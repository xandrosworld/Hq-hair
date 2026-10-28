import {periodDashboard} from './period-dashboard.js';
import {accountingCurrencies} from './accounting-currencies.js';
import {round,today} from './shared.js';

export const sheetSaleCodes=['HQ-JD','HQ-LN','HQ-EM','HQ-SL'];
// This export shares the CRM's calculations. It never replaces a missing rate
// with zero, applies a common rate, or adds receipts to a previous export.
export function accountingSheetData(orders,users,year,asOf=today()){
 if(!Number.isInteger(year)||year<2020||year>Number(asOf.slice(0,4)))throw new Error('Năm đồng bộ không hợp lệ.');
 const roster=sheetSaleCodes.map(code=>{
  const matches=users.filter(u=>u.code===code&&u.role==='sale');
  if(matches.length!==1)throw new Error(`Chưa xác định duy nhất nhân viên ${code}.`);
  return matches[0];
 });
 const rows=[];
 for(let month=1;month<=12;month++){
  const period=`${year}-${String(month).padStart(2,'0')}`;
  if(period>asOf.slice(0,7))break;
  for(const user of roster){
   const selected=orders.filter(o=>o.ownerId===user.id);
   const report=periodDashboard(selected,period,asOf);
   const rates=accountingCurrencies(selected,report,period);
   const listed=report.approved.map(a=>{
    const o=selected.find(o=>o.id===a.id),usd=round(a.revenue+(Number(o.discount)||0));
    return {usd,vnd:usd===0?0:o.accountingApproval?.exchangeRate>0?Math.round(usd*o.accountingApproval.exchangeRate):null};
   });
   rows.push({key:`${period}:${user.code}`,period,month,code:user.code,name:user.name,cutoff:report.cutoff,
    usd:{listed:round(listed.reduce((n,r)=>n+r.usd,0)),discount:report.discount,shipping:report.shippingPaid,total:report.paid,cash:report.revenuePaid,current:report.currentReceipts,recovered:report.recoveredDebt,debt:report.debt,damages:report.damages},
    vnd:{listed:listed.some(r=>r.vnd===null)?null:listed.reduce((n,r)=>n+r.vnd,0),...rates},
    warnings:{missingRates:report.missingRates,undated:report.undated,unclassified:report.unclassified,debtMissing:report.debtMissing}});
  }
 }
 return {schemaVersion:1,year,asOf,mode:'receipt-rates',rows};
}
