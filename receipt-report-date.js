import {deliveryDate} from './delivery-days.js';
// Sender/bank dates are evidence only. Reporting follows accounting confirmation.
export const receiptReportDate=payment=>payment.confirmed?deliveryDate(payment.confirmedAt):'';
