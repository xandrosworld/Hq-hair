import {randomUUID} from 'node:crypto';
export const MAX_IMAGE_BYTES=5*1024*1024;
export function parseChatImages(images=[]){
 const fail=message=>{throw Object.assign(new Error(message),{status:400})};
 if(!Array.isArray(images)||images.length>4)fail('Mỗi tin nhắn gửi tối đa 4 ảnh.');
 return images.map(image=>{
  const match=typeof image?.data==='string'&&image.data.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!match||match[2].length>Math.ceil(MAX_IMAGE_BYTES/3)*4)fail('Chỉ nhận ảnh JPG, PNG, WebP tối đa 5 MB/ảnh.');
  const bytes=Buffer.from(match[2],'base64'),mime=match[1];
  const valid=mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
  if(!valid||bytes.length>MAX_IMAGE_BYTES||bytes.length<12)fail('Ảnh không đúng định dạng hoặc vượt quá 5 MB.');
  return {id:randomUUID(),name:typeof image.name==='string'?image.name.slice(0,120):'Ảnh đính kèm',mime,bytes,size:bytes.length};
 });
}
export function setupChatImages(db){db.exec('CREATE TABLE IF NOT EXISTS chat_images(id TEXT PRIMARY KEY, data BLOB NOT NULL, mime TEXT NOT NULL)')}
