import React,{useEffect,useRef,useState} from 'react';
import {workspaceAPI} from './workspace-access.jsx';
import {readPriceWorkbook,downloadPriceTemplate} from '../price-workbook.js';
const actionNames={create:'Thêm mới',update:'Cập nhật',skip:'Bỏ qua',same:'Không đổi'};
export function PriceImport({data,onClose,onSaved}){
 const dialogRef=useRef(null),fileRef=useRef(null);
 useEffect(()=>{const previous=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=overflow;previous?.focus()}},[]);
 const [file,setFile]=useState(null),[format,setFormat]=useState('standard'),[side,setSide]=useState('right'),[mode,setMode]=useState('add'),[preview,setPreview]=useState(null),[body,setBody]=useState(null),[warnings,setWarnings]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[page,setPage]=useState(0);
 const reset=()=>{setPreview(null);setBody(null);setError('');setPage(0)};
 const run=async fn=>{setBusy(true);setError('');try{await fn()}catch(e){setError(e.message)}finally{setBusy(false)}};
 const inspect=()=>run(async()=>{
  reset();if(!file||!file.name.toLowerCase().endsWith('.xlsx'))throw Error('Chọn file Excel .xlsx.');if(file.size>5*1024*1024)throw Error('File tối đa 5 MB.');
  let buffer;try{buffer=await file.arrayBuffer()}catch{throw Error('Không đọc được file hoặc file vừa thay đổi. Chọn lại file Excel rồi xem trước.');}
  const parsed=await readPriceWorkbook(buffer,{format,babySide:side,fileName:file.name});
  const current=await workspaceAPI('/pricing');const next={version:current.version,rows:parsed.rows,mode,fileName:file.name};
  const plan=await workspaceAPI('/pricing/import/preview',next);setBody(next);setPreview(plan);setWarnings(parsed.warnings);
 });
 return <div className="price-import-backdrop"><section ref={dialogRef} className="price-import panel panel-body" role="dialog" aria-modal="true" aria-label="Nhập bảng giá Excel" onKeyDown={e=>{if(e.key==='Escape'&&!busy)onClose();if(e.key==='Tab'){const nodes=[...dialogRef.current.querySelectorAll('button:not(:disabled),select:not(:disabled)')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}}>
  <div className="price-import-heading"><div><h2>Nhập bảng giá Excel</h2><p>Thêm sản phẩm, màu và giá hàng loạt. Xem trước trước khi lưu.</p></div><button className="btn" disabled={busy} onClick={onClose}>Đóng</button></div>
  <p>1. Tải mẫu và điền dữ liệu, hoặc chọn định dạng bảng giá gốc. 2. Xem trước. 3. Xác nhận nhập.</p>
  <div className="actions"><button className="btn" disabled={busy} onClick={()=>run(downloadPriceTemplate)}>Tải mẫu Excel</button><button className="btn" disabled={busy} onClick={()=>run(async()=>downloadPriceTemplate(await workspaceAPI('/pricing')))}>Xuất Excel hiện tại</button></div>
  <p className="muted">Muốn sửa nhiều giá: xuất bảng giá hiện tại, chỉnh file rồi nhập lại bằng chế độ cập nhật. Bản xuất gồm giá và màu đơn; màu phối và ảnh quản lý trong Danh mục màu.</p>
  <div className="price-filters">
   <label>Định dạng file<select autoFocus aria-label="Định dạng file" disabled={busy} value={format} onChange={e=>{setFormat(e.target.value);reset()}}><option value="standard">Mẫu chuẩn HQ Hair (giá và màu)</option><option value="Basic">File gốc Bảng giá Basic so9</option><option value="Premium">File gốc Premium HQ so 9</option><option value="Baby">File gốc BABY THIN HAIR + BAO TẨY</option></select></label>
   {format==='Baby'&&<label>Dãy giá Baby<select aria-label="Dãy giá Baby" disabled={busy} value={side} onChange={e=>{setSide(e.target.value);reset()}}><option value="right">Bên phải — M–O ở Baby Bulk Hair (đã chốt)</option><option value="left">Bên trái — C–E</option></select></label>}
   <label>Khi gặp dòng đã có<select aria-label="Cách nhập" disabled={busy} value={mode} onChange={e=>{setMode(e.target.value);reset()}}><option value="add">Chỉ thêm mới, bỏ qua dòng đã có</option><option value="upsert">Thêm mới và cập nhật giá / ghi chú</option></select></label>
   <div className="price-import-file"><span>File Excel .xlsx (tối đa 5 MB)</span><input ref={fileRef} style={{display:'none'}} aria-label="File Excel" type="file" accept=".xlsx" disabled={busy} onChange={e=>{setFile(e.target.files[0]||null);reset()}}/><button className="btn" disabled={busy} onClick={()=>fileRef.current.click()}>Chọn tệp Excel</button><small>{file?.name||'Chưa chọn tệp'}</small></div>
  </div>
  <p className="muted">Mẫu chuẩn có sheet BangGia và MauSac; không đổi tên cột. Màu phối tạo tại Danh mục màu. {!data.canEditPrices&&'Bạn chưa có quyền nhập giá; để trống sheet BangGia. '}{data.canEditColors?'Bạn có quyền nhập màu.':'Bạn chưa có quyền nhập màu; để trống sheet MauSac hoặc nhờ quản trị cấp quyền.'} Đơn đã lưu giữ nguyên giá.</p>
  <button className="btn primary" disabled={busy||!file} onClick={inspect}>{busy?'Đang xử lý…':'Xem trước file'}</button>
  {error&&<p className="access-error" role="alert">{error}</p>}
  {preview&&<div className="price-import-preview">
   <h3>Kết quả kiểm tra: {body.rows.length.toLocaleString('vi-VN')} dòng</h3>
   <p>{preview.counts.create} thêm mới · {preview.counts.update} cập nhật · {preview.counts.skip} bỏ qua · {preview.counts.same} không đổi · {preview.errors.length} lỗi</p>
   {warnings.map(w=><p className="notice" key={w}>{w}</p>)}
   {preview.errors.length>0&&<div className="access-error" role="alert"><b>Chưa thể nhập. Sửa các lỗi sau trong Excel rồi chọn lại file:</b><ul>{preview.errors.slice(0,100).map((e,i)=><li key={i}>{e.location}: {e.message}</li>)}</ul>{preview.errors.length>100&&<p>Hiển thị 100 lỗi đầu tiên.</p>}</div>}
   <div className="table-scroll"><table className="price-table"><thead><tr><th>Nguồn</th><th>Thao tác</th><th>Sản phẩm / Màu</th><th>Chi tiết</th><th>Hiện tại</th><th>Sau nhập</th></tr></thead><tbody>{preview.changes.slice(page*30,page*30+30).map((c,i)=><tr key={i}><td>{c.location}</td><td>{actionNames[c.action]}</td><td>{c.row.product||c.row.code}</td><td>{c.kind==='price'?[c.row.tier,c.row.segment,c.row.variant,c.row.lengthCm+' cm',c.row.tone,c.row.priceBasis==='100g'?'USD / 100g':'USD / cái'].filter(Boolean).join(' · '):c.row.category}</td><td>{c.before??'—'}</td><td>{c.action==='skip'?'Giữ nguyên':c.row.price??c.row.code}{c.row.note&&<small>{c.row.note}</small>}</td></tr>)}</tbody></table></div>
   <div className="price-pagination"><button className="btn" disabled={!page} onClick={()=>setPage(page-1)}>Trước</button><span>Trang {page+1}/{Math.max(1,Math.ceil(preview.changes.length/30))}</span><button className="btn" disabled={(page+1)*30>=preview.changes.length} onClick={()=>setPage(page+1)}>Tiếp</button></div>
   <p>Chỉ các dòng “Thêm mới” và “Cập nhật” được lưu. Không xóa dữ liệu đang có. {mode==='upsert'?'Giá và ghi chú hiện tại của dòng khớp sẽ được thay bằng nội dung file.':''}</p>
   <button className="btn primary" disabled={busy||preview.errors.length>0||!(preview.counts.create+preview.counts.update)} onClick={()=>run(async()=>{const next=await workspaceAPI('/pricing/import',body);onSaved(next,preview.counts)})}>Xác nhận nhập {preview.counts.create+preview.counts.update} dòng</button>
  </div>}
 </section></div>;
}
