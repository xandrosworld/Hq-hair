export const followGroup=o=>!o.accountingApproval||o.cancelledAt?null:o.finalPaymentCheck?'checked':'unchecked';
export const hasNewDocuments=o=>(o.payments||[]).some(p=>!p.confirmed);

export const finalReviewLabels={full:'Thanh toán đủ',credit:'Giao hàng công nợ'};
export const matchesFinalReview=(order,key)=>followGroup(order)==='checked'&&(key==='all'||order.finalPaymentCheck?.status===key);
