import {today} from './shared.js';
export function deliveryDays(due,asOf=today()){
 const valid=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 return valid(due)&&valid(asOf)?Math.round((Date.parse(due)-Date.parse(asOf))/86400000):null;
}
export function deliveryDaysLabel(days){return days===null?'—':days===0?'Hôm nay':days<0?`Quá hạn ${-days} ngày`:`${days} ngày`}
