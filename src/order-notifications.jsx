import React from 'react';
import {orderNotifications} from '../order-notifications.js';
import {orderLabel} from '../order-identity.js';
import './order-notifications.css';
export function OrderNotifications({data,onOrder}){
 const items=orderNotifications(data.orders);
 return <div className="order-notifications"><p className="notification-period">Cập nhật từ 5 ngày trước đến hiện tại · {items.length} thông báo</p>{items.length?items.map(item=><article key={item.id}><span className={'notification-kind '+item.kind}>{item.kind==='message'?'Tin nhắn':'Tiến độ'}</span><strong>{orderLabel(item.order)} · {item.title}</strong>{item.note&&<p>{item.note}</p>}<small>{item.kind==='progress'&&item.actor?item.actor+' · ':''}{new Date(item.time).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</small><button className="btn" onClick={()=>onOrder(item.order)}>Xem đơn hàng</button></article>):<div className="empty"><p>Chưa có cập nhật tiến độ hoặc tin nhắn trong khoảng thời gian này.</p></div>}</div>;
}
