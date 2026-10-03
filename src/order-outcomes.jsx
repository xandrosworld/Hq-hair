import React from 'react';
import {orderOutcomes} from '../order-outcomes.js';
import {feedbackLabels} from '../workflow-state.js';
import './order-outcomes.css';
export function OrderOutcomes({orders}){
 const s=orderOutcomes(orders),rate=(n,d)=>d?`${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(n/d*100)}%`:'—';
 const row=(label,n,d)=><div className="outcome-row" key={label}><span>{label}</span><b>{n}</b><small>{rate(n,d)}</small></div>;
 return <section className="panel outcomes"><header><div><h3>Tổng đơn hàng</h3><p>Đã được Kế toán duyệt đến hiện tại</p></div><strong>{s.total}</strong></header><section><h4>6. Đã gửi văn phòng <span>{s.delivered} đơn</span></h4>{row('Giao sớm và đúng hạn',s.onTime,s.delivered)}{row('Giao trễ hạn',s.late,s.delivered)}{!!s.deliveryUnknown&&row('Thiếu dữ liệu hạn giao',s.deliveryUnknown,s.delivered)}<p>Tỷ lệ trên {s.delivered} đơn đã gửi văn phòng.</p></section><section><h4>9. Đã nhận <span>{s.received} đơn</span></h4>{Object.entries(feedbackLabels).map(([key,label])=>row(key==='claim'?'Claim Bình thường':label,s.feedback[key],s.received))}{!!s.feedbackUnknown&&row('Chưa ghi nhận phản hồi',s.feedbackUnknown,s.received)}<p>Tỷ lệ trên {s.received} đơn đã nhận.</p></section><section><h4>7. Kiểm tra thanh toán lần cuối</h4>{row('Hủy đơn mất cọc',s.forfeited,s.total)}<p>Tỷ lệ trên {s.total} đơn đã được duyệt.</p></section><footer>Lũy kế mọi thời điểm, gồm đơn hoàn thành và hủy sau duyệt; theo phạm vi dữ liệu được phép xem.</footer></section>;
}
