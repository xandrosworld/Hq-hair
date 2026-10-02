import {applyFactoryWorkflow} from './factory-workflow.js';
import {migrateOrderIdentity,assignOrderCode} from './order-identity.js';
import {qcSignature} from './quality-control.js';
import {applyAccounting} from './accounting.js';
import {setupQC,qcRoutes} from './qc-server.js';
import {validateOrder} from './src/order-validation.js';
import {validDate} from './reporting.js';
import express from 'express';
import {contentLocked,exceptionReason,assertContentAction,applySaleWorkflow} from './order-workflow.js';
import {deploymentGate} from './deployment-mode.js';
import {cleanProductFields} from './product-fields.js';
import {parseChatImages,setupChatImages} from './chat-images.js';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createWorkspace} from './workspace-server.js';
import {seed} from './seed.js';
import {totals,groups,countries,today} from './shared.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const dir=process.env.DATA_DIR||path.join(root,'data');mkdirSync(dir,{recursive:true});
const db=new DatabaseSync(path.join(dir,'demo.sqlite'));db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated INTEGER NOT NULL)');
setupChatImages(db);setupQC(db);
const app=express();app.disable('x-powered-by');app.set('trust proxy',1);
app.use(deploymentGate(dir));
app.use((req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'same-origin','X-Robots-Tag':'noindex, nofollow'});next()});
app.get('/api/health',(req,res)=>res.json({ok:true,revision:process.env.APP_REVISION||null}));
app.use('/api/work',express.json({limit:'30mb'}));
app.use('/api',express.json({limit:'30mb'}));
app.use('/api',(req,res,next)=>{
 if(req.method==='POST'&&(!req.body||Array.isArray(req.body)||typeof req.body!=='object'))return res.status(400).json({error:'Nội dung yêu cầu phải là một đối tượng hợp lệ.'});
 if(req.method!=='GET'&&req.get('origin')){try{if(new URL(req.get('origin')).host!==req.get('host'))return res.status(403).json({error:'Yêu cầu không hợp lệ.'})}catch{return res.status(403).json({error:'Yêu cầu không hợp lệ.'})}}
 next();
});
const workspace=await createWorkspace(dir);
const business=express.Router();
workspace.router.use(business);
workspace.router.use((req,res)=>res.status(404).json({error:'Không tìm thấy chức năng.'}));
app.use('/api/work',workspace.router);
app.use('/api',(req,res,next)=>{
 if(req.method!=='GET' && req.get('origin') && new URL(req.get('origin')).host!==req.get('host'))return res.status(403).json({error:'Yêu cầu không hợp lệ.'});
 let id=req.headers.cookie?.match(/(?:^|; )hq_demo=([a-f0-9-]{36})(?:;|$)/)?.[1];
 let row=id?db.prepare('SELECT data FROM sessions WHERE id=?').get(id):null;
 if(!row){id=randomUUID();row={data:JSON.stringify(seed())};db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(id,row.data,Date.now());res.cookie('hq_demo',id,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:30*86400000})}
 req.imageDb=db;req.user={id:'demo',name:'Judy',code:'HQ-JD',role:'sale'};req.view=()=>req.data;req.canRead=()=>true;req.assertAccess=()=>{};req.assertVersion=()=>{};req.data=JSON.parse(row.data);migrateOrderIdentity(req.data.orders);req.save=()=>db.prepare('UPDATE sessions SET data=?,updated=? WHERE id=?').run(JSON.stringify(req.data),Date.now(),id);res.set('Cache-Control','no-store');next();
});
const fail=(message)=>{const e=new Error(message);e.status=400;throw e};
const text=(v,max=1000)=>typeof v==='string'?v.trim().slice(0,max):'';
const num=(v,max=10000000)=>{const n=Number(v);if((typeof v!=='number'&&typeof v!=='string')||!Number.isFinite(n)||n<0||n>max)fail('Số tiền hoặc số lượng không hợp lệ.');return n};
const event=(req,o,title,note='')=>o.history.push({title,note,actor:req.user.name+' · '+(req.user.role==='manager'?'Quản lý':req.user.role==='accounting'?'Kế toán':req.user.role==='factory'?'Xưởng':req.user.role==='sales_lead'?'Trưởng nhóm Sale':'Sale'),actorId:req.user.id,time:new Date().toISOString()});
business.get('/orders/:id/images/:imageId',(req,res)=>{const o=req.data.orders.find(o=>o.id===req.params.id);req.assertAccess(o);if(!o||!o.messages.some(m=>m.images?.some(i=>i.id===req.params.imageId)))return res.status(404).json({error:'Không tìm thấy ảnh trong đơn này.'});const image=req.imageDb.prepare('SELECT data,mime FROM chat_images WHERE id=?').get(req.params.imageId);if(!image)return res.status(404).json({error:'Không tìm thấy ảnh.'});res.set({'Cache-Control':'private, no-store','Content-Type':image.mime,'Content-Security-Policy':"default-src 'none'; sandbox"});res.send(Buffer.from(image.data))});
qcRoutes(business);
business.get('/state',(req,res)=>res.json(req.view()));
business.post('/reset',(req,res)=>{req.data=seed();req.save();res.json(req.view())});
business.post('/customers',(req,res)=>{
 const b=req.body;const c={};for(const k of ['name','company','phone','email','country','group','address','recipient','recipientPhone','social','source','purchase'])c[k]=text(b[k]);
 if(!c.name||!c.phone||!c.address||!c.recipient||!c.recipientPhone||!c.social||!c.source||!c.purchase||!groups.includes(c.group)||!countries.includes(c.country))fail('Vui lòng điền đủ thông tin khách hàng và giao hàng bắt buộc.');
 if(c.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))fail('Email chưa đúng định dạng.');
 if(!b.id&&req.data.customers.length>=(req.work?10000:200))fail('Bản demo hỗ trợ tối đa 200 khách hàng.');
 const existing=req.data.customers.find(x=>x.id===b.id);
 if(b.id){req.assertAccess(existing);req.assertVersion(existing)}
 if(existing)Object.assign(existing,c,{version:(existing.version||0)+1});else req.data.customers.push({...c,ownerId:req.user.id,version:1,id:req.work?`${req.user.code}-${req.nextCode('customer:'+req.user.id)}`:`HQ-JD-${Math.max(0,...req.data.customers.map(x=>Number(x.id.split('-').at(-1))))+1}`,sale:req.user.name,created:today()});
 req.save();res.json(req.view());
});
function cleanPayment(p){
 if(!p||typeof p!=='object'||Array.isArray(p))fail('Chứng từ thanh toán không hợp lệ.');
 const result={id:randomUUID(),sender:text(p.sender),method:text(p.method),date:text(p.date),reference:text(p.reference),amount:p.amount===undefined||p.amount===null||p.amount===''?0:num(p.amount),confirmed:false};
 if(!result.sender||!result.method||!validDate(result.date))fail('Chứng từ cần tên người gửi, phương thức và ngày gửi hợp lệ.');
 if(p.file){if(!/^data:(image\/(png|jpeg|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(p.file)||p.file.length>1500000)fail('Chứng từ chỉ nhận PNG, JPG, WebP hoặc PDF tối đa 1 MB.');const bytes=Buffer.from(p.file.split(',')[1],'base64');const mime=p.file.slice(5,p.file.indexOf(';'));const valid=mime==='application/pdf'?bytes.subarray(0,5).toString()==='%PDF-':mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';if(!valid||bytes.length>1048576)fail('Nội dung tệp không khớp định dạng chứng từ.');result.file=p.file;result.fileName=text(p.fileName,120)}
 return result;
}
business.post('/orders',(req,res)=>{
 const b=req.body;const old=req.data.orders.find(o=>o.id===b.id);
 if(b.id){req.assertAccess(old);req.assertVersion(old);if(old?.cancelledAt)fail('Đơn đã hủy, không thể sửa.');}
 if(b.id&&!old)fail('Không tìm thấy đơn hàng.');
 const exception=!!(old&&(old.stage||contentLocked(old))&&req.work&&req.user.role==='manager');
 if(old&&(old.stage||contentLocked(old))&&!exception)fail('Đơn đã gửi duyệt đã bị khóa. Vui lòng gửi yêu cầu chỉnh sửa.');
 const reason=exception?exceptionReason(b.reason):'';
 const c=req.data.customers.find(c=>c.id===b.customerId);req.assertAccess(c);if(!c)fail('Vui lòng chọn khách hàng.');
 if(old&&old.customerId!==c.id)fail('Không thể đổi khách hàng của đơn đã lưu.');
 const o={customerId:c.id,sale:c.sale,ownerId:c.ownerId||req.user.id,version:(old?.version||0)+1,stage:0};
 for(const k of ['date','due','paymentDue','recipient','phone','email','address','country','carrier','service','tracking','note'])o[k]=text(b[k]);
 if((o.date&&!validDate(o.date))||(o.due&&!validDate(o.due)))fail('Ngày đặt và ngày giao phải là ngày hợp lệ.');
 if(o.paymentDue&&(!validDate(o.paymentDue)||o.paymentDue<o.date))fail('Hạn thanh toán phải là ngày hợp lệ, không trước ngày đặt hàng.');
 for(const k of ['discount','shippingFee','paymentFee'])o[k]=num(b[k]);
 if(!Array.isArray(b.items)||b.items.length>50||b.items.some(i=>!i||typeof i!=='object'||Array.isArray(i)))fail('Danh sách sản phẩm không hợp lệ.');
 o.items=b.items.map(i=>({...cleanProductFields(i),productId:text(i.productId||i.id,80),name:text(i.name,120),spec:text(i.spec,200),unit:text(i.unit,30),kind:['base','extra','gift'].includes(i.kind)?i.kind:'base',qty:num(i.qty,100000),price:i.kind==='gift'?0:num(i.price,100000)}));
 if(!Array.isArray(b.payments)||b.payments.length>20||b.payments.some(p=>!p||typeof p!=='object'||Array.isArray(p)))fail('Tối đa 20 chứng từ cho một đơn.');
 o.payments=(old?.payments||[]).filter(p=>p.confirmed).concat((b.payments||[]).filter(p=>!p.confirmed).slice(0,20).map(cleanPayment));
 if(o.payments.length>20)fail('Tối đa 20 chứng từ cho một đơn, gồm cả các lần đã xác nhận.');
 const refs=new Set();for(const p of o.payments){if(!p.reference)continue;const key=p.method+'|'+p.reference.toLowerCase();if(refs.has(key)||req.data.orders.some(other=>other.id!==old?.id&&other.payments.some(q=>q.method===p.method&&q.reference?.toLowerCase()===p.reference.toLowerCase())))fail('Mã giao dịch đã được ghi nhận.');refs.add(key)}
 if(totals(o).revenue<0)fail('Giảm giá không được vượt tổng giá sản phẩm.');
 if(o.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email))fail('Email chưa đúng định dạng.');
 if(b.submit||exception){
  const fields=validateOrder(o,{submit:true});if(Object.keys(fields).length){const error=new Error(Object.values(fields).join(' '));error.status=400;error.fields=fields;throw error;}
  o.stage=exception?old.stage:2;
 }
 o.id=old?.id||randomUUID();
 o.orderCode=old?.orderCode||null;
 o.requestCode=old?.requestCode||`YC-${o.id.replaceAll('-','').slice(0,12).toUpperCase()}`;
 o.messages=old?.messages||[];o.history=old?.history||[];
 if(old)for(const key of ['production','officeDispatch','finalPaymentCheck','customerFeedback','approvedAt','accountingApproval','qc','qcMedia','contentLockedAt','inspection','shippedDate','saleReview','receivedAt','completedAt','editRequested'])if(old[key]!==undefined)o[key]=old[key];
 if(o.qc&&o.qc.signature!==qcSignature(o.items))o.qc={...o.qc,stale:true};
 if(req.work&&old)o.history.push({title:'Lưu phiên bản trước chỉnh sửa',actor:req.user.name,actorId:req.user.id,time:new Date().toISOString(),snapshot:{...old,history:undefined,messages:undefined}});
 event(req,o,exception?'Quản trị chỉnh sửa ngoại lệ':old?'Cập nhật bản nháp':'Nhập đơn',reason);if(b.submit&&!exception)event(req,o,'Chờ duyệt','Đã chuyển yêu cầu đến Kế toán. Đơn được khóa chỉnh sửa.');
 if(old)Object.assign(old,o);else {if(req.data.orders.length>=(req.work?30000:300))fail('Bản demo hỗ trợ tối đa 300 đơn.');req.data.orders.unshift(o)}
 req.save();res.json({state:req.view(),id:o.id});
});
business.post('/orders/:id/action',(req,res)=>{
 const o=req.data.orders.find(o=>o.id===req.params.id);req.assertAccess(o);req.assertVersion(o);if(!o)fail('Không tìm thấy đơn hàng.');const {action}=req.body;
 const beforeAccounting=typeof action==='string'&&action.startsWith('accounting-')?{payments:structuredClone(o.payments),approval:o.accountingApproval||null,finalPaymentCheck:o.finalPaymentCheck||null,cancelType:o.cancelType||null,stage:o.stage}:null;
 const beforeException=req.work&&req.user.role==='manager'&&action!=='message'?structuredClone(o):null;
 if(o.cancelledAt&&action!=='message')fail('Đơn đã hủy, không thể thay đổi.');
 assertContentAction(o,req.user,action,req.body);
 if(action==='delete'){if(o.stage)fail('Chỉ xóa được bản nháp.');req.recordAudit?.('order-delete',o.id,{before:o});req.data.orders=req.data.orders.filter(x=>x.id!==o.id)}
 else if(action==='message'){const t=text(req.body.text);const images=parseChatImages(req.body.images);if(!t&&!images.length)fail('Nhập nội dung hoặc chọn ảnh trao đổi.');if(o.messages.length>=200)fail('Đã đạt giới hạn tin nhắn demo.');for(const image of images)req.imageDb.prepare('INSERT INTO chat_images VALUES (?,?,?)').run(image.id,image.bytes,image.mime);o.messages.push({id:randomUUID(),text:t,images:images.map(({id,name,mime,size})=>({id,name,mime,size})),author:req.user.name+' · '+(req.user.role==='manager'?'Quản lý':req.user.role==='accounting'?'Kế toán':req.user.role==='factory'?'Xưởng':req.user.role==='sales_lead'?'Trưởng nhóm Sale':'Sale'),authorId:req.user.id,time:new Date().toISOString()})}
 else if(action==='grant-edit'){if(!req.work||req.user.role!=='manager')return res.status(403).json({error:'Chỉ quản lý được cấp quyền sửa.'});if(contentLocked(o))fail('Không mở lại bản nháp của đơn đã khóa sau bước 8. Quản trị dùng chỉnh sửa ngoại lệ.');if(o.stage!==2||!o.editRequested)fail('Chỉ mở lại đơn đang chờ duyệt và đã có yêu cầu sửa.');const reason=text(req.body.text);if(!reason)fail('Nhập lý do cấp quyền sửa.');o.stage=0;o.editRequested=false;event(req,o,'Cấp quyền chỉnh sửa',reason)}
 else if(action==='edit-request'){if(!o.stage)fail('Bản nháp được chỉnh sửa trực tiếp.');if(o.editRequested)fail('Yêu cầu chỉnh sửa đang chờ xử lý.');const reason=text(req.body.text);if(!reason)fail('Vui lòng ghi lý do chỉnh sửa.');o.editRequested=true;event(req,o,'Yêu cầu chỉnh sửa',reason)}
 else if(action==='payment'){if(!o.stage)fail('Thêm thanh toán trong form bản nháp.');if(o.payments.length>=20)fail('Đã đạt giới hạn thanh toán demo.');const payment=cleanPayment(req.body.payment);if(payment.reference&&req.data.orders.some(order=>order.payments.some(p=>p.reference?.trim().toLowerCase()===payment.reference.toLowerCase()&&p.method===payment.method)))fail('Mã giao dịch này đã được ghi nhận. Kiểm tra lại chứng từ.');o.payments.push(payment);event(req,o,'Bổ sung chứng từ','Chờ Kế toán đối soát; chưa cộng vào tiền thực nhận.'+(req.body.reason?' Lý do ngoại lệ: '+text(req.body.reason):''))}
 else if(action==='manager-payment'){
  if(!req.work||req.user.role!=='manager')return res.status(403).json({error:'Chỉ quản trị được điều chỉnh thanh toán ngoại lệ.'});
  const reason=exceptionReason(req.body.text),payment=o.payments.find(p=>p.id===req.body.paymentId);
  if(!payment)fail('Không tìm thấy lần thanh toán.');
  const amount=num(req.body.amount);
  if(amount<=0||typeof req.body.confirmed!=='boolean')fail('Nhập số tiền lớn hơn 0 và trạng thái xác nhận hợp lệ.');
  const before={...payment};payment.amount=amount;payment.confirmed=req.body.confirmed;
  payment.correctedBy=req.user.id;payment.correctedAt=new Date().toISOString();
  event(req,o,'Quản trị điều chỉnh thanh toán',`${reason} · ${before.amount} → ${amount} USD · ${before.confirmed?'đã xác nhận':'chờ xác nhận'} → ${payment.confirmed?'đã xác nhận':'chờ xác nhận'}`);
 }
 else if(applyAccounting(o,req.user,action,req.body,(title,note)=>event(req,o,title,note))){assignOrderCode(o,req.data.orders);req.recordAudit?.('accounting-decision',o.id,{before:beforeAccounting,after:{payments:o.payments,approval:o.accountingApproval,orderCode:o.orderCode,cancelledAt:o.cancelledAt,finalPaymentCheck:o.finalPaymentCheck,cancelType:o.cancelType,stage:o.stage},reason:req.body.text,receipts:req.body.receipts})}
 else if(applyFactoryWorkflow(o,req.user,action,req.body,(title,note)=>event(req,o,title,note))){}
 else if(applySaleWorkflow(o,req.user,action,req.body,(title,note)=>event(req,o,title,note))){}
 else fail('Thao tác không được hỗ trợ.');if(beforeException)req.recordAudit('manager-order-action',o.id,{action,reason:text(req.body.reason||req.body.text),before:beforeException,after:o});o.version=(o.version||0)+1;req.save();res.json(req.view());
});
// Synchronous business mutations must release their transaction before leaving
// this router: Express can yield between routers while other requests arrive.
business.use((req,res,next)=>{req.rollback?.();next()});
business.use((error,req,res,next)=>{req.rollback?.();next(error)});
app.use('/api',business);
app.use('/api',(req,res)=>res.status(404).json({error:'Không tìm thấy chức năng.'}));
app.use(express.static(path.join(root,'dist')));
app.get('/{*path}',(req,res)=>res.sendFile(path.join(root,'dist/index.html')));
app.use((err,req,res,next)=>{if(!err.status)console.error('Request failed:',err.message);res.status(err.status||500).json({...(err.fields?{fields:err.fields}:{}),error:err.status===413?'Tổng dung lượng yêu cầu quá lớn. Giảm số tệp đính kèm.':err.status?err.message:'Không thể lưu dữ liệu lúc này. Vui lòng thử lại.'})});
app.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('HQ Hair demo ready'));
