export const followGroup=o=>!o.accountingApproval||o.cancelledAt?null:o.finalPaymentCheck?'checked':'unchecked';
export const hasNewDocuments=o=>(o.payments||[]).some(p=>!p.confirmed);
