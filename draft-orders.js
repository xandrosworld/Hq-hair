import {invoiceOrderLabel} from './order-identity.js';
export const pendingCustomerOrder=(orders,customerId,exceptId)=>orders.filter(o=>o.customerId===customerId&&o.id!==exceptId&&!o.cancelledAt&&!o.orderCode&&o.stage>=0).sort((a,b)=>b.stage-a.stage)[0];
export function assertDraftSlot(orders,customerId,exceptId){
 const pending=pendingCustomerOrder(orders,customerId,exceptId);
 if(pending)throw Object.assign(new Error(pending.stage===0?'Khách hàng đã có bản nháp. Mở lại bản nháp hiện có để tiếp tục.':'Khách hàng đang có đơn chờ Kế toán duyệt. Chưa thể tạo bản nháp tiếp theo.'),{status:409});
}
export const fixedDraftCode=(order,orders)=>order.draftCode||invoiceOrderLabel(order,orders);

export function freezeDraftCodes(orders){let changed=false;for(const o of orders)if(!o.orderCode&&!o.draftCode){o.draftCode=fixedDraftCode(o,orders);changed=true}return changed}
