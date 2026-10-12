import {approvalDate,orderLabel} from './order-identity.js';
import {isFinancialOrder} from './reporting.js';
import {totals,round} from './shared.js';
export function accountingPeriod(orders,period=''){
 const rows=[],approved=[];let undated=0;
 for(const o of orders.filter(isFinancialOrder)){
 const approvedOn=approvalDate(o);if(approvedOn&&approvedOn.startsWith(period))approved.push({id:o.id,code:orderLabel(o),date:approvedOn,revenue:totals(o).revenue});
 if(!approvedOn)undated++;
 let remaining=Math.max(0,Number(o.shippingFee)||0);
 const receipts=(o.payments||[]).filter(p=>p.confirmed).map((p,i)=>({...p,index:i,day:p.receivedDate||p.date||''})).sort((a,b)=>a.day.localeCompare(b.day)||a.index-b.index);
 for(const p of receipts){const paid=round(Number(p.amount)||0),shippingPaid=round(Math.min(remaining,Math.max(0,paid)));remaining=round(remaining-shippingPaid);if(!p.day){undated++;continue}if(!p.day.startsWith(period))continue;rows.push({id:p.id,orderId:o.id,code:orderLabel(o),date:p.day,legacy:!p.receivedDate,paid,shippingPaid,revenuePaid:round(paid-shippingPaid)})}
 }
 return {approved,rows:rows.sort((a,b)=>b.date.localeCompare(a.date)),undated,revenue:round(approved.reduce((s,r)=>s+r.revenue,0)),...Object.fromEntries(['paid','shippingPaid','revenuePaid'].map(k=>[k,round(rows.reduce((s,r)=>s+r[k],0))]))};
}
