import {setDraftOwner,endDraftSession} from './draft-storage.js';
export const isWorkspace=location.pathname.startsWith('/workspace');
let csrf='';
const pendingWrites=new Map();
export async function workspaceAPI(path,body){
 const controller=new AbortController(),timeout=!body?setTimeout(()=>controller.abort(),30000):null;
 try{
 const businessWrite=!!body&&(/^\/orders(?:\/|$)/.test(path)||['/factory/batch','/customers','/catalog','/assign','/pricing/adjust','/pricing/restore','/pricing/colors','/pricing/entries','/pricing/import'].includes(path));
 const signature=businessWrite?path+JSON.stringify(body):null;
 const key=body?(pendingWrites.get(signature)||crypto.randomUUID()):null;
 if(businessWrite)pendingWrites.set(signature,key);
 const options={signal:controller.signal,method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','X-CSRF-Token':csrf,'Idempotency-Key':key}:{},body:body?JSON.stringify(body):undefined};
 let response;
 try{response=await fetch('/api/work'+path,options)}catch{
  if(!businessWrite)throw Error(controller.signal.aborted?'Tải dữ liệu quá lâu. Vui lòng thử lại.':'Mất kết nối. Vui lòng thử lại.');
  try{response=await fetch('/api/work'+path,options)}catch{throw Error('Mất kết nối. Nội dung vẫn được giữ trên màn hình; bấm lưu lại để tiếp tục cùng thao tác.')}
 }
 let data;try{data=await response.json()}catch{throw Error(controller.signal.aborted?'Tải dữ liệu quá lâu. Vui lòng thử lại.':'Máy chủ chưa trả được dữ liệu. Vui lòng thử lại.')}
 if(businessWrite&&response.status<500)pendingWrites.delete(signature);
 if(!response.ok){if(response.status===401)endDraftSession();if(response.status===401&&!['/login','/me'].includes(path))window.dispatchEvent(new Event('hq-session-ended'));throw Object.assign(Error(data.error||'Không thể kết nối.'),{fields:data.fields,status:response.status})}
 if(data.csrf)csrf=data.csrf;
 if(['/me','/login','/password'].includes(path)&&data.user)setDraftOwner(data.user.id);
 if(path==='/logout')endDraftSession();
 if(['/login','/logout','/password'].includes(path))pendingWrites.clear();
 return data;
 }finally{if(timeout)clearTimeout(timeout)}
}
export const roleName=role=>({manager:'Quản lý',sale:'Kinh doanh',sales_lead:'Trưởng nhóm Sale',accounting:'Kế toán',factory:'Xưởng'}[role]||role);
