import {createHash,randomUUID} from 'node:crypto';
import {validDate} from './reporting.js';
import {today} from './shared.js';
import {contentLocked,exceptionReason} from './order-workflow.js';
import {parseChatImages} from './chat-images.js';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
const clean=(value,max=1000)=>typeof value==='string'?value.trim().slice(0,max):'';
export function qcSignature(items){return createHash('sha256').update(JSON.stringify(items)).digest('hex')}
export function assertQCWrite(order,user,body){
 if(!['sale','manager'].includes(user.role))fail(403,'Chỉ Sale phụ trách hoặc quản trị được lập phiếu kiểm định.');
 if(user.role!=='manager'&&order.stage!==8)fail(400,'Chỉ lập phiếu kiểm định khi đơn đến bước 8.');
 if(order.stage<=0||order.cancelledAt)fail(400,'Chỉ lập phiếu cho đơn đã gửi duyệt và chưa hủy.');
 if(contentLocked(order)){
  if(user.role!=='manager')fail(400,'Đơn đã khóa sau bước 8, không thể sửa phiếu kiểm định.');
  exceptionReason(body.reason);
 }
}
export function qcMedia(input){
 if(typeof input?.data!=='string')fail(400,'Chọn ảnh hoặc video kiểm định.');
 if(input.data.startsWith('data:image/')){const file=parseChatImages([input])[0];if(file.size>5*1024*1024)fail(400,'Ảnh kiểm định tối đa 5 MiB.');return file;}
 const match=input.data.match(/^data:(video\/(?:mp4|webm));base64,([A-Za-z0-9+/]+={0,2})$/);
 if(!match||match[2].length>16*1024*1024)fail(400,'Video chỉ nhận MP4/WebM tối đa 12 MiB.');
 const bytes=Buffer.from(match[2],'base64'),mime=match[1];
 const valid=mime==='video/mp4'?bytes.subarray(4,8).toString()==='ftyp':bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
 if(!valid||bytes.length<16||bytes.length>12*1024*1024)fail(400,'Nội dung video không đúng định dạng hoặc vượt 12 MiB.');
 return {id:randomUUID(),name:clean(input.name,120)||'Video QC',mime,size:bytes.length,bytes};
}
export function saveQC(order,user,body){
 assertQCWrite(order,user,body);
 const q=body.qc;
 if(!q||!validDate(q.date)||q.date<order.date||q.date>today())fail(400,'Ngày kiểm định phải hợp lệ, từ ngày đặt hàng đến hôm nay.');
 if(!Array.isArray(q.rows)||q.rows.length!==order.items.length||!Array.isArray(q.special)||q.special.length>50)fail(400,'Danh sách kiểm định chưa khớp sản phẩm trong đơn.');
 const complete=body.complete===true;
 const row=(r,index,special=false)=>{
  if(!r||!Number.isInteger(r.index)||r.index<0||r.index>=order.items.length||(!special&&r.index!==index))fail(400,'Sản phẩm kiểm định không hợp lệ.');
  if(!Array.isArray(r.mediaIds)||r.mediaIds.length>4||new Set(r.mediaIds).size!==r.mediaIds.length||r.mediaIds.some(id=>!order.qcMedia?.some(m=>m.id===id)))fail(400,'Mỗi sản phẩm tối đa 4 tệp thuộc phiếu của đơn này.');
  const note=clean(r.note,500);
  if(complete&&(!note||!r.mediaIds.length))fail(400,`Dòng ${index+1}${special?' cần lưu ý':''}: bắt buộc ghi chú và ít nhất một ảnh/video trước khi hoàn tất QC.`);
  return {index:r.index,note,mediaIds:r.mediaIds};
 };
 return {date:q.date,rows:q.rows.map((r,i)=>row(r,i)),special:q.special.map((r,i)=>row(r,i,true)),note:clean(q.note,2000),signature:qcSignature(order.items),updatedAt:new Date().toISOString(),by:user.id,name:user.name,completedAt:complete?new Date().toISOString():null};
}
