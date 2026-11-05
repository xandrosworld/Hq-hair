import PDFDocument from 'pdfkit';
import {fileURLToPath} from 'node:url';
import {approvalDate,orderLabel} from './order-identity.js';
import {hairSegment} from './hair-classification.js';
import {displayUnit} from './product-fields.js';

const font=name=>fileURLToPath(new URL(`./assets/fonts/BeVietnamPro-${name}.ttf`,import.meta.url));
const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value.split('-').reverse().join('/'):'—';
const heads=['STT','Sản phẩm','Nguồn tóc','Dài (cm)','Kiểu tóc','Phân khúc','Màu','Số lượng','Ghi chú'];
const widths=[30,150,80,50,95,100,60,70,139];

// Product-only projection: never export customer, contact, price or receipt data.
export function factoryPDFRows(order){return (order.items||[]).map((p,i)=>[
 String(i+1),[p.name,p.spec,p.kind==='gift'?'Quà tặng':p.kind==='extra'?'Bổ sung':''].filter(Boolean).join(' · '),
 p.origin,p.lengthCm,p.texture,p.origin==='Baby Hair'?'—':hairSegment(p.segment),p.color,
 `${p.qty??''} ${p.unit==='Piece'?'Cái':displayUnit(p.unit)||''}`,p.productNote
].map(v=>String(v??'').normalize('NFC').replace(/\s+/g,' ').trim()))}

export function factoryPDF(order){return new Promise((resolve,reject)=>{
 const doc=new PDFDocument({size:'A4',layout:'landscape',margin:34,bufferPages:true,info:{Title:`Phiếu sản phẩm ${orderLabel(order)}`,Author:'HQ HAIR'}});
 const chunks=[];doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
 doc.registerFont('body',font('Regular'));doc.registerFont('bold',font('SemiBold'));
 let y=34;
 const row=(cells,header=false)=>{
  let size=9,height;
  do{doc.font(header?'bold':'body').fontSize(size);height=Math.max(30,...cells.map((s,i)=>doc.heightOfString(s||'—',{width:widths[i]-12,lineGap:2})+14));if(header||height<=doc.page.height-210||size<=6)break;size-=0.5}while(true);
  if(!header&&y+height>doc.page.height-48){doc.addPage();heading();}
  let x=34;
  doc.font(header?'bold':'body').fontSize(size);
  cells.forEach((s,i)=>{doc.rect(x,y,widths[i],height).fillAndStroke(header?'#eaf0f4':'#ffffff','#ccd8df');doc.fillColor('#17384c').text(s||'—',x+6,y+6,{width:widths[i]-12,lineGap:2});x+=widths[i]});
  y+=height;
 };
 const heading=()=>{
  y=34;doc.font('bold').fontSize(17).fillColor('#17384c').text('HQ HAIR · PHIẾU SẢN PHẨM',34,y);y+=30;
  doc.font('bold').fontSize(11).text(`Mã đơn: ${orderLabel(order)}`,34,y);y+=21;
  doc.font('body').fontSize(9).text(`Ngày duyệt: ${date(approvalDate(order))}    ·    Dự kiến giao hàng: ${date(order.due)}`,34,y);y+=25;
  row(heads,true);
 };
 heading();for(const cells of factoryPDFRows(order))row(cells);
 if(!order.items?.length)doc.font('body').text('Chưa có sản phẩm.',34,y+12);
 const pages=doc.bufferedPageRange();for(let i=0;i<pages.count;i++){doc.switchToPage(i);doc.page.margins.bottom=0;doc.font('body').fontSize(8).fillColor('#52697d').text(`Trang ${i+1} / ${pages.count}`,34,doc.page.height-30,{width:774,align:'right',lineBreak:false})}
 doc.end();
})}

export function factoryPDFRoutes(router){router.get('/orders/:id/factory-slip.pdf',async(req,res)=>{
 const order=req.data.orders.find(o=>o.id===req.params.id);req.assertAccess(order);
 if(!order)return res.status(404).json({error:'Không tìm thấy đơn hàng.'});
 const bytes=await factoryPDF(order);
 const label=String(orderLabel(order)).replace(/[^A-Za-z0-9_-]/g,'_').slice(0,100);
 res.set({'Cache-Control':'private, no-store','Content-Type':'application/pdf','Content-Disposition':`attachment; filename="Phieu-san-pham-${label}.pdf"`});res.send(bytes);
})}
