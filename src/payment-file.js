import {normalizeUploadFile} from './upload-file.js';
const MB=1024*1024;
export const readDataURL=file=>new Promise((resolve,reject)=>{
 const reader=new FileReader();
 reader.onload=()=>resolve(reader.result);
 reader.onerror=()=>reject(Error('Không đọc được tệp. Vui lòng chọn lại.'));
 reader.onabort=()=>reject(Error('Đã dừng đọc tệp. Vui lòng chọn lại.'));
 reader.readAsDataURL(file);
});

// Keep the stored receipt within the existing server limit, including on phones.
export async function paymentFile(file){
 file=normalizeUploadFile(file);
 if(!['image/png','image/jpeg','image/webp','application/pdf'].includes(file.type))throw Error('Chọn JPG, PNG, WebP hoặc PDF. Ảnh HEIC cần đổi sang JPG trước khi tải lên.');
 if(!file.size)throw Error('Tệp rỗng. Vui lòng chọn lại.');
 if(file.type==='application/pdf'){
  if(file.size>MB)throw Error('PDF tối đa 1 MB. Vui lòng chọn bản có dung lượng nhỏ hơn.');
  if(await file.slice(0,5).text()!=='%PDF-')throw Error('Không mở được PDF. Hãy chọn tệp PDF hợp lệ.');
  return {file:await readDataURL(file),fileName:file.name};
 }
 if(file.size>20*MB)throw Error('Ảnh tối đa 20 MB trước khi xử lý. Vui lòng chọn ảnh nhỏ hơn.');
 const url=URL.createObjectURL(file),img=new Image();
 try{
  img.src=url;await img.decode();
  if(file.size<=MB)return {file:await readDataURL(file),fileName:file.name};
  const canvas=document.createElement('canvas');
  let scale=Math.min(1,2400/Math.max(img.naturalWidth,img.naturalHeight));
  for(let pass=0;pass<5;pass++,scale*=0.8){
   canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.85));
   if(blob&&blob.size<=MB)return {file:await readDataURL(blob),fileName:file.name.replace(/\.[^.]+$/,'')+'.jpg',compressed:true};
  }
  throw Error('Không giảm được ảnh xuống 1 MB. Vui lòng chọn ảnh nhỏ hơn.');
 }catch(error){
  if(error.name==='EncodingError')throw Error('Không mở được ảnh. Hãy chọn ảnh JPG, PNG hoặc WebP hợp lệ.');
  throw error;
 }finally{URL.revokeObjectURL(url)}
}
