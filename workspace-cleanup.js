import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
export const cleanupLabels={customers:'XOA KHACH HANG',orders:'XOA DON HANG',all:'XOA TAT CA'};
const fingerprint=raw=>createHash('sha256').update(raw).digest('hex');
export function cleanupPreview(db,mode){
 if(!Object.hasOwn(cleanupLabels,mode))fail(400,'Chọn chế độ xóa hợp lệ.');
 const raw=db.prepare('SELECT data FROM workspace WHERE id=1').get().data,data=JSON.parse(raw);
 return {mode,token:fingerprint(raw),confirmation:cleanupLabels[mode],customers:mode==='orders'?0:data.customers.length,orders:mode==='customers'?0:data.orders.length,blocked:mode==='customers'&&data.orders.length>0};
}
export function executeCleanup(db,dir,user,body,audit){
 const preview=cleanupPreview(db,body.mode);
 if(body.token!==preview.token)fail(409,'Dữ liệu đã thay đổi. Xem lại phạm vi trước khi xóa.');
 if(body.confirmation!==preview.confirmation)fail(400,'Cụm xác nhận chưa đúng.');
 if(preview.blocked)fail(409,'Còn đơn hàng liên kết. Xóa đơn hàng trước hoặc chọn Xóa tất cả.');
 if(!preview.customers&&!preview.orders)fail(400,'Không có dữ liệu cần xóa.');
 // Synchronous snapshot + mutation: no requests can interleave between these steps.
 const backupDir=path.join(dir,'cleanup-backups');
 const backupName=`before-cleanup-${Date.now()}-${randomUUID()}.sqlite`,file=path.join(backupDir,backupName);
 try{mkdirSync(backupDir,{recursive:true});db.prepare('VACUUM INTO ?').run(file);const snapshot=new DatabaseSync(file,{readOnly:true});try{if(snapshot.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Integrity check failed');if(fingerprint(snapshot.prepare('SELECT data FROM workspace WHERE id=1').get().data)!==preview.token)throw Error('Snapshot differs')}finally{snapshot.close()}}catch{fail(503,'Không tạo được bản sao lưu hợp lệ. Chưa xóa dữ liệu.');}
 db.exec('BEGIN IMMEDIATE');
 try{
  const data=JSON.parse(db.prepare('SELECT data FROM workspace WHERE id=1').get().data);
  if(body.mode!=='orders')data.customers=[];
  if(body.mode!=='customers'){data.orders=[];db.exec('DELETE FROM chat_images; DELETE FROM qc_media;');}
  db.prepare('UPDATE workspace SET data=? WHERE id=1').run(JSON.stringify(data));
  // Keep idempotency history so an old retry cannot recreate deleted records.
  audit(user,'workspace-cleanup',body.mode,{customers:preview.customers,orders:preview.orders,backup:backupName});
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e}
 return {ok:true,customers:preview.customers,orders:preview.orders,backup:backupName};
}
export function setupCleanup(router,db,dir,manager,verify,audit){
 router.get('/cleanup-preview',manager,(req,res)=>res.json(cleanupPreview(db,req.query.mode)));
 router.post('/cleanup',manager,async(req,res)=>{
  const key='cleanup:'+req.user.id;
  const limit=db.prepare('SELECT * FROM login_limits WHERE key=?').get(key);
  if(limit&&limit.reset>Date.now()&&limit.count>=5)fail(429,'Đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.');
  db.prepare('INSERT INTO login_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset<? THEN 1 ELSE count+1 END,reset=CASE WHEN reset<? THEN excluded.reset ELSE reset END').run(key,Date.now()+900000,Date.now(),Date.now());
  if(!await verify(req.body.password,req.user.password))fail(403,'Mật khẩu quản trị không đúng.');
  const fresh=db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if(!fresh?.active||fresh.role!=='manager'||fresh.password!==req.user.password||!db.prepare('SELECT token FROM auth_sessions WHERE token=? AND expires>?').get(req.session.token,Date.now()))fail(401,'Phiên đã thay đổi. Vui lòng đăng nhập lại.');
  const result=executeCleanup(db,dir,fresh,req.body,audit);
  db.prepare('DELETE FROM login_limits WHERE key=?').run(key);
  res.json(result);
 });
}
