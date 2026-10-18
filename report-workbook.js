// Browser report export. Keep the existing reporting rows as the single money source.
export function parseReportCSV(csv){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<csv.length;i++){const c=csv[i];if(i===0&&c==='\uFEFF')continue;if(c==='"'){if(quoted&&csv[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(cell);cell=''}else if((c==='\r'||c==='\n')&&!quoted){if(c==='\r'&&csv[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}else cell+=c}
 if(cell||row.length){row.push(cell);rows.push(row)}return rows;
}
const labels={'Loai':'Loại','Ma don':'Mã đơn','Ma khach':'Mã khách','Khach hang':'Khách hàng','Nguoi phu trach':'Người phụ trách','Ngay':'Ngày','Ngay dat':'Ngày đặt','Han giao hang':'Hạn giao hàng','Doanh thu thuan USD':'Doanh thu thuần (USD)','Dong tien thu vao tru van chuyen USD':'Dòng tiền thu vào, trừ vận chuyển (USD)','Doanh thu thuc thu USD':'Doanh thu thực thu (USD)','Thu hoi cong no USD':'Thu hồi công nợ (USD)','Giam gia USD':'Giảm giá (USD)','Van chuyen da nhan USD':'Vận chuyển đã nhận (USD)','Thiet hai USD':'Thiệt hại (USD)','Doanh thu USD':'Doanh thu (USD)','Tong thu USD':'Tổng thu (USD)','Da nhan USD (doanh thu sau phi van chuyen)':'Doanh thu đã nhận, trừ vận chuyển (USD)','Tien thuc nhan USD':'Tiền thực nhận (USD)','Phi van chuyen USD':'Phí vận chuyển (USD)','Con no USD':'Còn nợ (USD)','So ngay qua han':'Số ngày quá hạn','Nhom tuoi no':'Nhóm tuổi nợ'};
const rowLabels={'Don duyet':'Đơn duyệt','Khoan thu':'Khoản thu','Cong no cuoi ky':'Công nợ cuối kỳ','Thiet hai':'Thiệt hại'};
export async function reportWorkbook(csv,summary){
 const {default:ExcelJS}=await import('exceljs');const book=new ExcelJS.Workbook();book.creator='HQ HAIR';
 for(const [name,source] of (summary?[["Tổng hợp",summary],["Chi tiết",csv]]:[["Báo cáo",csv]])){
 const sheet=book.addWorksheet(name,{views:[{state:'frozen',ySplit:1}],pageSetup:{orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0}});
 const [headers,...rows]=parseReportCSV(source);
 sheet.addRow(headers.map(h=>labels[h]||h.replace(/^Cong no tai (.*) USD$/,'Công nợ tại $1 (USD)')));
 for(const values of rows){const row=sheet.addRow(values.map((v,i)=>{
  if(/^\d{4}-\d{2}-\d{2}$/.test(v)&&/^(Ngay|Ngày|Han |Hạn )/.test(headers[i]))return new Date(v+'T00:00:00Z');
  if((headers[i].includes('USD')||headers[i].includes('VND')||headers[i]==='So ngay qua han')&&v!==''&&Number.isFinite(Number(v)))return Number(v);
  return rowLabels[v]||v;
 }));row.height=34;row.eachCell({includeEmpty:true},(cell,i)=>{cell.alignment={vertical:'middle',wrapText:true,horizontal:typeof cell.value==='number'?'right':'left'};cell.font={name:'Calibri',size:11,color:{argb:'FF17384C'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:row.number%2?'FFF0F5F8':'FFFFFFFF'}};if(cell.value instanceof Date){cell.numFmt='dd/mm/yyyy';cell.alignment.horizontal='center'}else if(typeof cell.value==='number')cell.numFmt=headers[i-1]==='So ngay qua han'||headers[i-1].includes('VND')?'#,##0':'#,##0.00;[Red](#,##0.00);0.00'});
  const lines=Math.max(...values.map((v,i)=>Math.ceil(String(v).length/(headers[i].includes('USD')?22:28))),1);row.height=Math.max(34,lines*16+8);
 }
 headers.forEach((h,i)=>{sheet.getColumn(i+1).width=/^(Ngay|Ngày|Han |Hạn )/.test(h)?16:h.includes('USD')?24:h==='Ma don'||h==='Ma khach'?22:32});
 if(name==='Tổng hợp'){
 sheet.getColumn(1).width=44;sheet.getColumn(2).width=32;sheet.getColumn(3).width=44;
 sheet.eachRow((row,n)=>{if(n>1&&(/^[12]\./.test(String(row.getCell(1).value))||['Tổng thu','Dòng tiền thu về'].includes(row.getCell(1).value)))row.eachCell(cell=>{cell.font={...cell.font,bold:true};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE3EDF3'}}})});
 }
 const first=sheet.getRow(1);first.height=64;first.eachCell(c=>{c.font={name:'Calibri',size:11,bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF17384C'}};c.alignment={vertical:'middle',wrapText:true}});
 sheet.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,sheet.rowCount),column:headers.length}};sheet.pageSetup.printTitlesRow='1:1';
 }
 return book.xlsx.writeBuffer();
}
export async function downloadReportExcel(csv,name,summary){
 try{const buffer=await reportWorkbook(csv,summary),url=URL.createObjectURL(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const a=document.createElement('a');a.href=url;a.download=name.replace(/\.csv$/,'.xlsx');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch{window.alert('Không xuất được báo cáo Excel. Vui lòng thử lại.');}
}
