export const steps = ['Nhập đơn','Chờ duyệt','Kế toán duyệt','Sản xuất','Sale tiếp nhận','Gửi đến văn phòng','Kiểm tra thanh toán','Kiểm định & đặt ship','Đã nhận','Hoàn thành'];
export const groups = ['Khách lẻ','Start Business','Salon','Wholesale'];
export const countries = ['United States','United Kingdom','France','Germany','Australia','Canada','Nigeria','South Africa','Vietnam'];
export const catalog = [
 {name:'Bulk Hair',spec:'24” · Natural Black · Straight',unit:'Gram',price:8},
 {name:'Genius Weft',spec:'22” · #60 · Body Wave',unit:'Gram',price:10},
 {name:'Tape-in',spec:'22” · #18 · Straight',unit:'Gram',price:9},
 {name:'Clip-in',spec:'20” · #1B · Straight',unit:'Set',price:145},
 {name:'Lace Wig',spec:'24” · Natural Black · 13×4',unit:'Piece',price:280},
 {name:'Silicone Beads',spec:'Clear · 5mm',unit:'Pack',price:9.5},
 {name:'Color Ring',spec:'Bảng màu tóc mẫu',unit:'Piece',price:0}
];
export const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n || 0);
export const round = n => Math.round((n+Number.EPSILON)*100)/100;
export function totals(o) {
 const base=round((o.items||[]).filter(i=>i.kind==='base').reduce((s,i)=>s+i.qty*i.price,0));
 const extra=round((o.items||[]).filter(i=>i.kind==='extra').reduce((s,i)=>s+i.qty*i.price,0));
 const revenue=round(base+extra-(+o.discount||0));
 const receive=round(revenue+(+o.shippingFee||0));
 const total=round(receive+(+o.paymentFee||0));
 const paid=round((o.payments||[]).filter(p=>p.confirmed).reduce((s,p)=>s+(+p.amount||0),0));
 const pending=round((o.payments||[]).filter(p=>!p.confirmed).reduce((s,p)=>s+(+p.amount||0),0));
 return {base,extra,revenue,receive,total,paid,pending,debt:round(Math.max(0,receive-paid))};
}
export function status(o){return o.stage===0?'Bản nháp':o.stage===4?'Đang sản xuất':steps[o.stage-1]}
export function dateText(d){return d?new Date(d).toLocaleDateString('vi-VN'):'—'}
export const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
export function newOrder(customer){return {customerId:customer?.id||'',date:today(),due:'',sale:'Judy',stage:0,items:[{...catalog[0],qty:100,kind:'base'}],discount:0,shippingFee:0,paymentFee:0,payments:[],recipient:customer?.name||'',phone:customer?.phone||'',email:customer?.email||'',address:customer?.address||'',country:customer?.country||'United States',carrier:'DHL',service:'Express',tracking:'',note:'',messages:[],history:[]}}
