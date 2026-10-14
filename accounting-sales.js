import {datedFinancialSummary} from './dated-financial-report.js';
export const saleKey=o=>o.ownerId||`legacy:${o.sale||'Chưa xác định'}`;
export function accountingSales(orders,month='',asOf){
 const groups=new Map();
 for(const o of orders){const key=saleKey(o);if(!groups.has(key))groups.set(key,{key,name:o.sale||'Chưa xác định',orders:[]});groups.get(key).orders.push(o)}
 return [...groups.values()].map(g=>({...g,...datedFinancialSummary(g.orders,month,asOf)})).sort((a,b)=>a.name.localeCompare(b.name,'vi'));
}
