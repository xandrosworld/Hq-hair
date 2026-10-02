import {feedbackLabels} from '../workflow-state.js';
import React,{useState} from 'react';
import {contentLocked} from '../order-workflow.js';
import {today,totals,money} from '../shared.js';

export function WorkflowActions({order,user,busy,onAction,Modal}){
 const [action,setAction]=useState(null),[form,setForm]=useState({});
 const manager=user?.role==='manager',locked=contentLocked(order);
 const open=action=>{setForm({version:order.version,carrier:order.carrier||'DHL',service:order.service||'',tracking:order.tracking||'',shippedDate:today(),reference:'',text:'',checked:false,feedback:order.customerFeedback?.status||'',stage:order.stage,paymentId:order.payments[0]?.id||'',amount:order.payments[0]?.amount||'',confirmed:!!order.payments[0]?.confirmed});setAction(action)};
 const set=(key,value)=>setForm(v=>({...v,[key]:value}));
 const titles={inspection:'Hoàn tất kiểm định & đặt ship',received:'Xác nhận khách đã nhận hàng',complete:'Xác nhận hoàn thành đơn','manager-payment':'Điều chỉnh thanh toán ngoại lệ'};
 const field=(key,label,type='text',required=false)=><label className="field"><span>{label}</span><input aria-label={label} type={type} required={required} maxLength={200} value={form[key]||''} onChange={e=>set(key,e.target.value)}/></label>;
 const needsReason=action==='manager-payment'||action==='complete'&&totals(order).debt>0;
 return <>
  {locked&&<div className="notice"><div><b>Nội dung đã khóa sau bước 8</b><p>Sale tiếp tục trao đổi, xác nhận đã nhận và đóng đơn. Chỉnh sửa ngoại lệ của quản trị được lưu lịch sử.</p></div></div>}
  {order.saleReview&&order.stage===4&&<div className="notice">{order.saleReview.result==='accepted'?'Sale đã kiểm tra: tiếp tục sản xuất. Chờ Xưởng xác nhận gửi văn phòng.':'Đã gửi yêu cầu sửa lại. Chờ Xưởng xử lý và gửi kiểm tra lại.'}</div>}
  {order.stage===8&&!locked&&<div className="accept-banner"><div><span><b>Kiểm định & đặt ship</b><small>Kiểm tra hàng và thông tin vận chuyển trước khi khóa nội dung.</small></span></div><button className="btn primary" disabled={busy} onClick={()=>open('inspection')}>Hoàn tất kiểm định & đặt ship</button></div>}
  {order.stage===8&&locked&&<div className="accept-banner"><div><span><b>Đang chờ khách nhận hàng</b><small>{order.carrier} · {order.tracking||'Chưa có mã vận đơn'}</small></span></div><button className="btn primary" disabled={busy} onClick={()=>open('received')}>Xác nhận đã nhận</button></div>}
  {order.stage===9&&<button className="btn" disabled={busy} onClick={()=>open('received')}>Cập nhật phản hồi khách</button>}
  {order.stage===9&&<div className="accept-banner"><div><span><b>Khách đã nhận hàng</b><small>{totals(order).debt>0?`Còn nợ ${money(totals(order).debt)}. Đóng khi còn nợ cần quản trị xác nhận ngoại lệ.`:'Kiểm tra lần cuối để hoàn thành đơn.'}</small></span></div><button className="btn primary" disabled={busy||(!manager&&totals(order).debt>0)} onClick={()=>open('complete')}>Hoàn thành đơn</button></div>}
  {order.stage===10&&<div className="notice"><b>Đơn đã hoàn thành.</b> Lịch sử và trao đổi được giữ lại; công nợ nếu có vẫn được theo dõi.</div>}
  {manager&&order.stage>0&&<div className="actions" style={{marginBottom:16}}>{order.payments.length>0&&<button className="btn" disabled={busy} onClick={()=>open('manager-payment')}>Điều chỉnh thanh toán ngoại lệ</button>}</div>}
  {action&&<Modal title={titles[action]} onClose={()=>!busy&&setAction(null)}><form onSubmit={async e=>{e.preventDefault();if(await onAction(order.id,action,form))setAction(null)}}><div className="modal-body">
   {action==='received'&&<label className="field"><span>Phản hồi của khách</span><select aria-label="Phản hồi của khách" required value={form.feedback} onChange={e=>set('feedback',e.target.value)}><option value="">Chọn trạng thái</option>{Object.entries(feedbackLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>}
   {action==='inspection'&&<><div className="two-col">{field('carrier','Đơn vị vận chuyển', 'text',true)}{field('service','Dịch vụ vận chuyển')}{field('tracking','Mã vận đơn','text',true)}{field('shippedDate','Ngày đặt ship','date',true)}</div>{field('reference','Mã phiếu kiểm định (nếu có)')}<label className="field"><span><input type="checkbox" required checked={form.checked} onChange={e=>set('checked',e.target.checked)}/> Đã kiểm tra hàng và thông tin giao hàng</span></label><p className="notice">Sau xác nhận, Sale không thể sửa nội dung đơn hoặc thêm thanh toán. Trao đổi và bước tiếp theo vẫn hoạt động.</p></>}
   {action==='manager-payment'&&<><label className="field"><span>Lần thanh toán</span><select aria-label="Lần thanh toán" value={form.paymentId} onChange={e=>{const p=order.payments.find(p=>p.id===e.target.value);setForm(v=>({...v,paymentId:p.id,amount:p.amount,confirmed:!!p.confirmed}))}}>{order.payments.map(p=><option value={p.id} key={p.id}>{p.sender} · {p.reference||p.date} · {money(p.amount)}</option>)}</select></label><label className="field"><span>Số tiền điều chỉnh (USD)</span><input aria-label="Số tiền điều chỉnh (USD)" type="number" min="0.01" max="10000000" step="0.01" required value={form.amount} onChange={e=>set('amount',Number(e.target.value))}/></label><label className="check-label"><input type="checkbox" checked={form.confirmed} onChange={e=>set('confirmed',e.target.checked)}/> Xác nhận đã nhận tiền</label><p className="notice">Thay đổi cập nhật công nợ ngay và lưu số liệu trước/sau trong nhật ký quản trị.</p></>}
   {action==='complete'&&totals(order).debt>0&&<p className="notice">Công nợ {money(totals(order).debt)} vẫn giữ nguyên sau đóng đơn. Cần ghi rõ lý do ngoại lệ.</p>}
   <label className="field"><span>{needsReason?'Lý do ngoại lệ':'Ghi chú'}</span><textarea aria-label="Ghi chú thao tác" rows={3} maxLength={1000} required={needsReason} minLength={needsReason?5:undefined} value={form.text} onChange={e=>set('text',e.target.value)}/></label>
  </div><div className="modal-footer"><button type="button" className="btn" disabled={busy} onClick={()=>setAction(null)}>Hủy</button><button className="btn primary" disabled={busy}>{busy?'Đang lưu…':'Xác nhận'}</button></div></form></Modal>}
 </>;
}
