import React,{useEffect,useState} from 'react';
import {Pause,Play} from '@phosphor-icons/react';
import './login-motion.css';

export function LoginVisual({brand}){
 const [shown,setShown]=useState(false),[paused,setPaused]=useState(false),[hidden,setHidden]=useState(document.hidden);
 useEffect(()=>{let frame;const first=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>setShown(true))});const visibility=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',visibility);return()=>{cancelAnimationFrame(first);cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility)}},[]);
 return <section className={'hq-login-visual hq-editorial-motion'+(paused||hidden?' is-paused':'')} aria-label="HQ Hair">
  <picture className="hq-login-photo"><source media="(max-width: 760px)" srcSet="/assets/login/hq-hair-editorial-mobile.webp"/><img src="/assets/login/hq-hair-editorial.webp" alt="Mái tóc nâu dài với những lọn sóng mềm trong ánh sáng ấm" width="1122" height="1402" fetchPriority="high" decoding="async"/></picture>
  <div className="hq-login-shade"/><div className="hq-editorial-light" aria-hidden="true"/>
  <div className="hq-login-visual-top">{brand}</div>
  <div className={'hq-login-story t-stagger'+(shown?' is-shown':'')}><span className="hq-login-story-line"/><h1><span className="t-stagger-line t-stagger-line--1 hq-editorial-first">Chất lượng từ</span><span className="t-stagger-line t-stagger-line--2">từng chi tiết.</span></h1><p className="t-stagger-line t-stagger-line--3">Cùng HQ Hair chăm chút từng đơn hàng.</p></div>
  <button type="button" className="hq-motion-toggle" aria-label={paused?'Tiếp tục hiệu ứng':'Tạm dừng hiệu ứng'} aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?<Play size={16} weight="fill"/>:<Pause size={16} weight="fill"/>}</button>
 </section>;
}
