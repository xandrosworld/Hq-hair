// Some mobile document providers omit MIME types. The server still validates bytes.
const extensionTypes={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',pdf:'application/pdf',mp4:'video/mp4',webm:'video/webm'};
export function normalizeUploadFile(file){
 const supplied=file.type.toLowerCase();
 const type=supplied==='image/jpg'?'image/jpeg':!supplied||supplied==='application/octet-stream'?extensionTypes[file.name.split('.').at(-1)?.toLowerCase()]||supplied:supplied;
 return type!==file.type?new File([file],file.name,{type,lastModified:file.lastModified}):file;
}
