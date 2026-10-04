import React,{useState} from 'react';
import {approvedHistory} from '../approved-history.js';
import {approvalDate,orderLabel} from '../order-identity.js';
import {status,dateText,money,totals} from '../shared.js';
export function ApprovedOrderHistory({data,year,onOpen}){
 const [month,setMonth]=useState('all'),[query,setQuery]=useState(''),[page,setPage]=useState(1);
 const customers=new Map(data.customers.map(c=>[c.id,c]));
 const rows=approvedHistory(data.orders).filter(o=>approvalDate(o).startsWith(year)&&(month==='all'||approvalDate(o).slice(5,7)===month)&&`${orderLabel(o)} ${o.customerId} ${customers.get(o.customerId)?.name||''} ${o.sale}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
 const max=Math.max(1,Math.ceil(rows.length/20)),current=Math.min(page,max);
 return <section className="panel approved-history"><div className="panel-head"><div><h3>Lịch sử đơn hàng đã duyệt · {year}</h3><p>Theo ngày duyệt lần đầu. Gồm đơn đang xử lý, hoàn thành và đã hủy sau duyệt.</p></div><b>{rows.length} đơn</b></div>
  <div className="filters"><label>Tháng duyệt <select aria-label="Tháng lịch sử đơn" value={month} onChange={e=>{setMonth(e.target.value);setPage(1)}}><option value="all">Tất cả tháng</option>{Array.from({length:12},(_,i)=><option key={i} value={String(i+1).padStart(2,'0')}>Tháng {i+1}</option>)}</select></label><div className="search"><input aria-label="Tìm lịch sử đơn" placeholder="Mã đơn, khách hàng hoặc Sale…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></div>{(month!=='all'||query)&&<button className="btn" onClick={()=>{setMonth('all');setQuery('');setPage(1)}}>Xóa bộ lọc lịch sử</button>}</div>
  <div className="table-scroll"><table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày tạo</th><th>Ngày duyệt</th><th>Trạng thái hiện tại</th><th className="numeric">Giá trị đơn (USD)</th><th>Thao tác</th></tr></thead><tbody>{rows.slice((current-1)*20,current*20).map(o=><tr key={o.id}><td><button className="order-link" onClick={()=>onOpen(o)}>{orderLabel(o)}</button></td><td>{customers.get(o.customerId)?.name||o.customerId}<small>{o.customerId}</small></td><td>{dateText(o.date)}</td><td>{dateText(approvalDate(o))}</td><td>{status(o)}</td><td className="numeric">{money(totals(o).total)}</td><td><button className="btn" aria-label={'Xem '+orderLabel(o)} onClick={()=>onOpen(o)}>Xem</button></td></tr>)}</tbody></table></div>
  {!rows.length&&<div className="empty"><p>Không có đơn đã duyệt phù hợp với năm/tháng và từ khóa đã chọn.</p></div>}
  <div className="pagination"><span>{rows.length} đơn · Trang {current}/{max}</span><div><button className="btn" disabled={current===1} onClick={()=>setPage(current-1)}>Trước</button><button className="btn" disabled={current===max} onClick={()=>setPage(current+1)}>Sau</button></div></div>
 </section>;
}
