import React,{useState,useEffect,useRef} from 'react';
import {displayUnit,hairFields} from '../product-fields.js';
import {today} from '../shared.js';
import {contentLocked} from '../order-workflow.js';
import {isWorkspace,workspaceAPI} from './workspace-access.jsx';
import './quality-control.css';

const blank=order=>({date:today(),rows:order.items.map((_,index)=>({index,note:'',mediaIds:[]})),special:[],note:''});
export function QualityControl({order,user,onUpdate,draftStatus}){
 const [form,setForm]=useState(()=>order.qc&&!order.qc.stale?structuredClone(order.qc):blank(order)),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[reason,setReason]=useState('');
 const version=useRef(order.version),lock=useRef(false);
 const editable=isWorkspace&&(user?.role==='manager'||user?.role==='sale'&&order.stage===8)&&order.stage>0&&!order.cancelledAt&&(!contentLocked(order)||user.role==='manager');
 const media=order.qcMedia||[],url=id=>`/api${isWorkspace?'/work':''}/orders/${encodeURIComponent(order.id)}/qc-media/${id}`;
 useEffect(()=>{if(draftStatus)draftStatus.current=dirty||busy;const leave=e=>{e.preventDefault();e.returnValue=''};if(dirty||busy)window.addEventListener('beforeunload',leave);return()=>{window.removeEventListener('beforeunload',leave);if(draftStatus)draftStatus.current=false}},[dirty,busy,draftStatus]);
 useEffect(()=>{if(!dirty&&!busy){setForm(order.qc&&!order.qc.stale?structuredClone(order.qc):blank(order));version.current=order.version}},[order.version,dirty,busy]);
 const change=fn=>{setForm(fn);setDirty(true);setMessage('')};
 const update=(group,index,patch)=>change(q=>({...q,[group]:q[group].map((r,i)=>i===index?{...r,...patch}:r)}));
 const upload=async(file,group,index)=>{
  if(!file||lock.current)return;
  if(form[group][index].mediaIds.length>=4){setError('Mỗi dòng tối đa 4 ảnh/video.');return}
  if(!['image/png','image/jpeg','image/webp','video/mp4','video/webm'].includes(file.type)||file.size>(file.type.startsWith('video/')?12:5)*1024*1024){setError('Ảnh PNG/JPG/WebP tối đa 5 MiB; video MP4/WebM tối đa 12 MiB.');return}
  lock.current=true;setBusy(true);setError('');
  try{
   const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Không đọc được tệp.'));r.readAsDataURL(file)});
   const next=await workspaceAPI(`/orders/${order.id}/qc-upload`,{version:version.current,reason,file:{name:file.name,data}}),o=next.orders.find(o=>o.id===order.id);
   const added=o.qcMedia.find(m=>!media.some(old=>old.id===m.id));
   version.current=o.version;onUpdate?.(next);
   if(added)update(group,index,{mediaIds:[...form[group][index].mediaIds,added.id]});
  }catch(e){setError(e.message)}finally{lock.current=false;setBusy(false)}
 };
 const save=async complete=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{const next=await workspaceAPI(`/orders/${order.id}/qc`,{version:version.current,qc:form,complete,reason}),o=next.orders.find(o=>o.id===order.id);version.current=o.version;setForm(structuredClone(o.qc));setDirty(false);onUpdate?.(next);setMessage(complete?'Đã hoàn tất phiếu kiểm định.':'Đã lưu phiếu kiểm định.')}catch(e){setError(e.message)}finally{lock.current=false;setBusy(false)}
 };
 const rows=(group,special=false)=><div className="table-scroll" tabIndex={0} aria-label="Thông số sản phẩm kiểm định"><table className="qc-table"><thead><tr><th>STT</th><th>Loại tóc nối</th>{hairFields.map(([key,,label])=><th key={key}>{key==='lengthCm'?<>Chiều dài<br/><small>(cm)</small></>:key==='productNote'?<>Ghi chú<br/>sản phẩm</>:label}</th>)}<th>Trọng lượng<br/>/ Số lượng<br/><small>G / đơn vị</small></th></tr></thead><tbody>{form[group].map((r,index)=>{const p=order.items[r.index];return <React.Fragment key={index}><tr className="qc-product-row"><td>{index+1}</td><td>{special&&editable?<select aria-label={`Sản phẩm lưu ý ${index+1}`} value={r.index} disabled={busy} onChange={e=>update(group,index,{index:Number(e.target.value)})}>{order.items.map((p,i)=><option value={i} key={i}>{i+1}. {p.name}</option>)}</select>:<b>{p?.name||'Sản phẩm đã thay đổi'}</b>}{p?.spec&&<small>{p.spec}</small>}</td>{hairFields.map(([key])=><td key={key}>{p?.[key]||'—'}</td>)}<td>{p?.qty}<small>{p?.priceBasis==='100g'?'G':displayUnit(p?.unit)}</small></td></tr><tr className="qc-review-row"><td colSpan={9}><div className="qc-review-fields"><div><b>{special?'Ghi chú / Lý do cần lưu ý':'Ghi chú đánh giá'} *</b>{editable?<><textarea aria-label={`${special?'Lưu ý':'Đánh giá'} sản phẩm ${index+1}`} disabled={busy} maxLength={500} value={r.note} onChange={e=>update(group,index,{note:e.target.value})}/><small>{r.note.length}/500</small></>:<p>{r.note||'Chưa có đánh giá'}</p>}</div><div><b>Hình ảnh / Video *</b><div className="qc-media">{r.mediaIds.map(id=>{const m=media.find(m=>m.id===id);return m&&<div key={id}>{m.mime.startsWith('video/')?<video controls preload="metadata" src={url(id)} aria-label={m.name}/>:<a href={url(id)} target="_blank" rel="noreferrer"><img src={url(id)} alt={m.name}/></a>}{editable&&<button type="button" aria-label={'Bỏ tệp '+m.name} disabled={busy} onClick={()=>update(group,index,{mediaIds:r.mediaIds.filter(x=>x!==id)})}>×</button>}</div>})}{editable&&r.mediaIds.length<4&&<label className="qc-upload">+ Ảnh / video<input aria-label={`${special?'Tệp lưu ý':'Tệp kiểm định'} ${index+1}`} type="file" disabled={busy} accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" onChange={e=>{upload(e.target.files[0],group,index);e.target.value=''}}/></label>}</div></div>{editable&&special&&<button className="btn" disabled={busy} onClick={()=>change(q=>({...q,special:q.special.filter((_,i)=>i!==index)}))}>Bỏ</button>}</div></td></tr></React.Fragment>})}</tbody></table></div>;
 return <section className="qc-sheet"><div className="qc-heading"><div><h2>KIỂM ĐỊNH ĐƠN HÀNG (QC)</h2><span className={'badge '+(form.completedAt&&!dirty&&!order.qc?.stale?'green':'amber')}>{form.completedAt&&!dirty&&!order.qc?.stale?'Hoàn tất QC':'Đang kiểm'}</span></div>{editable&&<div className="actions"><button className="btn" disabled={busy} onClick={()=>save(false)}>Lưu QC</button><button className="btn primary" disabled={busy} onClick={()=>save(true)}>Hoàn tất QC</button></div>}</div>
 {error&&<p className="access-error" role="alert">{error}</p>}{message&&<p className="notice" role="status">{message}</p>}{order.qc?.stale&&<p className="notice">Sản phẩm trên đơn đã thay đổi. Cần kiểm định lại danh sách hiện tại; phiếu cũ được giữ trong nhật ký quản trị.</p>}
 <div className="qc-meta"><label>Mã đơn hàng<input readOnly value={order.orderCode||'Chờ Kế toán duyệt'}/></label><label>Sale phụ trách<input readOnly value={order.sale}/></label><label>Ngày kiểm<input aria-label="Ngày kiểm" type="date" min={order.date} max={today()} disabled={!editable||busy} value={form.date} onChange={e=>change(q=>({...q,date:e.target.value}))}/></label></div>
 {editable&&contentLocked(order)&&<label className="field"><span>Lý do sửa ngoại lệ QC</span><input value={reason} minLength={5} onChange={e=>setReason(e.target.value)}/></label>}
 <h3 className="qc-section-title">Danh sách sản phẩm của đơn hàng<span>Bắt buộc ghi chú và ảnh/video cho từng sản phẩm khi hoàn tất.</span></h3>{rows('rows')}
 <div className="qc-section-title special"><h3>Sản phẩm cần lưu ý đặc biệt (nếu có)</h3>{editable&&<button className="btn" disabled={busy||!order.items.length||form.special.length>=50} onClick={()=>change(q=>({...q,special:[...q.special,{index:0,note:'',mediaIds:[]}]}))}>+ Thêm sản phẩm cần lưu ý</button>}</div>{form.special.length?rows('special',true):<p className="inline-empty">Chưa có sản phẩm cần lưu ý riêng.</p>}
 <label className="field qc-note"><span>Ghi chú toàn đơn hàng</span><textarea disabled={!editable||busy} maxLength={2000} value={form.note} onChange={e=>change(q=>({...q,note:e.target.value}))}/></label><p className="muted">Ảnh tối đa 5 MiB · Video MP4/WebM tối đa 12 MiB · 4 tệp mỗi dòng. {dirty?'Có thay đổi chưa lưu.':''}</p>
 {!editable&&<p className="muted">Phiếu kiểm định đang ở chế độ chỉ xem.</p>}
 </section>;
}
