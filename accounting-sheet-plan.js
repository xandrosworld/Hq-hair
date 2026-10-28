export const accountingSpreadsheetId='1EYLtTFO4fsjZo9YzutnPhimBXOLCGCaHlyvB36Kaa_M';
export const accountingTab='05_Dữ liệu CRM';

// Match live formula results by month and employee code, never by roster position.
// Only CRM-owned E:Q cells are replaced. A:D and R, payroll and costs stay intact.
export function accountingSheetPlan(payload,grid){
 const index=new Map();
 grid.forEach((cells,i)=>{
  const match=/^Tháng (\d{1,2})$/.exec(String(cells[1]||''));
  const code=String(cells[2]||'').trim();
  if(!match||!code)return;
  const key=`${Number(match[1])}:${code}`;
  if(index.has(key))throw Error(`Duplicate sheet row: ${key}`);
  index.set(key,i+1);
 });
 const number=v=>{if(v==null)return '';if(typeof v!=='number'||!Number.isFinite(v))throw Error('Invalid CRM amount');return v;};
 return payload.rows.map(r=>{
  const row=index.get(`${r.month}:${r.code}`);
  if(!row)throw Error(`Missing sheet row: ${r.key}`);
  const u=r.usd,v=r.vnd;
  // I is total cash excluding shipping; P is new revenue for the payroll
  // formula which adds Q (recovered debt) separately.
  return {range:`'${accountingTab}'!E${row}:Q${row}`,values:[[v.listed,v.discount,v.shipping,v.total,v.cash,v.recovered,u.debt,u.listed,u.discount,u.shipping,u.total,u.current,u.recovered].map(number)]};
 });
}
