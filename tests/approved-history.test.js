import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedHistory,approvedMonths} from '../approved-history.js';
const order=(id,date,extra={})=>({id,orderCode:id,date:'2025-01-01',approvedAt:date,...extra});
test('History and chart use first approval, retain post-approval cancellations, exclude requests and future approvals',()=>{
 const rows=[order('a','2025-12-31'),order('b','2026-01-05'),order('c','2026-01-08',{cancelledAt:'2026-02-01',stage:-1}),order('d','2026-03-05'),order('future','2027-01-01'),order('request','2026-02-01',{orderCode:null})];
 const months=approvedMonths(rows,'2026','2026-10-03');
 assert.deepEqual(months.slice(0,3).map(m=>m.count),[2,0,1]);
 assert.equal(months[0].growth,100);assert.equal(months[1].growth,-100);assert.equal(months[2].growth,null);assert.equal(months[4].growth,0);assert.equal(months[11].growth,null);
 assert.equal(approvedHistory(rows,'2026-10-03').length,4);
 assert.equal(months.reduce((n,m)=>n+m.count,0),3);
});
test('Approval at Vietnam month boundary belongs to the same history month as chart',()=>{
 const rows=[order('a','2026-09-30T18:00:00Z')];
 assert.equal(approvedMonths(rows,2026,'2026-10-03')[9].count,1);
 assert.equal(approvedMonths(rows,2026,'2026-10-03')[8].count,0);
});
