import {hairProductName,hairSegment} from './hair-classification.js';
const fail=message=>{throw Object.assign(new Error(message),{status:400})};
const text=(value,max)=>typeof value==='string'&&value.trim().length<=max?value.trim():null;
const numeric=(value,max,label)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>max)fail(`${label} phải lớn hơn 0 và không quá ${max.toLocaleString('vi-VN')}.`);return value};
export function cleanPriceEntry(body,existing){
 const price=numeric(body.price,100000,'Giá');
 if(Math.abs(price*100-Math.round(price*100))>1e-7)fail('Đơn giá tối đa hai chữ số thập phân.');
 const note=text(body.note??'',500);if(note===null)fail('Ghi chú tối đa 500 ký tự.');
 if(existing)return {...existing,price,note};
 const product=text(body.product,120),segment=text(body.segment??'',80),variant=text(body.variant??'',80);
 if(!product||segment===null||variant===null)fail('Nhập tên sản phẩm và quy cách hợp lệ.');
 if(!['Basic','Baby','Premium'].includes(body.tier)||!['black','brown','blonde'].includes(body.tone)||!['100g','unit'].includes(body.priceBasis))fail('Chọn bảng giá, tông màu và đơn vị tính giá hợp lệ.');
 const lengthCm=numeric(body.lengthCm,300,'Chiều dài (cm)'),inches=numeric(body.inches,120,'Chiều dài (inch)');
 return {tier:body.tier,product,segment:hairSegment(segment),variant,lengthCm,inches,tone:body.tone,priceBasis:body.priceBasis,price,note};
}
export function priceEntryKey(row){return JSON.stringify([row.tier,hairProductName(row.product).normalize('NFKC').toLowerCase(),String(hairSegment(row.segment)||'').normalize('NFKC').trim().toLowerCase(),String(row.variant||'').normalize('NFKC').trim().toLowerCase(),Number(row.lengthCm),row.tone])}
