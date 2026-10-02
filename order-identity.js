// Internal IDs never change: attachments, URLs and retries continue to use them.
export const isOfficialOrder = order => !!order.orderCode && !order.cancelledAt && order.stage > 0;
export const orderLabel = order => order.orderCode || order.requestCode || `YC-${order.id || 'mới'}`;

// Only historical accounting evidence qualifies; a manager moving a workflow
// stage alone must never create a purchase or consume an official number.
export function migrateOrderIdentity(orders) {
 for (const order of orders) {
  if (Object.hasOwn(order, 'orderCode')) continue;
  const approved = order.accountingApproval || order.history?.some(h => h.title === 'Kế toán duyệt');
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
