import {today} from './shared.js';
import {deliveryTiming} from './delivery-days.js';
export const agingLabels={current:'Chưa quá hạn',overdue:'Quá hạn'};
export function aging(order,asOf=today()){
 const timing=deliveryTiming(order,asOf);
 const days=Number.isFinite(timing.days)?Math.max(0,-timing.days):0;
 return {due:timing.due||'',days,bucket:days>0?'overdue':'current'};
}
