import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
export function ReceiptPreview({file,name='Chứng từ thanh toán'}){
 const [open,setOpen]=useState(false),[url,setUrl]=useState(''),[failed,setFailed]=useState(false);const dialog=useRef(null);
 const type=/^data:(image\/(?:png|jpeg|webp)|application\/pdf);base64,/i.exec(file||'')?.[1]?.toLowerCase();
 useEffect(()=>{setUrl('');setFailed(false);if(!open||!type)return;let objectURL;try{const bytes=Uint8Array.from(atob(file.split(',')[1]),c=>c.charCodeAt(0));objectURL=URL.createObjectURL(new Blob([bytes],{type}));setUrl(objectURL)}catch{setUrl('')}return()=>{if(objectURL)URL.revokeObjectURL(objectURL)}},[open,file,type]);
 useEffect(()=>{if(open)dialog.current?.showModal()},[open]);
 return <><button type="button" className="text-btn" onClick={()=>setOpen(true)}>{name}</button>{open&&createPortal(<dialog ref={dialog} className="receipt-dialog" aria-label="Xem chứng từ thanh toán" onCancel={()=>setOpen(false)}><header><strong>{name}</strong><button type="button" className="btn" autoFocus onClick={()=>setOpen(false)}>Đóng</button></header>{url?(type.startsWith('image/')?<img src={url} alt={name} onError={()=>setFailed(true)}/>:<iframe title={name} src={url}/>):<p>Không xem được tệp này.</p>}{failed&&<p role="alert">Ảnh không đọc được. Bạn có thể tải tệp để kiểm tra.</p>}{url&&type==='application/pdf'&&<a className="btn" href={url} target="_blank" rel="noopener noreferrer">Mở PDF ở thẻ riêng</a>}{url&&<a className="btn" href={url} download={name}>Tải chứng từ</a>}</dialog>,document.body)}</>;
}
