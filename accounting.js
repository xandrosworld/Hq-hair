import {totals,round} from './shared.js';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
export const paymentLabels={partial:'Thanh toán một phần',full:'Thanh toán đủ'};
export function applyAccounting(order,user,action,body,event){
 if(!['accounting-approve','accounting-cancel'].includes(action))return false;
 if(user.role!=='accounting')fail(403,'Chỉ Kế toán được xử lý bước duyệt thanh toán.');
 if(![2,3].includes(order.stage)||order.cancelledAt||order.contentLockedAt)fail(400,'Chỉ xử lý đơn đang chờ duyệt hoặc ở bước Kế toán duyệt.');
 const now=new Date().toISOString(),note=typeof body.text==='string'?body.text.trim().slice(0,1000):'';
 if(action==='accounting-cancel'){
  if(order.payments.length||totals(order).paid>0||order.accountingApproval)fail(400,'Đơn đã có thanh toán/chứng từ, không thể hủy tại bước này.');
  if(!note)fail(400,'Nhập lý do hủy đơn.');
  order.cancelledAt=now;order.cancelledBy=user.id;order.cancelReason=note;order.stage=-1;
  event('Hủy đơn',note);return true;
 }
 if(!Object.hasOwn(paymentLabels,body.paymentStatus))fail(400,'Chọn thanh toán một phần hoặc thanh toán đủ.');
 if(!Array.isArray(body.receipts)||!body.receipts.length)fail(400,'Chọn ít nhất một chứng từ và nhập số tiền thực nhận.');
 const seen=new Set(),payments=structuredClone(order.payments);
 for(const receipt of body.receipts){
  const p=payments.find(p=>p.id===receipt?.id);
  if(!p||p.confirmed||seen.has(p.id))fail(400,'Chứng từ không hợp lệ, bị lặp hoặc đã xác nhận.');
  if(typeof receipt.amount!=='number'||!Number.isFinite(receipt.amount)||receipt.amount<=0||receipt.amount>10000000||Math.abs(receipt.amount-round(receipt.amount))>1e-8)fail(400,'Tiền thực nhận phải lớn hơn 0, tối đa 10.000.000 USD và hai chữ số thập phân.');
  seen.add(p.id);p.amount=receipt.amount;p.confirmed=true;p.confirmedBy=user.id;p.confirmedAt=now;
 }
 const total=totals({...order,payments});
 if(body.paymentStatus==='full'&&total.debt>0)fail(400,'Tiền xác nhận chưa đủ tổng phải nhận. Chọn thanh toán một phần.');
 if(body.paymentStatus==='partial'&&(total.paid<=0||total.debt<=0))fail(400,'Thanh toán một phần cần có tiền đã nhận và còn công nợ.');
 order.payments=payments;order.stage=3;
 order.accountingApproval={status:body.paymentStatus,by:user.id,name:user.name,time:now,paid:total.paid,note};
 event('Kế toán duyệt',paymentLabels[body.paymentStatus]+(note?' · '+note:''));
 return true;
}
