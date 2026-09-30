import {totals,today} from './shared.js';

const fail=message=>{throw Object.assign(new Error(message),{status:400})};
const text=(value,max=1000)=>typeof value==='string'?value.trim().slice(0,max):'';
export const contentLocked=order=>!!order.contentLockedAt||!!order.inspection?.completedAt||order.stage>=9;
export function exceptionReason(value){const reason=text(value);if(reason.length<5)fail('Nhập lý do chỉnh sửa ngoại lệ (ít nhất 5 ký tự).');return reason}
export function assertContentAction(order,user,action,body){
 if(!contentLocked(order)||['message','received','complete','manager-stage'].includes(action))return;
 if(user.role!=='manager')fail('Nội dung đơn đã khóa sau bước 8. Chỉ được trao đổi và thực hiện bước tiếp theo.');
 exceptionReason(body.reason||body.text);
}
export function applySaleWorkflow(order,user,action,body,event){
 if(!['accept','rework','inspection','received','complete','manager-stage'].includes(action))return false;
 if(!['sale','manager'].includes(user.role))fail('Bạn không có quyền thực hiện bước này.');
 const now=new Date().toISOString();
 if(action==='accept'||action==='rework'){
  if(order.stage!==5)fail('Đơn chưa đến bước Sale tiếp nhận.');
  const note=text(body.text);
  if(action==='rework'&&!note)fail('Nhập yêu cầu sửa lại.');
  order.stage=4;order.saleReview={result:action==='accept'?'accepted':'rework',by:user.id,time:now,note};
  event(action==='accept'?'Sale xác nhận tiếp tục sản xuất':'Yêu cầu xưởng sửa lại',note||'Xưởng tiếp tục xử lý và tự xác nhận gửi văn phòng.');
 }else if(action==='inspection'){
  if(order.stage!==8||contentLocked(order))fail('Chỉ hoàn tất kiểm định khi đang ở bước 8 và chưa khóa nội dung.');
  const carrier=text(body.carrier,100),tracking=text(body.tracking,200),date=text(body.shippedDate,10);
  if(!carrier||!tracking||body.checked!==true)fail('Cần đơn vị vận chuyển, mã vận đơn và xác nhận đã kiểm định hàng.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date<order.date||date>today())fail('Ngày đặt ship phải hợp lệ, không trước ngày đặt hàng hoặc sau hôm nay.');
  order.carrier=carrier;order.service=text(body.service,100);order.tracking=tracking;order.shippedDate=date;
  order.inspection={reference:text(body.reference,200),note:text(body.text),completedAt:now,by:user.id};
  order.contentLockedAt=now;order.editRequested=false;
  event('Kiểm định & đặt ship',`Đã kiểm định · ${carrier} · ${tracking}. Nội dung đơn được khóa.`);
 }else if(action==='received'){
  if(order.stage!==8||!contentLocked(order))fail('Cần hoàn tất kiểm định và đặt ship trước khi xác nhận khách đã nhận.');
  order.stage=9;order.receivedAt=now;event('Đã nhận',text(body.text));
 }else if(action==='complete'){
  if(order.stage!==9)fail('Chỉ đóng đơn sau khi đã xác nhận khách nhận hàng.');
  const debt=totals(order).debt;
  if(debt>0&&user.role!=='manager')fail('Đơn còn công nợ. Cần quản trị xác nhận ngoại lệ; công nợ không tự được xóa khi đóng đơn.');
  const note=debt>0?exceptionReason(body.text):text(body.text);
  order.stage=10;order.completedAt=now;event('Hoàn thành',note+(debt>0?` · Ngoại lệ quản trị: còn nợ ${debt} USD, tiếp tục theo dõi công nợ.`:''));
 }else{
  if(user.role!=='manager')fail('Chỉ quản trị được điều chỉnh trạng thái ngoại lệ.');
  const note=exceptionReason(body.text),stage=body.stage;
  if(!Number.isInteger(stage)||stage<2||stage>10||!order.stage||stage===order.stage)fail('Chọn trạng thái mới từ bước 2 đến bước 10 cho đơn đã gửi.');
  const before=order.stage;order.stage=stage;
  if(stage>=9&&!order.contentLockedAt)order.contentLockedAt=now;
  event('Quản trị điều chỉnh trạng thái',`Bước ${before} → ${stage}. ${note}. Không thay đổi xác nhận thanh toán.`);
 }
 return true;
}
