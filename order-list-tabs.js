import {productionLabels,saleReviewLabels,feedbackLabels} from './workflow-state.js';
export const orderListTabs=[
 {key:'active',label:'Danh sách chưa hoàn thành'},
 {key:'approval',label:'Đợi kế toán duyệt'},
 {key:'accounting',label:'Kế toán duyệt',options:{full:'Thanh toán đủ',partial:'Thanh toán 1 phần'}},
 {key:'factory',label:'Xưởng ghi nhận',options:productionLabels},
 {key:'sale',label:'Sale tiếp nhận',options:saleReviewLabels},
 {key:'office',label:'Đã gửi đến văn phòng'},
 {key:'final',label:'Kiểm tra thanh toán lần cuối',options:{full:'Xác nhận đủ',forfeited:'Hủy đơn mất cọc'}},
 {key:'inspection',label:'Phiếu kiểm định và đặt ship'},
 {key:'received',label:'9. Đã nhận',options:feedbackLabels},
];
export function orderListPosition(o){
 if(o.finalPaymentCheck?.status==='forfeited')return {key:'final',sub:'forfeited'};
 if(o.cancelledAt||o.stage<2||o.stage>=10)return null;
 if(o.stage===2)return {key:'approval'};
 if(o.stage===3)return {key:'accounting',sub:o.accountingApproval?.status};
 if(o.stage===4||o.stage===5){
  const review=o.saleReview,production=o.production;
  if(o.stage===4&&review&&(!production?.time||review.time>=production.time))return {key:'sale',sub:review.result};
  return {key:'factory',sub:production?.status};
 }
 if(o.stage===6)return {key:'office'};
 if(o.stage===7)return {key:'final',sub:o.finalPaymentCheck?.status};
 if(o.stage===8)return o.inspection?.completedAt||o.contentLockedAt?{key:'inspection'}:o.finalPaymentCheck?.status==='full'?{key:'final',sub:'full'}:{key:'inspection'};
 if(o.stage===9)return {key:'received',sub:o.customerFeedback?.status};
 return null;
}
export function matchesOrderTab(o,tab='active',sub='all'){
 if(tab==='active')return !o.cancelledAt&&o.stage>0&&o.stage<10;
 const position=orderListPosition(o);return position?.key===tab&&(sub==='all'||position.sub===sub);
}
