import {downloadReportExcel} from '../report-workbook.js';
import {ReportRangeSelect,defaultReportRange} from './report-range-select.jsx';
import React,{useState} from 'react';
import {saleKey} from '../accounting-sales.js';
import {periodDashboard,periodDashboardCSV} from '../period-dashboard.js';
import {availableYears} from '../reporting.js';
import {ReportPeriodSelect} from './report-period-select.jsx';
import {PeriodKpis} from './period-kpis.jsx';
import {money,today} from '../shared.js';
import {vnd} from '../receipt-fx.js';
export function AccountingPeriod({orders}){
 const [period,setPeriod]=useState(defaultReportRange),[sale,setSale]=useState('');
 const groups=new Map();for(const o of orders){const key=saleKey(o);if(!groups.has(key))groups.set(key,{key,name:o.sale||'Chưa xác định',orders:[]});groups.get(key).orders.push(o)}
 const sales=[...groups.values()].map(s=>({...s,...periodDashboard(s.orders,period)})).sort((a,b)=>a.name.localeCompare(b.name,'vi'));
 const selected=orders.filter(o=>!sale||saleKey(o)===sale),report=periodDashboard(selected,period);
 const download=()=>downloadReportExcel(periodDashboardCSV(selected,period,today(),true),'HQ-Hair-ke-toan-theo-ky.xlsx');
 const show=v=>v===null?'—':money(v);
 return <section className="panel panel-body accounting-period"><div className="accounting-report-heading"><h2>Báo cáo theo ngày duyệt / xác nhận thu</h2><button className="btn" onClick={download}>Xuất Excel theo kỳ</button></div>
 <div className="filters accounting-report-filters"><label>Sale<select aria-label="Sale báo cáo" value={sale} onChange={e=>setSale(e.target.value)}><option value="">Toàn bộ Sale</option>{sales.map(s=><option key={s.key} value={s.key}>{s.name}</option>)}</select></label><ReportRangeSelect value={period} onChange={setPeriod}/></div>
 <PeriodKpis orders={selected} period={period}/>
 <h3>Vận chuyển và thiệt hại</h3><div className="qc-summary">{[['Vận chuyển đã nhận',report.shippingPaid],['Thiệt hại',report.damages]].map(([k,v])=><span key={k}>{k}<b>{money(v)}</b></span>)}</div>
 <div className="qc-summary">{[['Tổng thực nhận VND',report.paidVND],['Vận chuyển đã nhận VND',report.shippingPaidVND],['Dòng tiền thu vào VND (trừ vận chuyển)',report.revenuePaidVND]].map(([k,v])=><span key={k}>{k}<b>{vnd(v)}</b></span>)}</div>
 <p>VND quy đổi theo tỷ giá từng khoản thu, làm tròn đến đồng. {report.missingRates>0&&<strong role="status">Có {report.missingRates} khoản chưa có tỷ giá, tổng VND chưa đầy đủ.</strong>}</p>
 <p>Thực thu và thu hồi công nợ phân loại theo từng tháng rồi cộng lại. Công nợ lấy số dư cuối tháng kết thúc, không cộng số dư các tháng; tháng hiện tại tính đến hôm nay. Doanh thu theo ngày kế toán duyệt. Dòng tiền theo ngày kế toán xác nhận, trừ vận chuyển phân bổ qua các đợt thu. Ngày gửi và ngày thực nhận chỉ dùng đối chiếu, không quyết định kỳ báo cáo. Công nợ cuối kỳ dùng các khoản đã xác nhận có ngày kế toán xác nhận đến cuối kỳ; khoản được điều chỉnh dùng dữ liệu đã sửa.</p>
 {report.undated>0&&<p role="status">Có {report.undated} mục thiếu ngày, chưa đưa vào thống kê theo kỳ.</p>}
 <h3>Báo cáo theo Sale</h3><div className="table-scroll"><table><thead><tr><th>Sale</th><th>Doanh thu thuần</th><th>Dòng tiền thu vào</th><th>Doanh thu thực thu</th><th>Thu hồi công nợ</th><th>Công nợ phải thu</th><th>Vận chuyển đã nhận</th><th>Thiệt hại</th></tr></thead><tbody>{sales.filter(s=>!sale||s.key===sale).map(s=><tr key={s.key}><td><button className="order-link" onClick={()=>setSale(s.key)}>{s.name}</button></td>{['revenue','revenuePaid','currentReceipts','recoveredDebt','debt','shippingPaid','damages'].map(k=><td key={k}>{show(s[k])}</td>)}</tr>)}</tbody></table></div>
 <details><summary>Chi tiết {report.approved.length} đơn duyệt và {report.rows.length} khoản thu</summary><div className="table-scroll"><table><thead><tr><th>Loại</th><th>Mã đơn</th><th>Ngày</th><th>Doanh thu thuần</th><th>Thực nhận</th><th>Vận chuyển</th><th>Dòng tiền trừ vận chuyển</th><th>Tỷ giá</th><th>Thực nhận VND</th></tr></thead><tbody>{report.approved.map(r=><tr key={'o'+r.id}><td>Đơn duyệt</td><td>{r.code}</td><td>{r.date}</td><td>{money(r.revenue)}</td><td colSpan={5}>—</td></tr>)}{report.rows.map((r,i)=><tr key={'p'+i}><td>Khoản thu</td><td>{r.code}</td><td>{r.date}</td><td>—</td><td>{money(r.paid)}</td><td>{money(r.shippingPaid)}</td><td>{money(r.revenuePaid)}</td><td>{r.exchangeRate??'—'}</td><td>{vnd(r.paidVND)}</td></tr>)}</tbody></table></div></details></section>;
}
