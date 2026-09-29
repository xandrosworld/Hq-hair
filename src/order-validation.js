import {totals} from '../shared.js';

export function validateOrder(order,{submit=false}={}){
  const errors={};
  if(!order.customerId)errors.customerId='Chọn khách hàng trước khi lưu đơn.';
  for(const key of ['discount','shippingFee','paymentFee']){
    if(!Number.isFinite(Number(order[key]))||Number(order[key])<0||Number(order[key])>10000000)errors[key]='Nhập số tiền từ 0 đến 10.000.000 USD.';
  }
  if(totals(order).revenue<0)errors.discount='Giảm giá không được vượt tổng giá sản phẩm.';
  (order.items||[]).forEach((item,i)=>{
    if(!Number.isFinite(Number(item.qty))||Number(item.qty)<(submit?1:0)||Number(item.qty)>100000)errors[`qty-${i}`]='Số lượng phải từ '+(submit?'1':'0')+' đến 100.000.';
    if(!Number.isFinite(Number(item.price))||Number(item.price)<0||Number(item.price)>100000)errors[`price-${i}`]='Đơn giá phải từ 0 đến 100.000 USD.';
  });
  if(submit){
    if(!order.date||!Number.isFinite(Date.parse(order.date)))errors.date='Chọn ngày đặt hàng.';
    if(!order.due||!Number.isFinite(Date.parse(order.due)))errors.due='Chọn ngày giao dự kiến.';
    else if(order.due<order.date)errors.due='Ngày giao phải từ ngày đặt hàng trở đi.';
    if(!order.items?.some(i=>i.kind==='base'&&Number(i.qty)>0))errors.items='Thêm ít nhất một sản phẩm gốc có số lượng lớn hơn 0.';
    for(const [key,label] of [['recipient','tên người nhận'],['phone','số điện thoại'],['address','địa chỉ giao hàng'],['country','quốc gia']])if(!order[key]?.trim())errors[key]=`Nhập ${label}.`;
    if(order.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.email))errors.email='Email chưa đúng định dạng.';
  }
  return errors;
}
