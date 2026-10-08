import {randomUUID} from 'node:crypto';
import {today,round} from './shared.js';
const fail=message=>{throw Object.assign(new Error(message),{status:400})};
export function applyCompensation(order,user,action,body,event){
 if(!['compensation-add','compensation-void'].includes(action))return false;
 if(!['sale','manager','sales_lead'].includes(user.role))fail('Bạn không có quyền ghi nhận bồi thường.');
 if(!order.orderCode||order.stage<3||order.cancelledAt)fail('Chỉ ghi nhận bồi thường trên đơn đã duyệt.');
 const note=typeof body.text==='string'?body.text.trim():'';
 if(!note||note.length>2000)fail('Nhập lý do hợp lệ, tối đa 2.000 ký tự.');
 const now=new Date().toISOString();
 if(action==='compensation-add'){
  const amount=Number(body.amount),date=body.date;
  if(!['number','string'].includes(typeof body.amount)||!Number.isFinite(amount)||amount<=0||amount>10000000||Math.abs(amount*100-Math.round(amount*100))>0.00001)fail('Tiền bồi thường phải lớn hơn 0, tối đa 10.000.000 USD và hai số thập phân.');
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date<order.date||date>today())fail('Ngày bồi thường phải từ ngày đặt đơn đến hôm nay.');
  const entry={id:randomUUID(),amount:round(amount),date,note,by:user.id,name:user.name,time:now};
  order.compensations=[...(order.compensations||[]),entry];
  event('Ghi nhận bồi thường',`${entry.amount} USD · ${date} · ${note}`);
 }else{
  const entry=order.compensations?.find(e=>e.id===body.entryId);
  if(!entry||entry.voidedAt)fail('Khoản bồi thường không tồn tại hoặc đã hủy.');
  if(user.role!=='manager'&&entry.by!==user.id)fail('Chỉ người ghi nhận hoặc quản lý được hủy khoản này.');
  Object.assign(entry,{voidedAt:now,voidedBy:user.id,voidReason:note});
  event('Hủy ghi nhận bồi thường',`${entry.amount} USD · ${entry.date} · ${note}`);
 }
 return true;
}
