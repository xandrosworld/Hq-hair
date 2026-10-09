import {approvalDate} from './order-identity.js';
import {deliveryDate,deliveryDays,deliveryTiming} from './delivery-days.js';
import {today,round} from './shared.js';
export const factoryTabs={overview:'Tổng quan',waiting:'Chưa ghi nhận',production:'Đã ghi nhận',review:'Đã gửi Sale Check',office:'Đã gửi văn phòng',analytics:'Thống kê & phân tích'};
export const factoryOrders=orders=>orders.filter(o=>o.orderCode&&o.stage>=3);
export function factoryGroup(o){
 if(o.cancelledAt)return 'production';
 if(o.officeDispatch||o.stage>=6)return 'office';
 if(o.stage===4&&o.production?.status==='paused')return 'production';
 if(o.stage===5||o.saleReview)return 'review';
 return o.stage===3?'waiting':'production';
}
export function factoryState(o){
 if(o.cancelledAt)return o.cancelType==='deposit_forfeited'?'forfeited':'cancelled';
 if(factoryGroup(o)==='office')return o.inspection?.completedAt||o.stage>=9?'shipped':'payment';
 if(factoryGroup(o)==='review')return o.stage===5?'waiting_review':o.saleReview?.result==='rework'?'rework':'accepted';
 return o.stage===3?'waiting':o.production?.status==='paused'?'paused':'producing';
}
export const factoryStateLabels={waiting:'Chờ ghi nhận',producing:'Đang sản xuất',paused:'Tạm dừng',forfeited:'Hủy - Mất cọc',cancelled:'Đã hủy',waiting_review:'Chờ Sale Check',rework:'Cần sửa',accepted:'Tiếp tục sản xuất',payment:'Kiểm tra thanh toán / đặt ship',shipped:'Đã gửi khách'};
export function quantities(o){
 const result={};
 for(const item of o.items||[]){let unit=String(item.unit||'').trim();if(/^(g|gram|grams)$/i.test(unit))unit='g';if(!unit)unit='Chưa rõ đơn vị';result[unit]=round((result[unit]||0)+(Number(item.qty)||0))}
 return result;
}
export const quantityText=o=>Object.entries(quantities(o)).map(([unit,n])=>`${n.toLocaleString('vi-VN')} ${unit}`).join(' · ')||'—';
export const recordedAt=o=>o.production?.recordedAt||o.history?.find(h=>h.title==='Xưởng ghi nhận')?.time||o.production?.time||'';
export const checkAt=o=>o.production?.checkAt||o.history?.findLast(h=>h.title==='Xưởng ghi nhận'&&h.note?.includes('Sale Check'))?.time||(o.stage===5?o.production?.time:'')||'';
export const waitingDays=(o,asOf=today())=>{const date=deliveryDate(checkAt(o)),end=o.stage===5?asOf:deliveryDate(o.saleReview?.time);const days=deliveryDays(date,end);return days==null?null:Math.max(0,-days)};
export const factoryDate=(o,tab)=>deliveryDate(tab==='waiting'?o.date:tab==='production'?recordedAt(o):tab==='review'?checkAt(o):deliveryTiming(o).actual);
export function factoryReport(orders,year){
 const rows=Array.from({length:12},(_,i)=>({month:`${year}-${String(i+1).padStart(2,'0')}`,total:0,early:0,onTime:0,late:0,unknown:0,grams:0,units:{}}));
 for(const o of factoryOrders(orders)){
  if(o.cancelledAt)continue;
  const timing=deliveryTiming(o),month=timing.actual.slice(0,7),row=rows.find(r=>r.month===month);
  if(!row)continue;
  row.total++;row[timing.days==null?'unknown':timing.days>0?'early':timing.days===0?'onTime':'late']++;
  for(const [unit,n] of Object.entries(quantities(o))){row.units[unit]=round((row.units[unit]||0)+n);if(unit==='g')row.grams=round(row.grams+n)}
 }
 return rows;
}
export function filterFactoryOrders(orders,{tab='waiting',query='',state='all',from='',to='',dueFrom='',dueTo='',urgency='all',sort='due',timing='all',customers=[]}={}){
 const q=query.trim().toLocaleLowerCase('vi');
 const names=new Map(customers.map(c=>[c.id,`${c.name||''} ${c.company||''}`]));
 return factoryOrders(orders).filter(o=>{
  if(factoryGroup(o)!==tab)return false;
  if(q&&!`${o.orderCode} ${o.sale} ${names.get(o.customerId)||''} ${o.note||''} ${o.production?.note||''} ${o.saleReview?.note||''} ${(o.items||[]).map(i=>`${i.name} ${i.productNote||''}`).join(' ')}`.toLocaleLowerCase('vi').includes(q))return false;
  if(state!=='all'&&factoryState(o)!==state)return false;
  const date=factoryDate(o,tab);
  if(from&&(!date||date<from)||to&&(!date||date>to))return false;
  const t=deliveryTiming(o);
  if(dueFrom&&(!t.due||t.due<dueFrom)||dueTo&&(!t.due||t.due>dueTo))return false;
  if(urgency==='overdue'&&!(t.days<0)||urgency==='urgent'&&!(t.days!=null&&t.days>=0&&t.days<=3))return false;
  if(timing!=='all'&&(timing==='unknown'?t.days!=null:timing==='early'?!(t.days>0):timing==='onTime'?t.days!==0:!(t.days<0)))return false;
  return true;
 }).sort((a,b)=>sort==='newest'?factoryDate(b,tab).localeCompare(factoryDate(a,tab)):sort==='oldest'?(factoryDate(a,tab)||'9999').localeCompare(factoryDate(b,tab)||'9999'):(deliveryTiming(a).due||'9999').localeCompare(deliveryTiming(b).due||'9999')||a.orderCode.localeCompare(b.orderCode));
}

// Calendar-day durations start at first accounting approval, never order entry.
export function factoryTiming(order){
 const timing=deliveryTiming(order),approved=approvalDate(order);
 const duration=end=>{const days=deliveryDays(end,approved);return days==null||days<0?null:days};
 return {...timing,approved,plannedDays:duration(timing.due),actualDays:timing.actual?duration(timing.actual):null};
}
