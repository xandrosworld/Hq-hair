import React,{useEffect,useRef,useState,useId} from 'react';
import {createPortal} from 'react-dom';
import {toneNames} from '../pricing-domain.js';
import {cleanPriceEntry} from '../price-entry.js';
import {money} from '../shared.js';

export function PriceEntryForm({initial,prices,busy,onClose,onSave,error}){
 const [form,setForm]=useState(initial),[validation,setValidation]=useState('');
 const dialog=useRef(null),listId=useId(),editing=!!initial.id;
 useEffect(()=>{dialog.current.showModal()},[]);
 const set=(key,value)=>setForm(f=>({...f,[key]:value}));
 const options=key=>[...new Set(prices.filter(p=>p.tier===form.tier).map(p=>p[key]).filter(Boolean))];
 const submit=e=>{e.preventDefault();try{const body={...form,price:Number(form.price),lengthCm:Number(form.lengthCm),inches:Number(form.inches)};cleanPriceEntry(body,editing?initial:undefined);setValidation('');onSave(body)}catch(e){setValidation(e.message)}};
 return createPortal(<dialog ref={dialog} className="price-entry-dialog" aria-labelledby={listId+'title'} onCancel={e=>{e.preventDefault();if(!busy)onClose()}}><form onSubmit={submit}>
  <div className="price-entry-heading"><h2 id={listId+'title'}>{editing?'Sửa mức giá':'Thêm mức giá'}</h2><button type="button" className="btn" disabled={busy} onClick={onClose}>Đóng</button></div>
  <p>{editing?'Cập nhật đơn giá của quy cách đang chọn.':'Nhập một mức giá cho từng sản phẩm, quy cách, chiều dài và tông màu.'} Giá áp dụng cho lần chọn vào đơn tiếp theo.</p>
  <fieldset disabled={busy}>
   <div className="price-filters">
    <label>Bảng giá sản phẩm<select aria-label="Bảng giá sản phẩm" disabled={editing} value={form.tier} onChange={e=>{set('tier',e.target.value);set('product','');set('segment','');set('variant','')}}><option value="Basic">Raw Hair · Basic / Super Double Drawn</option><option value="Premium">Raw Hair · Premium</option><option value="Baby">Baby Hair</option></select></label>
    <label>Tên sản phẩm<input aria-label="Tên sản phẩm" required maxLength={120} readOnly={editing} list={listId+'products'} value={form.product} onChange={e=>set('product',e.target.value)}/><datalist id={listId+'products'}>{options('product').map(v=><option key={v} value={v}/>)}</datalist></label>
    <label>Quy cách tóc<input aria-label="Quy cách tóc của mức giá" maxLength={80} readOnly={editing} list={listId+'segments'} value={form.segment} onChange={e=>set('segment',e.target.value)} placeholder="Basic hoặc Super Double Drawn"/><datalist id={listId+'segments'}>{options('segment').map(v=><option key={v} value={v}/>)}</datalist></label>
    <label>Kích thước / Kiểu lưới<input aria-label="Kích thước của mức giá" maxLength={80} readOnly={editing} list={listId+'variants'} value={form.variant} onChange={e=>set('variant',e.target.value)} placeholder="Ví dụ: 13×4 · có thể để trống"/><datalist id={listId+'variants'}>{options('variant').map(v=><option key={v} value={v}/>)}</datalist></label>
    <label>Chiều dài (cm)<input aria-label="Chiều dài mức giá (cm)" type="number" min="0.1" max="300" step="any" required readOnly={editing} value={form.lengthCm} onChange={e=>setForm(f=>({...f,lengthCm:e.target.value,inches:e.target.value?Number((Number(e.target.value)/2.5).toFixed(2)):''}))}/></label>
    <label>Chiều dài (inch)<input aria-label="Chiều dài mức giá (inch)" type="number" min="0.1" max="120" step="any" required readOnly={editing} value={form.inches} onChange={e=>set('inches',e.target.value)}/></label>
    <label>Tông giá<select aria-label="Tông của mức giá" disabled={editing} value={form.tone} onChange={e=>set('tone',e.target.value)}>{Object.entries(toneNames).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
    <label>Đơn vị tính giá<select aria-label="Đơn vị tính giá" disabled={editing} value={form.priceBasis} onChange={e=>set('priceBasis',e.target.value)}><option value="100g">USD / 100g</option><option value="unit">USD / cái</option></select></label>
    <label>Đơn giá (USD)<input aria-label="Đơn giá mới (USD)" autoFocus={editing} type="number" min="0.01" max="100000" step="0.01" required value={form.price} onChange={e=>set('price',e.target.value)}/></label>
   </div>
   {editing&&<p>Giá hiện tại: <strong>{money(initial.price)}</strong> / {initial.priceBasis==='100g'?'100g':'cái'}</p>}
   <label className="field"><span>Ghi chú cập nhật</span><textarea aria-label="Ghi chú cập nhật giá" rows={2} maxLength={500} value={form.note||''} onChange={e=>set('note',e.target.value)}/></label>
   <p className="muted">Các mã màu cùng tông dùng chung mức giá này. Màu phối lấy tông cao nhất của các màu thành phần. Đơn đã lưu giữ nguyên giá.</p>
   {(validation||error)&&<p className="access-error" role="alert">{validation||error}</p>}
   <div className="actions"><button type="button" className="btn" onClick={onClose}>Hủy</button><button className="btn primary" disabled={busy}>{busy?'Đang lưu…':'Lưu mức giá'}</button></div>
  </fieldset>
 </form></dialog>,document.body);
}
