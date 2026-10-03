import {today} from './shared.js';
export function deliveryDays(due,asOf=today()){
 const valid=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 return valid(due)&&valid(asOf)?Math.round((Date.parse(due)-Date.parse(asOf))/86400000):null;
}
export function deliveryDaysLabel(days){return days===null?'—':days===0?'Hôm nay':days<0?`Quá hạn ${-days} ngày`:`${days} ngày`}
const vietnamDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
export function deliveryDate(value){
 if(typeof value!=='string'||!value)return '';
 if(/^\d{4}-\d{2}-\d{2}$/.test(value))return deliveryDays(value,value)===null?'':value;
 const date=new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)?value:value+'+07:00');
 return Number.isFinite(date.getTime())?vietnamDate.format(date):'';
}
export function deliveryTiming(order,asOf=today()){
 const events=(order.history||[]).filter(h=>['Đã gửi đến văn phòng','Gửi đến văn phòng'].includes(h.title));
 const dates=[order.officeDispatch?.time,...events.map(h=>h.time)].map(deliveryDate).filter(Boolean).sort();
 const delivered=!!order.officeDispatch||events.length>0,actual=dates[0]||'';
 const due=order.officeDispatch?.dueDate??order.due;
 if(order.cancelledAt&&!delivered)return {title:'Đã hủy',detail:'Dừng theo dõi hạn giao',tone:'muted',actual:'',due};
 if(delivered&&!actual)return {title:'Đã giao',detail:'Thiếu ngày xác nhận',tone:'muted',actual:'',due};
 const days=deliveryDays(due,delivered?actual:asOf),title=delivered?'Đã giao':'Chưa giao';
 if(days===null)return {title,detail:'Chưa có hạn giao hợp lệ',tone:'muted',actual,due};
 const detail=delivered?(days>0?`Sớm ${days} ngày`:days===0?'Đúng hạn':`Trễ ${-days} ngày`):(days>0?`Còn ${days} ngày`:days===0?'Đến hạn hôm nay':`Quá hạn ${-days} ngày`);
 return {title,detail,tone:days<0?'red':!delivered&&days===0?'amber':'green',actual,due,days};
}
