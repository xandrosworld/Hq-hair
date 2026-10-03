import {orderQueue,queueGroups} from './order-queue.js';

// The API already scopes orders; additionally route actionable work to its department.
export function orderAttention(orders,user){
 const role=user?.role||'sale';
 const department=role==='accounting'?'accounting':role==='factory'?'factory':'sale';
 return orders.flatMap(order=>{
  const queue=orderQueue(order);
  if(!queue)return [];
  const group=queueGroups.find(g=>g.queues.includes(queue.key));
  if(role!=='manager'&&group?.key!==department)return [];
  if(role==='sale'&&user?.id&&order.ownerId&&order.ownerId!==user.id)return [];
  return [{order,queue,department:group.label}];
 });
}
