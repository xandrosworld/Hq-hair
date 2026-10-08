import {compensationTotal} from './compensation-totals.js';
import {isOfficialOrder,orderLabel} from './order-identity.js';
import {totals,round,today} from './shared.js';
import {aging,agingLabels} from './receivables.js';

export const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export function monthlySeries(orders,year,key){
 const values=Array(12).fill(0);
 for(const order of orders){if(!isOfficialOrder(order)||!validDate(order.date)||order.date.slice(0,4)!==String(year))continue;const month=Number(order.date.slice(5,7))-1;values[month]+=key==='count'?1:key==='discount'?(Number(order.discount)||0):key==='damages'?compensationTotal(order):totals(order)[key]||0}
 return values.map(round);
}
export {customerActivity} from './customer-statistics.js';
export function reportOrders(data,{month='all',owner='all',query='',bucket='all',overdue=false,debtOnly=false}={}){
 const customers=new Map(data.customers.map(c=>[c.id,c]));const q=query.trim().toLocaleLowerCase('vi');
 return data.orders.filter(o=>isOfficialOrder(o)&&(month==='all'||o.date.startsWith(month))&&(owner==='all'||(o.ownerId||o.sale)===owner)&&(!q||`${orderLabel(o)} ${o.customerId} ${customers.get(o.customerId)?.name||customers.get(o.customerId)?.company||''} ${o.sale}`.toLocaleLowerCase('vi').includes(q))&&(!debtOnly||totals(o).debt>0)&&(!overdue||aging(o).days>0)&&(bucket==='all'||aging(o).bucket===bucket));
}
export function financialSummary(orders){
 const result={revenue:0,receive:0,total:0,paid:0,pending:0,debt:0,overdue:0,unscheduled:0,debtCustomers:new Set(orders.filter(o=>isOfficialOrder(o)&&totals(o).debt>0).map(o=>o.customerId)).size};
 for(const o of orders.filter(o=>isOfficialOrder(o))){const t=totals(o);for(const key of ['revenue','receive','total','paid','pending','debt'])result[key]+=t[key];if(aging(o).days>0)result.overdue+=t.debt;if(aging(o).days===null)result.unscheduled+=t.debt}
 return Object.fromEntries(Object.entries(result).map(([k,v])=>[k,round(v)]));
}
export function csvCell(value){
 let text=String(value??'');
 if(/^[\s\uFEFF]*[=+@-]/u.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
}
export function reportCSV(orders,customers){
 const byId=new Map(customers.map(c=>[c.id,c]));
 const rows=[['Ma don','Ma khach','Khach hang','Nguoi phu trach','Ngay dat','Han giao hang','Doanh thu USD','Phai nhan USD','Da nhan USD','Cho xac nhan USD','Con no USD','So ngay qua han','Nhom tuoi no'],...orders.filter(o=>isOfficialOrder(o)).map(o=>{const t=totals(o),a=aging(o);return [orderLabel(o),o.customerId,byId.get(o.customerId)?.name||byId.get(o.customerId)?.company,o.sale,o.date,a.due,t.revenue,t.receive,t.paid,t.pending,t.debt,a.days??'',agingLabels[a.bucket]]})];
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
export const availableYears=orders=>[...new Set([today().slice(0,4),...orders.filter(o=>validDate(o.date)).map(o=>o.date.slice(0,4))])].sort().reverse();
