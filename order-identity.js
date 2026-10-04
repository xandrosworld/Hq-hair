// Internal IDs never change: attachments, URLs and retries continue to use them.
export const isOfficialOrder = order => !!order.orderCode && !order.cancelledAt && order.stage > 0;
export const orderLabel = order => order.orderCode || order.draftCode || order.requestCode || `YC-${order.id || 'mới'}`;

// Preview only: reserving official numbers remains an accounting approval action.
export function invoiceOrderLabel(order, orders = []) {
 if (order.orderCode) return order.orderCode;
 if (order.draftCode) return order.draftCode;
 const prefix = `${order.customerId}-`;
 const numbers = orders.map(o => o.orderCode).filter(code => code?.startsWith(prefix))
  .map(code => code.slice(prefix.length)).filter(suffix => /^\d+$/.test(suffix)).map(Number);
 return `Draft-${prefix}${Math.max(0, ...numbers) + 1}`;
}

// Reports use the first accounting approval, not order entry or later balance payments.
const approvalDateFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
export function approvalDate(order) {
 const dates=[order.approvedAt,...(order.history||[]).filter(h=>['Kế toán duyệt','Đã duyệt'].includes(h.title)).map(h=>h.time),order.accountingApproval?.time]
  .filter(v=>typeof v==='string').map(v=>{
   if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;
   const date=new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(v)?v:v+'+07:00');
   return Number.isFinite(date.getTime())?approvalDateFormat.format(date):'';
  }).filter(Boolean).sort();
 return dates[0]||'';
}

// Only historical accounting evidence qualifies; a manager moving a workflow
// stage alone must never create a purchase or consume an official number.
export function migrateOrderIdentity(orders) {
 for (const order of orders) {
  if (Object.hasOwn(order, 'orderCode')) continue;
  const approved = order.accountingApproval || order.history?.some(h => ['Kế toán duyệt','Đã duyệt'].includes(h.title));
  order.orderCode = approved ? order.id : null;
  order.requestCode = `YC-${order.id}`;
 }
}

export function assignOrderCode(order, orders) {
 if (order.orderCode || !order.accountingApproval || order.cancelledAt) return;
 const prefix = `${order.customerId}-`;
 const numbers = orders.map(o => o.orderCode).filter(code => code?.startsWith(prefix))
  .map(code => code.slice(prefix.length)).filter(suffix => /^\d+$/.test(suffix)).map(Number);
 order.orderCode = prefix + (Math.max(0, ...numbers) + 1);
 order.approvedAt = order.accountingApproval.time;
}
