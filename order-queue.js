// Each open order belongs to exactly one queue: the next action still needed.
export const queueGroups=[
 {key:'accounting',label:'Kế toán',queues:['approval','payment']},
 {key:'factory',label:'Xưởng',queues:['factory','producing','paused','rework','office']},
 {key:'sale',label:'Kinh doanh',queues:['sale','inspection','delivery','complete']},
];
export const orderQueues=[
 {key:'approval',label:'Chờ Kế toán duyệt',stage:2},
 {key:'factory',label:'Chờ Xưởng ghi nhận',stage:3},
 {key:'producing',label:'Xưởng đang sản xuất',stage:4},
 {key:'paused',label:'Xưởng tạm dừng',stage:4},
 {key:'rework',label:'Chờ Xưởng sửa lại',stage:4},
 {key:'sale',label:'Chờ Sale kiểm tra',stage:5},
 {key:'office',label:'Chờ Xưởng gửi văn phòng',stage:6},
 {key:'payment',label:'Chờ Kế toán kiểm tra cuối',stage:7},
 {key:'inspection',label:'Chờ Sale kiểm định và đặt ship',stage:8},
 {key:'delivery',label:'Chờ Sale xác nhận khách đã nhận',stage:9},
 {key:'complete',label:'Chờ Sale hoàn thành đơn',stage:10},
];
export function orderQueue(order){
 if(order.cancelledAt||order.stage<2||order.stage>=10)return null;
 let key;
 switch(order.stage){
  case 2:key='approval';break;
  case 3:key='factory';break;
  case 4:key=order.production?.status==='paused'?'paused':order.saleReview?.result==='accepted'?'office':order.saleReview?.result==='rework'?'rework':'producing';break;
  case 5:key='sale';break;
  case 6:case 7:key='payment';break;
  case 8:key=order.contentLockedAt||order.inspection?.completedAt?'delivery':'inspection';break;
  case 9:key='complete';break;
 }
 return orderQueues.find(q=>q.key===key)||null;
}
export function matchesOrderFilter(order,filter){
 if(filter.startsWith('group:'))return !!queueGroups.find(g=>g.key===filter.slice(6))?.queues.includes(orderQueue(order)?.key);
 return filter==='all'||(filter.startsWith('queue:')?orderQueue(order)?.key===filter.slice(6):order.stage===Number(filter));
}
export function queueStatistics(orders){
 const counts=Object.fromEntries(orderQueues.map(q=>[q.key,0]));
 for(const order of orders){const queue=orderQueue(order);if(queue)counts[queue.key]++}
 return {counts,total:Object.values(counts).reduce((sum,n)=>sum+n,0)};
}
