import {approvalDate} from './order-identity.js';
export const costTab='13_Chi phí trực tiếp (Giá vốn)';
export const costSheetId=2141284137;
const tag='HQCRM_ORDER_ID:';
const value=c=>c?.effectiveValue?.stringValue??c?.effectiveValue?.numberValue??c?.userEnteredValue?.stringValue??c?.userEnteredValue?.numberValue??'';
const occupied=c=>Boolean(c?.userEnteredValue||c?.note);
export function costOrders(orders,users,year){
 const codes=new Set(),ids=new Set();
 return orders.filter(o=>o.orderCode).flatMap(o=>{
  const date=approvalDate(o);
  if(!date)throw Error(`Approved order missing approval date: ${o.orderCode}`);
  if(Number(date.slice(0,4))!==year)return [];
  const user=users.find(u=>u.id===o.ownerId);
  if(!user?.code||!o.id)throw Error(`Missing order identity/owner: ${o.orderCode}`);
  if(codes.has(o.orderCode)||ids.has(o.id))throw Error('Duplicate CRM order identity');
  codes.add(o.orderCode);ids.add(o.id);
  return [{id:String(o.id),code:o.orderCode,sale:user.code,date,month:Number(date.slice(5,7)),cancelled:!!o.cancelledAt}];
 }).sort((a,b)=>a.date.localeCompare(b.date)||a.code.localeCompare(b.code));
}
export function costSheetPlan(orders,grid,year){
 const blocks=new Map();let active;
 grid.forEach((r,i)=>{
  const m=/^THÁNG\s+(\d{1,2})\/(\d{4})$/i.exec(String(value(r[0])).trim());
  if(m){if(active)throw Error('Missing cost subtotal');if(+m[2]!==year)throw Error('Wrong cost year');if(blocks.has(+m[1]))throw Error('Duplicate cost month');active={month:+m[1],start:i+2,rows:[]};blocks.set(active.month,active);}
  else if(active&&String(value(r[0])).trim()==='TỔNG THÁNG'){active.end=i;active=null;}
  else if(active&&i>=active.start)active.rows.push(i);
 });
 if(active||blocks.size!==12||[...blocks.values()].some(b=>!b.end||!b.rows.length))throw Error('Invalid cost month layout');
 const byId=new Map(),byCode=new Map(),rowMonth=new Map();
 for(const b of blocks.values())for(const i of b.rows){
  rowMonth.set(i,b.month);const r=grid[i]||[],id=r[1]?.note?.split('\n').find(l=>l.startsWith(tag))?.slice(tag.length),code=String(value(r[1])).trim();
  if(id){if(byId.has(id))throw Error('Duplicate linked order row');byId.set(id,i);}
  if(code&&value(r[4])!=='Quà tặng'){const rows=byCode.get(code)||[];rows.push(i);byCode.set(code,rows);}
 }
 const assignments=[],missing=new Map(),used=new Set();
 for(const o of orders){
  let i=byId.get(o.id);
  if(i===undefined){const hits=byCode.get(o.code)||[];if(hits.length>1)throw Error(`Ambiguous cost order: ${o.code}`);i=hits[0];
   if(i!==undefined&&(grid[i]?.[1]?.note||'').split('\n').some(l=>l.startsWith(tag)&&l!==tag+o.id))throw Error('Order code already linked to another CRM identity');
  }
  if(i!==undefined){
   if(rowMonth.get(i)!==o.month)throw Error(`Approval month changed; review cost row for ${o.code}`);
   const sale=value(grid[i]?.[2]);if(sale&&sale!==o.sale)throw Error(`Cost Sale mismatch: ${o.code}`);
   if(used.has(i))throw Error('Multiple orders claim cost row');used.add(i);assignments.push({o,i});
  }else{const list=missing.get(o.month)||[];list.push(o);missing.set(o.month,list);}
 }
 const expansions=[];
 for(const [month,list] of missing){const b=blocks.get(month);if(!b)throw Error('Missing month');
  const free=b.rows.filter(i=>![1,2,4,5,6,7,8].some(c=>occupied(grid[i]?.[c])));
  if(list.length>free.length)expansions.push({month,index:b.end-1,count:Math.max(20,list.length-free.length),start:b.start});
  else list.forEach((o,k)=>assignments.push({o,i:free[k]}));
 }
 if(expansions.length)return {expansions:expansions.sort((a,b)=>b.index-a.index),requests:[],orders:orders.length};
 const requests=[],expected=[];
 for(const {o,i} of assignments){
  const r=grid[i]||[];
  const personalNote=(r[1]?.note||'').split('\n').filter(l=>!l.startsWith(tag)&&!l.startsWith('HQCRM:')).join('\n').trim();
  const note=[personalNote,tag+o.id,`HQCRM: Duyệt ${o.date}; ${o.cancelled?'đơn đã hủy – giữ chi phí để đối soát':'đơn đã duyệt'}.`].filter(Boolean).join('\n');
  if(value(r[1])!==o.code||r[1]?.note!==note)requests.push({updateCells:{start:{sheetId:costSheetId,rowIndex:i,columnIndex:1},rows:[{values:[{userEnteredValue:{stringValue:o.code},note}]}],fields:'userEnteredValue,note'}});
  if(value(r[2])!==o.sale)requests.push({updateCells:{start:{sheetId:costSheetId,rowIndex:i,columnIndex:2},rows:[{values:[{userEnteredValue:{stringValue:o.sale}}]}],fields:'userEnteredValue'}});
  if(!occupied(r[4]))requests.push({updateCells:{start:{sheetId:costSheetId,rowIndex:i,columnIndex:4},rows:[{values:[{userEnteredValue:{stringValue:'Giá vốn hàng hóa'}}]}],fields:'userEnteredValue'}});
  expected.push({row:i,code:o.code,sale:o.sale,note});
 }
 return {expansions:[],requests,expected,orders:orders.length};
}
export function costExpansionRequests(expansions){
 return expansions.flatMap(({index,count,start})=>{
  const source={sheetId:costSheetId,startRowIndex:index+count,endRowIndex:index+count+1,startColumnIndex:0,endColumnIndex:9};
  const destination={sheetId:costSheetId,startRowIndex:index,endRowIndex:index+count,startColumnIndex:0,endColumnIndex:9};
  return [
   {insertDimension:{range:{sheetId:costSheetId,dimension:'ROWS',startIndex:index,endIndex:index+count},inheritFromBefore:true}},
   ...['PASTE_FORMAT','PASTE_DATA_VALIDATION'].map(pasteType=>({copyPaste:{source,destination,pasteType}})),
   {updateCells:{start:{sheetId:costSheetId,rowIndex:index,columnIndex:3},rows:Array.from({length:count},(_,k)=>({values:[{userEnteredValue:{formulaValue:`=IFERROR(VLOOKUP(C${index+k+1},'01_Nhân sự'!$B$2:$F$200,2,FALSE()),"")`}}]})),fields:'userEnteredValue'}},
   {updateCells:{start:{sheetId:costSheetId,rowIndex:start,columnIndex:0},rows:Array.from({length:index+count+1-start},(_,k)=>({values:[{userEnteredValue:{numberValue:k+1}}]})),fields:'userEnteredValue'}}
  ];
 });
}
