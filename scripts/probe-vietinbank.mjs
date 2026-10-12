// Read-only feasibility probe against VietinBank's public exchange-rate page.
// This is not an official/stable API integration. No customer data is sent.
const source='https://www.vietinbank.vn/doanh-nghiep/ty-gia-khdn';
const target=process.argv[2];
if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(target||''))throw Error('Usage: node scripts/probe-vietinbank.mjs YYYY-MM-DDTHH:mm:ss (Vietnam local time)');
async function get(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`Source HTTP ${r.status}`);return r.text()}
const html=await get(source),scripts=[...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>new URL(m[1],source).href))];
let sourceCode;
for(const url of scripts){const text=await get(url);if(text.includes('eB:function()')&&text.includes('OQ:function()')){sourceCode=text;break}}
if(!sourceCode)throw Error('Public site structure changed; manual verification required');
function action(exportName){const start=sourceCode.indexOf(exportName+':function()'),block=sourceCode.slice(start,start+6000),variable=block.match(/^\w+:function\(\)\{return (\w+)\}/)?.[1];const match=variable&&block.match(new RegExp('(?:var |,)'+variable+'=\\(0,\\w+\\.\\$\\)\\("([a-f0-9]+)"\\)'));if(!match)throw Error('Public action mapping changed');return match[1]}
async function read(actionId,args){const text=await get(source,{method:'POST',headers:{'Next-Action':actionId,'Content-Type':'text/plain;charset=UTF-8','Accept':'text/x-component','Origin':new URL(source).origin},body:JSON.stringify(args)});const line=text.split('\n').find(l=>l.startsWith('1:'));if(!line)throw Error('Unexpected source response');const rows=JSON.parse(line.slice(2));if(!Array.isArray(rows))throw Error('Unexpected source data');return rows}
const dates=await read(action('eB'),[target.slice(0,10)]);
const applicable=dates.map(r=>r.apply_date).filter(d=>typeof d==='string'&&d.startsWith(target.slice(0,10))&&d<=target).sort().at(-1);
if(!applicable)throw Error('No same-day publication at or before receipt time; require manual rate, do not substitute a future quote');
const rows=await read(action('OQ'),[applicable,'USD']),row=rows.find(r=>r.currency_code==='USD'&&r.apply_date===applicable&&r.status==='published');
if(!row||!Number.isFinite(row.transfer_rate)||row.transfer_rate<=0)throw Error('USD transfer-buy rate unavailable');
console.log(JSON.stringify({source,requestedVietnamTime:target,publishedVietnamTime:applicable,currency:'USD',quoteCurrency:'VND',rateType:'transfer_buy',rate:row.transfer_rate,sourceRecordId:row.id,retrievedAt:new Date().toISOString(),note:'Public website lookup without credentials; not a contracted API or guarantee of future access.'},null,2));
