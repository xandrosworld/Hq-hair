import {periodDashboard} from '../period-dashboard.js';
import {isFinancialOrder} from '../reporting.js';
import {isOfficialOrder} from '../order-identity.js';
import React from 'react';
import {totals,money} from '../shared.js';

export function SalesTeamSummary({orders,customers,revenueBasis=false,period}){
 const groups=new Map();
 const get=(id,name)=>{if(!groups.has(id))groups.set(id,{id,name,customers:new Set(),orders:0,active:0,revenue:0,paid:0,debt:0});return groups.get(id)};
 for(const c of customers)get(c.ownerId||c.sale,c.sale).customers.add(c.id);
 for(const order of orders){
  const row=get(order.ownerId||order.sale,order.sale);
  if(period===undefined&&!(revenueBasis?isFinancialOrder(order):isOfficialOrder(order)))continue;
  const dated=period!==undefined?periodDashboard([order],period):null;row.orders+=dated?dated.approved.length:1;
  const total=dated||totals(order);row.revenue+=total.revenue;row.paid+=revenueBasis?total.revenuePaid:total.paid;row.debt=row.debt===null||total.debt===null?null:row.debt+total.debt;
  if(order.stage<10&&(period===undefined||total.approved.length))row.active++;
 }
 const rows=[...groups.values()].sort((a,b)=>b.revenue-a.revenue);
 return <section className="panel" aria-label="Tổng hợp đội Sale"><div className="panel-head"><div><h3>Tổng hợp theo người phụ trách</h3><p>Doanh thu theo ngày duyệt · Tiền thu theo ngày kế toán xác nhận · Công nợ tại cuối kỳ đã chọn</p></div></div>{rows.length?<div className="table-scroll"><table><thead><tr><th>Người phụ trách</th><th className="numeric">Khách hàng</th><th className="numeric">Đơn hàng</th><th className="numeric">Đang xử lý</th><th className="numeric">Doanh thu</th><th className="numeric">{revenueBasis?'Dòng tiền thu vào':'Đã nhận'}</th><th className="numeric">Công nợ</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><b>{row.name||'Chưa phân công'}</b></td><td className="numeric">{row.customers.size}</td><td className="numeric">{row.orders}</td><td className="numeric">{row.active}</td><td className="numeric">{money(row.revenue)}</td><td className="numeric">{money(row.paid)}</td><td className="numeric">{row.debt===null?'—':money(row.debt)}</td></tr>)}</tbody></table></div>:<div className="inline-empty">Chưa có khách hàng hoặc đơn trong kỳ này.</div>}</section>;
}
