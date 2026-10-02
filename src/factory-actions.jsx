import React,{useState,useRef} from 'react';
import {productionLabels} from '../workflow-state.js';
export function FactoryActions({order,busy,onAction,draftStatus}){
 const [choice,setChoice]=useState(null),[note,setNote]=useState('');
 const locked=useRef(false);
 if(!order.orderCode||order.cancelledAt||order.contentLockedAt||![3,4].includes(order.stage))return null;
 const submit=async()=>{
  if(locked.current||busy)return;
  if(draftStatus?.current){window.alert('Vui lòng lưu phiếu QC trước khi cập nhật tiến độ.');return;}
  locked.current=true;try{if(await onAction(order.id,choice==='office'?'factory-office':'factory-status',{status:choice,text:note})){setChoice(null);setNote('')}}finally{locked.current=false}
 };
 return <section className="panel panel-body"><h3>Xưởng thao tác</h3><div className="factory-workflow-actions">{Object.entries(productionLabels).map(([key,label])=><button key={key} className="btn" disabled={busy} onClick={()=>setChoice(key)}>{label}</button>)}{order.stage===4&&order.saleReview?.result==='accepted'&&order.production?.status!=='paused'&&<button className="btn primary" disabled={busy} onClick={()=>setChoice('office')}>Đã gửi đến văn phòng</button>}</div>{choice&&<div className="notice"><div><b>Xác nhận {choice==='office'?'đã gửi đến văn phòng':productionLabels[choice].toLowerCase()}?</b><label className="field"><span>Ghi chú</span><textarea maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></label><button className="btn" disabled={busy} onClick={()=>setChoice(null)}>Quay lại</button> <button className="btn primary" disabled={busy} onClick={submit}>Xác nhận trạng thái Xưởng</button></div></div>}</section>;
}
