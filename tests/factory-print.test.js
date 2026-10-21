import test from 'node:test';import assert from 'node:assert/strict';import {factoryPrintHTML} from '../factory-print.js';
test('Factory slip prints only product data and agreed dates, escapes untrusted text',()=>{
 const html=factoryPrintHTML({orderCode:'HQ-EM-1-1',approvedAt:'2026-10-01',due:'2026-10-25',recipient:'PRIVATE CUSTOMER',payments:[{amount:1234}],items:[{name:'<script>bad</script>',origin:'Raw Hair',segment:'Double Drawn',lengthCm:90,qty:100,unit:'Gram',price:999,productNote:'a & b'}]});
 for(const s of ['HQ-EM-1-1','01/10/2026','25/10/2026','Basic','90','100 Gram','&lt;script&gt;','a &amp; b'])assert.ok(html.includes(s),s);
 for(const s of ['PRIVATE CUSTOMER','1234','999','<script>','USD'])assert.ok(!html.includes(s),s);
});
