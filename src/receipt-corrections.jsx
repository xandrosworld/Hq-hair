import {DateInput} from './date-input.jsx';
import React,{useState,useEffect,useRef} from 'react';
import {workspaceAPI} from './workspace-access.jsx';
import {money} from '../shared.js';
export function ReceiptCorrections({order,user,onUpdate}){
 const [selected,setSelected]=useState(''),[amount,setAmount]=useState(''),[date,setDate]=useState(''),[rate,setRate]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const latest=useRef({order,onUpdate});latest.current={order,onUpdate};
 useEffect(()=>{
  if(user?.role!=='accounting'||selected||busy)return;
  let alive=true,inFlight=false;
  const refresh=async()=>{if(inFlight)return;inFlight=true;try{const data=await workspaceAPI('/state');const updated=data.orders.find(o=>o.id===order.id);if(alive&&updated&&updated.version!==latest.current.order.version)latest.current.onUpdate(data)}catch{}finally{inFlight=false}};
  refresh();const timer=setInterval(refresh,15000);window.addEventListener('focus',refresh);
  return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',refresh)};
 },[order.id,user?.role,selected,busy]);
 if(!['manager','accounting'].includes(user?.role))return null;
 const manager=user.role==='manager',rows=order.payments.filter(p=>p.confirmed&&(manager||p.correctionGrant));
 if(!rows.length)return null;
 const save=async()=>{if(busy)return;if(reason.trim().length<5){setError('Nhập lý do từ 5 đến 1.000 ký tự, ví dụ: Điều chỉnh tiền thực nhận.');return}setBusy(true);setError('');try{const data=await workspaceAPI(`/orders/${order.id}/action`,{version:order.version,action:manager?'accounting-grant-receipt':'accounting-correct-receipt',paymentId:selected,amount:Number(amount),receivedDate:date,exchangeRate:rate===''?null:Number(rate),text:reason});onUpdate(data);setSelected('');setReason('')}catch(e){setError(e.message)}finally{setBusy(false)}};
 return <section id="receipt-corrections" className="panel panel-body"><h3>{manager?'Cấp quyền sửa khoản thu':'Điều chỉnh khoản thu được cấp quyền'}</h3><p>Mỗi lần cấp quyền cho phép Kế toán sửa một khoản thu một lần. Số cũ và lý do được lưu trong nhật ký; khoản thu vẫn được xác nhận. Chọn chứng từ bên dưới để mở ô sửa tiền.</p>{rows.map(p=><div key={p.id}><button className="btn" disabled={busy} onClick={()=>{setSelected(p.id);setAmount(p.amount);setRate(p.exchangeRate??'');setDate(p.receivedDate||p.date||'')}}>{!manager?'Sửa tiền đã nhận · ':''}{p.sender||p.id} · {money(p.amount)}{p.correctionGrant?' · Đã cấp quyền':''}</button></div>)}{selected&&<fieldset disabled={busy} style={{border:0,padding:0}}>{!manager&&<><label className="field">Tiền thực nhận USD<input type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label className="field">Ngày thực nhận<DateInput type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label className="field">Tỷ giá VND / 1 USD<input type="number" min="0.01" max="1000000" step="0.01" value={rate} onChange={e=>setRate(e.target.value)}/></label></>}<label className="field">Lý do (ít nhất 5 ký tự)<textarea aria-describedby="receipt-reason-help" value={reason} maxLength={1000} onChange={e=>{setReason(e.target.value);setError('')}}/><small id="receipt-reason-help">Nhập từ 5 đến 1.000 ký tự để lưu nhật ký điều chỉnh. Tỷ giá có thể để trống.</small></label><button className="btn primary" disabled={busy} onClick={save}>{manager?'Cấp quyền một lần':'Xác nhận điều chỉnh và khóa lại'}</button></fieldset>}{error&&<p role="alert" className="access-error">{error}</p>}</section>;
}
