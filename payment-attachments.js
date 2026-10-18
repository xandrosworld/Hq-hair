const fail=message=>{throw Object.assign(new Error(message),{status:400})};
function cleanAttachment(p){
 if(!p||typeof p.file!=='string'||!p.file)fail('Tệp chứng từ không hợp lệ.');
 if(p.file){if(!/^data:(image\/(png|jpeg|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(p.file)||p.file.length>1500000)fail('Chứng từ chỉ nhận PNG, JPG, WebP hoặc PDF tối đa 1 MB.');const bytes=Buffer.from(p.file.split(',')[1],'base64');const mime=p.file.slice(5,p.file.indexOf(';'));const valid=mime==='application/pdf'?bytes.subarray(0,5).toString()==='%PDF-':mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';if(!valid||bytes.length>1048576)fail('Nội dung tệp không khớp định dạng chứng từ.');return {file:p.file,fileName:String(p.fileName||'Chứng từ').trim().slice(0,120)}}
}
export function cleanPaymentAttachments(p){
 if(p.files!==undefined){if(!Array.isArray(p.files)||p.files.length>3)fail('Mỗi lần thanh toán được đính kèm tối đa 3 tệp.');return {files:p.files.map(cleanAttachment)}}
 return p.file?cleanAttachment(p):{};
}
