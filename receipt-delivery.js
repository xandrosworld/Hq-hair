// Keep financial snapshots for historical debt; omit only embedded file bytes.
function withoutInlineFiles(value){if(Array.isArray(value))return value.map(withoutInlineFiles);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k,v])=>!(k==='file'&&typeof v==='string'&&v.startsWith('data:'))).map(([k,v])=>[k,withoutInlineFiles(v)]));return value}
const types={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','application/pdf':'pdf'};
export function compactReceipts(order){
 const link=(f,p,index)=>{const mime=/^data:([^;]+);base64,/.exec(f.file||'')?.[1];return types[mime]?{...f,file:`/api/work/orders/${encodeURIComponent(order.id)}/receipts/${encodeURIComponent(p.id)}/${index}.${types[mime]}`}:{...f}};
 return {...order,...(order.history?{history:order.history.map(withoutInlineFiles)}:{}),payments:(order.payments||[]).map(p=>({...p,...(p.file?link(p,p,'legacy'):{}),...(p.files?{files:p.files.map((f,i)=>link(f,p,i))}:{})}))};
}
export function receiptBytes(order,paymentId,index){
 const p=order?.payments?.find(p=>p.id===paymentId);const file=index==='legacy'?p?.file:p?.files?.[Number(index)]?.file;
 const m=/^data:(image\/(?:png|jpeg|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/.exec(file||'');return m?{mime:m[1],bytes:Buffer.from(m[2],'base64')}:null;
}
