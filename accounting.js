import {totals,round} from './shared.js';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
export const paymentLabels={partial:'Thanh toán một phần',full:'Thanh toán đủ'};
function confirmReceipts(order,user,receipts,now){
 if(!Array.isArray(receipts))fail(400,'Danh sách chứng từ không hợp lệ.');
 const seen=new Set(),payments=structuredClone(order.payments);
 for(const receipt of receipts){
  const p=payments.find(p=>p.id===receipt?.id);
  if(!p||p.confirmed||seen.has(p.id))fail(400,'Chứng từ không hợp lệ, bị lặp hoặc đã xác nhận.');
  if(typeof receipt.amount!=='number'||!Number.isFinite(receipt.amount)||receipt.amount<=0||receipt.amount>10000000||Math.abs(receipt.amount-round(receipt.amount))>1e-8)fail(400,'Tiền thực nhận phải lớn hơn 0, tối đa 10.000.000 USD và hai chữ số thập phân.');
  seen.add(p.id);p.amount=receipt.amount;p.confirmed=true;p.confirmedBy=user.id;p.confirmedAt=now;
 }
 return payments;
}
export const canForfeitPaused=order=>order.stage===4&&order.production?.status==='paused'&&!!order.orderCode&&!order.cancelledAt&&!order.contentLockedAt;
export function applyAccounting(order,user,action,body,event){
 if(!['accounting-approve','accounting-cancel','accounting-final','accounting-forfeit'].includes(action))return false;
 if(user.role!=='accounting')fail(403,'Chỉ Kế toán được xử lý bước duyệt thanh toán.');
 if(order.cancelledAt||order.contentLockedAt)fail(400,'Đơn đã hủy hoặc đã khóa nội dung.');
 const now=new Date().toISOString(),note=typeof body.text==='string'?body.text.trim().slice(0,1000):'';
 if(['accounting-final','accounting-forfeit'].includes(action)){
  if(!(action==='accounting-forfeit'&&canForfeitPaused(order))&&(![6,7].includes(order.stage)||!order.orderCode||(!order.officeDispatch&&!order.history?.some(h=>['Đã gửi đến văn phòng','Gửi đến văn phòng'].includes(h.title)))))fail(400,'Xưởng phải xác nhận gửi đến văn phòng trước bước kiểm tra thanh toán lần cuối.');
  if(action==='accounting-forfeit'){
   const total=totals(order);
   if(total.paid<=0||total.debt<=0)fail(400,'Hủy mất cọc chỉ áp dụng khi đã nhận cọc và còn khoản chưa thanh toán.');
   if(!note)fail(400,'Nhập lý do hủy đơn mất cọc.');
   order.finalPaymentCheck={status:'forfeited',by:user.id,name:user.name,time:now,note,deposit:total.paid};
   order.cancelledAt=now;order.closedAt=now;order.cancelledBy=user.id;order.cancelReason=note;order.cancelType='deposit_forfeited';order.stage=10;order.completedAt=now;order.contentLockedAt=now;
   event('Kiểm tra thanh toán lần cuối',`Hủy đơn mất cọc · ${total.paid} USD · ${note}`);event('Hoàn thành','Đóng đơn do hủy mất cọc.');return true;
  }
  const payments=confirmReceipts(order,user,body.receipts||[],now),total=totals({...order,payments});
  if(total.debt>0)fail(400,'Phải xác nhận đủ tiền trước khi chuyển sang phiếu kiểm định và đặt ship.');
  order.payments=payments;order.finalPaymentCheck={status:'full',by:user.id,name:user.name,time:now,note,paid:total.paid};order.stage=8;
  event('Kiểm tra thanh toán lần cuối','Xác nhận đủ'+(note?' · '+note:''));return true;
 }
 if(order.stage!==2)fail(400,'Chỉ duyệt khi đơn đang chờ duyệt; đơn đã duyệt phải chuyển sang Xưởng.');
 if(action==='accounting-cancel'){
  if(order.payments.length||totals(order).paid>0||order.accountingApproval)fail(400,'Đơn đã có thanh toán/chứng từ, không thể hủy tại bước này.');
  if(!note)fail(400,'Nhập lý do hủy đơn.');
  order.cancelledAt=now;order.cancelledBy=user.id;order.cancelReason=note;order.stage=-1;
  event('Hủy đơn',note);return true;
 }
 if(!Object.hasOwn(paymentLabels,body.paymentStatus))fail(400,'Chọn thanh toán một phần hoặc thanh toán đủ.');
 if(!Array.isArray(body.receipts)||!body.receipts.length)fail(400,'Chọn ít nhất một chứng từ và nhập số tiền thực nhận.');
 const payments=confirmReceipts(order,user,body.receipts,now);
 const total=totals({...order,payments});
 if(body.paymentStatus==='full'&&total.debt>0)fail(400,'Tiền xác nhận chưa đủ tổng phải nhận. Chọn thanh toán một phần.');
 if(body.paymentStatus==='partial'&&(total.paid<=0||total.debt<=0))fail(400,'Thanh toán một phần cần có tiền đã nhận và còn công nợ.');
 order.payments=payments;order.stage=3;
 order.accountingApproval={status:body.paymentStatus,by:user.id,name:user.name,time:now,paid:total.paid,note};
 event('Kế toán duyệt',paymentLabels[body.paymentStatus]+(note?' · '+note:''));
 return true;
}
