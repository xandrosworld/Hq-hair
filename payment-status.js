import {totals} from './shared.js';
export function currentPaymentLabel(order){
 if(order.cancelledAt)return order.cancelType==='deposit_forfeited'?'Hủy đơn mất cọc':'Đã hủy';
 if(!order.accountingApproval&&!order.payments?.some(p=>p.confirmed))return 'Chưa xác nhận thanh toán';
 const t=totals(order);
 if(t.debt<=0)return 'Thanh toán đủ';
 return t.paid>0?'Thanh toán một phần':'Chưa thanh toán';
}
