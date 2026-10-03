import React,{useState} from 'react';
import './product-standards.css';
const sections=['Quy chuẩn chung','Genius Weft / Flat Weft','Mini Genius Weft','Normal Tape','Flat Tip','I-Tip','Nano Ring'];
const base='/api/work/product-standards/';
export function ProductStandards(){
 const [section,setSection]=useState(0),[language,setLanguage]=useState('vi'),[zoom,setZoom]=useState(false),[failed,setFailed]=useState(false);
 const page=section*2+(language==='vi'?1:2);
 const change=fn=>{setFailed(false);setZoom(false);fn()};
 return <><div className="page-title"><div><h1>Quy chuẩn sản phẩm</h1><p>Tra cứu tiêu chuẩn kiểm tra và hình ảnh minh họa theo tài liệu HQ Hair.</p></div><div className="actions"><a className="btn" href={base+'original.pdf'} target="_blank" rel="noreferrer">Mở PDF gốc</a><a className="btn primary" href={base+'original.pdf?download=1'}>Tải PDF · 49 MB</a></div></div>
 <section className="panel standards-panel"><div className="standards-toolbar"><label className="field"><span>Nhóm sản phẩm</span><select aria-label="Nhóm quy chuẩn" value={section} onChange={e=>change(()=>setSection(Number(e.target.value)))}>{sections.map((name,i)=><option key={name} value={i}>{name}</option>)}</select></label><label className="field"><span>Ngôn ngữ tài liệu</span><select aria-label="Ngôn ngữ quy chuẩn" value={language} onChange={e=>change(()=>setLanguage(e.target.value))}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label><button className="btn" aria-pressed={zoom} onClick={()=>setZoom(!zoom)}>{zoom?'Vừa khung':'Phóng to'}</button><span className="muted" aria-live="polite">Trang {page} / 14</span></div>
 {failed?<p className="access-error" role="alert">Không tải được trang tài liệu. Vui lòng tải lại trang hoặc mở PDF gốc.</p>:<div className={'standards-page'+(zoom?' zoomed':'')} tabIndex={0} aria-label="Trang quy chuẩn sản phẩm"><img key={page} src={base+`page-${page}.webp`} width="2160" height="1215" alt={`${sections[section]} · ${language==='vi'?'Tiếng Việt':'English'} · Trang ${page}`} onError={()=>setFailed(true)}/></div>}
 <div className="standards-pagination"><button className="btn" disabled={section===0} onClick={()=>change(()=>setSection(section-1))}>Nhóm trước</button><span>{sections[section]} · {section+1}/{sections.length}</span><button className="btn" disabled={section===sections.length-1} onClick={()=>change(()=>setSection(section+1))}>Nhóm tiếp theo</button></div><p className="standards-caption">Bảng quy chuẩn · 14 trang · Bản xem giữ nguyên nội dung và hình ảnh của PDF khách cung cấp.</p></section></>;
}
