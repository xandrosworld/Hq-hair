// Production only: development retains the isolated demo and Vite HMR.
export function publicSecurity(req,res,next){
 if(process.env.NODE_ENV==='production'){
  res.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob: data:; object-src 'none'; frame-src 'self' blob:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  if(req.secure)res.set('Strict-Transport-Security','max-age=31536000');
  if(!req.path.startsWith('/assets/'))res.set('Cache-Control','no-store');
 }
 next();
}
export function productionBoundary(req,res,next){
 if(process.env.NODE_ENV!=='production')return next();
 if(req.path==='/api'||(req.path.startsWith('/api/')&&!req.path.startsWith('/api/work/')))return res.status(404).json({error:'Không tìm thấy chức năng.'});
 if(!req.path.startsWith('/api/')&&!req.path.startsWith('/workspace')&&!req.path.startsWith('/assets/')&&!['/robots.txt','/favicon.svg'].includes(req.path))return res.redirect(302,'/workspace');
 next();
}
