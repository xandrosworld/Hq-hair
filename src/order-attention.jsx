import React from 'react';
import {orderAttention} from '../order-attention.js';
import {orderLabel} from '../order-identity.js';

export function OrderAttention({data,onOpen}){
 const items=orderAttention(data.orders,data.user);
 return <section className="panel panel-body" aria-label="Việc cần xử lý"><details><summary><strong>Việc cần xử lý · {items.length} đơn</strong></summary>{items.length?<div className="inbox-content">{items.map(({order,queue})=><button key={order.id} onClick={()=>onOpen(order)}><span><b>{queue.label}</b><p>{orderLabel(order)} · {order.sale}</p></span></button>)}</div>:<p>Không có đơn đang chờ bộ phận của bạn xử lý.</p>}</details></section>;
}
