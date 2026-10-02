import {isOfficialOrder} from './order-identity.js';
import {groups,today} from './shared.js';
import {validDate} from './reporting.js';
export const openStages=[2,3,4,5,6,7,8,9];
export const compareOpenOrders=(a,b)=>a.stage-b.stage||(a.createdAt||a.date||'').localeCompare(b.createdAt||b.date||'')||a.id.localeCompare(b.id,undefined,{numeric:true});
export const growth=(value,previous)=>previous?Math.round((value-previous)/previous*100):null;
export function buyerStatistics(customers,orders,asOf=today()){
 const ids=new Set(customers.map(c=>c.id)),history=new Map();
 for(const o of orders){if(!isOfficialOrder(o)||!ids.has(o.customerId)||!validDate(o.date)||o.date>asOf)continue;const list=history.get(o.customerId)||[];list.push(o.date);history.set(o.customerId,list)}
 const month=asOf.slice(0,7);let repeat=0,newCustomers=0,previous=0;
 for(const dates of history.values()){dates.sort();if(dates.length>1)repeat++;if(dates[0].startsWith(month))newCustomers++;if(dates[0].slice(0,7)<month)previous++}
 return {total:history.size,repeat,newCustomers,rate:history.size?Math.round(repeat/history.size*100):0,growth:growth(history.size,previous)};
}
export function customerGroupSeries(customers,year,asOf=today()){
 return Array.from({length:12},(_,i)=>{const month=`${year}-${String(i+1).padStart(2,'0')}`;return {month:i+1,values:groups.map(group=>customers.filter(c=>c.group===group&&validDate(c.created?.slice(0,10))&&c.created.slice(0,7)<=month&&c.created.slice(0,10)<=asOf&&month<=asOf.slice(0,7)).length)}});
}

export function customerGroupGrowth(customers,group,asOf=today()){
 const rows=customers.filter(c=>c.group===group&&validDate(c.created?.slice(0,10))&&c.created.slice(0,10)<=asOf);
 return growth(rows.length,rows.filter(c=>c.created.slice(0,7)<asOf.slice(0,7)).length);
}
