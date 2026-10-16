// XLSX is loaded only when importing/downloading, keeping the normal workspace light.
export const priceHeaders=['Bảng giá','Sản phẩm','Quy cách','Kích thước','Inch','Cm','Tông','Đơn vị','Giá USD','Ghi chú'];
export const colorHeaders=['Mã màu','Loại màu','Ghi chú'];
const babyProducts={'Baby Bulk Hair':'Baby Bulk','Tape-in Baby':'Baby Tape In','Baby Genius Hair':'Genius Baby','Flat Weft Baby':'Baby Flat Weft','Baby ponytail Hair':'Ponytail Baby','Same clip in Baby':'Seamless clip baby','Bulk đen bao tẩy':'Raw bao tẩy','Normal clip-in baby':'Normal clip-in'};
const value=c=>{const v=c.value;if(v&&typeof v==='object'){if('formula'in v||'sharedFormula'in v){if(v.result===undefined||typeof v.result==='object')throw Error(`${c.address}: công thức chưa có kết quả. Mở Excel, tính lại và lưu file.`);return v.result}if(v.richText)return v.richText.map(x=>x.text).join('');throw Error(`${c.address}: ô dữ liệu không được hỗ trợ.`)}return v??''};
export async function readPriceWorkbook(buffer,{format='standard',babySide='',fileName=''}={}){
 const {default:ExcelJS}=await import('exceljs');const book=new ExcelJS.Workbook();try{await book.xlsx.load(buffer)}catch{throw Error('Không đọc được file XLSX. Kiểm tra file không hỏng, không khóa mật khẩu và lưu lại bằng Excel.');}
 if(book.worksheets.length>50)throw Error('Tối đa 50 sheet mỗi file.');
 const rows=[],warnings=[];const add=row=>{rows.push(row);if(rows.length>10000)throw Error('Tối đa 10.000 dòng mỗi lần nhập.')};
 for(const s of book.worksheets){
  if(s.rowCount>12000||s.columnCount>100)throw Error(`${s.name}: vượt giới hạn kích thước bảng.`);
  if(format==='standard'){
   if(s.name==='HuongDan')continue;
   const kind=s.name==='BangGia'?'price':s.name==='MauSac'?'color':null;if(!kind)throw Error(`Sheet ${s.name}: dùng mẫu chuẩn với sheet BangGia và MauSac.`);
   const headers=kind==='price'?priceHeaders:colorHeaders;
   headers.forEach((h,i)=>{if(value(s.getCell(1,i+1))!==h)throw Error(`${s.name}: cột ${i+1} phải là ${h}.`)});
   for(let r=2;r<=s.rowCount;r++){
    const v=headers.map((_,i)=>value(s.getCell(r,i+1)));if(v.every(x=>x===''))continue;
    for(let c=headers.length+1;c<=s.columnCount;c++)if(value(s.getCell(r,c))!=='')throw Error(`${s.name}, dòng ${r}: có dữ liệu ngoài các cột mẫu.`);
    add(kind==='price'?{kind,tier:v[0],product:v[1],segment:v[2],variant:v[3],inches:v[4],lengthCm:v[5],tone:({Đen:'black',Nâu:'brown',Sáng:'blonde'})[v[6]]||v[6],priceBasis:({'Cái':'unit'})[v[7]]||v[7],price:v[8],note:v[9],location:`${s.name} dòng ${r}`}:{kind,code:v[0],category:v[1],note:v[2],location:`${s.name} dòng ${r}`});
   }continue;
  }
  const tier=format;if(!['Basic','Baby','Premium'].includes(tier))throw Error('Chọn định dạng file.');
  if(tier==='Premium'&&s.columnCount>5)throw Error(`${s.name}: không đúng cấu trúc Premium 5 cột. Kiểm tra định dạng đã chọn hoặc dùng mẫu chuẩn.`);
  const used=new Set(),ignored=new Set();const get=(r,c)=>value(s.getCell(r,c)),num=v=>typeof v==='number'&&Number.isFinite(v);
  const block=(start,end,ic,cc,pcs,variant='',segment='')=>{
   for(let r=start;r<=end;r++){
    const inches=get(r,ic),lengthCm=get(r,cc);if(!num(inches)||!num(lengthCm))continue;
    used.add(`${r}:${ic}`);used.add(`${r}:${cc}`);
    for(const [c,tone]of pcs){const price=get(r,c);if(price==='')continue;if(!num(price))throw Error(`${s.name}!${s.getCell(r,c).address}: giá phải là số.`);used.add(`${r}:${c}`);add({kind:'price',tier,product:tier==='Baby'?(babyProducts[s.name]||s.name):s.name,variant,segment,inches,lengthCm,tone,price:Math.round((price+Number.EPSILON)*100)/100,priceBasis:/closure|frontal|ponytail|topper/i.test(s.name)?'unit':'100g',note:'',location:`${s.name}!${s.getCell(r,c).address}`})}
   }
  };
  const trip=c=>[[c,'black'],[c+1,'brown'],[c+2,'blonde']];
  if(tier==='Baby'){
   if(!['left','right'].includes(babySide))throw Error('File Baby có hai dãy giá. Chọn dãy bên trái hoặc bên phải.');
   const right={'Baby Bulk Hair':13,'Baby Weft Hair':11,'Tape-in Baby':9,'Baby Genius Hair':10,'Flat Weft Baby':10,'Baby ponytail Hair':10,'Same clip in Baby':9,'Keratine Baby':10,'Normal clip-in baby':8,'Invisible Tape Baby':9};
   if(s.name==='Bulk đen bao tẩy')block(1,s.rowCount,1,2,[[9,'black']]);
   else{if(!right[s.name])throw Error(`${s.name}: chưa hỗ trợ sheet Baby này. Dùng mẫu chuẩn.`);const chosen=babySide==='left'?3:right[s.name],other=babySide==='left'?right[s.name]:3;block(1,s.rowCount,1,2,trip(chosen));for(let r=1;r<=s.rowCount;r++)for(let c=other;c<other+3;c++)ignored.add(`${r}:${c}`)}
  }else if(s.name==='Closure')for(const [a,b,i,c,v]of [[4,20,1,3,'2x4'],[4,20,9,11,'2x6'],[5,18,18,20,'4x4'],[21,33,18,20,'5x5'],[25,35,1,3,'6x6'],[26,36,9,11,'7x7']])block(a,b,i,i+1,trip(c),v);
  else if(['Frontal','HD Lace'].includes(s.name)){
   for(let r=2;r<=s.rowCount;r++)for(let c=1;c<=s.columnCount;c++)if(String(get(r,c)).trim().toLowerCase()==='inches'){const titles=Array.from({length:5},(_,j)=>get(r-1,c+j)).filter(v=>typeof v==='string'&&v);let end=r+1;while(num(get(end,c)))end++;block(r+1,end-1,c,c+1,trip(c+2),titles[0]||'')}
  }else if(s.name==='Topper full lưới'){block(4,12,3,4,trip(5),'5x5','2D');block(15,23,3,4,trip(5),'5x5','3D')}
  else if(s.name==='Topper Mix Weft'){for(const [hr,seg]of [[6,'2D'],[30,'3D']])for(const [ic,pc,tone]of [[1,3,'brown'],[12,14,'black'],[22,24,'blonde']])for(let c=pc;c<pc+5;c++)block(hr+1,hr+12,ic,ic+1,[[c,tone]],String(get(hr,c)),seg)}
  else{
   let double=false;for(let r=1;r<=Math.min(4,s.rowCount);r++)for(let c=1;c<=s.columnCount;c++)if(String(get(r,c)).toLowerCase().includes('double drawn'))double=true;
   if(tier==='Basic'&&!double)throw Error(`${s.name}: không nhận diện được bảng Basic. Dùng mẫu chuẩn.`);
   block(1,s.rowCount,1,2,trip(3),'',double?'Double Drawn':'');if(double)block(1,s.rowCount,1,2,trip(6),'','Super Double Drawn');
  }
  for(let r=1;r<=s.rowCount;r++)for(let c=1;c<=s.columnCount;c++)if(num(get(r,c))&&!used.has(`${r}:${c}`)&&!ignored.has(`${r}:${c}`))throw Error(`${s.name}!${s.getCell(r,c).address}: có số chưa nhận diện. Chuyển sang mẫu chuẩn để không bỏ sót dữ liệu.`);
 }
 if(format==='Baby')warnings.push(`Đã chọn dãy giá ${babySide==='left'?'bên trái (C–E)':'bên phải'}; Bao tẩy dùng cột I.`);
 if(format!=='standard')warnings.push('Giá file gốc được làm tròn 2 chữ số thập phân. Kiểm tra đơn vị 100g/cái trong bản xem trước.');
 if(!rows.length)throw Error('File chưa có dòng dữ liệu.');return {rows,warnings,fileName};
}
export async function downloadPriceTemplate(data=null){
 const {default:ExcelJS}=await import('exceljs');const book=new ExcelJS.Workbook();
 for(const [name,headers]of [['BangGia',priceHeaders],['MauSac',colorHeaders]]){
  const s=book.addWorksheet(name);s.addRow(headers);s.views=[{state:'frozen',ySplit:1}];s.columns=headers.map((h,i)=>({width:i===1?28:20}));s.getRow(1).height=30;s.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF19394C'}}});
  if(name==='BangGia')for(const [col,list]of [['A','Basic,Baby,Premium'],['G','black,brown,blonde'],['H','100g,unit']])for(let r=2;r<=1001;r++)s.getCell(`${col}${r}`).dataValidation={type:'list',allowBlank:true,formulae:[`"${list}"`],showErrorMessage:true,error:'Chọn giá trị trong danh sách.'};
  else for(let r=2;r<=1001;r++)s.getCell(`B${r}`).dataValidation={type:'list',allowBlank:true,formulae:['"Black,Brown,Blonde,Other"']};
 }
 if(data){
  data.prices.forEach((p,i)=>{book.getWorksheet('BangGia').getRow(i+2).values=[p.tier,p.product,p.segment||'',p.variant||'',p.inches,p.lengthCm,p.tone,p.priceBasis,p.price,p.note||'']});
  data.colors.filter(c=>['Black','Brown','Blonde','Other'].includes(c.category)).forEach((c,i)=>{book.getWorksheet('MauSac').getRow(i+2).values=[c.code,c.category,c.note||'']});
 }
 const guide=book.addWorksheet('HuongDan');guide.getColumn(1).width=115;
 for(const t of ['NHẬP BẢNG GIÁ HQ HAIR','Điền dữ liệu từ dòng 2. Giữ nguyên tên sheet và tiêu đề. Có thể để trống một sheet.','BangGia: mỗi dòng là một sản phẩm + quy cách + kích thước + chiều dài + tông giá.','Bảng giá: Basic / Baby / Premium. Tông: black / brown / blonde. Đơn vị: 100g / unit (cái).','Inch, Cm và Giá USD phải là số dương. Giá tối đa 2 chữ số thập phân.','Ví dụ BangGia: Premium | Bulk | [trống] | [trống] | 10 | 25 | black | 100g | 49.50 | [trống]','MauSac: mã màu, loại Black / Brown / Blonde / Other, ghi chú tùy chọn.','Màu phối Ombre / Piano / Balayage: thêm tại Danh mục màu để chọn màu thành phần.','Màu cùng tông dùng chung mức giá. Không cần tạo giá riêng cho từng mã màu.','Chỉ thêm mới: bỏ qua mức giá hoặc mã màu đã có. Thêm mới và cập nhật: thay giá/ghi chú của dòng khớp.','Không xóa dòng đang có khi thiếu dòng trong file. Giá trên đơn đã lưu không thay đổi.','Tối đa 5 MB và 10.000 dòng dữ liệu mỗi lần. Bấm xem trước, sửa hết lỗi rồi xác nhận nhập.','Công thức phải được tính và lưu bằng Excel trước khi nhập. Không hỗ trợ macro hoặc đồng bộ tự động.'])guide.addRow([t]);
 guide.getRow(1).font={bold:true,size:16};guide.eachRow(r=>{r.height=32;r.alignment={wrapText:true,vertical:'middle'}});
 if(data)guide.addRow(['Bản xuất gồm toàn bộ giá và các màu đơn. Màu phối và hình ảnh tiếp tục quản lý tại Danh mục màu.']);
 const blob=new Blob([await book.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=data?'HQ-Hair-Bang-gia-hien-tai.xlsx':'HQ-Hair-Mau-nhap-bang-gia.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
