import React from 'react';
import {orderNotifications} from '../order-notifications.js';
import {orderLabel} from '../order-identity.js';
import {deliveryDate} from '../delivery-days.js';
import './order-notifications.css';
export function OrderNotifications({data,onOrder}){
 const items=orderNotifications(data.orders);
 const groups=new Map();
 for(const item of items){const day=deliveryDate(item.time);if(!groups.has(day))groups.set(day,[]);groups.get(day).push(item)}
 const today=deliveryDate(new Date().toISOString());
 return <div className="order-notifications"><p className="notification-period">5 ngày trước đến hiện tại · {items.length} thông báo</p>{items.length?[...groups].sort(([a],[b])=>b.localeCompare(a)).map(([day,entries])=><section className="notification-day" key={day} aria-label={`Thông báo ngày ${day}`}><h3>{day===today?'Hôm nay · ':''}{day.split('-').reverse().join('/')}<span>{entries.length} thông báo</span></h3><div className="notification-cards">{entries.map(item=><article key={item.id}><div className="notification-card-head"><span className={'notification-kind '+item.kind}>{item.kind==='message'?'Tin nhắn':'Tiến độ'}</span><time dateTime={item.time}>{new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(item.time)?item.time:item.time+'+07:00').toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'})}</time></div><strong>{orderLabel(item.order)} · {item.title}</strong>{item.note&&<p>{item.note}</p>}<div className="notification-card-footer"><small>{item.kind==='progress'?item.actor:''}</small><button className="btn" onClick={()=>onOrder(item.order)}>Xem đơn hàng →</button></div></article>)}</div></section>):<div className="empty"><p>Chưa có cập nhật tiến độ hoặc tin nhắn trong khoảng thời gian này.</p></div>}</div>;
}
