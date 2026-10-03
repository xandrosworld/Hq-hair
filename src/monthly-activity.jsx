import {approvedMonths,approvedHistory} from '../approved-history.js';
import {approvalDate} from '../order-identity.js';
import React,{useState} from 'react';
import {availableYears,customerActivity,monthlySeries} from '../reporting.js';
import {today} from '../shared.js';
import './monthly-activity.css';

export function MonthlyActivity({orders,profiles=[],mode='customers',year:chosenYear,onYear}){
 const [localYear,setLocalYear]=useState(today().slice(0,4)),[details,setDetails]=useState(false);
 const year=chosenYear||localYear,setYear=onYear||setLocalYear,months=approvedMonths(orders,year);
 const years=mode==='orders'?[...new Set([today().slice(0,4),...approvedHistory(orders).map(o=>approvalDate(o).slice(0,4))])].sort().reverse():availableYears(orders);
 const customers=mode==='customers'?customerActivity(orders,year,profiles):Array.from({length:12},(_,i)=>({month:i+1})),counts=mode==='customers'?customers.map(m=>m.orders):months.map(m=>m.count);
 const max=Math.max(1,...(mode==='customers'?customers.flatMap(m=>[m.newCustomers,m.returning]):counts));
 const last=counts.reduce((n,v,i)=>v>0?i:n,-1),change=last>0&&counts[last-1]>0?Math.round((counts[last]-counts[last-1])/counts[last-1]*100):null;
 return <section className="panel monthly-activity"><div className="panel-head"><div><h3>{mode==='customers'?'Khách mới & khách quay lại theo tháng':'Tăng trưởng đơn hàng theo tháng'}</h3><p>Theo tháng Kế toán duyệt lần đầu · Gồm đơn hoàn thành và hủy sau duyệt</p></div><select aria-label={mode==='customers'?'Năm thống kê khách':'Năm thống kê đơn'} value={year} onChange={e=>setYear(e.target.value)}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></div>
 <div className="activity-body"><div className="activity-legend">{mode==='customers'?<><span><i className="new"/>Khách mới đã mua</span><span><i className="returning"/>Khách mua tiếp</span></>:<span>{counts.reduce((a,b)=>a+b,0)} đơn trong năm{change!==null&&` · Tháng ${last+1}: ${change>0?'+':''}${change}% so với tháng trước`}</span>}<button className="text-btn" onClick={()=>setDetails(!details)}>{details?'Ẩn bảng số liệu':'Xem bảng số liệu'}</button></div>
 <div className="activity-chart" aria-label={mode==='customers'?'Biểu đồ khách hàng':'Biểu đồ số đơn'}>{customers.map((m,i)=><div className="activity-month" key={m.month}><div className="activity-bars">{(mode==='customers'?[['new',m.newCustomers,'khách mới đã mua'],['returning',m.returning,'khách mua tiếp']]:[['new',counts[i],'đơn']]).map(([kind,value,label])=><div tabIndex={0} role="img" aria-label={`Tháng ${m.month}: ${value} ${label}`} title={`Tháng ${m.month}: ${value} ${label}`} className={'activity-bar '+kind} key={kind} style={{height:`${value/max*100}%`,minHeight:value?4:2}}><span>{value}</span></div>)}</div><small>T{m.month}</small>{mode==='orders'&&<small className={'month-growth '+(months[i].growth<0?'negative':'')} title={months[i].future?'Tháng chưa diễn ra':months[i].previous===0&&counts[i]>0?'Tháng trước có 0 đơn, không tính được tỷ lệ':'So với tháng trước'}>{months[i].growth===null?'—':`${months[i].growth>0?'+':''}${months[i].growth}%`}</small>}</div>)}</div>
 {mode==='orders'&&<p className="muted">% so với tháng trước. Dấu —: tháng chưa diễn ra hoặc tăng từ 0 đơn nên không xác định tỷ lệ. Tháng hiện tại tính đến hôm nay.</p>}
 {mode==='customers'&&<p className="muted">Khách mới đã mua và mua tiếp trong cùng tháng có thể xuất hiện ở cả hai cột. Lịch sử được xét trong dữ liệu tài khoản được phép xem.</p>}
 {details&&<div className="table-scroll"><table><thead><tr><th>Tháng</th>{mode==='customers'&&<><th>Khách mới đã mua</th><th>Khách mua tiếp</th></>}<th>Đơn đã được duyệt</th>{mode==='orders'&&<th>Tăng / giảm</th>}</tr></thead><tbody>{customers.map((m,i)=><tr key={m.month}><td>{m.month}/{year}</td>{mode==='customers'&&<><td>{m.newCustomers}</td><td>{m.returning}</td></>}<td>{counts[i]}</td>{mode==='orders'&&<td>{months[i].growth===null?'—':`${months[i].growth>0?'+':''}${months[i].growth}%`}</td>}</tr>)}</tbody></table></div>}
 </div></section>;
}
