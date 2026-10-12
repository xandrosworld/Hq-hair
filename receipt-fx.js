// Manual VND per USD rate, stored on each receipt; never inferred for legacy data.
export function receiptRate(value){
 if(value===undefined||value===null||value==='')return null;
 if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>1000000||Math.abs(value*100-Math.round(value*100))>0.000001)throw Object.assign(new Error('Tỷ giá phải lớn hơn 0, tối đa 1.000.000 VND/USD và hai chữ số thập phân.'),{status:400});
 return value;
}
export function receiptVND(paid,shippingPaid,rate){
 if(rate==null)return {paidVND:null,shippingPaidVND:null,revenuePaidVND:null};
 const paidVND=Math.round(paid*rate),shippingPaidVND=Math.round(shippingPaid*rate);
 return {paidVND,shippingPaidVND,revenuePaidVND:paidVND-shippingPaidVND};
}
export const vnd=value=>value==null?'Chưa có tỷ giá':new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(value);
