import {buyerStatistics} from './customer-statistics.js';
import {groups,today} from './shared.js';

export function percentageOf(value,base){
 return Number.isFinite(value)&&Number.isFinite(base)&&base>0?value/base*100:null;
}
export const percentageText=value=>value===null?'—':new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(value)+'%';

// Count each authorized customer once, using the same approval/cutoff rules as
// the "customers who purchased" total. Group selection never changes the base.
export function buyerGroupShares(customers,orders,cutoff=today()){
 const total=buyerStatistics(customers,orders,cutoff,cutoff.slice(0,7),'all').total;
 return {total,groups:groups.map(group=>{const count=buyerStatistics(customers.filter(c=>c.group===group),orders,cutoff,cutoff.slice(0,7),'all').total;return {group,count,percent:percentageOf(count,total)}})};
}
