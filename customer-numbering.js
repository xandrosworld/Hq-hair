import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import path from 'node:path';

// Explicit customer request, 2026-10-16: renumber Judy's live customers and
// their visible order codes. Order IDs stay stable for URLs, media and retries.
export const customerNumberingMigration='judy-customer-numbering-20261016';
export function renumberJudyCustomers(data){
 const customers=data.customers.filter(c=>/^HQ-JD-\d+$/.test(c.id)).sort((a,b)=>Number(a.id.split('-').at(-1))-Number(b.id.split('-').at(-1)));
 if(!customers.length||customers[0].id!=='HQ-JD-3')return [];
 if(customers.some((c,i)=>c.id!==`HQ-JD-${i+3}`))throw Error('Customer numbering differs from the approved contiguous sequence; review before migration.');
 const mapping=customers.map((c,i)=>({before:c.id,after:`HQ-JD-${i+1}`})),ids=new Map(mapping.map(m=>[m.before,m.after]));
 if(data.orders.some(o=>o.customerId?.startsWith('HQ-JD-')&&!ids.has(o.customerId)))throw Error('Orphaned Judy orders require review before renumbering.');
 for(const c of customers){c.previousIds=[...new Set([...(c.previousIds||[]),c.id])];c.id=ids.get(c.id);c.version=(c.version||0)+1}
 for(const o of data.orders){
  const before=o.customerId,after=ids.get(before);if(!after)continue;
  const oldCode=o.orderCode;
  if(o.orderCode){if(!o.orderCode.startsWith(before+'-'))throw Error('Order code does not match customer.');o.orderCode=after+o.orderCode.slice(before.length)}
  if(o.draftCode?.startsWith('Draft-'+before+'-'))o.draftCode='Draft-'+after+o.draftCode.slice(('Draft-'+before).length);
  o.customerId=after;o.version=(o.version||0)+1;
  o.history||=[];o.history.push({title:'Điều chỉnh mã khách hàng',actor:'Hệ thống',actorId:'system',time:new Date().toISOString(),note:`${before} → ${after}${oldCode?`; mã đơn ${oldCode} → ${o.orderCode}`:''}`});
 }
 const codes=data.orders.map(o=>o.orderCode).filter(Boolean);
 if(new Set(codes).size!==codes.length)throw Error('Duplicate order code after renumbering.');
 return mapping;
}
export function migrateCustomerNumbering(db,dir,audit){
 if(db.prepare('SELECT id FROM app_migrations WHERE id=?').get(customerNumberingMigration))return;
 const data=JSON.parse(db.prepare('SELECT data FROM workspace WHERE id=1').get().data);
 const mapping=renumberJudyCustomers(data);
 let snapshot;
 if(mapping.length){
  const folder=path.join(dir,'identity-backups');mkdirSync(folder,{recursive:true});
  snapshot=path.join(folder,customerNumberingMigration+'-'+Date.now()+'.sqlite');
  db.prepare('VACUUM INTO ?').run(snapshot);
  const check=new DatabaseSync(snapshot,{readOnly:true});try{if(check.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Customer numbering backup failed integrity check.')}finally{check.close()}
 }
 db.exec('BEGIN IMMEDIATE');try{
  if(mapping.length){
   db.prepare('UPDATE workspace SET data=? WHERE id=1').run(JSON.stringify(data));
   const user=db.prepare("SELECT id FROM users WHERE code='HQ-JD'").get();
   if(!user)throw Error('Missing Judy account; cannot update customer sequence.');
   db.prepare('INSERT INTO sequences(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('customer:'+user.id,mapping.length);
   // Reauthentication prevents a stale form addressing a reassigned customer ID.
   db.exec('DELETE FROM auth_sessions');
   audit({id:'system'},'customer-numbering-migration','HQ-JD',{mapping,backup:snapshot,orders:data.orders.filter(o=>mapping.some(m=>m.after===o.customerId)).length});
  }
  db.prepare('INSERT INTO app_migrations VALUES (?)').run(customerNumberingMigration);db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e}
}
