import React,{useEffect,useState} from 'react';
import {today,dateText} from '../shared.js';
import {deliveryTiming} from '../delivery-days.js';
export function DeliveryTiming({order,showDate=false}){
 const [asOf,setAsOf]=useState(today);
 useEffect(()=>{const refresh=()=>setAsOf(today()),timer=setInterval(refresh,60000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh)}},[]);
 const value=deliveryTiming(order,asOf);
 return <span className={'delivery-timing '+value.tone} title={value.due?`Hạn giao: ${dateText(value.due)}`:undefined}><b>{value.title}</b><small>{value.detail}</small>{showDate&&value.actual&&<small className="delivery-actual">Xưởng xác nhận: {dateText(value.actual)}</small>}</span>;
}
