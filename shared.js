import {orderQueue} from './order-queue.js';
import {rawProductAmount} from './product-fields.js';
export const steps = ['Nhập đơn','Chờ duyệt','Đã duyệt','Xưởng ghi nhận','Sale tiếp nhận','Đã gửi đến văn phòng','Kiểm tra thanh toán lần cuối','Phiếu kiểm định và đặt ship','Đã nhận','Hoàn thành'];
export const groups = ['Khách lẻ','Start Business','Salon','Wholesale'];
export const countries = ['United States','United Kingdom','France','Germany','Australia','Canada','Nigeria','South Africa','Vietnam'];
export const catalog = [
 {name:'Bulk Hair',spec:'24” · Natural Black · Straight',unit:'Gram',price:8},
 {name:'Genius Weft',spec:'22” · #60 · Body Wave',unit:'Gram',price:10},
 {name:'Tape-in',spec:'22” · #18 · Straight',unit:'Gram',price:9},
 {name:'Clip-in',spec:'20” · #1B · Straight',unit:'Set',price:145},
 {name:'Lace Wig',spec:'24” · Natural Black · 13×4',unit:'Piece',price:280},
 {name:'Silicone Beads',spec:'Clear · 5mm',unit:'Pack',price:9.5},
 {name:'Color Ring',spec:'Bảng màu tóc mẫu',unit:'Piece',price:0},
 {name:'Bulk',origin:'Raw hair',lengthCm:55,texture:'Straight',segment:'Super Double Drawn',color:'#2H',productNote:'',spec:'',unit:'Gram',price:98.5,priceBasis:'100g',kind:'base'}
];
export const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n || 0);
export const round = n => Math.round((n+Number.EPSILON)*100)/100;
export function totals(o) {
 const base=round((o.items||[]).filter(i=>i.kind==='base').reduce((s,i)=>s+rawProductAmount(i),0));
 const extra=round((o.items||[]).filter(i=>i.kind==='extra').reduce((s,i)=>s+rawProductAmount(i),0));
 const revenue=round(base+extra-(+o.discount||0));
 const receive=round(revenue+(+o.shippingFee||0));
 const total=round(receive+(+o.paymentFee||0));
 const paid=round((o.payments||[]).filter(p=>p.confirmed).reduce((s,p)=>s+(+p.amount||0),0));
 const pending=round((o.payments||[]).filter(p=>!p.confirmed).reduce((s,p)=>s+(+p.amount||0),0));
 const revenuePaid=round(Math.max(0,paid-(+o.shippingFee||0)));
 return {base,extra,revenue,receive,total,paid,revenuePaid,pending,debt:round(Math.max(0,total-paid))};
}
export function status(o){if(o.stage===10&&o.cancelType==='deposit_forfeited')return 'Hoàn thành - Hủy đơn mất cọc';return o.cancelledAt?'Đã hủy':o.stage===0?'Bản nháp':orderQueue(o)?.label||steps[o.stage-1]}
export function dateText(d){return d?new Date(d).toLocaleDateString('vi-VN'):'—'}
export const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
export function newOrder(customer){return {customerId:customer?.id||'',date:today(),due:'',sale:'Judy',stage:0,items:[{...catalog[0],qty:100,kind:'base'}],discount:0,shippingFee:0,paymentFee:0,payments:[],recipient:customer?.recipient||customer?.name||'',phone:customer?.recipientPhone||customer?.phone||'',email:customer?.recipientEmail??customer?.email??'',address:customer?.address||'',country:customer?.shippingCountry||customer?.country||'United States',carrier:'DHL',service:'Express',tracking:'',note:'',messages:[],history:[]}}
