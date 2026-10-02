import React,{useState} from 'react';
import {availableYears,customerActivity,monthlySeries} from '../reporting.js';
import {today} from '../shared.js';
import './monthly-activity.css';

export function MonthlyActivity({orders,mode='customers'}){
 const [year,setYear]=useState(today().slice(0,4)),[details,setDetails]=useState(false);
 const customers=customerActivity(orders,year),counts=monthlySeries(orders,year,'count');
 const max=Math.max(1,...(mode==='customers'?customers.flatMap(m=>[m.newCustomers,m.returning]):counts));
 const last=counts.reduce((n,v,i)=>v>0?i:n,-1),change=last>0&&counts[last-1]>0?Math.round((counts[last]-counts[last-1])/counts[last-1]*100):null;
 return <section className="panel monthly-activity"><div className="panel-head"><div><h3>{mode==='customers'?'Khách mới & khách quay lại theo tháng':'Tăng trưởng đơn hàng theo tháng'}</h3><p>Chỉ tính đơn Kế toán đã duyệt · Bao gồm đơn đã hoàn thành</p></div><select aria-label={mode==='customers'?'Năm thống kê khách':'Năm thống kê đơn'} value={year} onChange={e=>setYear(e.target.value)}>{availableYears(orders).map(y=><option key={y} value={y}>{y}</option>)}</select></div>
 <div className="activity-body"><div className="activity-legend">{mode==='customers'?<><span><i className="new"/>Khách có đơn đầu tiên</span><span><i className="returning"/>Khách mua tiếp</span></>:<span>{counts.reduce((a,b)=>a+b,0)} đơn trong năm{change!==null&&` · Tháng ${last+1}: ${change>0?'+':''}${change}% so với tháng trước`}</span>}<button className="text-btn" onClick={()=>setDetails(!details)}>{details?'Ẩn bảng số liệu':'Xem bảng số liệu'}</button></div>
 <div className="activity-chart" aria-label={mode==='customers'?'Biểu đồ khách hàng':'Biểu đồ số đơn'}>{customers.map((m,i)=><div className="activity-month" key={m.month}><div className="activity-bars">{(mode==='customers'?[['new',m.newCustomers,'khách có đơn đầu tiên'],['returning',m.returning,'khách mua tiếp']]:[['new',counts[i],'đơn']]).map(([kind,value,label])=><div tabIndex={0} role="img" aria-label={`Tháng ${m.month}: ${value} ${label}`} title={`Tháng ${m.month}: ${value} ${label}`} className={'activity-bar '+kind} key={kind} style={{height:`${value/max*100}%`,minHeight:value?4:2}}><span>{value||''}</span></div>)}</div><small>T{m.month}</small>{mode==='orders'&&<small className={'month-growth '+(i>0&&counts[i]<counts[i-1]?'negative':'')} title="So với tháng trước">{i===0||!counts[i-1]?'—':`${counts[i]>=counts[i-1]?'+':''}${Math.round((counts[i]-counts[i-1])/counts[i-1]*100)}%`}</small>}</div>)}</div>
 {mode==='customers'&&<p className="muted">Khách có đơn đầu tiên và mua tiếp trong cùng tháng có thể xuất hiện ở cả hai cột. Lịch sử được xét trong dữ liệu tài khoản được phép xem.</p>}
 {details&&<div className="table-scroll"><table><thead><tr><th>Tháng</th>{mode==='customers'&&<><th>Khách có đơn đầu tiên</th><th>Khách mua tiếp</th></>}<th>Đơn đã gửi duyệt</th></tr></thead><tbody>{customers.map((m,i)=><tr key={m.month}><td>{m.month}/{year}</td>{mode==='customers'&&<><td>{m.newCustomers}</td><td>{m.returning}</td></>}<td>{counts[i]}</td></tr>)}</tbody></table></div>}
 </div></section>;
}
