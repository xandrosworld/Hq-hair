import test from 'node:test';
import assert from 'node:assert/strict';
import {orderQueue,queueStatistics,matchesOrderFilter,orderQueues} from '../order-queue.js';
import {status} from '../shared.js';
test('Queues describe the next responsible action including handoffs and delivery',()=>{
 const cases=[
  [{stage:2},'approval'],[{stage:3,accountingApproval:{status:'partial'}},'factory'],
  [{stage:4},'producing'],[{stage:4,production:{status:'paused'}},'paused'],
  [{stage:4,saleReview:{result:'rework'}},'rework'],[{stage:5},'sale'],
  [{stage:4,saleReview:{result:'accepted'}},'office'],
  [{stage:6},'payment'],[{stage:7},'payment'],[{stage:8},'inspection'],
  [{stage:8,inspection:{completedAt:'2026-10-03'}},'delivery'],[{stage:8,contentLockedAt:'2026-10-03'},'delivery'],[{stage:9},'complete'],
 ];
 for(const [order,key] of cases){assert.equal(orderQueue(order).key,key);assert.equal(status(order),orderQueue(order).label);assert.equal(matchesOrderFilter(order,'queue:'+key),true);assert.equal(orderQueues.filter(q=>matchesOrderFilter(order,'queue:'+q.key)).length,1)}
 const rows=cases.map(([o])=>o),stats=queueStatistics([...rows,{stage:0},{stage:10},{stage:-1,cancelledAt:'today'},{stage:6,cancelledAt:'today'}]);
 assert.equal(stats.total,rows.length);assert.equal(stats.counts.payment,2);
 assert.equal(Object.values(stats.counts).reduce((a,b)=>a+b,0),stats.total);
 assert.equal(matchesOrderFilter({stage:4},'4'),true);assert.equal(matchesOrderFilter({stage:4},'all'),true);
 assert.equal(orderQueue({stage:10}),null);assert.equal(orderQueue({stage:6,cancelledAt:'today'}),null);
});
