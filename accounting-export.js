import {accountingCurrencies} from './accounting-currencies.js';
import {csvCell} from './reporting.js';
import {money} from './shared.js';
import {vnd} from './receipt-fx.js';
export const accountingMetrics=[['discount','discount','Giảm giá'],['revenue','revenue','Doanh thu thuần'],['cash','revenuePaid','Dòng tiền thu vào'],['current','currentReceipts','Doanh thu thực thu'],['recovered','recoveredDebt','Thu hồi công nợ'],['debt','debt','Công nợ phải thu'],['shipping','shippingPaid','Tổng thu phí vận chuyển'],['total','paid','Tổng thu'],['damages','damages','Bồi thường / thiệt hại']];
export function accountingSummaryRows(orders,report,period){
 const rates=accountingCurrencies(orders,report,period);
 return accountingMetrics.map(([key,usd,label])=>[label,report[usd]??'Chưa đủ dữ liệu',key==='debt'?'Chỉ theo dõi USD':rates[key]??'Chưa có tỷ giá']);
}
export const accountingSummaryCSV=(orders,report,period)=>[['Chỉ tiêu','USD','VND'],...accountingSummaryRows(orders,report,period)].map(r=>r.map(csvCell).join(',')).join('\r\n');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function accountingPrintHTML(orders,report,period,sale){
 const rows=accountingSummaryRows(orders,report,period);
 const range=typeof period==='object'?`${period.from} → ${period.to}`:period||'Tất cả thời gian';
 return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo thu tiền HQ HAIR</title><style>@page{size:A4;margin:16mm}body{font:13px Arial,sans-serif;color:#17384c}h1{font-size:23px}table{border-collapse:collapse;width:100%;margin-top:24px}th,td{border-bottom:1px solid #ccd8df;padding:13px 10px;text-align:right}th:first-child,td:first-child{text-align:left}th{background:#eaf1f5}tr{break-inside:avoid}small{display:block;margin-top:18px;line-height:1.6}</style></head><body><h1>HQ HAIR · Báo cáo thu tiền</h1><p>Kỳ báo cáo: ${esc(range)} · ${esc(sale||'Toàn bộ Sale')}</p><table><thead><tr><th>Chỉ tiêu</th><th>USD</th><th>VND</th></tr></thead><tbody>${rows.map(([label,usd,vietnam])=>`<tr><td>${esc(label)}</td><td>${esc(typeof usd==='number'?money(usd):usd)}</td><td>${esc(typeof vietnam==='number'?vnd(vietnam):vietnam)}</td></tr>`).join('')}</tbody></table><small>Doanh thu và giảm giá theo tỷ giá duyệt đơn. Tiền đã thu theo tỷ giá từng khoản. Bồi thường theo tỷ giá riêng khi ghi nhận. Thiếu tỷ giá không thay bằng 0.<br>Các khoản phát sinh cộng theo kỳ. Công nợ là số dư đến ngày kết thúc, gồm nợ trước kỳ chọn. Tổng thu gồm vận chuyển; dòng tiền thu vào đã trừ vận chuyển.</small></body></html>`;
}
export async function printAccountingReport(html){
 const popup=window.open('','_blank');if(!popup){window.alert('Cho phép mở cửa sổ mới để in báo cáo.');return}
 popup.document.write(html);popup.document.close();await popup.document.fonts.ready;popup.focus();popup.print();
}
