import React,{useEffect,useRef,useState} from 'react';
import {workspaceAPI} from './workspace-api.js';
import './session-lock.css';
import {endDraftSession} from './draft-storage.js';

export function SessionLock({auth,onLogout,children}){
 const [locked,setLocked]=useState(!!auth.locked),[mounted,setMounted]=useState(!auth.locked),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const state=useRef({locked:!!auth.locked,lockAt:0,expiresAt:0,lastSent:0}),field=useRef(null);
 useEffect(()=>{
  let alive=true,checking=false;
  const apply=data=>{if(!alive||!data?.lockAt)return;if(data.user&&(data.user.id!==auth.user.id||data.user.role!==auth.user.role)){endDraftSession();window.dispatchEvent(new Event('hq-session-ended'));return;}const now=Date.now();Object.assign(state.current,{locked:!!data.locked,lockAt:now+data.lockAt-data.serverNow,expiresAt:now+data.expiresAt-data.serverNow});setLocked(!!data.locked);if(!data.locked)setMounted(true)};
  apply(auth);
  const sync=async()=>{if(checking)return;checking=true;try{apply(await workspaceAPI('/me'))}catch(e){if(e.status===401)window.dispatchEvent(new Event('hq-session-ended'))}finally{checking=false}};
  const update=e=>apply(e.detail);
  const lock=()=>{if(state.current.locked)return;state.current.locked=true;setLocked(true);setPassword('')};
  const check=()=>{const s=state.current;if(Date.now()>=s.expiresAt){lock();endDraftSession();window.dispatchEvent(new Event('hq-session-ended'))}else if(!s.locked&&Date.now()>=s.lockAt){lock();sync()}};
  const activity=e=>{
   if(!e.isTrusted||document.visibilityState!=='visible')return;
   const s=state.current;if(s.locked||Date.now()>=s.lockAt){check();return}
   if(Date.now()-s.lastSent<30000)return;s.lastSent=Date.now();
   workspaceAPI('/activity',{}).then(apply).catch(()=>{});
  };
  const resume=()=>{check();sync()};
  const events=['pointerdown','pointermove','keydown','wheel','touchstart'];
  events.forEach(name=>window.addEventListener(name,activity,{passive:true}));
  window.addEventListener('hq-session-update',update);window.addEventListener('hq-session-locked',lock);window.addEventListener('hq-session-sync',sync);
  window.addEventListener('focus',resume);document.addEventListener('visibilitychange',resume);
  const timer=setInterval(check,1000),poll=setInterval(sync,30000);
  return()=>{alive=false;clearInterval(timer);clearInterval(poll);events.forEach(name=>window.removeEventListener(name,activity));window.removeEventListener('hq-session-update',update);window.removeEventListener('hq-session-locked',lock);window.removeEventListener('hq-session-sync',sync);window.removeEventListener('focus',resume);document.removeEventListener('visibilitychange',resume)};
 },[auth]);
 useEffect(()=>{
  if(!locked){setError('');setPassword('');return}
  const previous=document.activeElement;document.body.classList.add('hq-session-is-locked');
  const portals=new Map(),hidePortals=()=>{for(const node of document.body.children)if(node.id!=='root'&&!portals.has(node)){portals.set(node,node.inert);node.inert=true}};
  hidePortals();const observer=new MutationObserver(hidePortals);observer.observe(document.body,{childList:true});field.current?.focus();
  const trap=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation()}else if(e.key==='Tab'){e.stopImmediatePropagation();const controls=[...document.querySelectorAll('.hq-session-card input:not(:disabled),.hq-session-card button:not(:disabled)')],first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};
  document.addEventListener('keydown',trap,true);
  return()=>{observer.disconnect();document.removeEventListener('keydown',trap,true);document.body.classList.remove('hq-session-is-locked');for(const [node,inert] of portals)node.inert=inert;if(previous?.isConnected)previous.focus()};
 },[locked]);
 const unlock=async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{await workspaceAPI('/unlock',{password});setPassword('')}catch(e){setError(e.message);setPassword('')}finally{setBusy(false)}};
 return <><div hidden={locked} inert={locked} aria-hidden={locked?true:undefined}>{mounted&&children}</div>{locked&&<div className="hq-session-lock" role="dialog" aria-modal="true" aria-labelledby="session-lock-title"><form onSubmit={unlock} className="hq-session-card"><span className="hq-session-brand">HQ HAIR</span><h1 id="session-lock-title">Không gian đã khóa</h1><p>Chào {auth.user.name}. Nhập mật khẩu để tiếp tục công việc.</p><p className="hq-session-note">Tự khóa sau 1 giờ không thao tác. Sau 5 giờ không hoạt động, bạn cần đăng nhập lại.</p><label htmlFor="session-password">Mật khẩu</label><input ref={field} id="session-password" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/>{error&&<p className="hq-session-error" role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy?'Đang xác nhận…':'Mở khóa và tiếp tục'}</button><button type="button" className="hq-session-exit" disabled={busy} onClick={async()=>{setBusy(true);try{await onLogout()}catch(e){setError(e.message);setBusy(false)}}}>Đăng xuất / đổi tài khoản</button></form></div>}</>;
}
