import {catalog,newOrder,totals,steps} from './shared.js';
export function seed(){
 const names=['Olivia Bennett','Amelia Wilson','Chloe Martin','Sophie Laurent','Isabella Brooks','Charlotte Evans','Mia Thompson','Grace Williams'];
 const companies=['Olivia Hair Studio','Amelia Beauty','Maison Chloe','Atelier Sophie','Bella Extensions','Charlotte Salon','Mia Hair Supply','Grace Beauty'];
 const customers=names.map((name,i)=>({id:`HQ-JD-${i+1}`,name,company:companies[i],phone:`+1 202 555 01${String(i).padStart(2,'0')}`,email:`client${i+1}@example.com`,country:['United States','United Kingdom','France','France','Australia','United Kingdom','United States','Canada'][i],group:['Salon','Wholesale','Start Business','Salon','Khách lẻ','Salon','Wholesale','Start Business'][i],address:`${100+i} Demo Street, Sample City`,recipient:name,recipientPhone:`+1 202 555 01${String(i).padStart(2,'0')}`,social:'https://example.com',source:['Instagram','Website','WhatsApp'][i%3],sale:'Judy',created:`2026-${String(5+i%5).padStart(2,'0')}-05`,purchase:'Đã mua trước đây'}));
 const stages=[4,2,5,6,0,7,10,3,9,4,2,10];
 const counts={};
 const orders=stages.map((stage,i)=>{
  const c=customers[i%8];counts[c.id]=(counts[c.id]||0)+1;
  const o={...newOrder(c),id:`${c.id}-${counts[c.id]}`,stage,date:`2026-${i>7?'08':'09'}-${String(4+i).padStart(2,'0')}`,due:`2026-${i%3===0?'09':'10'}-${String(20+i%8).padStart(2,'0')}`,items:[{...catalog[i%5],qty:i%5<3?100*(i%3+1):5+i,kind:'base'},{...catalog[5],qty:5,kind:'extra'},{...catalog[6],qty:1,kind:'gift'}],discount:20,shippingFee:65,paymentFee:15,note:i===2?'Khách cần kiểm tra màu #60 trước khi gửi.':'',tracking:stage>=8?'DEMO-DHL-2026-001':''};
  o.payments=stage>2?[{id:`p${i}`,sender:c.name,method:'Wise',date:o.date,amount:stage>=9?totals(o).receive:500,confirmed:true,reference:`DEMO-${i+1}`}]:[];
  o.history=stage?Array.from({length:stage},(_,s)=>({title:steps[s],actor:s<2?'Judy · Sale':s===2?'Lan · Kế toán':s===3?'Nam · Xưởng':'Judy · Sale',time:`${o.date}T${String(8+s).padStart(2,'0')}:30:00`,note:'Dữ liệu minh họa'})):[];
  o.messages=i===2?[{id:'m1',author:'Nam · Xưởng',text:'Đã hoàn thiện lô hàng. Nhờ Sale kiểm tra thông số và xác nhận tiếp nhận.',time:'2026-09-28T08:30:00'}]:[];
  return o;
 });
 // Historical demo orders make monthly reports derive from actual records.
 for(let month=1;month<=7;month++){
  const c=customers[(month-1)%4];counts[c.id]++;
  const date=`2026-${String(month).padStart(2,'0')}-12`;
  const o={...newOrder(c),id:`${c.id}-${counts[c.id]}`,stage:10,date,due:`2026-${String(month).padStart(2,'0')}-25`,items:[{...catalog[0],qty:120+month*65,kind:'base'},{...catalog[1],qty:70+month*35,kind:'base'}],shippingFee:65,paymentFee:15};
  o.payments=[{id:`history-${month}`,sender:c.name,method:'Wise',date,amount:totals(o).receive,confirmed:true,reference:`DEMO-HISTORY-${month}`}];
  o.history=steps.map((title,i)=>({title,actor:i<2?'Judy · Sale':i===2?'Lan · Kế toán':i===3?'Nam · Xưởng':'Judy · Sale',time:`${date}T${String(8+i).padStart(2,'0')}:00:00`,note:'Dữ liệu minh họa'}));
  orders.push(o);
 }
 customers.forEach((c,i)=>{c.created=`2026-${String(Math.min(i+1,7)).padStart(2,'0')}-01`});
 return {customers,orders};
}
