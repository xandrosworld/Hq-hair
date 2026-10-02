import {fileURLToPath} from 'node:url';
import path from 'node:path';
const directory=path.resolve(process.env.HQ_STANDARDS_DIR||path.join(process.env.DATA_DIR||fileURLToPath(new URL('./data/',import.meta.url)),'product-standards'));
export function setupStandards(router){
 router.get('/product-standards/:file',(req,res)=>{
  if(!['sale','sales_lead','manager'].includes(req.user.role))return res.status(403).json({error:'Tài liệu dành cho bộ phận kinh doanh.'});
  const file=req.params.file;
  if(file!=='original.pdf'&&!/^page-(?:[1-9]|1[0-4])\.webp$/.test(file))return res.status(404).json({error:'Không tìm thấy trang tài liệu.'});
  res.set('Cache-Control','private, no-store');
  if(file==='original.pdf'&&req.query.download==='1')return res.download(path.join(directory,file),'Bang-quy-chuan-san-pham.pdf');
  res.sendFile(path.join(directory,file),{cacheControl:false});
 });
}
