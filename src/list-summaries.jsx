import {customerRatio} from '../customer-statistics.js';
import {orderQueues,queueStatistics,queueGroups} from '../order-queue.js';
import React,{useState,useEffect} from 'react';
import {Users,FileText} from '@phosphor-icons/react';
import {groups,today} from '../shared.js';
import {buyerStatistics,customerGroupSeries} from '../list-statistics.js';
import {displayLabel} from './display-labels.js';
import {AnimatedNumber} from './motion.jsx';
import './list-summaries.css';
export function OpenOrderSummary({orders,onStage,selected}){
 const {counts,total}=queueStatistics(orders),[expanded,setExpanded]=useState(null);
 return <section className="panel queue-overview" aria-label="Thống kê đơn chưa hoàn thành">
  <button className="queue-total" onClick={()=>onStage('all')} aria-pressed={selected==='all'}><span><b>Hồ sơ đang xử lý</b><small>Theo bộ phận phụ trách</small></span><strong data-testid="open-total">{total}</strong></button>
  <div className="queue-groups">{queueGroups.map(g=>{
   const count=g.queues.reduce((sum,key)=>sum+counts[key],0),open=expanded===g.key;
   return <div className="queue-group" key={g.key}>
    <div className="queue-group-head"><button className="queue-group-filter" aria-label={`Lọc bộ phận: ${g.label}`} aria-pressed={selected==='group:'+g.key} onClick={()=>onStage('group:'+g.key)}><span>{g.label}</span><b>{count}</b></button><button className="queue-expand" aria-label={`Chi tiết ${g.label}`} aria-expanded={open} aria-controls={'queue-'+g.key} onClick={()=>setExpanded(open?null:g.key)}>{open?'−':'+'}</button></div>
    {open&&<div id={'queue-'+g.key} className="queue-details">{g.queues.map(key=>{const q=orderQueues.find(q=>q.key===key);return <button key={key} aria-label={`Lọc: ${q.label}`} aria-pressed={selected==='queue:'+key} onClick={()=>onStage('queue:'+key)}><span>{q.label}</span><b data-testid={'queue-count-'+key}>{counts[key]}</b></button>})}</div>}
   </div>;
  })}</div><p className="queue-footnote">Bấm bộ phận để lọc đơn · Dấu + để xem trạng thái</p>
 </section>;
}
const colors=['#de6ba0','#4c91db','#45a584','#d5a537'];
export function CustomerOverview({customers,orders,onPeriodChange}){
 const [year,setYear]=useState(today().slice(0,4)),[details,setDetails]=useState(false),[month,setMonth]=useState(today().slice(0,7)),[mode,setMode]=useState('all'),[periodYear,setPeriodYear]=useState(today().slice(0,4));
 const stats=buyerStatistics(customers,orders,today(),mode==='year'?periodYear+'-01':month,mode),series=customerPeriodSeries(customers,mode,periodYear,month),max=Math.max(1,...series.flatMap(m=>m.values));
 const cutoff=mode==='all'?today():mode==='year'?(periodYear===today().slice(0,4)?today():periodYear+'-12-31'):(month===today().slice(0,7)?today():new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).toISOString().slice(0,10));
 useEffect(()=>{onPeriodChange?.(cutoff)},[cutoff,onPeriodChange]);
 const {notReturned,ratio}=customerRatio(stats);
 const ratioText=ratio===null?'—':new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(ratio);
 const years=[...new Set([today().slice(0,4),...customers.map(c=>c.created?.slice(0,4)).filter(Boolean)])].sort().reverse();
 return <div className="list-overview customer-overview"><section className="panel group-chart"><div className="panel-head"><div><h3>Biểu đồ khách hàng theo kỳ</h3><p>Tổng hồ sơ lũy kế theo 4 nhóm khách hàng</p></div></div><div className="group-chart-body"><div className="group-chart-legend">{groups.map((g,i)=><span key={g}><i style={{background:colors[i]}}/>{displayLabel(g)}</span>)}</div><div className="group-chart-grid" style={{gridTemplateColumns:`repeat(${series.length},minmax(0,1fr))`}}>{series.map(m=><div key={m.month}><div className="group-chart-bars">{m.values.map((v,i)=><div key={i} role="img" tabIndex={0} aria-label={`Tháng ${m.month}: ${v} ${displayLabel(groups[i])}`} title={`Tháng ${m.month} · ${displayLabel(groups[i])}: ${v}`} style={{height:`${v/max*100}%`,minHeight:2,background:colors[i]}}/>)}</div><small>{mode==='all'?m.month:mode==='year'?'T'+Number(m.month.slice(5)):Number(m.month.slice(8))}</small></div>)}</div><button className="text-btn" onClick={()=>setDetails(!details)}>{details?'Ẩn bảng số liệu':'Xem bảng số liệu'}</button>{details&&<div className="table-scroll"><table><thead><tr><th>Tháng</th>{groups.map(g=><th key={g}>{displayLabel(g)}</th>)}</tr></thead><tbody>{series.map(m=><tr key={m.month}><td>{m.month}</td>{m.values.map((v,i)=><td key={i}>{v}</td>)}</tr>)}</tbody></table></div>}</div></section>
 <section className="panel buyer-summary" aria-label="Thống kê khách hàng đã mua"><div className="buyer-period"><label>Kỳ thống kê<select aria-label="Kỳ thống kê khách hàng" value={mode} onChange={e=>setMode(e.target.value)}><option value="all">Đến hiện tại</option><option value="month">Theo tháng</option><option value="year">Theo năm</option></select></label>{mode==='month'&&<input aria-label="Tháng thống kê khách" type="month" value={month} max={today().slice(0,7)} onChange={e=>{if(/^\d{4}-\d{2}$/.test(e.target.value)&&e.target.value<=today().slice(0,7))setMonth(e.target.value)}}/>}{mode==='year'&&<select aria-label="Năm thống kê khách đã mua" value={periodYear} onChange={e=>setPeriodYear(e.target.value)}>{years.map(y=><option key={y}>{y}</option>)}</select>}</div><div className="buyer-total"><span className="summary-icon"><Users size={32}/></span><div><h3>Tổng số khách hàng đã mua</h3><strong data-testid="buyers-total"><AnimatedNumber value={stats.total}/></strong>{mode==='month'&&<p>{stats.growth===null?'Chưa có khách mua ở tháng trước':`${stats.growth>0?'+':''}${stats.growth}% so với cuối tháng trước`}</p>}</div></div><div className="buyer-breakdown"><div><span>Khách mới trong kỳ</span><strong data-testid="buyers-new"><AnimatedNumber value={stats.newCustomers}/></strong></div><div><span>Khách quay lại trong kỳ</span><strong data-testid="buyers-repeat"><AnimatedNumber value={stats.repeat}/></strong></div><div><span>Tỷ lệ khách quay lại</span><strong data-testid="buyers-rate"><AnimatedNumber value={stats.rate}/>%</strong></div></div><div className="buyer-comparison" aria-label="So sánh khách mới và khách chưa quay lại"><div><span>Khách chưa quay lại trong kỳ</span><strong data-testid="buyers-not-returned">{notReturned}</strong></div><div><span>Khách mới / chưa quay lại</span><strong data-testid="buyers-new-ratio">{ratioText}</strong></div><p data-testid="buyers-ratio-explanation">{ratio===null?'Không có khách chưa quay lại.':`${stats.newCustomers} / ${notReturned} ${Number(ratio.toFixed(2))===ratio?'=':'≈'} ${ratioText} · ${stats.newCustomers} khách mới so với ${notReturned} khách chưa mua lại trong kỳ.`}</p><small>Chưa quay lại = khách đã mua − khách quay lại trong kỳ, gồm khách mới chưa mua lần hai.</small></div><p className="summary-note">Khách mới: tạo hồ sơ trong kỳ và đã có đơn được duyệt. Khách đã mua: có ít nhất 1 đơn được duyệt tính đến cuối kỳ đang xem. Khách quay lại: có đơn thứ 2 trở đi được duyệt trong kỳ, mỗi khách tính 1 lần/kỳ. Tháng mua tính theo lần Kế toán duyệt đầu tiên, giờ Việt Nam. Tỷ lệ = khách quay lại trong kỳ / khách đã mua. Chỉ tính dữ liệu được phép xem.</p></section></div>;
}

function customerPeriodSeries(customers,mode,year,month){
 const now=today(),years=[...new Set([now.slice(0,4),...customers.map(c=>c.created?.slice(0,4)).filter(y=>/^\d{4}$/.test(y)&&y<=now.slice(0,4))])].sort();
 const keys=mode==='all'?years:mode==='year'?Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`):Array.from({length:new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate()},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`);
 return keys.map(key=>({month:key,values:groups.map(g=>customers.filter(c=>c.group===g&&c.created&&c.created.slice(0,10)<=now&&c.created.slice(0,key.length)<=key&&key<=now.slice(0,key.length)).length)}));
}
