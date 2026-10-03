import {DeliveryTiming} from './delivery-timing.jsx';
import React,{useState} from 'react';
import {Check} from '@phosphor-icons/react';
import {steps} from '../shared.js';
import {workflowStep} from '../workflow-state.js';
import './order-timeline.css';
export function OrderTimeline({order}){
 const [history,setHistory]=useState(false);
 return <section className="panel workflow-timeline"><div className="panel-head"><h3>Tiến độ đơn hàng</h3><span>{order.cancelledAt?'Đã đóng · Đã hủy':`${order.stage}/10`}</span></div>{order.finalPaymentCheck?.status==='forfeited'&&<p className="notice">Đơn đã đóng do hủy mất cọc. Không thực hiện bước 8–10.</p>}<div className="timeline">{steps.map((label,i)=>{
  const s=workflowStep(order,i+1);
  return <div key={label} className={`timeline-step ${s.done?'done':''} ${order.stage===i+1?'current':''}`}><span className="step-dot">{s.done?<Check size={14} weight="bold"/>:i+1}</span><div><b>{label}</b>{i===5&&<DeliveryTiming order={order} showDate/>}{s.label&&<span className={`workflow-substatus ${s.tone}`}><i aria-hidden="true"/>{s.label}</span>}{s.time?<><small>{s.actor||'Đã ghi nhận'}</small><small>{new Date(s.time).toLocaleString('vi-VN')}</small></>:<small>{order.stage===i+1?'Đang xử lý':'Chưa có xác nhận'}</small>}</div></div>;
 })}</div><button className="history-btn" onClick={()=>setHistory(!history)}>{history?'Ẩn nhật ký':'Xem toàn bộ nhật ký'}</button>{history&&<div className="panel-body audit">{(order.history||[]).map((h,i)=><div key={i}><b>{h.title}</b><small>{h.actor} · {new Date(h.time).toLocaleString('vi-VN')}</small>{h.note&&<p>{h.note}</p>}</div>)}</div>}</section>;
}
