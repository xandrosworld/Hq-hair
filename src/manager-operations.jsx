import React,{useState} from 'react';
import {FactoryBoard} from './factory-board.jsx';
import {factoryTabs} from '../factory-model.js';
import {totals,money,status,round} from '../shared.js';
import {orderLabel} from '../order-identity.js';
import {canForfeitPaused} from '../accounting.js';
export function ManagerFactory({data,onOpen}){
 const [tab,setTab]=useState('analytics');
 return <div className="factory-shell factory-layout manager-operations"><nav className="factory-state-tabs" aria-label="Báo cáo Xưởng">{Object.entries(factoryTabs).filter(([id])=>id!=='notifications').map(([id,label])=><button key={id} className={tab===id?'selected':''} onClick={()=>setTab(id)}>{label}</button>)}</nav><FactoryBoard data={data} tab={tab} onTab={setTab} onOpen={onOpen} readOnly/></div>;
}
export function ManagerAccounting({data,onOpen}){
 const [filter,setFilter]=useState('all'),[query,setQuery]=useState('');
 const orders=data.orders.filter(o=>o.stage>=2||o.cancelledAt),active=orders.filter(o=>!o.cancelledAt&&o.orderCode);
 const sum=key=>round(active.reduce((s,o)=>s+totals(o)[key],0));
 const matches=o=>filter==='all'||filter==='approval'&&o.stage===2&&!o.cancelledAt||filter==='final'&&[6,7].includes(o.stage)&&!o.cancelledAt||filter==='paused'&&canForfeitPaused(o)||filter==='pending'&&!o.cancelledAt&&o.payments?.some(p=>!p.confirmed)||filter==='debt'&&!o.cancelledAt&&o.orderCode&&totals(o).debt>0||filter==='cancelled'&&o.cancelledAt;
 const rows=orders.filter(matches).filter(o=>[orderLabel(o),o.sale,data.customers.find(c=>c.id===o.customerId)?.name].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase())));
 return <div className="factory-shell factory-layout manager-operations"><div className="page-title"><div><h1>Số liệu Kế toán</h1><p>Toàn bộ Sale · Tiền thực nhận do Kế toán xác nhận. Tổng tiền dưới đây tính trên đơn đã duyệt, không gồm đơn hủy.</p></div></div><div className="factory-kpis">{[['Tổng thu',sum('total')],['Tổng đã nhận',sum('paid')],['Doanh thu đã nhận',sum('revenuePaid')],['Công nợ',sum('debt')]].map(([label,value])=><div className="panel factory-kpi" key={label}><span>{label}</span><strong>{money(value)}</strong></div>)}</div><section className="panel"><div className="factory-filters"><label className="field"><span>Trạng thái Kế toán</span><select aria-label="Trạng thái Kế toán" value={filter} onChange={e=>setFilter(e.target.value)}>{[['all','Tất cả'],['approval','Chờ duyệt'],['pending','Chứng từ chưa đối soát'],['final','Kiểm tra thanh toán cuối'],['paused','Tạm dừng tại Xưởng'],['debt','Còn công nợ'],['cancelled','Đã hủy']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label className="field"><span>Tìm mã đơn / Sale / khách</span><input value={query} onChange={e=>setQuery(e.target.value)}/></label><p>{rows.length} đơn</p></div><div className="table-scroll"><table className="factory-order-table"><thead><tr>{['Mã đơn / Sale','Trạng thái','Tổng thu','Tổng đã nhận','Doanh thu đã nhận','Chứng từ chưa đối soát','Công nợ'].map(l=><th key={l}>{l}</th>)}</tr></thead><tbody>{rows.map(o=>{const t=totals(o);return <tr key={o.id}><td><button className="order-link" onClick={()=>onOpen(o)}>{orderLabel(o)}</button><small>{o.sale}</small></td><td>{status(o)}</td><td>{money(t.total)}</td><td>{money(t.paid)}</td><td>{money(t.revenuePaid)}</td><td>{o.payments?.filter(p=>!p.confirmed).length||0}</td><td>{o.cancelledAt?'—':money(t.debt)}</td></tr>})}</tbody></table>{!rows.length&&<p className="empty">Không có đơn phù hợp.</p>}</div></section></div>;
}
