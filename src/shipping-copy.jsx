import React,{useState} from 'react';
import {orderLabel} from '../order-identity.js';
export function ShippingCopy({order}){
 const [state,setState]=useState('');
 const content=[['Mã đơn',orderLabel(order)],['Người nhận',order.recipient],['Điện thoại',order.phone],['Email',order.email],['Địa chỉ',order.address],['Quốc gia',order.country],['Vận chuyển',[order.carrier,order.service].filter(Boolean).join(' · ')],['Mã vận đơn',order.tracking]].filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join('\n');
 const copy=async()=>{try{if(!navigator.clipboard?.writeText)throw new Error('Unavailable');await navigator.clipboard.writeText(content);setState('copied')}catch{setState('manual')}};
 return <div style={{marginBottom:12}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><h3 className="section-label">Thông tin giao hàng</h3><button type="button" className="btn" onClick={copy}>Sao chép thông tin giao hàng</button></div>{state==='copied'&&<p role="status">Đã sao chép thông tin giao hàng.</p>}{state==='manual'&&<label className="field">Trình duyệt chưa cho phép sao chép. Nhấn giữ để sao chép nội dung bên dưới.<textarea aria-label="Nội dung giao hàng để sao chép" readOnly rows={8} value={content} onFocus={e=>e.target.select()}/></label>}</div>;
}
