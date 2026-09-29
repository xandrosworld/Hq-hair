import React,{useEffect,useLayoutEffect,useRef} from 'react';

const reduce=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const currency=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2});
const compact=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const integer=new Intl.NumberFormat('en-US',{maximumFractionDigits:0});
const formatValue=(value,format)=>format==='money'?currency.format(value):format==='compact'?compact.format(value):format==='padded'?String(Math.round(value)).padStart(2,'0'):integer.format(value);

/** Direct text updates keep animation frames out of React's render cycle.
 * Screen readers get the final value; visible text animates only while in view. */
export function AnimatedNumber({value,format='number',duration=1100,delay=0,className=''}){
  const ref=useRef(null),current=useRef(0),seen=useRef(false);
  const target=Number(value)||0;
  useLayoutEffect(()=>{
    const node=ref.current,media=window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,observer,startTime=null,stopped=false;
    const finish=()=>{cancelAnimationFrame(frame);current.current=target;node.textContent=formatValue(target,format);node.dataset.animating='false';};
    const start=()=>{
      if(stopped)return;
      observer?.disconnect();
      if(media.matches){seen.current=true;finish();return;}
      const from=seen.current?current.current:0;seen.current=true;
      node.dataset.animating='true';node.textContent=formatValue(from,format);
      const tick=time=>{
        if(stopped)return;
        if(startTime===null)startTime=time+delay;
        const progress=Math.max(0,Math.min(1,(time-startTime)/duration));
        const eased=1-Math.pow(1-progress,4);
        current.current=from+(target-from)*eased;
        node.textContent=formatValue(current.current,format);
        if(progress<1)frame=requestAnimationFrame(tick);else finish();
      };
      frame=requestAnimationFrame(tick);
    };
    const preference=()=>{if(media.matches)finish();};
    media.addEventListener('change',preference);
    if(media.matches||seen.current)start();
    else{node.textContent=formatValue(0,format);observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))start();},{threshold:.3});observer.observe(node);}
    return()=>{stopped=true;cancelAnimationFrame(frame);observer?.disconnect();media.removeEventListener('change',preference);};
  },[target,format,duration,delay]);
  return <span className={`animated-number ${className}`} data-value={target}><span className="sr-only">{formatValue(target,format)}</span><span ref={ref} aria-hidden="true">{formatValue(target,format)}</span></span>;
}

export function ArtIcon({name,className=''}){
  return <img className={`art-icon ${className}`} src={`/assets/icons/${name}.webp`} width="40" height="40" alt="" aria-hidden="true" decoding="async" draggable="false"/>;
}

export function MetricSurface({children,className='',index=0}){
  const ref=useRef(null),frame=useRef(0);
  useEffect(()=>()=>cancelAnimationFrame(frame.current),[]);
  const move=e=>{
    if(reduce()||e.pointerType==='touch')return;
    const rect=e.currentTarget.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
    cancelAnimationFrame(frame.current);
    frame.current=requestAnimationFrame(()=>{const node=ref.current;if(!node)return;node.style.setProperty('--pointer-x',`${x}px`);node.style.setProperty('--pointer-y',`${y}px`);});
  };
  return <section ref={ref} className={`metric-surface ${className}`} style={{'--entry-index':index}} onPointerMove={move}>{children}</section>;
}

/** Animate only when a surface enters the viewport. Never leave content hidden. */
export function useWorkspaceMotion(page,ready){
  useEffect(()=>{
    if(!ready)return;
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations=new Set(),ripples=new Set();let observer;
    const stop=()=>{observer?.disconnect();animations.forEach(a=>a.cancel());animations.clear();ripples.forEach(n=>n.remove());ripples.clear();};
    const animate=(node,keyframes,options)=>{
      const animation=node.animate(keyframes,options);animations.add(animation);
      animation.finished.then(()=>animations.delete(animation),()=>animations.delete(animation));
      return animation;
    };
    if(!media.matches){
      const main=document.querySelector('main');
      const surfaces=main?.querySelectorAll('.page-title,.welcome-banner,.metric-surface,.pipeline-section,.dashboard-middle>.panel,.recent-panel,.order-stats,.customer-groups,.customer-summary,.order-snapshot,.detail-layout>div>.panel,.timeline-panel,.wizard,.product-panel,.overview-grid>.panel');
      observer=new IntersectionObserver(entries=>{
        let stagger=0;
        for(const entry of entries){if(!entry.isIntersecting)continue;
          const node=entry.target;observer.unobserve(node);
          animate(node,[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:640,delay:stagger++*55,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
          node.querySelectorAll('.draw-line').forEach(line=>animate(line,[{strokeDashoffset:1},{strokeDashoffset:0}],{duration:1400,delay:180,easing:'cubic-bezier(.2,.7,.3,1)',fill:'backwards'}));
        }
      },{threshold:.08});
      surfaces?.forEach(node=>observer.observe(node));
    }
    const pointer=e=>{
      if(media.matches||e.button!==0)return;
      const button=e.target.closest('button.btn,button.nav-item,button.pipeline-node,button.board-card');
      if(!button||button.disabled)return;
      const rect=button.getBoundingClientRect(),size=Math.max(rect.width,rect.height)*1.5;
      const ripple=document.createElement('span');ripple.className='click-ripple';ripple.setAttribute('aria-hidden','true');
      Object.assign(ripple.style,{width:`${size}px`,height:`${size}px`,left:`${e.clientX-rect.left-size/2}px`,top:`${e.clientY-rect.top-size/2}px`});
      button.appendChild(ripple);ripples.add(ripple);
      const a=animate(ripple,[{transform:'scale(0)',opacity:.22},{transform:'scale(1)',opacity:0}],{duration:650,easing:'cubic-bezier(.2,.7,.3,1)'});
      a.finished.then(()=>{ripple.remove();ripples.delete(ripple);},()=>{ripple.remove();ripples.delete(ripple);});
    };
    const preference=()=>{if(media.matches)stop();};
    document.addEventListener('pointerdown',pointer);media.addEventListener('change',preference);
    return()=>{stop();document.removeEventListener('pointerdown',pointer);media.removeEventListener('change',preference);};
  },[page,ready]);
}
