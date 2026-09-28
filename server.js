import express from 'express';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {seed} from './seed.js';
import {totals,groups,countries} from './shared.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const dir=process.env.DATA_DIR||path.join(root,'data');mkdirSync(dir,{recursive:true});
const db=new DatabaseSync(path.join(dir,'demo.sqlite'));db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated INTEGER NOT NULL)');
const app=express();app.disable('x-powered-by');app.set('trust proxy',1);
app.use((req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'same-origin','X-Robots-Tag':'noindex, nofollow'});next()});
app.get('/api/health',(req,res)=>res.json({ok:true}));
app.use('/api',express.json({limit:'3mb'}));
app.use('/api',(req,res,next)=>{
 if(req.method!=='GET' && req.get('origin') && new URL(req.get('origin')).host!==req.get('host'))return res.status(403).json({error:'Yêu cầu không hợp lệ.'});
 let id=req.headers.cookie?.match(/(?:^|; )hq_demo=([a-f0-9-]{36})(?:;|$)/)?.[1];
 let row=id?db.prepare('SELECT data FROM sessions WHERE id=?').get(id):null;
 if(!row){id=randomUUID();row={data:JSON.stringify(seed())};db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(id,row.data,Date.now());res.cookie('hq_demo',id,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:30*86400000})}
 req.data=JSON.parse(row.data);req.save=()=>db.prepare('UPDATE sessions SET data=?,updated=? WHERE id=?').run(JSON.stringify(req.data),Date.now(),id);res.set('Cache-Control','no-store');next();
});
const fail=(message)=>{const e=new Error(message);e.status=400;throw e};
const text=(v,max=1000)=>typeof v==='string'?v.trim().slice(0,max):'';
const num=(v,max=10000000)=>{const n=Number(v);if(!Number.isFinite(n)||n<0||n>max)fail('Số tiền hoặc số lượng không hợp lệ.');return n};
const event=(o,title,note='')=>o.history.push({title,note,actor:'Judy · Sale',time:new Date().toISOString()});
app.get('/api/state',(req,res)=>res.json(req.data));
app.post('/api/reset',(req,res)=>{req.data=seed();req.save();res.json(req.data)});
app.post('/api/customers',(req,res)=>{
 const b=req.body;const c={};for(const k of ['name','company','phone','email','country','group','address','recipient','recipientPhone','social','source','purchase'])c[k]=text(b[k]);
 if(!c.name||!c.phone||!c.address||!c.recipient||!c.recipientPhone||!c.social||!c.source||!c.purchase||!groups.includes(c.group)||!countries.includes(c.country))fail('Vui lòng điền đủ thông tin khách hàng và giao hàng bắt buộc.');
 if(c.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))fail('Email chưa đúng định dạng.');
 if(req.data.customers.length>=200)fail('Bản demo hỗ trợ tối đa 200 khách hàng.');
 const existing=req.data.customers.find(x=>x.id===b.id);
 if(existing)Object.assign(existing,c);else req.data.customers.push({...c,id:`HQ-JD-${Math.max(0,...req.data.customers.map(x=>Number(x.id.split('-').at(-1))))+1}`,sale:'Judy',created:new Date().toISOString().slice(0,10)});
 req.save();res.json(req.data);
});
function cleanPayment(p){
 const result={id:randomUUID(),sender:text(p.sender),method:text(p.method),date:text(p.date),reference:text(p.reference),amount:num(p.amount),confirmed:false};
 if(result.amount<=0||!result.sender||!result.method||!/^\d{4}-\d{2}-\d{2}$/.test(result.date)||!Number.isFinite(Date.parse(result.date)))fail('Lần thanh toán cần người gửi, ngày gửi và số tiền lớn hơn 0.');
 if(p.file){if(!/^data:(image\/(png|jpeg|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(p.file)||p.file.length>1500000)fail('Chứng từ chỉ nhận PNG, JPG, WebP hoặc PDF tối đa 1 MB.');result.file=p.file;result.fileName=text(p.fileName,120)}
 return result;
}
app.post('/api/orders',(req,res)=>{
 const b=req.body;const old=req.data.orders.find(o=>o.id===b.id);
 if(b.id&&!old)fail('Không tìm thấy đơn hàng.');if(old?.stage)fail('Đơn đã gửi duyệt đã bị khóa. Vui lòng gửi yêu cầu chỉnh sửa.');
 const c=req.data.customers.find(c=>c.id===b.customerId);if(!c)fail('Vui lòng chọn khách hàng.');
 if(old&&old.customerId!==c.id)fail('Không thể đổi khách hàng của đơn đã lưu.');
 const o={customerId:c.id,sale:'Judy',stage:0};
 for(const k of ['date','due','recipient','phone','email','address','country','carrier','service','tracking','note'])o[k]=text(b[k]);
 for(const k of ['discount','shippingFee','paymentFee'])o[k]=num(b[k]);
 if(!Array.isArray(b.items)||b.items.length>50)fail('Danh sách sản phẩm không hợp lệ.');
 o.items=b.items.map(i=>({name:text(i.name,120),spec:text(i.spec,200),unit:text(i.unit,30),kind:['base','extra','gift'].includes(i.kind)?i.kind:'base',qty:num(i.qty,100000),price:i.kind==='gift'?0:num(i.price,100000)}));
 o.payments=(old?.payments||[]).filter(p=>p.confirmed).concat((b.payments||[]).filter(p=>!p.confirmed).slice(0,20).map(cleanPayment));
 if(totals(o).revenue<0)fail('Giảm giá không được vượt tổng giá sản phẩm.');
 if(b.submit){
  if(!o.date||!o.due||!Number.isFinite(Date.parse(o.date))||!Number.isFinite(Date.parse(o.due))||o.due<o.date||!o.recipient||!o.phone||!o.address||!o.country||!o.items.some(i=>i.kind==='base'&&i.qty>0)||o.items.some(i=>!i.name||i.qty<=0))fail('Kiểm tra sản phẩm, ngày giao và thông tin người nhận trước khi gửi duyệt.');
  o.stage=2;
 }
 o.id=old?.id||`${c.id}-${Math.max(0,...req.data.orders.filter(o=>o.customerId===c.id).map(o=>Number(o.id.split('-').at(-1))))+1}`;
 o.messages=old?.messages||[];o.history=old?.history||[];
 event(o,old?'Cập nhật bản nháp':'Nhập đơn');if(b.submit)event(o,'Chờ duyệt','Đã chuyển yêu cầu đến Kế toán. Đơn được khóa chỉnh sửa.');
 if(old)Object.assign(old,o);else {if(req.data.orders.length>=300)fail('Bản demo hỗ trợ tối đa 300 đơn.');req.data.orders.unshift(o)}
 req.save();res.json({state:req.data,id:o.id});
});
app.post('/api/orders/:id/action',(req,res)=>{
 const o=req.data.orders.find(o=>o.id===req.params.id);if(!o)fail('Không tìm thấy đơn hàng.');const {action}=req.body;
 if(action==='delete'){if(o.stage)fail('Chỉ xóa được bản nháp.');req.data.orders=req.data.orders.filter(x=>x.id!==o.id)}
 else if(action==='message'){const t=text(req.body.text);if(!t)fail('Nhập nội dung trao đổi.');if(o.messages.length>=200)fail('Đã đạt giới hạn tin nhắn demo.');o.messages.push({id:randomUUID(),text:t,author:'Judy · Sale',time:new Date().toISOString()})}
 else if(action==='edit-request'){if(!o.stage)fail('Bản nháp được chỉnh sửa trực tiếp.');const reason=text(req.body.text);if(!reason)fail('Vui lòng ghi lý do chỉnh sửa.');o.editRequested=true;event(o,'Yêu cầu chỉnh sửa',reason)}
 else if(action==='payment'){if(!o.stage)fail('Thêm thanh toán trong form bản nháp.');if(o.payments.length>=20)fail('Đã đạt giới hạn thanh toán demo.');o.payments.push(cleanPayment(req.body.payment));event(o,'Bổ sung chứng từ','Chờ Kế toán đối soát; chưa cộng vào tiền thực nhận.')}
 else if(action==='accept'){if(o.stage!==5)fail('Đơn chưa đến bước Sale tiếp nhận.');o.stage=6;event(o,'Sale tiếp nhận','Đã kiểm tra và xác nhận gửi đến văn phòng.');event(o,'Gửi đến văn phòng')}
 else if(action==='rework'){if(o.stage!==5)fail('Đơn chưa đến bước Sale tiếp nhận.');const reason=text(req.body.text);if(!reason)fail('Nhập yêu cầu sửa lại.');o.stage=4;event(o,'Yêu cầu xưởng sửa lại',reason)}
 else fail('Thao tác không được hỗ trợ.');req.save();res.json(req.data);
});
app.use('/api',(req,res)=>res.status(404).json({error:'Không tìm thấy chức năng.'}));
app.use(express.static(path.join(root,'dist')));
app.get('/{*path}',(req,res)=>res.sendFile(path.join(root,'dist/index.html')));
app.use((err,req,res,next)=>res.status(err.status||500).json({error:err.status?err.message:'Không thể lưu dữ liệu lúc này. Vui lòng thử lại.'}));
app.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('HQ Hair demo ready'));
