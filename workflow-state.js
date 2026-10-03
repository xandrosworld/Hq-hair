export const productionLabels={producing:'Đang sản xuất',paused:'Tạm dừng',sale_check:'Gửi Sale Check'};
export const saleReviewLabels={accepted:'Đã gửi lại - không sửa',rework:'Đã gửi lại - sửa'};
export const feedbackLabels={very_satisfied:'Hoàn toàn hài lòng',satisfied_feedback:'Hài lòng kèm góp ý',neutral:'Bình thường - Không góp ý',claim:'Claim- Bình Thường',claim_compensation:'Claim - Bồi Thường'};
export function workflowStep(order,step){
 const aliases={1:['Nhập đơn'],2:['Chờ duyệt'],3:['Kế toán duyệt'],4:['Xưởng ghi nhận','Sản xuất'],5:['Sale tiếp nhận','Sale xác nhận tiếp tục sản xuất','Yêu cầu xưởng sửa lại'],6:['Đã gửi đến văn phòng','Gửi đến văn phòng'],7:['Kiểm tra thanh toán lần cuối','Kiểm tra thanh toán'],8:['Phiếu kiểm định và đặt ship','Kiểm định & đặt ship'],9:['Đã nhận'],10:['Hoàn thành']};
 const event=order.history?.findLast(h=>aliases[step]?.includes(h.title));
 const record=({3:order.accountingApproval,4:order.production,5:order.saleReview,6:order.officeDispatch,7:order.finalPaymentCheck,8:order.inspection,9:order.customerFeedback})[step];
 const done=step<=2?!!event||order.stage>=step:!!record||!!event&&(order.stage>step||step===10);
 const label=step===3?({partial:'Thanh toán một phần',full:'Thanh toán đủ'})[record?.status]:step===4?productionLabels[record?.status]:step===5?saleReviewLabels[record?.result]:step===7?({full:'Xác nhận đủ',forfeited:'Hủy đơn mất cọc'})[record?.status]:step===9?feedbackLabels[record?.status]:null;
 const tone=step===7?(record?.status==='forfeited'?'red':'green'):step===3?(record?.status==='full'?'green':'amber'):step===5?(record?.result==='accepted'?'green':'red'):step===4?(record?.status==='paused'?'amber':'blue'):step===9?(record?.status?.startsWith('claim')?'red':'green'):'green';
 return {done,label,tone,actor:record?.name||event?.actor,time:record?.time||record?.completedAt||event?.time};
}
