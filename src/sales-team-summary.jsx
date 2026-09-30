import React from 'react';
import {totals,money} from '../shared.js';

export function SalesTeamSummary({orders,customers}){
 const groups=new Map();
 const get=(id,name)=>{if(!groups.has(id))groups.set(id,{id,name,customers:new Set(),orders:0,active:0,revenue:0,paid:0,debt:0});return groups.get(id)};
 for(const c of customers)get(c.ownerId||c.sale,c.sale).customers.add(c.id);
 for(const order of orders){
  const row=get(order.ownerId||order.sale,order.sale);row.orders++;
  if(!order.stage)continue;
  const total=totals(order);row.revenue+=total.revenue;row.paid+=total.paid;row.debt+=total.debt;
  if(order.stage<10)row.active++;
 }
 const rows=[...groups.values()].sort((a,b)=>b.revenue-a.revenue);
 return <section className="panel" aria-label="Tổng hợp đội Sale"><div className="panel-head"><div><h3>Tổng hợp theo người phụ trách</h3><p>Trong kỳ đang chọn · Đơn nháp không tính doanh thu và công nợ</p></div></div>{rows.length?<div className="table-scroll"><table><thead><tr><th>Người phụ trách</th><th className="numeric">Khách hàng</th><th className="numeric">Đơn hàng</th><th className="numeric">Đang xử lý</th><th className="numeric">Doanh thu</th><th className="numeric">Đã nhận</th><th className="numeric">Công nợ</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><b>{row.name||'Chưa phân công'}</b></td><td className="numeric">{row.customers.size}</td><td className="numeric">{row.orders}</td><td className="numeric">{row.active}</td><td className="numeric">{money(row.revenue)}</td><td className="numeric">{money(row.paid)}</td><td className="numeric">{money(row.debt)}</td></tr>)}</tbody></table></div>:<div className="inline-empty">Chưa có khách hàng hoặc đơn trong kỳ này.</div>}</section>;
}
