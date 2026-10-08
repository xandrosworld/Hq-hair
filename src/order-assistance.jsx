import React from 'react';
import {CheckCircle,Clock,ArrowRight} from '@phosphor-icons/react';
import {money,totals} from '../shared.js';

export function OrderBrief({order,customer,dirty,onStep}){
 const t=totals(order);
 const ready=[['Khách hàng',!!customer,1],['Sản phẩm',order.items.some(i=>i.kind==='base'&&i.qty>0),1],['Ngày giao',!!order.due&&order.due>=order.date,1],['Người nhận',!!(order.recipient&&order.phone&&order.address),2]];
 return <section className="order-brief" aria-label="Tóm tắt đơn đang soạn"><div className="brief-top"><div><span className="brief-eyebrow">ĐƠN ĐANG SOẠN</span><h3>{customer?.name||'Chọn khách hàng để bắt đầu'}</h3><p>{customer?.company||'Sản phẩm, giao hàng và số tiền trong một góc nhìn.'}</p></div><span className={`draft-save-state ${dirty?'unsaved':''}`}><Clock size={14}/>{dirty?'Có thay đổi chưa lưu':order.id?'Đã tải bản nháp':'Bản nháp mới'}</span></div><div className="brief-body"><div className="brief-checklist">{ready.map(([label,complete,step])=><button key={label} onClick={()=>onStep(step)} className={complete?'complete':''}><CheckCircle size={16} weight={complete?'fill':'regular'}/>{label}<ArrowRight size={12}/></button>)}</div><div className="brief-money"><span>Tổng sản phẩm <b>{money(t.base+t.extra)}</b></span><span>Giảm giá <b>−{money(order.discount)}</b></span><span>Phí vận chuyển (Thu hộ) <b>{money(Number(order.shippingFee))}</b></span><span className="brief-total">Tổng thu <b>{money(t.total)}</b></span></div></div></section>;
}

export function DemoNextStep({order,onInvoice,onPayment}){
 if(order.stage!==2)return null;
 return <div className="demo-next-step"><CheckCircle size={22}/><div><b>Đơn đã chuyển sang Chờ duyệt</b><p>Tiếp theo, bạn có thể bổ sung chứng từ hoặc xem hóa đơn gửi khách.</p></div><button className="btn" onClick={onPayment}>Bổ sung chứng từ</button><button className="btn primary" onClick={onInvoice}>Xem hóa đơn <ArrowRight size={15}/></button></div>;
}
