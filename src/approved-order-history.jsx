import React,{useState} from 'react';
import {approvedHistory} from '../approved-history.js';
import {approvalDate,orderLabel} from '../order-identity.js';
import {UnfinishedOrderTable} from './unfinished-order-table.jsx';
export function ApprovedOrderHistory({data,year,onOpen}){
 const [month,setMonth]=useState('all'),[query,setQuery]=useState(''),[page,setPage]=useState(1),[direction,setDirection]=useState('asc');
 const customers=new Map(data.customers.map(c=>[c.id,c]));
 const rows=approvedHistory(data.orders).filter(o=>approvalDate(o).startsWith(year)&&(month==='all'||approvalDate(o).slice(5,7)===month)&&`${orderLabel(o)} ${o.customerId} ${customers.get(o.customerId)?.name||''} ${o.sale}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'))).sort((a,b)=>(direction==='asc'?1:-1)*(a.date||'').localeCompare(b.date||'')||a.id.localeCompare(b.id));
 const max=Math.max(1,Math.ceil(rows.length/20)),current=Math.min(page,max);
 return <section className="panel approved-history"><div className="panel-head"><div><h3>Lịch sử đơn hàng đã duyệt · {year}</h3><p>Theo ngày duyệt lần đầu. Gồm đơn đang xử lý, hoàn thành và đã hủy sau duyệt.</p></div><b>{rows.length} đơn</b></div>
  <div className="filters"><label>Tháng duyệt <select aria-label="Tháng lịch sử đơn" value={month} onChange={e=>{setMonth(e.target.value);setPage(1)}}><option value="all">Tất cả tháng</option>{Array.from({length:12},(_,i)=><option key={i} value={String(i+1).padStart(2,'0')}>Tháng {i+1}</option>)}</select></label><div className="search"><input aria-label="Tìm lịch sử đơn" placeholder="Mã đơn, khách hàng hoặc Sale…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></div>{(month!=='all'||query)&&<button className="btn" onClick={()=>{setMonth('all');setQuery('');setPage(1)}}>Xóa bộ lọc lịch sử</button>}</div>
  <UnfinishedOrderTable data={data} orders={rows.slice((current-1)*20,current*20)} onOpen={onOpen} offset={(current-1)*20} direction={direction} onSort={()=>{setDirection(direction==='asc'?'desc':'asc');setPage(1)}}/>
  <div className="pagination"><span>{rows.length} đơn · Trang {current}/{max}</span><div><button className="btn" disabled={current===1} onClick={()=>setPage(current-1)}>Trước</button><button className="btn" disabled={current===max} onClick={()=>setPage(current+1)}>Sau</button></div></div>
 </section>;
}
