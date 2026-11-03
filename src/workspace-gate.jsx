import {SessionLock} from './session-lock.jsx';
import React,{useState,useEffect,useId} from 'react';
import {ArrowRight,ShieldCheck,User,LockKey,Eye,EyeSlash,Question,WarningCircle,SpinnerGap} from '@phosphor-icons/react';
import {workspaceAPI} from './workspace-api.js';
import './login.css';

function Brand({compact=false}){
 return <div className={'hq-login-brand'+(compact?' is-compact':'')} aria-label="HQ Hair"><span className="hq-login-monogram">HQ</span><span className="hq-login-wordmark">HQ HAIR<small>KHÔNG GIAN KINH DOANH</small></span></div>;
}
function PasswordField({label,value,onChange,autoComplete='current-password',minLength,disabled}){
 const [visible,setVisible]=useState(false),[caps,setCaps]=useState(false),id=useId();
 return <div className="hq-login-field"><label htmlFor={id}>{label}</label><div className="hq-login-input"><LockKey size={20} aria-hidden="true"/><input id={id} type={visible?'text':'password'} required minLength={minLength} maxLength={128} autoComplete={autoComplete} value={value} onChange={onChange} disabled={disabled} placeholder={autoComplete==='new-password'?'Tối thiểu 12 ký tự':'Nhập mật khẩu của bạn'} onKeyUp={e=>setCaps(e.getModifierState('CapsLock'))} onBlur={()=>setCaps(false)}/><button className="hq-password-toggle" type="button" aria-label={(visible?'Ẩn':'Hiện')+' '+label.toLowerCase()} aria-pressed={visible} onClick={()=>setVisible(v=>!v)} disabled={disabled}>{visible?<EyeSlash size={20}/>:<Eye size={20}/>}</button></div>{caps&&<small className="hq-caps-notice" role="status">Caps Lock đang bật.</small>}</div>;
}
export function WorkspaceGate({children}){
 const [auth,setAuth]=useState(undefined),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[help,setHelp]=useState(false);
 const usernameId=useId(),helpId=useId();
 useEffect(()=>{let active=true;workspaceAPI('/me').then(value=>{if(active)setAuth(value)}).catch(()=>{if(active)setAuth(null)});const ended=()=>{setAuth(null);setError('Phiên đã kết thúc. Vui lòng đăng nhập lại.')};window.addEventListener('hq-session-ended',ended);return()=>{active=false;window.removeEventListener('hq-session-ended',ended)}},[]);
 const submit=async e=>{e.preventDefault();if(busy)return;setError('');setBusy(true);try{if(auth?.user.mustChange&&newPassword!==confirm)throw Error('Mật khẩu xác nhận chưa trùng khớp.');setAuth(await workspaceAPI(auth?.user.mustChange?'/password':'/login',auth?.user.mustChange?{currentPassword:password,password:newPassword}:{email,password}));setPassword('');setNewPassword('');setConfirm('');setHelp(false)}catch(e){setError(e.message)}finally{setBusy(false)}};
 if(auth===undefined)return <div className="hq-auth-loading" role="status"><Brand/><span className="hq-auth-loading-line"/><p>Đang mở không gian làm việc…</p></div>;
 if(auth&&!auth.user.mustChange){const logout=async()=>{await workspaceAPI('/logout',{});setAuth(null)};return <SessionLock auth={auth} onLogout={logout}>{children(auth.user,logout)}</SessionLock>}
 const login=<main className="hq-login">
  <section className="hq-login-visual" aria-label="HQ Hair">
   <picture className="hq-login-photo"><source media="(max-width: 760px)" srcSet="/assets/login/hq-hair-editorial-mobile.webp"/><img src="/assets/login/hq-hair-editorial.webp" alt="Mái tóc nâu dài với những lọn sóng mềm trong ánh sáng ấm" width="1122" height="1402" fetchPriority="high" decoding="async"/></picture>
   <div className="hq-login-shade"/>
   <div className="hq-login-visual-top"><Brand/></div>
   <div className="hq-login-story"><span className="hq-login-story-line"/><h1>Chất lượng từ<br/><span>từng chi tiết.</span></h1><p>Cùng HQ Hair chăm chút từng đơn hàng.</p></div>
  </section>
  <section className={'hq-login-panel'+(auth?' is-setup':'')} aria-labelledby="hq-login-title">
   <header className="hq-login-panel-header"><span className="hq-workspace-symbol"><ShieldCheck size={19} weight="regular"/></span><span>KHÔNG GIAN LÀM VIỆC</span></header>
   <div className="hq-login-form-wrap">
    <div className="hq-login-intro"><span className="hq-login-welcome">DÀNH RIÊNG CHO ĐỘI NGŨ HQ HAIR</span><h2 id="hq-login-title">{auth?<>Khởi đầu <br/>an tâm.</>:<>Chào mừng <br/>trở lại.</>}</h2><p>{auth?'Đặt mật khẩu riêng để bắt đầu công việc.':'Đăng nhập để tiếp tục công việc của bạn.'}</p></div>
    <form onSubmit={submit} className="hq-login-form" aria-busy={busy}>
     {!auth&&<div className="hq-login-field"><label htmlFor={usernameId}>Email hoặc tên đăng nhập</label><div className="hq-login-input"><User size={20} aria-hidden="true"/><input id={usernameId} type="text" required autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email hoặc tên đăng nhập của bạn" disabled={busy}/></div></div>}
     <PasswordField label={auth?'Mật khẩu ban đầu':'Mật khẩu'} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/>
     {auth&&<><PasswordField label="Mật khẩu mới · tối thiểu 12 ký tự" value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password" minLength={12} disabled={busy}/><PasswordField label="Nhập lại mật khẩu mới" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" minLength={12} disabled={busy}/></>}
     {!auth&&<div className="hq-login-assistance"><button type="button" aria-expanded={help} aria-controls={helpId} onClick={()=>setHelp(v=>!v)}>Quên mật khẩu?<Question size={15}/></button></div>}
     {help&&<div id={helpId} className="hq-login-help" role="region" aria-label="Hướng dẫn lấy lại mật khẩu">Liên hệ quản lý HQ Hair để được cấp lại mật khẩu. Bạn sẽ đặt mật khẩu mới khi đăng nhập lại.</div>}
     {error&&<div className="hq-login-error" role="alert"><WarningCircle size={19}/><span>{error}</span></div>}
     <button className="hq-login-submit" type="submit" disabled={busy}><span>{busy?(auth?'Đang lưu mật khẩu…':'Đang đăng nhập…'):auth?'Lưu mật khẩu & tiếp tục':'Vào không gian làm việc'}</span>{busy?<SpinnerGap className="hq-login-spinner" size={21}/>:<ArrowRight size={21}/>}</button>
    </form>
    <div className="hq-login-private"><LockKey size={15}/><span>Tài khoản riêng. Không gian chung.</span></div>
   </div>
   <footer className="hq-login-footer"><span>© {new Date().getFullYear()} HQ Hair</span><span>Kết nối để cùng phát triển.</span></footer>
  </section>
 </main>;
 return auth?<SessionLock auth={auth} onLogout={async()=>{await workspaceAPI('/logout',{});setAuth(null)}}>{login}</SessionLock>:login;
}
