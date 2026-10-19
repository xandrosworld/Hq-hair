import {approvalDate} from './order-identity.js';
import {receiptPartition} from './report-range.js';
import {round} from './shared.js';
// Group only the on-screen report; receipt dates/rates remain available underneath.
export function accountingDetailGroups(orders,report){
 const byId=new Map(orders.map(o=>[o.id,o])),current=new Map(),recovered=new Map(),unclassified=[];
 for(const a of report.approved)current.set(a.id,{...a,receipts:[]});
 for(const r of report.rows){
  const part=receiptPartition(approvalDate(byId.get(r.orderId)||{}),r.date);
  if(part==='unclassified'){unclassified.push(r);continue}
  const group=part==='current'?current:recovered;
  if(!group.has(r.orderId))group.set(r.orderId,{id:r.orderId,code:r.code,date:approvalDate(byId.get(r.orderId)||{}),revenue:null,receipts:[]});
  group.get(r.orderId).receipts.push(r);
 }
 const finish=group=>[...group.values()].map(g=>({...g,...Object.fromEntries(['paid','shippingPaid','revenuePaid'].map(k=>[k,round(g.receipts.reduce((sum,r)=>sum+r[k],0))])),paidVND:g.receipts.some(r=>r.paidVND==null)?null:g.receipts.reduce((sum,r)=>sum+r.paidVND,0)})).sort((a,b)=>b.date.localeCompare(a.date)||a.code.localeCompare(b.code));
 return {current:finish(current),recovered:finish(recovered),unclassified};
}
