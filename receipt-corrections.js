import {round,today} from './shared.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
export function receiptDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value&&value<=today()}
export function applyReceiptCorrection(order,user,action,body,event){
 if(!['accounting-grant-receipt','accounting-correct-receipt'].includes(action))return false;
 const manager=action==='accounting-grant-receipt';
 if(user.role!==(manager?'manager':'accounting'))fail(403,'Không có quyền thực hiện thao tác này.');
 const p=order.payments.find(p=>p.id===body.paymentId&&p.confirmed);
 if(!p)fail(400,'Chỉ điều chỉnh khoản thu đã xác nhận.');
 const reason=typeof body.text==='string'?body.text.trim():'';
 if(reason.length<5||reason.length>1000)fail(400,'Nhập lý do từ 5 đến 1.000 ký tự.');
 const time=new Date().toISOString();
 if(manager){p.correctionGrant={by:user.id,name:user.name,time,reason};event('Cấp quyền sửa khoản thu',`${p.id} · ${reason}`);return true}
 if(!p.correctionGrant)fail(403,'Cần quản trị cấp quyền sửa khoản thu này.');
 if(typeof body.amount!=='number'||!Number.isFinite(body.amount)||body.amount<=0||body.amount>10000000||Math.abs(body.amount-round(body.amount))>1e-8||!receiptDate(body.receivedDate))fail(400,'Nhập tiền thực nhận hợp lệ và ngày thực nhận không sau hôm nay.');
 const before={amount:p.amount,receivedDate:p.receivedDate||p.date||null};
 p.corrections=[...(p.corrections||[]),{before,after:{amount:body.amount,receivedDate:body.receivedDate},by:user.id,name:user.name,time,reason,grant:p.correctionGrant}];
 p.amount=body.amount;p.receivedDate=body.receivedDate;delete p.correctionGrant;
 event('Kế toán điều chỉnh khoản thu',`${p.id} · ${before.amount} → ${p.amount} USD · ${reason}`);
 return true;
}
