import React from 'react';
import {dateText,money,totals,status} from '../shared.js';
import {orderLabel} from '../order-identity.js';
import {orderQueue} from '../order-queue.js';
import {deliveryDays,deliveryDaysLabel} from '../delivery-days.js';
export function UnfinishedOrderTable({orders,data,onOpen,offset=0,direction,onSort}){
 const customers=new Map(data.customers.map(c=>[c.id,c]));
 return <div className="table-scroll"><table className="unfinished-orders"><thead><tr><th>STT</th><th>Mã đơn hàng</th><th>Khách hàng</th><th aria-sort={direction==='asc'?'ascending':'descending'}><button className="table-sort" onClick={onSort}>Ngày tạo {direction==='asc'?'↑':'↓'}</button></th><th>Ngày dự kiến giao hàng</th><th className="numeric">Giá trị (USD)</th><th>Trạng thái hiện tại</th><th className="numeric" title="Số ngày còn lại từ hôm nay đến ngày dự kiến giao hàng">Số ngày</th></tr></thead><tbody>{orders.map((o,i)=>{
  const days=deliveryDays(o.due),queue=orderQueue(o);
  return <tr key={o.id} onClick={()=>onOpen(o)}><td>{offset+i+1}</td><td><button className="order-link" onClick={e=>{e.stopPropagation();onOpen(o)}}>{orderLabel(o)}</button></td><td>{customers.get(o.customerId)?.name||o.customerId}</td><td>{dateText(o.date)}</td><td>{dateText(o.due)}</td><td className="numeric">{money(totals(o).total)}</td><td><span className={`badge queue-badge queue-${queue?.key||'none'}`}>{status(o)}</span></td><td className={'numeric delivery-days '+(days!==null&&days<0?'overdue':'')}>{deliveryDaysLabel(days)}</td></tr>;
 })}</tbody></table>{!orders.length&&<div className="empty"><p>Không có đơn hàng phù hợp với bộ lọc.</p></div>}</div>;
}
