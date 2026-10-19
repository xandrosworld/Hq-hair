import React from 'react';
import {accountingDetailGroups} from '../accounting-detail.js';
import {money} from '../shared.js';
import {vnd} from '../receipt-fx.js';
const day=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value.split('-').reverse().join('/'):'—';
function Receipts({rows}){return <details><summary>{rows.length} lần thu · Xem ngày và tỷ giá</summary><div className="table-scroll"><table><thead><tr><th>Ngày xác nhận thu</th><th>Tổng thu (USD)</th><th>Phí vận chuyển</th><th>Dòng tiền thu về</th><th>Tỷ giá</th><th>Tổng thu (VND)</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td>{day(r.date)}</td><td>{money(r.paid)}</td><td>{money(r.shippingPaid)}</td><td>{money(r.revenuePaid)}</td><td>{r.exchangeRate?.toLocaleString('vi-VN')||'—'}</td><td>{vnd(r.paidVND)}</td></tr>)}</tbody></table></div></details>}
export function AccountingDetails({orders,report}){
 const groups=accountingDetailGroups(orders,report);
 return <details className="accounting-details"><summary>Chi tiết {report.approved.length} đơn duyệt và {report.rows.length} khoản thu</summary>
 {[['current','Đơn duyệt','Tiền thu của đơn duyệt cùng tháng nhận tiền.'],['recovered','Thu hồi công nợ','Tiền thu của đơn duyệt từ các tháng trước.']].map(([key,label,help])=><section key={key} aria-label={label}><h3>{label}</h3><p className="muted">{help} Các khoản thu được cộng theo từng đơn trong kỳ đã chọn.</p><div className="table-scroll"><table><thead><tr><th>Mã đơn / Ngày duyệt</th>{key==='current'&&<th>Doanh thu thuần</th>}<th>Tổng thu (USD / VND)</th><th>Phí vận chuyển đã nhận</th><th>{key==='current'?'Doanh thu thực thu':'Thu hồi công nợ'}</th></tr></thead><tbody>{groups[key].map(g=><React.Fragment key={g.id}><tr><td><b>{g.code}</b><small>{day(g.date)}</small></td>{key==='current'&&<td>{g.revenue===null?'Ngoài kỳ chọn':money(g.revenue)}</td>}<td>{money(g.paid)}<small>{vnd(g.paidVND)}</small></td><td>{money(g.shippingPaid)}</td><td>{money(g.revenuePaid)}</td></tr>{g.receipts.length>0&&<tr><td colSpan={key==='current'?5:4}><Receipts rows={g.receipts}/></td></tr>}</React.Fragment>)}</tbody></table></div>{!groups[key].length&&<p>Không có dữ liệu trong kỳ đã chọn.</p>}</section>)}
 {groups.unclassified.length>0&&<section role="status"><p>Có {groups.unclassified.length} khoản thu thiếu ngày duyệt, chưa thể phân loại. Cần bổ sung ngày để đối chiếu.</p>{groups.unclassified.map((r,i)=><div key={i}><b>{r.code}</b><Receipts rows={[r]}/></div>)}</section>}
 </details>;
}
