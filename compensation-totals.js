export const compensationTotal=order=>Math.round((order.compensations||[]).filter(e=>!e.voidedAt).reduce((s,e)=>s+(Number(e.amount)||0),0)*100)/100;
