import {productionLabels} from './workflow-state.js';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
export function applyFactoryWorkflow(order,user,action,body,event){
 if(!['factory-status','factory-office'].includes(action))return false;
 if(user.role!=='factory')fail(403,'Chỉ Xưởng được thực hiện bước này.');
 if(order.cancelledAt||order.contentLockedAt||!order.orderCode)fail(400,'Đơn chưa được duyệt hoặc đã khóa.');
 const time=new Date().toISOString(),note=typeof body.text==='string'?body.text.trim().slice(0,1000):'';
 if(action==='factory-status'){
  if(![3,4].includes(order.stage))fail(400,'Chỉ cập nhật Xưởng ghi nhận sau khi Kế toán duyệt hoặc khi Sale đã gửi lại.');
  if(!Object.hasOwn(productionLabels,body.status))fail(400,'Chọn trạng thái Xưởng hợp lệ.');
  if(order.stage===3&&body.status!=='producing')fail(400,'Cần ghi nhận sản xuất trước khi cập nhật hoặc gửi Sale Check.');
  if(order.production?.status==='paused'&&body.status==='sale_check')fail(400,'Cần tiếp tục sản xuất trước khi gửi Sale Check.');
  const recordedAt=order.production?.recordedAt||order.history?.find(h=>h.title==='Xưởng ghi nhận')?.time||order.production?.time||time;
  order.production={...order.production,status:body.status,by:user.id,name:user.name,time,note,recordedAt};
  if(body.status==='sale_check')order.production.checkAt=time;
  order.stage=body.status==='sale_check'?5:4;
  if(body.status==='sale_check')order.saleReview=null;
  event('Xưởng ghi nhận',productionLabels[body.status]+(note?' · '+note:''));
 }else{
  if(order.stage!==4||order.saleReview?.result!=='accepted'||order.production?.status==='paused')fail(400,'Cần Sale gửi lại không sửa và Xưởng không tạm dừng trước khi gửi văn phòng.');
  order.officeDispatch={by:user.id,name:user.name,time,note,dueDate:order.due||''};order.stage=6;
  event('Đã gửi đến văn phòng',note);
 }
 return true;
}
