import {feedbackLabels,saleReviewLabels} from './workflow-state.js';
import {totals,today} from './shared.js';

const fail=message=>{throw Object.assign(new Error(message),{status:400})};
const text=(value,max=1000)=>typeof value==='string'?value.trim().slice(0,max):'';
export const contentLocked=order=>!!order.contentLockedAt||!!order.inspection?.completedAt||order.stage>=9;
export function exceptionReason(value){const reason=text(value);if(reason.length<5)fail('Nhập lý do chỉnh sửa ngoại lệ (ít nhất 5 ký tự).');return reason}
export function assertContentAction(order,user,action,body){
 if(!contentLocked(order)||['message','received','complete','manager-stage','compensation-add','compensation-void'].includes(action))return;
 if(user.role!=='manager')fail('Nội dung đơn đã khóa sau bước 8. Chỉ được trao đổi và thực hiện bước tiếp theo.');
 exceptionReason(body.reason||body.text);
}
export function applySaleWorkflow(order,user,action,body,event){
 if(!['accept','rework','inspection','received','complete','manager-stage'].includes(action))return false;
 if(!['sale','manager','sales_lead'].includes(user.role))fail('Bạn không có quyền thực hiện bước này.');
 const now=new Date().toISOString();
 if(action==='accept'||action==='rework'){
  if(order.stage!==5)fail('Đơn chưa đến bước Sale tiếp nhận.');
  const note=text(body.text);
  if(action==='rework'&&!note)fail('Nhập yêu cầu sửa lại.');
  order.stage=4;order.saleReview={result:action==='accept'?'accepted':'rework',by:user.id,name:user.name,time:now,note};
  event('Sale tiếp nhận',saleReviewLabels[order.saleReview.result]+(note?' · '+note:''));
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
  if(![8,9].includes(order.stage)||!contentLocked(order))fail('Cần hoàn tất kiểm định và đặt ship trước khi xác nhận khách đã nhận.');
  if(!Object.hasOwn(feedbackLabels,body.feedback))fail('Chọn trạng thái phản hồi của khách.');
  order.customerFeedback={status:body.feedback,by:user.id,name:user.name,time:now,note:text(body.text)};
  order.stage=9;order.receivedAt=order.receivedAt||now;event('Đã nhận',feedbackLabels[body.feedback]+(body.text?' · '+text(body.text):''));
 }else if(action==='complete'){
  if(order.stage!==9)fail('Chỉ đóng đơn sau khi đã xác nhận khách nhận hàng.');
  const debt=totals(order).debt;
  if(debt>0&&user.role!=='manager')fail('Đơn còn công nợ. Cần quản trị xác nhận ngoại lệ; công nợ không tự được xóa khi đóng đơn.');
  const note=debt>0?exceptionReason(body.text):text(body.text);
  order.stage=10;order.completedAt=now;event('Hoàn thành',note+(debt>0?` · Ngoại lệ quản trị: còn nợ ${debt} USD, tiếp tục theo dõi công nợ.`:''));
 }else{
  fail('Phải thao tác tuần tự từng bước, không được chuyển trạng thái tắt.');
 }
 return true;
}
