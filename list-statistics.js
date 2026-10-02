export {buyerStatistics} from './customer-statistics.js';
import {groups,today} from './shared.js';
import {validDate} from './reporting.js';
export const openStages=[2,3,4,5,6,7,8,9];
export const compareOpenOrders=(a,b)=>a.stage-b.stage||(a.createdAt||a.date||'').localeCompare(b.createdAt||b.date||'')||a.id.localeCompare(b.id,undefined,{numeric:true});
export const growth=(value,previous)=>previous?Math.round((value-previous)/previous*100):null;
export function customerGroupSeries(customers,year,asOf=today()){
 return Array.from({length:12},(_,i)=>{const month=`${year}-${String(i+1).padStart(2,'0')}`;return {month:i+1,values:groups.map(group=>customers.filter(c=>c.group===group&&validDate(c.created?.slice(0,10))&&c.created.slice(0,7)<=month&&c.created.slice(0,10)<=asOf&&month<=asOf.slice(0,7)).length)}});
}

export function customerGroupGrowth(customers,group,asOf=today()){
 const rows=customers.filter(c=>c.group===group&&validDate(c.created?.slice(0,10))&&c.created.slice(0,10)<=asOf);
 return growth(rows.length,rows.filter(c=>c.created.slice(0,7)<asOf.slice(0,7)).length);
}
