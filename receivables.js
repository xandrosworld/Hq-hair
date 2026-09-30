import {today} from './shared.js';
export const agingLabels={unscheduled:'Chưa đặt hạn',current:'Chưa quá hạn','1-30':'Quá hạn 1–30 ngày','31-60':'Quá hạn 31–60 ngày','61-90':'Quá hạn 61–90 ngày','91+':'Quá hạn trên 90 ngày'};
export function aging(order,asOf=today()){
 const due=order.paymentDue||'';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(due)||!Number.isFinite(Date.parse(due)))return {due:'',days:null,bucket:'unscheduled'};
 const days=Math.max(0,Math.floor((Date.parse(asOf)-Date.parse(due))/86400000));
 return {due,days,bucket:days===0?'current':days<=30?'1-30':days<=60?'31-60':days<=90?'61-90':'91+'};
}
