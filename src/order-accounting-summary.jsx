import React from 'react';
import {totals,money} from '../shared.js';
import {periodDashboard} from '../period-dashboard.js';
import {accountingCurrencies} from '../accounting-currencies.js';
import {vnd} from '../receipt-fx.js';
export function OrderAccountingSummary({order}){
 const total=totals(order),report=periodDashboard([order]),rates=accountingCurrencies([order],report,''),rate=order.accountingApproval?.exchangeRate;
 const convert=n=>n===0?0:rate>0?Math.round(n*rate):null;
 const cards=[['discount','Giảm giá',Number(order.discount)||0,convert(Number(order.discount)||0)],['revenue','Doanh thu thuần',total.revenue,convert(total.revenue)],['total','Tổng thu',report.paid,rates.total],['cash','Dòng tiền thu về',report.revenuePaid,rates.cash],['recovered','Thu hồi công nợ',report.recoveredDebt,rates.recovered],['shipping','Phí vận chuyển đã nhận',report.shippingPaid,rates.shipping],['debt','Còn nợ',order.cancelledAt?null:total.debt,null]];
 return <div className="order-accounting-summary"><div className="qc-summary">{cards.map(([key,label,amount,converted])=><span key={key} data-testid={'order-money-'+key}>{label}<b>{amount===null?'—':money(amount)}</b>{key!=='debt'&&<small>{vnd(converted)}</small>}</span>)}</div><p className="muted">Tổng phải thu theo đơn: <strong>{money(total.total)}</strong>. Tổng thu là tiền kế toán đã xác nhận, gồm phí vận chuyển. Dòng tiền thu về đã trừ phí vận chuyển; thu hồi công nợ là phần thu từ đơn được duyệt trước tháng nhận tiền.</p>{report.undated>0&&<p role="status">Có dữ liệu thiếu ngày xác nhận hoặc ngày duyệt, chưa đưa đầy đủ vào thống kê thu tiền.</p>}</div>;
}
