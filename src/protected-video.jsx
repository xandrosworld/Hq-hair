import React,{useEffect,useRef,useState} from 'react';

// Native media requests on some WebKit environments omit the session cookie.
// A user-triggered authenticated fetch preserves access checks and avoids loading
// every video in a long order into memory just to display its thumbnail.
export function ProtectedVideo({src,name,autoPlay=false}){
 const [blob,setBlob]=useState(''),[failed,setFailed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const resource=useRef(''),request=useRef(null);
 useEffect(()=>()=>{request.current?.abort();if(resource.current)URL.revokeObjectURL(resource.current)},[]);
 const load=async()=>{
  if(request.current)return;
  const controller=new AbortController();request.current=controller;setBusy(true);setError('');
  try{
   const response=await fetch(src,{credentials:'same-origin',signal:controller.signal});
   if(!response.ok)throw Error(response.status===401?'Phiên đã hết hạn. Đăng nhập lại để xem video.':'Không tải được video. Vui lòng thử lại.');
   const data=await response.blob();
   if(!data.type.startsWith('video/')||data.size>25*1024*1024)throw Error('Tệp video không hợp lệ hoặc vượt dung lượng hỗ trợ.');
   if(controller.signal.aborted)return;
   if(resource.current)URL.revokeObjectURL(resource.current);
   resource.current=URL.createObjectURL(data);setBlob(resource.current);setFailed(false);
  }catch(e){if(e.name!=='AbortError')setError(e.message)}
  finally{if(!controller.signal.aborted){request.current=null;setBusy(false)}}
 };
 return <div className="protected-video"><video key={blob||src} src={blob||src} controls playsInline autoPlay={autoPlay} preload="metadata" aria-label={name} onError={()=>setFailed(true)}/>{failed&&<div className="video-recovery"><p>{blob?'Trình duyệt chưa phát được định dạng video này. Bạn có thể mở hoặc tải tệp gốc.':'Nếu video chưa phát được, tải video bằng phiên đăng nhập hiện tại.'}</p>{!blob&&<button type="button" className="btn" disabled={busy} onClick={load}>{busy?'Đang tải video…':'Tải video để phát'}</button>}<a className="btn" href={blob||src} download={blob?name:undefined} target={blob?undefined:"_blank"} rel="noreferrer">{blob?"Tải video gốc":"Mở / tải video gốc"}</a>{error&&<p role="alert">{error}</p>}</div>}</div>;
}
