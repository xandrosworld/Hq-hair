import {randomUUID} from 'node:crypto';
import {MAX_CHAT_FILES,MAX_IMAGE_BYTES,MAX_VIDEO_BYTES,MAX_CHAT_BYTES} from './chat-limits.js';
export {MAX_IMAGE_BYTES} from './chat-limits.js';
export function parseChatImages(images=[]){
 const fail=message=>{throw Object.assign(new Error(message),{status:400})};
 if(!Array.isArray(images)||images.length>MAX_CHAT_FILES)fail('Mỗi tin nhắn gửi tối đa 20 ảnh/video.');
 let total=0;
 return images.map(image=>{
  const match=typeof image?.data==='string'&&image.data.match(/^data:((?:image\/(?:png|jpeg|webp)|video\/(?:mp4|webm)));base64,([A-Za-z0-9+/]+={0,2})$/);
  const limit=match?.[1].startsWith('video/')?MAX_VIDEO_BYTES:MAX_IMAGE_BYTES;
  if(!match||match[2].length>Math.ceil(limit/3)*4)fail('Chỉ nhận JPG, PNG, WebP (10 MB) hoặc MP4, WebM (25 MB).');
  const bytes=Buffer.from(match[2],'base64'),mime=match[1];
  const valid=mime==='video/mp4'?bytes.subarray(4,8).toString()==='ftyp':mime==='video/webm'?bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])):mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
  if(!valid||bytes.length>limit||bytes.length<12)fail('Tệp không đúng định dạng hoặc vượt dung lượng cho phép.');
  total+=bytes.length;if(total>MAX_CHAT_BYTES)fail('Tổng ảnh/video mỗi tin nhắn tối đa 50 MB.');
  return {id:randomUUID(),name:typeof image.name==='string'?image.name.slice(0,120):'Ảnh đính kèm',mime,bytes,size:bytes.length};
 });
}
export function setupChatImages(db){db.exec('CREATE TABLE IF NOT EXISTS chat_images(id TEXT PRIMARY KEY, data BLOB NOT NULL, mime TEXT NOT NULL)')}
