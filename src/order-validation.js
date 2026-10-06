import {validDate} from '../reporting.js';
import {totals} from '../shared.js';

export function validateOrder(order,{submit=false}={}){
  const errors={};
  if(!order.customerId)errors.customerId='Chọn khách hàng trước khi lưu đơn.';
  for(const key of ['discount','shippingFee','paymentFee']){
    if(!Number.isFinite(Number(order[key]))||Number(order[key])<0||Number(order[key])>10000000)errors[key]='Nhập số tiền từ 0 đến 10.000.000 USD.';
  }
  if(totals(order).revenue<0)errors.discount='Giảm giá không được vượt tổng giá sản phẩm.';
  (order.items||[]).forEach((item,i)=>{
    if(submit&&!String(item.name||'').trim())errors[`name-${i}`]=`Dòng sản phẩm ${i+1}: nhập loại tóc nối / tên sản phẩm hoặc xóa dòng không dùng.`;
    if(submit){
      for(const [key,label] of [['origin','nguồn tóc'],['lengthCm','chiều dài'],['texture','kiểu tóc'],['segment','phân khúc tóc'],['color','màu tóc'],['unit','đơn vị'],['priceBasis','cách tính giá']])if(!String(item[key]??'').trim()||['-','—'].includes(String(item[key]).trim()))errors[`${key}-${i}`]=`Dòng sản phẩm ${i+1}: chọn ${label}.`;
      if(item.lengthCm&&(!Number.isFinite(Number(item.lengthCm))||Number(item.lengthCm)<=0))errors[`lengthCm-${i}`]=`Dòng sản phẩm ${i+1}: chiều dài phải lớn hơn 0.`;
      if(item.kind!=='gift'&&Number(item.price)<=0)errors[`price-${i}`]=`Dòng sản phẩm ${i+1}: đơn giá phải lớn hơn 0.`;
    }
    if(!Number.isFinite(Number(item.qty))||(submit?Number(item.qty)<=0:Number(item.qty)<0)||Number(item.qty)>100000)errors[`qty-${i}`]='Số lượng phải '+(submit?'lớn hơn 0':'từ 0')+' và không vượt 100.000.';
    if(!Number.isFinite(Number(item.price))||Number(item.price)<0||Number(item.price)>100000)errors[`price-${i}`]='Đơn giá phải từ 0 đến 100.000 USD.';
  });
  if(order.paymentDue&&(!validDate(order.paymentDue)||order.paymentDue<order.date))errors.paymentDue='Hạn thanh toán phải hợp lệ và không trước ngày đặt hàng.';
  if(order.date&&!validDate(order.date))errors.date='Ngày đặt hàng chưa hợp lệ.';
  if(order.due&&!validDate(order.due))errors.due='Ngày giao chưa hợp lệ.';
  if(submit){
    if(!order.payments?.length)errors.payments='Thêm ít nhất một chứng từ thanh toán trước khi gửi duyệt.';
    if(!validDate(order.date))errors.date='Chọn ngày đặt hàng.';
    if(!validDate(order.due))errors.due='Chọn ngày giao dự kiến.';
    else if(order.due<order.date)errors.due='Ngày giao phải từ ngày đặt hàng trở đi.';
    if(!order.items?.some(i=>i.kind==='base'&&Number(i.qty)>0))errors.items='Thêm ít nhất một sản phẩm gốc có số lượng lớn hơn 0.';
    for(const [key,label] of [['recipient','tên người nhận'],['phone','số điện thoại'],['address','địa chỉ giao hàng'],['country','quốc gia']])if(!order[key]?.trim())errors[key]=`Nhập ${label}.`;
    if(order.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.email))errors.email='Email chưa đúng định dạng.';
  }
  return errors;
}

export const validationStep=key=>/^(customerId|date|due|items|name-|qty-|price-|origin-|lengthCm-|texture-|segment-|color-|unit-|priceBasis-)/.test(key)?1:2;
