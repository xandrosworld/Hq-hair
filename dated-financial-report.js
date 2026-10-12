import {accountingPeriod} from './accounting-period.js';
import {isFinancialOrder,csvCell} from './reporting.js';
import {totals,round,today} from './shared.js';
export function datedFinancialSummary(orders,period='',asOf=today()){
 const financial=orders.filter(isFinancialOrder),report=accountingPeriod(financial,period,asOf),ids=new Set(report.approved.map(r=>r.id));
 const losses=financial.flatMap(o=>(o.compensations||[]).filter(e=>!e.voidedAt&&e.date&&e.date<=asOf&&e.date.startsWith(period)).map(e=>({...e,orderId:o.id,code:o.orderCode})));
 return {...report,discount:round(financial.filter(o=>ids.has(o.id)).reduce((s,o)=>s+(Number(o.discount)||0),0)),damages:round(losses.reduce((s,e)=>s+Number(e.amount||0),0)),losses,debt:round(financial.reduce((s,o)=>s+totals(o).debt,0)),debtCount:financial.filter(o=>totals(o).debt>0).length};
}
export function datedFinancialCSV(orders,period='',asOf=today()){
 const r=datedFinancialSummary(orders,period,asOf),byId=new Map(orders.map(o=>[o.id,o]));
 const rows=[['Loai','Ma don','Sale','Ngay','Doanh thu don USD','Tong thuc nhan USD','Van chuyen da nhan USD','Doanh thu da nhan USD','Giam gia USD','Thiet hai USD','Cong no hien tai USD','Nguon ngay','Ty gia VND/USD','Tong thuc nhan VND','Van chuyen da nhan VND','Doanh thu da nhan VND'],
 ...r.approved.map(x=>['Don duyet',x.code,byId.get(x.id)?.sale,x.date,x.revenue,0,0,0,Number(byId.get(x.id)?.discount)||0,0,0,'Ngay duyet']),
 ...r.rows.map(x=>['Khoan thu',x.code,byId.get(x.orderId)?.sale,x.date,0,x.paid,x.shippingPaid,x.revenuePaid,0,0,0,x.legacy?'Ngay chung tu cu':'Ngay thuc nhan',x.exchangeRate??'',x.paidVND??'',x.shippingPaidVND??'',x.revenuePaidVND??'']),
 ...r.losses.map(x=>['Thiet hai',x.code,byId.get(x.orderId)?.sale,x.date,0,0,0,0,0,x.amount,0,'Ngay ghi nhan']),
 ...orders.filter(o=>isFinancialOrder(o)&&totals(o).debt>0).map(o=>['Cong no hien tai',o.orderCode,o.sale,asOf,0,0,0,0,0,0,totals(o).debt,'So du hien tai, khong phai lich su'])];
 return '\uFEFF'+rows.map(row=>Array.from({length:16},(_,i)=>row[i]??'').map(csvCell).join(',')).join('\r\n');
}
