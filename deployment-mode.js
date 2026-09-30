import {readFileSync} from 'node:fs';
import path from 'node:path';

// Operator-owned flag on the source host. Never included in database transfers.
export function deploymentGate(dataDir){
 return (req,res,next)=>{
  if(req.path==='/api/health')return next();
  let mode;
  try{mode=JSON.parse(readFileSync(path.join(dataDir,'deployment-mode.json'),'utf8'))}
  catch(e){if(e.code==='ENOENT')return next();return res.status(503).send('Hệ thống đang được bảo trì. Vui lòng thử lại sau.')}
  if(!['maintenance','redirect'].includes(mode.mode))return next();
  res.set('Cache-Control','no-store');
  if(mode.mode==='redirect'&&['GET','HEAD'].includes(req.method)&&typeof mode.target==='string'){
   const target=new URL(mode.target);
   if(target.protocol==='https:')return res.redirect(302,target.origin+(req.originalUrl.startsWith('/')?req.originalUrl:'/'));
  }
  res.set('Retry-After','60');
  if(req.path.startsWith('/api/'))return res.status(503).json({error:'Hệ thống đang chuyển máy chủ. Nội dung chưa gửi cần được giữ lại; vui lòng tải lại trang sau ít phút.'});
  res.status(503).type('html').send('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>HQ Hair — Đang chuyển máy chủ</title><body style="font-family:system-ui;max-width:600px;margin:15vh auto;padding:24px"><h1>HQ Hair</h1><p>Hệ thống đang chuyển sang máy chủ mới. Vui lòng quay lại sau ít phút.</p></body></html>');
 };
}
