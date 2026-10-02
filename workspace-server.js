import {migrateOrderIdentity} from './order-identity.js';
import {setupStandards} from './standards-server.js';
import {setupQC} from './qc-server.js';
import {setupPricing} from './pricing-server.js';
import express from 'express';
import {canReadRecord,factoryOrder,factoryView} from './permissions.js';
import {cleanProductFields} from './product-fields.js';
import {setupChatImages} from './chat-images.js';
import {DatabaseSync,backup} from 'node:sqlite';
import {randomBytes,randomUUID,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {mkdirSync,readdirSync,unlinkSync,statSync} from 'node:fs';
import path from 'node:path';

const derive=promisify(scrypt);
const digest=value=>createHash('sha256').update(value).digest('hex');
const reject=(status,message)=>{throw Object.assign(new Error(message),{status})};
export const safeUser=u=>({id:u.id,name:u.name,email:u.email,role:u.role,code:u.code,active:!!u.active,mustChange:!!u.must_change,factoryView:factoryView(u),priceEdit:!!u.price_edit,colorEdit:!!u.color_edit,leadEdit:!!u.lead_edit,leadAssign:!!u.lead_assign});
export async function hashPassword(password){
 if(typeof password!=='string'||password.length<12||password.length>128)reject(400,'Mật khẩu cần từ 12 đến 128 ký tự.');
 const salt=randomBytes(16).toString('hex');
 return salt+':'+Buffer.from(await derive(password,salt,64,{N:32768,maxmem:64*1024*1024})).toString('hex');
}
async function verify(password,stored){
 if(typeof password!=='string'||password.length>128)return false;
 const [salt,hash]=stored.split(':');
 const actual=await derive(password,salt,64,{N:32768,maxmem:64*1024*1024});
 return timingSafeEqual(Buffer.from(hash,'hex'),actual);
}
export async function createWorkspace(dir){
 const db=new DatabaseSync(path.join(dir,'workspace.sqlite'));
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,code TEXT NOT NULL UNIQUE,role TEXT NOT NULL,password TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,must_change INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS auth_sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS workspace(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,time TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,details TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS requests(user_id TEXT NOT NULL,key TEXT NOT NULL,hash TEXT NOT NULL,result TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(user_id,key));
 CREATE TABLE IF NOT EXISTS login_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,reset INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sequences(key TEXT PRIMARY KEY,value INTEGER NOT NULL);`);
 if(!db.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='factory_view'))db.exec("ALTER TABLE users ADD COLUMN factory_view TEXT NOT NULL DEFAULT 'full'");
 db.prepare('INSERT OR IGNORE INTO workspace VALUES (1,?)').run(JSON.stringify({customers:[],orders:[],catalog:[]}));
 const audit=(user,action,target='',details={})=>db.prepare('INSERT INTO audit(actor,time,action,target,details) VALUES (?,?,?,?,?)').run(user.id,new Date().toISOString(),action,target,JSON.stringify(details));
 // Customer confirmation 2026-10-02: all departments see all three tabs now.
 // Run once; later manager visibility changes remain in force.
 db.exec('CREATE TABLE IF NOT EXISTS app_migrations(id TEXT PRIMARY KEY)');
 if(!db.prepare('SELECT id FROM app_migrations WHERE id=?').get('qc-full-factory-20261002')){
  db.exec('BEGIN IMMEDIATE');try{
   for(const u of db.prepare("SELECT id,factory_view FROM users WHERE role='factory' AND factory_view!='full'").all()){db.prepare("UPDATE users SET factory_view='full' WHERE id=?").run(u.id);audit({id:'system'},'factory-visibility',u.id,{before:u.factory_view,after:'full',reason:'Customer confirmation 2026-10-02'});}
   db.prepare('INSERT INTO app_migrations VALUES (?)').run('qc-full-factory-20261002');db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
 }
 if(!db.prepare('SELECT id FROM app_migrations WHERE id=?').get('official-order-code-20261002')){
  db.exec('BEGIN IMMEDIATE');try{
   const data=JSON.parse(db.prepare('SELECT data FROM workspace WHERE id=1').get().data);
   migrateOrderIdentity(data.orders);
   db.prepare('UPDATE workspace SET data=? WHERE id=1').run(JSON.stringify(data));
   audit({id:'system'},'order-code-migration','',{approved:data.orders.filter(o=>o.orderCode).length,pending:data.orders.filter(o=>!o.orderCode).length});
   db.prepare('INSERT INTO app_migrations VALUES (?)').run('official-order-code-20261002');db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
 }
 if(!db.prepare('SELECT id FROM users LIMIT 1').get()&&process.env.HQ_ADMIN_EMAIL&&process.env.HQ_ADMIN_PASSWORD){
  db.prepare('INSERT INTO users(id,email,name,code,role,password,active,must_change) VALUES (?,?,?,?,?,?,1,1)').run(randomUUID(),process.env.HQ_ADMIN_EMAIL.toLowerCase(),process.env.HQ_ADMIN_NAME||'Quản lý HQ Hair','HQ-ADMIN','manager',await hashPassword(process.env.HQ_ADMIN_PASSWORD));
 }
 for(const column of ['lead_edit','lead_assign'])if(!db.prepare('PRAGMA table_info(users)').all().some(c=>c.name===column))db.exec(`ALTER TABLE users ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 0`);
 setupChatImages(db);setupQC(db);
 const dummy=await hashPassword(randomBytes(24).toString('hex'));
 const router=express.Router();
 router.use((req,res,next)=>{res.set('Cache-Control','no-store');next()});
 const cookieOptions={httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/api/work',maxAge:8*3600000};
 function issue(user,res){
  db.prepare('DELETE FROM auth_sessions WHERE expires<?').run(Date.now());
  const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');
  db.prepare('INSERT INTO auth_sessions VALUES (?,?,?,?)').run(digest(token),user.id,csrf,Date.now()+8*3600000);
  res.cookie('hq_work',token,cookieOptions);return {user:safeUser(user),csrf};
 }
 router.post('/login',async(req,res)=>{
  const email=String(req.body.email||'').trim().toLowerCase();
  const keys=['ip:'+req.ip,'email:'+digest(email)];
  for(const key of keys){const l=db.prepare('SELECT * FROM login_limits WHERE key=?').get(key);if(l&&l.reset>Date.now()&&l.count>=(key.startsWith('ip:')?100:10)){res.set('Retry-After','900');return res.status(429).json({error:'Đã thử đăng nhập nhiều lần. Vui lòng thử lại sau 15 phút.'})}}
  for(const key of keys)db.prepare('INSERT INTO login_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset<? THEN 1 ELSE count+1 END,reset=CASE WHEN reset<? THEN excluded.reset ELSE reset END').run(key,Date.now()+900000,Date.now(),Date.now());
  const user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
  const valid=await verify(req.body.password,user?.password||dummy);
  if(!valid||!user?.active)return res.status(401).json({error:'Email hoặc mật khẩu không đúng.'});
  // Re-read after asynchronous password work: disabled/reset accounts cannot race login.
  const current=db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
  if(!current.active||current.password!==user.password)return res.status(401).json({error:'Tài khoản đã thay đổi. Vui lòng đăng nhập lại.'});
  db.prepare('DELETE FROM login_limits WHERE key=?').run(keys[1]);
  audit(user,'login');res.json(issue(user,res));
 });
 router.use((req,res,next)=>{
  const token=req.headers.cookie?.match(/(?:^|;\s*)hq_work=([a-f0-9]{64})(?:;|$)/)?.[1];
  const session=token&&db.prepare('SELECT * FROM auth_sessions WHERE token=? AND expires>?').get(digest(token),Date.now());
  const user=session&&db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(session.user_id);
  if(!user)return res.status(401).json({error:'Vui lòng đăng nhập để tiếp tục.'});
  if(req.method!=='GET'&&req.get('X-CSRF-Token')!==session.csrf)return res.status(403).json({error:'Phiên thao tác không hợp lệ. Vui lòng tải lại trang.'});
  req.user=user;req.session=session;req.work=true;
  if(user.must_change&&!['/me','/password','/logout'].includes(req.path))return res.status(403).json({error:'Vui lòng đổi mật khẩu ban đầu.'});
  next();
 });
 router.get('/me',(req,res)=>res.json({user:safeUser(req.user),csrf:req.session.csrf}));
 router.post('/logout',(req,res)=>{db.prepare('DELETE FROM auth_sessions WHERE token=?').run(req.session.token);res.clearCookie('hq_work',cookieOptions);res.json({ok:true})});
 router.post('/password',async(req,res)=>{
  if(!await verify(req.body.currentPassword,req.user.password))reject(400,'Mật khẩu hiện tại không đúng.');
  const password=await hashPassword(req.body.password);
  if(await verify(req.body.password,req.user.password))reject(400,'Mật khẩu mới phải khác mật khẩu cũ.');
  const fresh=db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if(!fresh.active||fresh.password!==req.user.password)reject(409,'Tài khoản đã thay đổi. Vui lòng đăng nhập lại.');
  db.prepare('UPDATE users SET password=?,must_change=0 WHERE id=?').run(password,req.user.id);
  db.prepare('DELETE FROM auth_sessions WHERE user_id=?').run(req.user.id);
  audit(req.user,'password-change');res.json(issue({...req.user,must_change:0},res));
 });
 const manager=(req,res,next)=>req.user.role==='manager'?next():res.status(403).json({error:'Chỉ quản lý được thực hiện thao tác này.'});
 setupPricing(router,db,audit);
 setupStandards(router);
 router.get('/sales-roster',(req,res)=>{if(req.user.role!=='manager'&&!(req.user.role==='sales_lead'&&req.user.lead_assign))return res.status(403).json({error:'Chưa được cấp quyền phân công.'});res.json(db.prepare("SELECT id,name,code,role,active FROM users WHERE role IN ('sale','manager')").all())});
 router.post('/users/:id/lead-permissions',manager,(req,res)=>{
  const u=db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if(!u||u.role!=='sales_lead'||typeof req.body.leadEdit!=='boolean'||typeof req.body.leadAssign!=='boolean')reject(400,'Chọn trưởng nhóm và quyền hợp lệ.');
  db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE users SET lead_edit=?,lead_assign=? WHERE id=?').run(+req.body.leadEdit,+req.body.leadAssign,u.id);audit(req.user,'lead-permissions',u.id,{before:{leadEdit:!!u.lead_edit,leadAssign:!!u.lead_assign},after:req.body});db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}res.json({ok:true});
 });

 router.get('/users',manager,(req,res)=>res.json(db.prepare('SELECT * FROM users ORDER BY name').all().map(safeUser)));
 router.post('/users',manager,async(req,res)=>{
  const b=req.body;
  if(b.id){
   const old=db.prepare('SELECT * FROM users WHERE id=?').get(b.id);if(!old)reject(404,'Không tìm thấy tài khoản.');
   if(b.id===req.user.id)reject(400,'Không thể tự khóa hoặc đặt lại mật khẩu của chính mình tại đây.');
   const password=b.password?await hashPassword(b.password):null;
   // Authorization must still hold after hashing.
   if(!db.prepare('SELECT token FROM auth_sessions WHERE token=?').get(req.session.token))reject(401,'Phiên đã kết thúc.');
   db.prepare('UPDATE users SET active=?,password=COALESCE(?,password),must_change=CASE WHEN ? IS NULL THEN must_change ELSE 1 END WHERE id=?').run(b.active===false?0:1,password,password,b.id);
   db.prepare('DELETE FROM auth_sessions WHERE user_id=?').run(b.id);audit(req.user,password?'user-reset':'user-status',b.id);
  }else{
   const email=String(b.email||'').trim().toLowerCase(),name=String(b.name||'').trim().slice(0,100);
   if(!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||(b.role==='sales_lead'&&/^[a-z][a-z0-9._-]{2,39}$/.test(email)))||!name||!['sale','sales_lead','manager','accounting','factory'].includes(b.role))reject(400,'Kiểm tra tên, email và vai trò.');
   const password=await hashPassword(b.password);
   if(!db.prepare('SELECT token FROM auth_sessions WHERE token=?').get(req.session.token))reject(401,'Phiên đã kết thúc.');
   if(db.prepare('SELECT id FROM users WHERE email=?').get(email))reject(409,'Email đã được sử dụng.');
   const id=randomUUID();
   const prefix={sale:'HQ',sales_lead:'TL',manager:'QT',accounting:'KT',factory:'SX'}[b.role];
   let code=String(b.code||'').trim().toUpperCase();
   if(code&&!new RegExp('^'+prefix+'-[A-Z0-9]{2,12}$').test(code))reject(400,`Mã tài khoản cần dạng ${prefix}-TÊNVIẾTTẮT (2–12 chữ cái hoặc số).`);
   if(!code){let n=db.prepare('SELECT COUNT(*) AS n FROM users').get().n+1;do{code=prefix+'-S'+String(n++).padStart(3,'0')}while(db.prepare('SELECT id FROM users WHERE code=?').get(code))}
   if(db.prepare('SELECT id FROM users WHERE code=?').get(code))reject(409,'Mã tài khoản đã được sử dụng. Chọn mã khác.');
   db.prepare('INSERT INTO users(id,email,name,code,role,password,active,must_change) VALUES (?,?,?,?,?,?,1,1)').run(id,email,name,code,b.role,password);audit(req.user,'user-create',id,{name,email,role:b.role,code});
  }
  res.json(db.prepare('SELECT * FROM users ORDER BY name').all().map(safeUser));
 });
 router.post('/users/:id/visibility',manager,(req,res)=>{const user=db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);if(!user||user.role!=='factory')reject(400,'Chọn tài khoản Xưởng.');if(!['full','products'].includes(req.body.factoryView))reject(400,'Phạm vi xem không hợp lệ.');db.prepare('UPDATE users SET factory_view=? WHERE id=?').run(req.body.factoryView,user.id);audit(req.user,'factory-visibility',user.id,{before:user.factory_view,after:req.body.factoryView});res.json(db.prepare('SELECT * FROM users ORDER BY name').all().map(safeUser))});
 router.get('/audit',manager,(req,res)=>res.json(db.prepare('SELECT audit.*,users.name AS actorName FROM audit LEFT JOIN users ON users.id=audit.actor ORDER BY audit.id DESC LIMIT 200').all()));
 const backupDir=process.env.BACKUP_DIR||path.join(dir,'backups');mkdirSync(backupDir,{recursive:true});
 let backingUp=false,lastBackup=null,backupError=null;
 async function makeBackup(){
  if(backingUp)return;backingUp=true;
  const file=path.join(backupDir,`workspace-${new Date().toISOString().replaceAll(':','-')}-${randomUUID().slice(0,8)}.sqlite`);
  try{await backup(db,file);const check=new DatabaseSync(file,{readOnly:true});try{if(check.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Integrity check failed')}finally{check.close()}
   lastBackup=new Date().toISOString();backupError=null;
   const files=readdirSync(backupDir).filter(x=>/^workspace-[\wT.:-]+\.sqlite$/.test(x)).sort((a,b)=>statSync(path.join(backupDir,b)).mtimeMs-statSync(path.join(backupDir,a)).mtimeMs);
   // Keep the newest valid snapshot for each of the last 14 backup days.
   const days=new Set();
   for(const name of files){const day=name.slice(10,20);if(days.has(day)||days.size>=14)unlinkSync(path.join(backupDir,name));else days.add(day)}
  }catch(e){backupError='Sao lưu chưa hoàn thành';console.error('Workspace backup failed:',e.message)}finally{backingUp=false}
 }
 router.get('/backup-status',manager,(req,res)=>res.json({lastBackup,backupError,separateLocation:!!process.env.BACKUP_DIR,retention:14}));
 let exporting=false;
 router.get('/backup-download',manager,async(req,res)=>{
  if(exporting)return res.status(409).json({error:'Đang chuẩn bị bản sao lưu. Vui lòng thử lại sau.'});
  exporting=true;const exports=path.join(dir,'exports');mkdirSync(exports,{recursive:true});
  const file=path.join(exports,randomUUID()+'.sqlite');
  const cleanup=()=>{exporting=false;try{unlinkSync(file)}catch{}};
  try{
   await backup(db,file);
   if(!db.prepare('SELECT token FROM auth_sessions WHERE token=? AND expires>?').get(req.session.token,Date.now())){cleanup();return res.status(401).json({error:'Phiên đã kết thúc.'})}
   audit(req.user,'backup-download');res.download(file,'HQ-Hair-workspace-backup.sqlite',cleanup);
  }catch(e){cleanup();throw e}
 });
 await makeBackup();const timer=setInterval(makeBackup,86400000);timer.unref();
 router.use((req,res,next)=>{
  if(!['sale','manager','sales_lead','factory','accounting'].includes(req.user.role))return res.status(403).json({error:'Phân hệ này dành cho Sale và quản lý. Phân hệ của bạn sẽ được mở ở giai đoạn tương ứng.'});
  req.imageDb=db;req.data=JSON.parse(db.prepare('SELECT data FROM workspace WHERE id=1').get().data);
  const beforeCustomers=new Map(req.data.customers.map(c=>[c.id,JSON.stringify(c)]));
  const beforeCatalog=JSON.stringify(req.data.catalog);
  req.canRead=record=>canReadRecord(req.user,record);
  req.recordAudit=(action,target,details)=>audit(req.user,action,target,details);
  req.assertAccess=record=>{if(!req.canRead(record))reject(404,'Không tìm thấy dữ liệu trong phạm vi được giao.')};
  req.assertVersion=record=>{if(record&&req.body.version!==record.version)reject(409,'Dữ liệu đã được cập nhật ở nơi khác. Tải lại trang trước khi sửa tiếp.')};
  req.nextCode=key=>db.prepare('INSERT INTO sequences VALUES (?,1) ON CONFLICT(key) DO UPDATE SET value=value+1 RETURNING value').get(key).value;
  req.view=()=>{const orders=req.data.orders.filter(req.canRead);if(req.user.role==='accounting')return {orders,customers:req.data.customers.filter(c=>orders.some(o=>o.customerId===c.id)),catalog:[],user:safeUser(req.user),mode:'workspace'};if(req.user.role==='factory')return {orders:factoryView(req.user)==='products'?orders.map(factoryOrder):orders,customers:factoryView(req.user)==='products'?[]:req.data.customers.filter(c=>orders.some(o=>o.customerId===c.id)),catalog:[],user:safeUser(req.user),mode:'workspace'};return {...req.data,customers:req.data.customers.filter(req.canRead),orders,user:safeUser(req.user),mode:'workspace'}};
  req.save=()=>{
   for(const c of req.data.customers){const before=beforeCustomers.get(c.id);if(before!==JSON.stringify(c))audit(req.user,before?'customer-update':'customer-create',c.id,{before:before?JSON.parse(before):null,after:c})}
   if(beforeCatalog!==JSON.stringify(req.data.catalog))audit(req.user,'catalog-update','catalog',{before:JSON.parse(beforeCatalog),after:req.data.catalog});
   return db.prepare('UPDATE workspace SET data=? WHERE id=1').run(JSON.stringify(req.data));
  };
  if(req.method==='GET')return next();
  if(req.user.role==='accounting'&&!( /^\/orders\/[^/]+\/action$/.test(req.path)&&['accounting-approve','accounting-cancel','accounting-final','accounting-forfeit'].includes(req.body.action)))return res.status(403).json({error:'Kế toán chỉ được xử lý thanh toán tại bước 3 và 7.'});
  if(req.user.role==='sales_lead'&&!req.user.lead_edit&&!(req.path==='/assign'&&req.user.lead_assign))return res.status(403).json({error:'Trưởng nhóm đang ở quyền chỉ xem. Quản trị có thể cấp thêm quyền.'});
  if(req.user.role==='factory'&&!( /^\/orders\/[^/]+\/action$/.test(req.path)&&['message','factory-status','factory-office'].includes(req.body.action))&&!/^\/orders\/[^/]+\/(qc|qc-upload)$/.test(req.path))return res.status(403).json({error:'Tài khoản Xưởng hiện được xem đơn và trao đổi; không được sửa nội dung hoặc thanh toán.'});
  if(req.path==='/reset')return res.status(403).json({error:'Không gian làm việc không hỗ trợ khôi phục dữ liệu mẫu.'});
  const key=req.get('Idempotency-Key');if(!key||!/^[\w-]{16,100}$/.test(key))return res.status(400).json({error:'Thiếu mã thao tác. Vui lòng tải lại trang.'});
  const hash=digest(req.path+JSON.stringify(req.body));
  const old=db.prepare('SELECT * FROM requests WHERE user_id=? AND key=?').get(req.user.id,key);
  if(old){if(old.hash!==hash)return res.status(409).json({error:'Mã thao tác đã được dùng cho nội dung khác.'});const result=JSON.parse(old.result);if(result.id){req.assertAccess(req.data.orders.find(o=>o.id===result.id));return res.json({id:result.id,state:req.view()})}return res.json(req.view())}
  db.exec('BEGIN IMMEDIATE');
  const json=res.json.bind(res);let done=false;
  req.rollback=()=>{if(!done){done=true;if(db.isTransaction)db.exec('ROLLBACK')}};
  res.json=value=>{
   if(!done){if(res.statusCode<400){
    try{
    audit(req.user,req.path,req.params.id||req.body.id||value.id||'',{action:req.body.action||null,version:req.body.version||null});
    db.prepare('INSERT INTO requests VALUES (?,?,?,?,?)').run(req.user.id,key,hash,JSON.stringify({id:value.id}),Date.now());db.exec('COMMIT');done=true;
    }catch(error){req.rollback();throw error}
   }else req.rollback()}
   return json(value);
  };
  res.on('close',req.rollback);
  next();
 });
 router.post('/catalog',manager,(req,res)=>{
  const b=req.body;
  if(!Array.isArray(b.products)||b.products.length>1000)reject(400,'Danh mục tối đa 1.000 sản phẩm.');
  if(b.version!==(req.data.catalogVersion||0))reject(409,'Bảng giá đã thay đổi. Tải lại trước khi lưu.');
  const products=b.products.map(p=>{
   const name=String(p.name||'').trim(),unit=String(p.unit||'').trim(),price=Number(p.price);
   if(!name||name.length>120||!unit||unit.length>30||!Number.isFinite(price)||price<0||price>100000||!['base','extra','gift'].includes(p.kind))reject(400,'Kiểm tra tên, đơn vị, nhóm và giá sản phẩm.');
   return {...cleanProductFields(p),id:p.id&&req.data.catalog.some(x=>x.id===p.id)?p.id:randomUUID(),name,unit,price:p.kind==='gift'?0:price,kind:p.kind,spec:String(p.spec||'').trim().slice(0,200)};
  });
  if(new Set(products.map(p=>p.id)).size!==products.length)reject(400,'Sản phẩm bị lặp mã.');
  req.data.catalog=products;req.data.catalogVersion=(req.data.catalogVersion||0)+1;req.save();res.json(req.view());
 });
 router.post('/assign',(req,res,next)=>req.user.role==='manager'||(req.user.role==='sales_lead'&&req.user.lead_assign)?next():res.status(403).json({error:'Chưa được cấp quyền phân công khách hàng.'}),(req,res)=>{
  const c=req.data.customers.find(c=>c.id===req.body.id);req.assertAccess(c);req.assertVersion(c);
  const owner=db.prepare("SELECT * FROM users WHERE id=? AND active=1 AND role IN ('sale','manager')").get(req.body.ownerId);
  if(!owner)reject(400,'Chọn nhân sự Sale hoặc quản lý đang hoạt động.');
  audit(req.user,'customer-assign',c.id,{from:c.ownerId,to:owner.id});
  c.ownerId=owner.id;c.sale=owner.name;c.version++;
  for(const order of req.data.orders.filter(o=>o.customerId===c.id)){order.ownerId=owner.id;order.sale=owner.name;order.version++;order.history.push({title:'Chuyển người phụ trách',actor:req.user.name,actorId:req.user.id,time:new Date().toISOString(),note:`Chuyển tới ${owner.name}`})}
  req.save();res.json(req.view());
 });
 // Roll back inside this router before Express yields to its parent on errors.
 router.use((error,req,res,next)=>{req.rollback?.();next(error)});
 return {router,db,makeBackup};
}
