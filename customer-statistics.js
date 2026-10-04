import {approvalDate,isOfficialOrder} from './order-identity.js';
import {today} from './shared.js';

const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export function customerRatio({total,repeat,newCustomers}){
 const notReturned=Math.max(0,total-repeat);
 return {notReturned,ratio:notReturned?newCustomers/notReturned:null};
}
export function buyerStatistics(customers,orders,asOf=today(),month=asOf.slice(0,7),mode='month'){
 const empty={total:0,repeat:0,newCustomers:0,rate:0,growth:null};
 if(mode==='all')month=asOf.slice(0,7);
 if(mode==='year')month=month.slice(0,4)+(month.slice(0,4)===asOf.slice(0,4)?asOf.slice(4,7):'-12');
 if(!validDate(asOf)||!validDate(month+'-01')||month>asOf.slice(0,7))return empty;
 const monthEnd=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).toISOString().slice(0,10);
 const cutoff=month===asOf.slice(0,7)?asOf:monthEnd;
 const start=mode==='all'?'0000-01-01':mode==='year'?month.slice(0,4)+'-01-01':month+'-01';
 const profiles=new Map(customers.map(c=>[c.id,c])),history=new Map();
 for(const o of orders){
  const date=approvalDate(o);
  if(!isOfficialOrder(o)||!profiles.has(o.customerId)||!validDate(date)||date>cutoff)continue;
  const rows=history.get(o.customerId)||[];rows.push(date);history.set(o.customerId,rows);
 }
 let repeat=0,newCustomers=0,previous=0;
 for(const [id,dates] of history){
  dates.sort();
  if(dates.slice(1).some(date=>date>=start))repeat++;
  const created=profiles.get(id).created?.slice(0,10);
  if(validDate(created)&&created>=start&&created<=cutoff)newCustomers++;
  if(dates[0]<start)previous++;
 }
 const total=history.size;
 return {total,repeat,newCustomers,rate:total?Math.round(repeat/total*100):0,growth:previous?Math.round((total-previous)/previous*100):null};
}

export function customerActivity(orders,year,customers=[],asOf=today()){
 return Array.from({length:12},(_,i)=>{
  const month=`${year}-${String(i+1).padStart(2,'0')}`,s=buyerStatistics(customers,orders,asOf,month);
  return {month:i+1,newCustomers:s.newCustomers,returning:s.repeat,orders:orders.filter(o=>isOfficialOrder(o)&&approvalDate(o).startsWith(month)&&approvalDate(o)<=asOf).length};
 });
}
