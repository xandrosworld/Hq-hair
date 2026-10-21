import {approvalDate,orderLabel} from './order-identity.js';
import {hairSegment} from './hair-classification.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')?v.split('-').reverse().join('/'):'—';
export function factoryPrintHTML(order){
 const heads=['STT','Sản phẩm','Nguồn tóc','Dài (cm)','Kiểu tóc','Phân khúc','Màu','Số lượng','Ghi chú'];
 return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Phiếu sản phẩm ${esc(orderLabel(order))}</title><style>@page{size:A4 landscape;margin:12mm}body{font:12px Arial;color:#17384c}h1{font-size:22px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #bbb;padding:8px;overflow-wrap:anywhere;text-align:left}th{background:#eef3f6}th:first-child{width:30px}thead{display:table-header-group}tr{break-inside:avoid}p{line-height:1.8}</style></head><body><h1>HQ HAIR · PHIẾU SẢN PHẨM</h1><p><b>Mã đơn: ${esc(orderLabel(order))}</b><br>Ngày duyệt: ${date(approvalDate(order))} · Dự kiến giao hàng: ${date(order.due)}</p><table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${(order.items||[]).map((p,i)=>`<tr>${[i+1,[p.name,p.spec].filter(Boolean).join(' · '),p.origin,p.lengthCm,p.texture,p.origin==='Baby Hair'?'—':hairSegment(p.segment),p.color,`${p.qty??''} ${p.unit||''}`,p.productNote||''].map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
}
export async function printFactoryOrder(order){const w=window.open('','_blank');if(!w){window.alert('Cho phép mở cửa sổ mới để in phiếu sản phẩm.');return}w.document.write(factoryPrintHTML(order));w.document.close();await w.document.fonts.ready;w.focus();w.print()}
