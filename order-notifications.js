import {deliveryDate} from './delivery-days.js';
export function orderNotifications(orders,now=new Date()){
 const current=deliveryDate(now.toISOString());
 const since=new Date(Date.parse(current)-5*86400000).toISOString().slice(0,10);
 const recent=time=>{const date=deliveryDate(time);return date&&date>=since&&date<=current&&Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/.test(time)?time:time+'+07:00')<=now.getTime()};
 const items=[];
 for(const order of orders){
  for(const [i,h] of (order.history||[]).entries()){
   if(!recent(h.time)||h.snapshot||['Nhập đơn','Cập nhật bản nháp','Lưu phiên bản trước chỉnh sửa'].includes(h.title))continue;
   items.push({id:`${order.id}:history:${i}`,order,time:h.time,kind:'progress',title:h.title==='Kế toán duyệt'?'Đã duyệt':h.title,actor:h.actor,note:h.note});
  }
  for(const [i,m] of (order.messages||[]).entries())if(recent(m.time))items.push({id:`${order.id}:message:${m.id||i}`,order,time:m.time,kind:'message',title:`${m.author||'Nhân viên'} đã gửi tin nhắn`,actor:m.author,note:m.text||`Đã gửi ${m.images?.length||0} ảnh/video`});
 }
 return items.sort((a,b)=>b.time.localeCompare(a.time));
}
