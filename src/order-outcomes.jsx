import React,{useState} from 'react';
import {today} from '../shared.js';
import {approvalDate} from '../order-identity.js';
import {orderOutcomes} from '../order-outcomes.js';
import {feedbackLabels} from '../workflow-state.js';
import './order-outcomes.css';
export function OrderOutcomes({orders}){
 const now=today(),[mode,setMode]=useState('all'),[year,setYear]=useState(now.slice(0,4)),[month,setMonth]=useState(now.slice(5,7));
 const years=[...new Set([now.slice(0,4),...orders.map(approvalDate).filter(d=>d&&d<=now).map(d=>d.slice(0,4))])].sort().reverse();
 const period=mode==='all'?'all':mode==='year'?year:year+'-'+month;
 const s=orderOutcomes(orders,now,period),rate=(n,d)=>d?`${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(n/d*100)}%`:'—';
 const columns=<div className="outcome-row outcome-columns"><span>Trạng thái</span><b>Số đơn</b><small>Tỉ lệ</small></div>;
 const row=(label,n,d)=><div className="outcome-row" key={label}><span>{label}</span><b>{n}</b><small>{rate(n,d)}</small></div>;
 return <section className="panel outcomes"><header><div><h3>Tổng đơn hàng</h3><p>Đã được Kế toán duyệt đến hiện tại</p></div><strong>{s.total}</strong></header><div className="outcome-filters"><select aria-label="Kỳ thống kê đơn hàng" value={mode} onChange={e=>setMode(e.target.value)}><option value="all">Tổng tất cả đến hiện tại</option><option value="year">Theo năm</option><option value="month">Theo tháng</option></select>{mode!=='all'&&<select aria-label="Năm thống kê đơn hàng" value={year} onChange={e=>{setYear(e.target.value);if(e.target.value===now.slice(0,4)&&month>now.slice(5,7))setMonth(now.slice(5,7))}}>{years.map(y=><option key={y}>{y}</option>)}</select>}{mode==='month'&&<select aria-label="Tháng thống kê đơn hàng" value={month} onChange={e=>setMonth(e.target.value)}>{Array.from({length:year===now.slice(0,4)?Number(now.slice(5,7)):12},(_,i)=>String(i+1).padStart(2,'0')).map(m=><option key={m} value={m}>Tháng {m}</option>)}</select>}</div><p>Theo ngày Kế toán duyệt lần đầu · Kết quả đến hiện tại.</p><section><h4>Đã gửi văn phòng <span>{s.delivered} đơn</span></h4>{columns}{row('Sớm + Đúng hạn',s.onTime,s.delivered)}{row('Trễ hạn',s.late,s.delivered)}{!!s.deliveryUnknown&&row('Thiếu dữ liệu hạn giao',s.deliveryUnknown,s.delivered)}</section><section><h4>Đã nhận <span>{s.received} đơn</span></h4>{columns}{Object.entries(feedbackLabels).map(([key,label])=>row(label,s.feedback[key],s.received))}{!!s.feedbackUnknown&&row('Chưa ghi nhận phản hồi',s.feedbackUnknown,s.received)}</section><section><h4>Kiểm tra thanh toán lần cuối</h4>{columns}{row('Hủy đơn mất cọc',s.forfeited,s.total)}</section><footer>Gồm đơn hoàn thành và hủy sau duyệt trong kỳ đã chọn; theo phạm vi dữ liệu được phép xem.</footer></section>;
}
