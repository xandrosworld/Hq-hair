import {approvalDate} from './order-identity.js';
import {today} from './shared.js';
export function approvedHistory(orders,asOf=today()){
 return orders.filter(o=>o.orderCode&&approvalDate(o)&&approvalDate(o)<=asOf).sort((a,b)=>approvalDate(b).localeCompare(approvalDate(a))||String(b.orderCode).localeCompare(String(a.orderCode),undefined,{numeric:true}));
}
export function approvedMonths(orders,year,asOf=today()){
 const rows=approvedHistory(orders,asOf),count=month=>rows.filter(o=>approvalDate(o).startsWith(month)).length;
 return Array.from({length:12},(_,i)=>{
  const month=`${year}-${String(i+1).padStart(2,'0')}`,previous=i?`${year}-${String(i).padStart(2,'0')}`:`${Number(year)-1}-12`;
  const value=count(month),before=count(previous),future=month>asOf.slice(0,7);
  return {month,count:value,previous:before,future,growth:future?null:before?Math.round((value-before)/before*100):value?null:0};
 });
}
