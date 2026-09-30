import {highestTone} from './pricing-domain.js';

// HQ Hair confirmed both base colors belong to the bright price tone on 2026-09-30.
export function confirmBrightColors(data){
 const normalize=value=>String(value).replace(/^#/,'').trim().toLowerCase();
 for(const code of ['60A','Grey']){
  let color=data.colors.find(c=>normalize(c.code)===normalize(code));
  if(!color){color={id:'hq-confirmed-'+code.toLowerCase(),code:'#'+code,components:[],unlistedComponents:[],images:[],note:'HQ Hair xác nhận tông Sáng ngày 30/09/2026.'};data.colors.push(color)}
  color.category='Blonde';color.tone='blonde';
  for(const mix of data.colors){
   if(!mix.unlistedComponents?.some(part=>normalize(part)===normalize(code)))continue;
   mix.components=[...new Set([...(mix.components||[]),color.id])];
   mix.unlistedComponents=mix.unlistedComponents.filter(part=>normalize(part)!==normalize(code));
  }
 }
 for(const color of data.colors.filter(c=>['Ombre','Piano','Balayage'].includes(c.category))){
  const tones=(color.components||[]).map(id=>data.colors.find(c=>c.id===id)?.tone);
  color.tone=tones.includes('blonde')?'blonde':color.unlistedComponents?.length?null:highestTone(tones);
 }
 return data;
}

export function migrateBrightColors(db,audit){
 const id='20260930-confirm-60a-grey-bright';
 db.exec('CREATE TABLE IF NOT EXISTS pricing_migrations(id TEXT PRIMARY KEY,time TEXT NOT NULL)');
 if(db.prepare('SELECT id FROM pricing_migrations WHERE id=?').get(id))return;
 db.exec('BEGIN IMMEDIATE');
 try{
  const data=JSON.parse(db.prepare('SELECT data FROM pricing WHERE id=1').get().data);
  const before=data.colors.filter(c=>!c.tone).map(c=>c.code);
  confirmBrightColors(data);data.version++;
  db.prepare('UPDATE pricing SET data=? WHERE id=1').run(JSON.stringify(data));
  db.prepare('INSERT INTO pricing_migrations VALUES (?,?)').run(id,new Date().toISOString());
  audit({id:'system:customer-confirmation'},'color-confirmation',id,{colors:['60A','Grey'],tone:'blonde',previouslyUnresolved:before,version:data.version});
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error}
}
