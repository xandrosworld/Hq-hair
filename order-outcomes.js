import {approvedHistory} from './approved-history.js';
import {deliveryTiming,deliveryDate} from './delivery-days.js';
import {feedbackLabels} from './workflow-state.js';
import {today} from './shared.js';
import {approvalDate} from './order-identity.js';
export function orderOutcomes(orders,asOf=today(),period='all'){
 const rows=approvedHistory(orders,asOf).filter(o=>period==='all'||approvalDate(o).startsWith(period)),result={total:rows.length,onTime:0,late:0,deliveryUnknown:0,delivered:0,received:0,feedbackUnknown:0,feedback:Object.fromEntries(Object.keys(feedbackLabels).map(k=>[k,0])),forfeited:0};
 for(const o of rows){
  const timing=deliveryTiming(o,asOf);
  if(timing.title==='Đã giao'&&(!timing.actual||timing.actual<=asOf)){result.delivered++;if(!timing.actual||timing.days==null)result.deliveryUnknown++;else if(timing.days<0)result.late++;else result.onTime++;}
  const received=deliveryDate(o.receivedAt||o.customerFeedback?.time||(o.history||[]).find(h=>h.title==='Đã nhận')?.time);
  if(received?received<=asOf:o.stage>=9){result.received++;if(Object.hasOwn(result.feedback,o.customerFeedback?.status))result.feedback[o.customerFeedback.status]++;else result.feedbackUnknown++;}
  if(o.finalPaymentCheck?.status==='forfeited'&&deliveryDate(o.cancelledAt||o.finalPaymentCheck.time)<=asOf)result.forfeited++;
 }
 return result;
}
