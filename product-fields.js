// Legacy rows retain their original per-unit calculation unless explicitly changed.
export const hairFields=[['origin','Origin of hair','Nguồn tóc'],['lengthCm','LENGTH (CM)','Chiều dài (cm)'],['texture','Type','Kiểu tóc'],['segment','Hair segment','Phân khúc tóc'],['color','Color','Màu tóc'],['productNote','Note','Ghi chú sản phẩm']];
export function rawProductAmount(item){return Number(item.qty||0)*Number(item.price||0)/(item.priceBasis==='100g'?100:1)}
export function productAmount(item){return Math.round((rawProductAmount(item)+Number.EPSILON)*100)/100}
export function productDescription(item){return [item.origin,item.lengthCm?`${item.lengthCm} cm`:null,item.texture,item.segment,item.color,item.productNote,item.spec].filter(Boolean).join(' · ')}
export function cleanProductFields(p){
 const fail=message=>{throw Object.assign(new Error(message),{status:400})};
 if(p.priceBasis!==undefined&&!['unit','100g'].includes(p.priceBasis))fail('Đơn vị tính giá không hợp lệ.');
 const fields={priceBasis:p.priceBasis||'unit'};
 if(p.priceReference&&typeof p.priceReference==='object'){fields.priceReference={};for(const key of ['id','tier','tone','colorId','variant'])fields.priceReference[key]=String(p.priceReference[key]||'').slice(0,120);if(Number.isSafeInteger(p.priceReference.version)&&p.priceReference.version>0)fields.priceReference.version=p.priceReference.version;}
 for(const [key] of hairFields){
  if(key==='lengthCm'){
   const v=p[key];if(v!==undefined&&v!==null&&v!==''){if(!Number.isFinite(Number(v))||Number(v)<=0||Number(v)>300)fail('Chiều dài tóc phải lớn hơn 0 và không quá 300 cm.');fields[key]=Number(v)}else fields[key]='';
  }else fields[key]=typeof p[key]==='string'?p[key].trim().slice(0,200):'';
 }
 if(fields.priceBasis==='100g'&&!['gram','grams','g'].includes(String(p.unit).toLowerCase()))fail('Đơn giá USD/100g phải dùng trọng lượng Gram.');
 return fields;
}
