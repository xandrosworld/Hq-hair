import {inReportPeriod,validReportRange,receiptPartition} from './report-range.js';
import {datedFinancialSummary} from './dated-financial-report.js';
import {approvalDate,orderLabel} from './order-identity.js';
import {deliveryDate} from './delivery-days.js';
import {totals,round,today} from './shared.js';
import {csvCell} from './reporting.js';
export function periodEnd(period,asOf=today()){
 if(typeof period==='object')return period.to<asOf?period.to:asOf;
 if(!period)return asOf;
 const end=period.length===4?period+'-12-31':period.length===7?new Date(Date.UTC(Number(period.slice(0,4)),Number(period.slice(5,7)),0)).toISOString().slice(0,10):period;
 return end<asOf?end:asOf;
}
export function receivablesAt(orders,cutoff,asOf=today()){
 const rows=[];let missing=0;
 for(const o of orders){
  const approved=approvalDate(o);if(!o.orderCode||approved&&approved>cutoff)continue;
  const historical=cutoff<asOf;
  if(historical&&!approved){missing++;continue;}
  const snapshots=(o.history||[]).filter(h=>h.snapshot&&deliveryDate(h.time)>cutoff).sort((a,b)=>a.time.localeCompare(b.time));
  const source=historical&&snapshots.length?{...o,...snapshots[0].snapshot}:o;
  // Preserve corrected receipt data, selecting by the actual receipt date.
  const payments=(o.payments||[]).filter(p=>p.confirmed);
  if(historical&&payments.some(p=>!p.receivedDate&&!p.date)){missing++;continue;}
  if(historical&&(o.history||[]).some(h=>h.title==='Quản trị chỉnh sửa ngoại lệ'&&deliveryDate(h.time)>cutoff)&&!snapshots.length){missing++;continue;}
  const cancelled=deliveryDate(o.cancelledAt);
  if(historical&&o.cancelledAt&&!cancelled){missing++;continue;}
  const debt=totals({...source,cancelledAt:!historical?o.cancelledAt:cancelled&&cancelled<=cutoff?o.cancelledAt:null,payments:payments.filter(p=>!historical&&!p.receivedDate&&!p.date||(p.receivedDate||p.date)<=cutoff)}).debt;
  if(debt>0)rows.push({id:o.id,code:orderLabel(o),date:cutoff,debt});
 }
 return {debt:missing?null:round(rows.reduce((s,r)=>s+r.debt,0)),debtCount:rows.length,debtRows:rows,debtMissing:missing};
}
export function periodDashboard(orders,period='',asOf=today()){
 if(typeof period==='object'&&!validReportRange(period,asOf))throw new Error('Khoảng ngày báo cáo không hợp lệ');
 const report=datedFinancialSummary(orders,period,asOf),cutoff=periodEnd(period,asOf),byId=new Map(orders.map(o=>[o.id,o]));
 // All-time receipts are cumulative; recovery has no prior-period baseline. Year partition remains unconfigured.
 const splitReady=typeof period==='object'||/^\d{4}-\d{2}$/.test(period),start=typeof period==='object'?period.from:period+'-01';let current=0,recovered=0,unclassified=0;
 if(splitReady)for(const receipt of report.rows){const kind=receiptPartition(approvalDate(byId.get(receipt.orderId)),receipt.date,period);if(kind==='current')current+=receipt.revenuePaid;else if(kind==='recovered')recovered+=receipt.revenuePaid;else unclassified+=receipt.revenuePaid;}
 return {...report,...receivablesAt(orders,cutoff,asOf),cutoff,historical:cutoff<asOf,splitReady,recoveryNotApplicable:!period,currentReceipts:!period?report.revenuePaid:splitReady?round(current):null,recoveredDebt:splitReady?round(recovered):null,unclassified:round(unclassified)};
}
export function periodDashboardCSV(orders,period='',asOf=today(),accounting=false){
 const start=typeof period==='object'?period.from:period+'-01',r=periodDashboard(orders,period,asOf),byId=new Map(orders.map(o=>[o.id,o]));
 const rows=[['Loai','Ma don','Ngay','Doanh thu thuan USD','Dong tien thu vao tru van chuyen USD','Doanh thu thuc thu USD','Thu hoi cong no USD','Giam gia USD','Cong no tai '+r.cutoff+' USD',...(accounting?['Van chuyen da nhan USD','Thiet hai USD']:[])]];
 for(const a of r.approved)rows.push(['Don duyet',a.code,a.date,a.revenue,0,r.splitReady?0:'',r.splitReady?0:'',Number(byId.get(a.id)?.discount)||0,0]);
 for(const p of r.rows){const approved=approvalDate(byId.get(p.orderId));rows.push(['Khoan thu',p.code,p.date,0,p.revenuePaid,!period?p.revenuePaid:r.splitReady?(receiptPartition(approved,p.date,period)==='current'?p.revenuePaid:0):'',r.splitReady?(receiptPartition(approved,p.date,period)==='recovered'?p.revenuePaid:0):'',0,0,...(accounting?[p.shippingPaid,0]:[])])}
 for(const d of r.debtRows)rows.push(['Cong no cuoi ky',d.code,d.date,0,0,r.splitReady?0:'',r.splitReady?0:'',0,d.debt]);
 if(accounting)for(const l of r.losses)rows.push(['Thiet hai',l.code,l.date,0,0,'','',0,0,0,l.amount]);
 if(r.debtMissing)rows.push(['CHUA DU DU LIEU CONG NO',`${r.debtMissing} don`,r.cutoff]);
 if(!period)rows.push(['THU HOI CONG NO: KHONG AP DUNG']);
 if(period&&!r.splitReady)rows.push(['CHUA CHOT PHAN LOAI THUC THU / THU HOI NO CHO CHE DO NAY']);
 return '\uFEFF'+rows.map(row=>Array.from({length:rows[0].length},(_,i)=>row[i]??'').map(csvCell).join(',')).join('\r\n');
}
