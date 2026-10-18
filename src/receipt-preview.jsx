import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
export function ReceiptPreview({file,name='Chứng từ thanh toán'}){
 const [open,setOpen]=useState(false),[url,setUrl]=useState('');const dialog=useRef(null);
 const type=/^data:(image\/(?:png|jpeg|webp)|application\/pdf);base64,/i.exec(file||'')?.[1]?.toLowerCase();
 useEffect(()=>{if(!open||!type)return;let objectURL;try{const bytes=Uint8Array.from(atob(file.split(',')[1]),c=>c.charCodeAt(0));objectURL=URL.createObjectURL(new Blob([bytes],{type}));setUrl(objectURL)}catch{setUrl('')}return()=>{if(objectURL)URL.revokeObjectURL(objectURL)}},[open,file,type]);
 useEffect(()=>{if(open)dialog.current?.showModal()},[open]);
 return <><button type="button" className="text-btn" onClick={()=>setOpen(true)}>{name}</button>{open&&createPortal(<dialog ref={dialog} className="receipt-dialog" aria-label="Xem chứng từ thanh toán" onCancel={()=>setOpen(false)}><header><strong>{name}</strong><button type="button" className="btn" autoFocus onClick={()=>setOpen(false)}>Đóng</button></header>{url?(type.startsWith('image/')?<img src={url} alt={name}/>:<iframe title={name} src={url}/>):<p>Không xem được tệp này.</p>}{url&&<a className="btn" href={url} download={name}>Tải chứng từ</a>}</dialog>,document.body)}</>;
}
