import React from 'react';
import {money} from '../shared.js';

export function DebtReconciliation({report:r}){
 const date=value=>value.split('-').reverse().join('/');
 return <details className="panel panel-body debt-reconciliation">
  <summary>Đối chiếu công nợ đến {date(r.cutoff)}</summary>
  <p>Công nợ gồm tất cả đơn cũ và mới còn thiếu tiền đến ngày kết thúc, không phụ thuộc tháng bắt đầu chọn. Không cộng công nợ của từng tháng.</p>
  {r.complete?<><p data-testid="debt-equation"><strong>{money(r.opening)} + {money(r.increased)} − {money(r.decreased)} = {money(r.closing)}</strong></p>
   <p>Số dư ngày {date(r.openingDate)} + nợ tăng − nợ giảm trong tháng kết thúc. Đơn mới chỉ tính phần còn thiếu; tiền trả dư của một đơn không trừ nợ đơn khác.</p>
   <div className="table-scroll"><table><thead><tr><th>Đơn hàng</th><th>Cuối tháng trước</th><th>Nợ tăng</th><th>Nợ giảm</th><th>Còn nợ ngày {date(r.cutoff)}</th></tr></thead><tbody>{r.rows.map(row=><tr key={row.id}><td>{row.code}</td>{['opening','increased','decreased','closing'].map(key=><td key={key}>{money(row[key])}</td>)}</tr>)}</tbody></table></div>
   <p>Nợ tăng/giảm là chênh lệch số dư từng đơn, gồm cả điều chỉnh hoặc hủy đơn; không phải chỉ số “Thu hồi công nợ”.</p>
  </>:<p role="status">Chưa đủ lịch sử để đối chiếu công nợ cuối tháng trước. Không dùng số 0 thay cho dữ liệu còn thiếu.</p>}
 </details>;
}
