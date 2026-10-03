import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesOrderTab,orderListPosition} from '../order-list-tabs.js';
test('List tabs follow last confirmed step including production rework cycles and terminal forfeiture',()=>{
 assert.ok(matchesOrderTab({stage:2},'approval'));
 assert.ok(matchesOrderTab({stage:3,accountingApproval:{status:'partial'}},'accounting','partial'));
 const o={stage:4,production:{status:'sale_check',time:'2026-10-01'},saleReview:{result:'rework',time:'2026-10-02'}};
 assert.ok(matchesOrderTab(o,'sale','rework'));o.production={status:'paused',time:'2026-10-03'};assert.ok(matchesOrderTab(o,'factory','paused'));
 assert.ok(matchesOrderTab({stage:5,production:{status:'sale_check'}},'factory','sale_check'));
 assert.ok(matchesOrderTab({stage:6},'office'));
 assert.ok(matchesOrderTab({stage:8,finalPaymentCheck:{status:'full'}},'final','full'));
 assert.ok(matchesOrderTab({stage:8,finalPaymentCheck:{status:'full'},contentLockedAt:'now'},'inspection'));
 assert.ok(matchesOrderTab({stage:9,customerFeedback:{status:'claim'}},'received','claim'));
 const cancelled={stage:-1,cancelledAt:'now',finalPaymentCheck:{status:'forfeited'}};assert.ok(matchesOrderTab(cancelled,'final','forfeited'));assert.equal(matchesOrderTab(cancelled),false);
 assert.equal(orderListPosition({stage:10}),null);assert.equal(matchesOrderTab({stage:0}),false);
});
