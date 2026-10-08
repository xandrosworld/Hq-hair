import React,{useEffect,useRef,useState} from 'react';
export function MobileNavigation(){
 const [open,setOpen]=useState(false),button=useRef(null);
 useEffect(()=>{
  const sidebar=document.querySelector('.sidebar'),media=matchMedia('(max-width: 1119px)');
  const sync=()=>{sidebar?.classList.toggle('mobile-open',open&&media.matches);if(sidebar)sidebar.inert=media.matches&&!open;document.body.classList.toggle('mobile-menu-open',open&&media.matches)};
  const close=e=>{if(e.type==='keydown'&&e.key!=='Escape')return;if(e.type==='click'&&!e.target.closest('button,a'))return;setOpen(false);if(e.type==='keydown')button.current?.focus()};
  sync();media.addEventListener('change',sync);sidebar?.addEventListener('click',close);document.addEventListener('keydown',close);
  return()=>{media.removeEventListener('change',sync);sidebar?.removeEventListener('click',close);document.removeEventListener('keydown',close);document.body.classList.remove('mobile-menu-open');if(sidebar)sidebar.inert=false};
 },[open]);
 return <><button ref={button} className="mobile-menu-toggle" aria-label={open?'Đóng menu':'Mở menu'} aria-expanded={open} aria-controls="workspace-navigation" onClick={()=>setOpen(v=>!v)}>{open?'✕':'☰'}</button>{open&&<button className="mobile-menu-backdrop" aria-label="Đóng menu điều hướng" onClick={()=>setOpen(false)}/>}</>;
}
