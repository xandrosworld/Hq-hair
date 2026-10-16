import React,{useState,useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {today} from '../shared.js';
import './date-input.css';

const pad=n=>String(n).padStart(2,'0');
export function dateDisplay(value,type){return value?(type==='month'?value.slice(5,7)+'/'+value.slice(0,4):value.slice(8,10)+'/'+value.slice(5,7)+'/'+value.slice(0,4)):''}
export function parseDateInput(text,type){
 let value=text.trim();
 if(type==='month'&&/^\d{2}\/\d{4}$/.test(value))value=value.slice(3)+'-'+value.slice(0,2);
 if(type!=='month'&&/^\d{2}\/\d{2}\/\d{4}$/.test(value))value=value.slice(6)+'-'+value.slice(3,5)+'-'+value.slice(0,2);
 if(!(type==='month'?/^\d{4}-\d{2}$/:/^\d{4}-\d{2}-\d{2}$/).test(value))return null;
 const [y,m,d=1]=value.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));
 return y>=100&&date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?value:null;
}
export function DateInput({type='date',value='',onChange,min,max,disabled,readOnly,onBlur,...props}){
 const [text,setText]=useState(dateDisplay(value,type)),[open,setOpen]=useState(false),[cursor,setCursor]=useState((value||today()).slice(0,7));
 const root=useRef(null),input=useRef(null),calendar=useRef(null);
 const [position,setPosition]=useState({left:0,top:0});
 useEffect(()=>{setText(dateDisplay(value,type));if(value)setCursor(value.slice(0,7));input.current?.setCustomValidity('')},[value,type]);
 useEffect(()=>{if(!open)return;const close=e=>{if(!root.current?.contains(e.target)&&!calendar.current?.contains(e.target))setOpen(false)};const place=()=>{const r=root.current.getBoundingClientRect(),height=calendar.current?.getBoundingClientRect().height||340,width=Math.min(300,window.innerWidth-32);setPosition({left:Math.max(16,Math.min(r.left,window.innerWidth-width-16)),top:Math.max(8,r.bottom+height+8>window.innerHeight?r.top-height-6:r.bottom+6)})};place();document.addEventListener('pointerdown',close);window.addEventListener('resize',place);window.addEventListener('scroll',place,true);return()=>{document.removeEventListener('pointerdown',close);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true)}},[open,cursor]);
 const valid=v=>(!min||v>=min)&&(!max||v<=max);
 const emit=v=>onChange?.({target:{value:v,name:props.name},currentTarget:{value:v,name:props.name}});
 const choose=v=>{if(v&&!valid(v))return;setText(dateDisplay(v,type));input.current?.setCustomValidity('');emit(v);setOpen(false);input.current?.focus()};
 const [year,month]=cursor.split('-').map(Number),days=new Date(year,month,0).getDate(),offset=(new Date(year,month-1,1).getDay()+6)%7;
 const shift=n=>{const d=new Date(year,month-1+n,1);setCursor(d.getFullYear()+'-'+pad(d.getMonth()+1))};
 const label=props['aria-label']||'Ngày';
 return <span className="vi-date" ref={root} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);input.current?.focus()}}}>
  <input {...props} ref={input} type="text" inputMode="numeric" placeholder={type==='month'?'tháng/năm':'ngày/tháng/năm'} value={text} disabled={disabled} readOnly={readOnly} onChange={e=>{const raw=e.target.value;setText(raw);if(!raw){e.target.setCustomValidity('');emit('');return}const parsed=parseDateInput(raw,type);e.target.setCustomValidity(parsed&&valid(parsed)?'':`Nhập ${type==='month'?'tháng/năm':'ngày/tháng/năm'} hợp lệ${min?' từ '+dateDisplay(min,type):''}${max?' đến '+dateDisplay(max,type):''}.`);if(parsed&&valid(parsed))emit(parsed)}} onBlur={e=>{const parsed=parseDateInput(text,type);if(parsed&&valid(parsed))setText(dateDisplay(parsed,type));onBlur?.(e)}}/>
  <button className="vi-date-toggle" type="button" disabled={disabled||readOnly} aria-label={'Mở lịch '+label} aria-expanded={open} onClick={()=>{setCursor((value||today()).slice(0,7));setOpen(!open)}}>▦</button>
  {open&&createPortal(<span className="vi-date vi-date-portal" ref={calendar} style={position} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);input.current?.focus()}}}><span className="vi-calendar" role="dialog" aria-label={'Chọn '+label}>
   <span className="vi-calendar-head"><button type="button" aria-label="Tháng trước" onClick={()=>shift(-1)}>‹</button><select aria-label="Tháng trong lịch" value={month} onChange={e=>setCursor(year+'-'+pad(e.target.value))}>{Array.from({length:12},(_,i)=><option key={i} value={i+1}>Tháng {i+1}</option>)}</select><input aria-label="Năm trong lịch" type="number" min="100" max="9999" value={year} onChange={e=>{const y=Number(e.target.value);if(y>=100&&y<=9999)setCursor(y+'-'+pad(month))}}/><button type="button" aria-label="Tháng sau" onClick={()=>shift(1)}>›</button></span>
   {type==='month'?<button className="vi-calendar-month" type="button" disabled={!valid(cursor)} onClick={()=>choose(cursor)}>Chọn tháng {month}/{year}</button>:<span className="vi-calendar-grid">{['T2','T3','T4','T5','T6','T7','CN'].map(d=><b key={d}>{d}</b>)}{Array.from({length:offset},(_,i)=><span key={'blank'+i}/>)}{Array.from({length:days},(_,i)=>{const v=cursor+'-'+pad(i+1);return <button key={v} type="button" disabled={!valid(v)} aria-label={dateDisplay(v,'date')} aria-pressed={v===value} onClick={()=>choose(v)}>{i+1}</button>})}</span>}
   <span className="vi-calendar-footer"><button type="button" disabled={!valid(today().slice(0,type==='month'?7:10))} onClick={()=>choose(today().slice(0,type==='month'?7:10))}>{type==='month'?'Tháng này':'Hôm nay'}</button><button type="button" onClick={()=>choose('')}>Xóa</button><button type="button" onClick={()=>setOpen(false)}>Đóng</button></span>
  </span></span>,document.body)}
 </span>;
}
