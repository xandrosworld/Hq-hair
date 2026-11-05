// A dedicated approval rate wins. Legacy orders may use one unambiguous receipt rate.
export function approvalRate(order){
 const manual=Number(order?.accountingApproval?.exchangeRate);
 if(Number.isFinite(manual)&&manual>0)return manual;
 const receipts=(order?.payments||[]).filter(p=>p.confirmed&&Number(p.amount)>0);
 if(!receipts.length||receipts.some(p=>!Number.isFinite(Number(p.exchangeRate))||Number(p.exchangeRate)<=0))return null;
 const rates=new Set(receipts.map(p=>Number(p.exchangeRate)));
 return rates.size===1?[...rates][0]:null;
}
