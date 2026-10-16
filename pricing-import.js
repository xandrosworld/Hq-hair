import {cleanPriceEntry,priceEntryKey} from './price-entry.js';
const fail=message=>{throw Object.assign(Error(message),{status:400})};
export const colorKey=v=>String(v||'').trim().replace(/^#/,'').toLowerCase();
export function planPricingImport(data,body,permissions={prices:true,colors:true}){
 if(body.version!==data.version)throw Object.assign(Error('Danh mục đã thay đổi. Tải giá mới và xem trước lại.'),{status:409});
 if(!['add','upsert'].includes(body.mode))fail('Chọn cách nhập dữ liệu.');
 if(!Array.isArray(body.rows)||!body.rows.length||body.rows.length>10000)fail('Mỗi lần nhập từ 1 đến 10.000 dòng.');
 const errors=[],changes=[],seen=new Set(),prices=new Map(),colors=new Map(data.colors.map(c=>[colorKey(c.code),c]));
 for(const p of data.prices){const k=priceEntryKey(p);prices.set(k,prices.has(k)?null:p)}
 for(const [i,input] of body.rows.entries()){
  const location=String(input?.location||`Dòng ${i+1}`).slice(0,180);
  try{
   if(!input||typeof input!=='object')fail('Dòng dữ liệu không hợp lệ.');
   const kind=input.kind;if(!['price','color'].includes(kind))fail('Loại dòng không hợp lệ.');
   if(!permissions[kind==='price'?'prices':'colors'])fail(kind==='price'?'Chưa được cấp quyền sửa giá.':'Chưa được cấp quyền sửa màu.');
   let row,key,existing;
   if(kind==='price'){
    row=cleanPriceEntry(input);key=priceEntryKey(row);existing=prices.get(key);
    if(prices.has(key)&&existing===null)fail('Danh mục có nhiều mức giá trùng khóa; cần xử lý trước khi nhập.');
    if(existing&&(existing.priceBasis!==row.priceBasis||existing.inches!==row.inches))fail('Đơn vị hoặc chiều dài inch khác mức giá hiện có.');
   }else{
    const code=typeof input.code==='string'?input.code.trim():'';
    if(!colorKey(code)||code.length>120||!['Black','Brown','Blonde','Other'].includes(input.category))fail('Nhập mã màu và loại Black, Brown, Blonde hoặc Other. Màu phối tạo tại Danh mục màu.');
    if(typeof(input.note??'')!=='string'||(input.note||'').length>1000)fail('Ghi chú màu tối đa 1.000 ký tự.');
    row={code,category:input.category,note:input.note||'',tone:({Black:'black',Brown:'brown',Blonde:'blonde',Other:'blonde'})[input.category]};key=colorKey(code);existing=colors.get(key);
    if(existing&&existing.category!==row.category)fail('Màu đã có với loại khác; chỉnh sửa tại Danh mục màu để kiểm tra màu phối liên quan.');
   }
   const unique=kind+key;if(seen.has(unique))fail('Trùng sản phẩm/quy cách/tông hoặc mã màu trong file.');seen.add(unique);
   const unchanged=existing&&(kind==='price'?existing.price===row.price&&(existing.note||'')===row.note:(existing.note||'')===row.note);
   const action=unchanged?'same':existing?(body.mode==='add'?'skip':'update'):'create';
   changes.push({kind,row,existingId:existing?.id,action,location,before:kind==='price'?existing?.price??null:existing?.code??null});
  }catch(e){errors.push({location,message:e.message})}
 }
 if(data.prices.length+changes.filter(c=>c.kind==='price'&&c.action==='create').length>20000)errors.push({location:'Bảng giá',message:'Vượt giới hạn 20.000 mức giá.'});
 if(data.colors.length+changes.filter(c=>c.kind==='color'&&c.action==='create').length>5000)errors.push({location:'Danh mục màu',message:'Vượt giới hạn 5.000 màu.'});
 return {changes,errors,counts:Object.fromEntries(['create','update','skip','same'].map(k=>[k,changes.filter(c=>c.action===k).length]))};
}
