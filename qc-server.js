import {assertQCWrite,qcMedia,saveQC} from './quality-control.js';

export function setupQC(db){db.exec('CREATE TABLE IF NOT EXISTS qc_media(id TEXT PRIMARY KEY,data BLOB NOT NULL,mime TEXT NOT NULL)')}
export function qcRoutes(router){
 router.get('/orders/:id/qc-media/:mediaId',(req,res)=>{
  const o=req.data.orders.find(o=>o.id===req.params.id);req.assertAccess(o);
  if(!o?.qcMedia?.some(m=>m.id===req.params.mediaId))return res.status(404).end();
  const file=req.imageDb.prepare('SELECT * FROM qc_media WHERE id=?').get(req.params.mediaId);
  if(!file)return res.status(404).end();
  const bytes=Buffer.from(file.data);
  res.set({'Content-Type':file.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Accept-Ranges':'bytes'});
  if(req.headers.range){
   const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range),start=match?Number(match[1]):-1,end=match&&match[2]?Math.min(Number(match[2]),bytes.length-1):bytes.length-1;
   if(start<0||start>=bytes.length||end<start)return res.status(416).set('Content-Range',`bytes */${bytes.length}`).end();
   return res.status(206).set('Content-Range',`bytes ${start}-${end}/${bytes.length}`).send(bytes.subarray(start,end+1));
  }
  res.send(bytes);
 });
 router.post('/orders/:id/qc-upload',(req,res)=>{
  const o=req.data.orders.find(o=>o.id===req.params.id);req.assertAccess(o);if(!o)return res.status(404).json({error:'Order not found'});req.assertVersion(o);
  assertQCWrite(o,req.user,req.body);
  const file=qcMedia(req.body.file),files=o.qcMedia||[];
  if(files.length>=200||files.reduce((n,m)=>n+m.size,0)+file.size>200*1024*1024)throw Object.assign(Error('Phiếu đã đạt giới hạn 200 tệp hoặc 200 MiB.'),{status:400});
  req.imageDb.prepare('INSERT INTO qc_media VALUES(?,?,?)').run(file.id,file.bytes,file.mime);
  const {bytes,...metadata}=file;o.qcMedia=[...files,metadata];o.version=(o.version||0)+1;
  req.recordAudit?.('qc-upload',o.id,{media:metadata});req.save();res.json(req.view());
 });
 router.post('/orders/:id/qc',(req,res)=>{
  const o=req.data.orders.find(o=>o.id===req.params.id);req.assertAccess(o);if(!o)return res.status(404).json({error:'Order not found'});req.assertVersion(o);
  const before=o.qc||null,next=saveQC(o,req.user,req.body);o.qc=next;o.version=(o.version||0)+1;
  o.history.push({title:next.completedAt?'Hoàn tất QC':'Lưu phiếu kiểm định',actor:req.user.name,actorId:req.user.id,time:next.updatedAt,note:req.body.reason||''});
  req.recordAudit?.('qc-save',o.id,{before,after:next,reason:req.body.reason||''});req.save();res.json(req.view());
 });
}
