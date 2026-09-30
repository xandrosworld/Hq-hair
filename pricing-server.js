import {readFileSync} from 'node:fs';
import {migrateBrightColors} from './color-confirmations.js';
import {fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {highestTone,adjustedPrice,matchingPrices,toneNames} from './pricing-domain.js';
const seed=JSON.parse(readFileSync(new URL('./resources/pricing-seed.json',import.meta.url),'utf8'));
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
export function setupPricing(router,db,audit){
 db.exec(`CREATE TABLE IF NOT EXISTS pricing(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS pricing_history(id TEXT PRIMARY KEY,time TEXT NOT NULL,actor TEXT NOT NULL,actor_name TEXT NOT NULL,details TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS pricing_requests(user_id TEXT NOT NULL,key TEXT NOT NULL,hash TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(user_id,key));`);
 for(const column of ['price_edit','color_edit'])if(!db.prepare('PRAGMA table_info(users)').all().some(c=>c.name===column))db.exec(`ALTER TABLE users ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 0`);
 db.prepare('INSERT OR IGNORE INTO pricing VALUES(1,?)').run(JSON.stringify(seed));
 migrateBrightColors(db,audit);
 const read=()=>JSON.parse(db.prepare('SELECT data FROM pricing WHERE id=1').get().data);
 const can=(u,key)=>u.role==='manager'||(u.role==='sale'&&!!u[key]);
 const view=u=>({...read(),canEditPrices:can(u,'price_edit'),canEditColors:can(u,'color_edit')});
 router.use('/pricing',(req,res,next)=>['manager','sale'].includes(req.user.role)?next():res.status(403).json({error:'Bảng giá dành cho kinh doanh và quản trị.'}));
 router.get('/pricing',(req,res)=>res.json(view(req.user)));
 router.get('/pricing/images/:id',(req,res)=>{const id=req.params.id;if(!seed.colors.some(c=>c.images.some(i=>i.id===id)))return res.status(404).end();res.type('webp').sendFile(fileURLToPath(new URL('./resources/color-images/'+id+'.webp',import.meta.url)))});
 router.get('/pricing/history',(req,res)=>{if(!can(req.user,'price_edit'))fail(403,'Bạn chưa được cấp quyền quản lý giá.');res.json(db.prepare('SELECT * FROM pricing_history ORDER BY rowid DESC LIMIT 50').all().map(h=>{const d=JSON.parse(h.details);return {id:h.id,time:h.time,actor:h.actor_name,...d,changes:d.changes.map(c=>({id:c.id,before:c.before,after:c.after}))}}))});
 router.post('/pricing/permissions/:id',(req,res)=>{
  if(req.user.role!=='manager')fail(403,'Chỉ quản trị được cấp quyền.');
  const u=db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);if(!u||u.role!=='sale')fail(400,'Chọn tài khoản kinh doanh.');
  if(typeof req.body.priceEdit!=='boolean'||typeof req.body.colorEdit!=='boolean')fail(400,'Quyền không hợp lệ.');
  db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE users SET price_edit=?,color_edit=? WHERE id=?').run(+req.body.priceEdit,+req.body.colorEdit,u.id);audit(req.user,'pricing-permissions',u.id,{before:{priceEdit:!!u.price_edit,colorEdit:!!u.color_edit},after:req.body});db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}res.json({ok:true});
 });
 function adjustment(data,b){
  if(b.version!==data.version)fail(409,'Bảng giá đã thay đổi. Tải lại và xem trước lần nữa.');
  const percent=b.percent;if(typeof percent!=='number'||!Number.isFinite(percent)||percent<=-100||percent>1000||percent===0)fail(400,'Nhập tỷ lệ khác 0, lớn hơn -100% và không quá 1.000%.');
  if(Math.abs(percent*100-Math.round(percent*100))>0.0000001)fail(400,'Tỷ lệ điều chỉnh tối đa hai chữ số thập phân.');
  const scope=b.scope||{};if(Object.keys(scope).some(k=>!['tier','product','tone'].includes(k)))fail(400,'Phạm vi không hợp lệ.');
  const selected=matchingPrices(data.prices,scope);if(!selected.length)fail(400,'Không có giá trong phạm vi đã chọn.');
  const changes=selected.map(p=>({id:p.id,before:p.price,after:adjustedPrice(p.price,percent)}));
  if(changes.some(c=>c.after<=0||c.after>100000))fail(400,'Giá sau điều chỉnh phải lớn hơn 0 và không quá 100.000 USD.');
  return {percent,scope,changes};
 }
 router.post('/pricing/preview',(req,res)=>{if(!can(req.user,'price_edit'))fail(403,'Bạn chưa được cấp quyền quản lý giá.');res.json(adjustment(read(),req.body))});
 function write(req,res,permission,fn){
  if(!can(req.user,permission))fail(403,'Bạn chưa được cấp quyền thực hiện thao tác này.');
  const key=req.get('Idempotency-Key');if(!key||!/^[\w-]{16,100}$/.test(key))fail(400,'Thiếu mã thao tác.');
  const hash=createHash('sha256').update(req.path+JSON.stringify(req.body)).digest('hex');
  const prior=db.prepare('SELECT * FROM pricing_requests WHERE user_id=? AND key=?').get(req.user.id,key);
  if(prior){if(prior.hash!==hash)fail(409,'Mã thao tác đã được sử dụng.');return res.json(view(req.user))}
  db.exec('BEGIN IMMEDIATE');try{const data=read();if(req.body.version!==data.version)fail(409,'Danh mục đã thay đổi. Tải lại trước khi tiếp tục.');fn(data);data.version++;db.prepare('UPDATE pricing SET data=? WHERE id=1').run(JSON.stringify(data));db.prepare('INSERT INTO pricing_requests VALUES(?,?,?,?)').run(req.user.id,key,hash,'{}');db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}res.json(view(req.user));
 }
 router.post('/pricing/adjust',(req,res)=>write(req,res,'price_edit',data=>{
  const change=adjustment(data,req.body);const map=new Map(change.changes.map(c=>[c.id,c.after]));for(const p of data.prices)if(map.has(p.id))p.price=map.get(p.id);
  const id=randomUUID();db.prepare('INSERT INTO pricing_history VALUES(?,?,?,?,?)').run(id,new Date().toISOString(),req.user.id,req.user.name,JSON.stringify({...change,version:data.version+1,kind:'adjust'}));audit(req.user,'price-adjust',id,{percent:change.percent,scope:change.scope,count:change.changes.length});
 }));
 router.post('/pricing/restore',(req,res)=>write(req,res,'price_edit',data=>{
  const last=db.prepare('SELECT * FROM pricing_history ORDER BY rowid DESC LIMIT 1').get();if(!last||last.id!==req.body.historyId)fail(409,'Chỉ khôi phục lần điều chỉnh giá gần nhất.');const old=JSON.parse(last.details);if(old.kind!=='adjust')fail(400,'Lần điều chỉnh đã được khôi phục.');
  const changes=old.changes.map(c=>({id:c.id,before:c.after,after:c.before}));for(const c of changes){const p=data.prices.find(p=>p.id===c.id);if(!p||p.price!==c.before)fail(409,'Giá đã thay đổi. Không thể khôi phục.');p.price=c.after}
  const id=randomUUID();db.prepare('INSERT INTO pricing_history VALUES(?,?,?,?,?)').run(id,new Date().toISOString(),req.user.id,req.user.name,JSON.stringify({kind:'restore',restored:last.id,version:data.version+1,changes}));audit(req.user,'price-restore',id,{restored:last.id});
 }));
 router.post('/pricing/colors',(req,res)=>write(req,res,'color_edit',data=>{
  const b=req.body,code=String(b.code||'').trim(),category=b.category;
  if(!code||code.length>120||!['Black','Brown','Blonde','Other','Ombre','Piano','Balayage'].includes(category))fail(400,'Kiểm tra mã và loại màu.');
  const existing=b.id&&data.colors.find(c=>c.id===b.id);if(b.id&&!existing)fail(404,'Không tìm thấy màu.');
  if(data.colors.some(c=>c.id!==b.id&&c.code.toLowerCase()===code.toLowerCase()))fail(400,'Mã màu đã có trong danh mục.');
  const components=Array.isArray(b.components)?[...new Set(b.components)]:[];
  const mix=['Ombre','Piano','Balayage'].includes(category);
  if(mix&&components.length<2)fail(400,'Màu phối cần ít nhất hai màu thành phần.');
  if(mix&&existing&&data.colors.some(c=>c.components?.includes(existing.id)))fail(400,'Màu đang được dùng làm thành phần. Giữ loại màu đơn hoặc tạo mẫu phối mới.');
  if(components.length>20||components.some(id=>id===b.id||!data.colors.some(c=>c.id===id&&c.tone&&!['Ombre','Piano','Balayage'].includes(c.category))))fail(400,'Chọn màu đơn đã xác định tông.');
  const tone=mix?highestTone(components.map(id=>data.colors.find(c=>c.id===id).tone)):({Black:'black',Brown:'brown',Blonde:'blonde',Other:'blonde'})[category];
  if(!tone||!Object.hasOwn(toneNames,tone))fail(400,'Chọn các màu thành phần để xác định tông giá.');
  const color={id:existing?.id||randomUUID(),code,category,tone,components,images:existing?.images||[],note:String(b.note||'').trim().slice(0,1000),unlistedComponents:[]};
  if(existing)Object.assign(existing,color);else data.colors.push(color);
  // Refresh dependent mixes when a base color is corrected; preserve unresolved source components.
  for(const c of data.colors){
   if(!mix&&c.unlistedComponents?.some(code=>code.toUpperCase()===color.code.replace(/^#/,'').toUpperCase())){c.components=[...new Set([...c.components,color.id])];c.unlistedComponents=c.unlistedComponents.filter(code=>code.toUpperCase()!==color.code.replace(/^#/,'').toUpperCase())}
   if(c.components?.includes(color.id)){const tones=c.components.map(id=>data.colors.find(x=>x.id===id)?.tone);c.tone=tones.includes('blonde')?'blonde':c.unlistedComponents?.length?null:highestTone(tones)}
  }
  audit(req.user,'color-save',color.id,{code,tone,components});
 }));
}
