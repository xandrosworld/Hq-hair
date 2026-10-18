import {approvalDate} from './order-identity.js';
import {receiptPartition} from './report-range.js';
// Missing rates never become a misleading partial VND total.
export function accountingCurrencies(orders,report,period){
 const byId=new Map(orders.map(o=>[o.id,o]));
 const sum=(rows,key,amount)=>rows.some(r=>r[key]==null&&r[amount]!==0)?null:rows.reduce((n,r)=>n+(r[key]||0),0);
 const current=report.rows.filter(r=>receiptPartition(approvalDate(byId.get(r.orderId)),r.date,period)==='current');
 const recovered=report.rows.filter(r=>receiptPartition(approvalDate(byId.get(r.orderId)),r.date,period)==='recovered');
 const convert=(amount,rate)=>amount===0?0:rate>0?Math.round(amount*rate):null;
 const approved=report.approved.map(r=>({...r,discount:Number(byId.get(r.id)?.discount)||0,rate:byId.get(r.id)?.accountingApproval?.exchangeRate}));
 const revenue=approved.map(r=>({usd:r.revenue,vnd:convert(r.revenue,r.rate)})),discount=approved.map(r=>({usd:r.discount,vnd:convert(r.discount,r.rate)})),damages=report.losses.map(r=>({usd:r.amount,vnd:convert(r.amount,r.exchangeRate)}));
 return {cash:sum(report.rows,'revenuePaidVND','revenuePaid'),total:sum(report.rows,'paidVND','paid'),shipping:sum(report.rows,'shippingPaidVND','shippingPaid'),current:report.currentReceipts===null?null:sum(current,'revenuePaidVND','revenuePaid'),recovered:report.recoveredDebt===null?null:sum(recovered,'revenuePaidVND','revenuePaid'),discount:sum(discount,'vnd','usd'),revenue:sum(revenue,'vnd','usd'),damages:sum(damages,'vnd','usd')};
}
