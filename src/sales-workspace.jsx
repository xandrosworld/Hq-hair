import {orderLabel,isOfficialOrder} from '../order-identity.js';
import {SalesTeamSummary} from './sales-team-summary.jsx';
import {displayLabel} from './display-labels.js';
import React, {useState} from 'react';
import {ArrowRight,ArrowUpRight,CalendarBlank,CaretRight,CheckCircle,Clock,Package,Plus,Receipt,Truck,Users,Wallet,NotePencil,Play,GlobeHemisphereWest} from '@phosphor-icons/react';
import {totals,money,dateText,status,today} from '../shared.js';
import {KpiStrip,RevenueChart} from './refined.jsx';

import {AnimatedNumber,ArtIcon} from './motion.jsx';

export const lanes=[
  {id:'draft',label:'Bản nháp',stages:[0],Icon:NotePencil,tone:'slate'},
  {id:'approval',label:'Duyệt đơn',stages:[2,3],Icon:Receipt,tone:'amber'},
  {id:'production',label:'Sản xuất & kiểm tra hàng',stages:[4,5],Icon:Package,tone:'blue'},
  {id:'delivery',label:'Văn phòng & giao hàng',stages:[6,7,8,9],Icon:Truck,tone:'teal'},
  {id:'complete',label:'Hoàn thành',stages:[10],Icon:CheckCircle,tone:'green'},
];

export function HomeBoard({data,onCreate,onOrders,onOpen,onGuide,Table}) {
  const [period,setPeriod]=useState('all');
  const [lane,setLane]=useState('all');
  const [list,setList]=useState('attention');
  const inPeriod=data.orders.filter(o=>period==='all'||o.date.startsWith(period));
  const active=inPeriod.filter(isOfficialOrder);
  const customers=data.customers.filter(c=>period==='all'||active.some(o=>o.customerId===c.id));
  const selectedLane=lanes.find(l=>l.id===lane);
  const shown=inPeriod.filter(o=>selectedLane?selectedLane.stages.includes(o.stage):list==='attention'?[0,2,5,8,9].includes(o.stage):true).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const attention=data.orders.filter(o=>[0,2,5,8,9].includes(o.stage)).sort((a,b)=>({8:0,9:1,5:2,2:3,0:4}[a.stage]-{8:0,9:1,5:2,2:3,0:4}[b.stage]));
  const waiting=data.orders.filter(o=>o.stage===5).length;
  return <div className="home-board">
    <div className="page-title home-title"><div><div className="page-kicker">KHÔNG GIAN KINH DOANH</div><h1>Tổng quan kinh doanh</h1><p>Một góc nhìn rõ ràng. Chủ động từng đơn hàng.</p></div><div className="actions"><button className="btn walkthrough-button" onClick={onGuide}><Play size={16} weight="fill"/>{data.user?'Tài khoản & đội ngũ':'Khám phá bản dùng thử'}</button><div className="period-filter"><CalendarBlank size={18}/><select aria-label="Kỳ tổng quan" value={period} onChange={e=>setPeriod(e.target.value)}><option value="all">Tất cả thời gian</option>{[...new Set([today().slice(0,7),...data.orders.map(o=>o.date.slice(0,7))])].sort().reverse().map(m=><option key={m} value={m}>Tháng {m.slice(5)}, {m.slice(0,4)}</option>)}</select></div></div></div>
    <section className="welcome-banner">
      <div className="welcome-copy"><div className="welcome-eyebrow">HQ HAIR / KHÔNG GIAN KINH DOANH</div><h2>Chào {data.user?.name||'Judy'}, một ngày làm việc mới.</h2><p>{waiting>0?<><b>{waiting} đơn hàng đã sẵn sàng</b> chờ bạn kiểm tra.</>:<>Theo sát đơn hàng, chăm sóc từng kết nối.</>}</p><div className="welcome-actions">{onCreate&&<button className="btn primary" onClick={onCreate}><Plus size={18}/>Tạo đơn mới</button>}<button className="welcome-link" onClick={onOrders}>Theo dõi đơn hàng <ArrowUpRight size={18}/></button></div></div>
      <div className="welcome-art"><img src="/assets/hair-editorial.webp" alt="Tóc nối đen, nâu và vàng của bộ sưu tập minh họa HQ Hair"/></div>
    </section>
    <KpiStrip orders={active} customers={customers}/>{['manager','sales_lead'].includes(data.user?.role)&&<SalesTeamSummary orders={inPeriod} customers={customers}/>}
    <section className="pipeline-section" aria-label="Luồng đơn hàng"><div className="section-heading"><h3>Nhịp vận hành</h3><span>{inPeriod.filter(o=>o.stage>0&&o.stage<10).length} hồ sơ đang xử lý</span><button className="text-btn" onClick={()=>{setLane('all');setList('recent')}}>Xem tất cả <ArrowRight size={15}/></button></div><div className="pipeline-grid">{lanes.map(({id,label,stages,Icon,tone})=><button key={id} className={`pipeline-node ${tone} ${lane===id?'selected':''}`} aria-pressed={lane===id} onClick={()=>{setLane(lane===id?'all':id);setList('recent')}}><span className="pipeline-icon"><Icon size={20}/></span><span><small>{label}</small><strong><AnimatedNumber value={inPeriod.filter(o=>stages.includes(o.stage)).length} format="padded"/></strong></span><CaretRight size={16}/></button>)}</div></section>
    <div className="dashboard-middle"><section className="panel sales-chart-panel"><div className="panel-head"><div><h3>Hiệu quả kinh doanh</h3><p>Doanh thu và tiền đã xác nhận</p></div><span className="year-chip">{period==='all'?(data.user?new Date().getFullYear():2026):period.slice(0,4)} · USD</span></div><RevenueChart orders={data.orders.filter(isOfficialOrder)} year={period==='all'?(data.user?new Date().getFullYear():2026):period.slice(0,4)} selectedMonth={period==='all'?undefined:Number(period.slice(5))-1}/></section>
      <section className="panel priority-panel"><div className="panel-head"><div><h3>{data.user?.role==='sales_lead'?'Việc cần theo dõi của đội':'Ưu tiên của bạn'} <span className="count-chip">{attention.length}</span></h3><p>Các đơn cần nhân viên kinh doanh theo dõi tiếp</p></div><Clock size={21}/></div><div className="priority-list">{attention.slice(0,3).map(o=>{const c=data.customers.find(c=>c.id===o.customerId);return <button key={o.id} className="priority-order" onClick={()=>onOpen(o)}><span className={`priority-avatar ${o.stage===5?'green':o.stage===2?'amber':'slate'}`}>{o.stage===5?<Package size={22}/>:o.stage===2?<Receipt size={22}/>:<NotePencil size={22}/>}</span><span className="priority-copy"><span className="priority-label">{o.stage===8?'Kiểm định và theo dõi giao hàng':o.stage===9?'Kiểm tra để hoàn thành đơn':o.stage===5?'Kiểm tra hàng từ Xưởng':o.stage===2?'Theo dõi yêu cầu duyệt':'Hoàn thiện bản nháp'}</span><b>{c?.name}</b><small>{orderLabel(o)} · {money(totals(o).receive)}</small></span><ArrowUpRight size={18}/></button>})}{!attention.length&&<div className="empty"><CheckCircle size={30}/><h3>Bạn đã xử lý hết việc cần chú ý.</h3></div>}</div><div className="priority-footer"><span>Thông tin theo từng đơn, luôn có lịch sử.</span><button aria-label="Xem danh sách đơn hàng" onClick={onOrders}><ArrowRight size={18}/></button></div></section></div>
    <section className="panel recent-panel"><div className="panel-head"><div><h3>{selectedLane?selectedLane.label:'Hồ sơ & đơn hàng của bạn'} <span className="count-chip">{selectedLane?inPeriod.filter(o=>selectedLane.stages.includes(o.stage)).length:inPeriod.length}</span></h3><p>{selectedLane?'Các đơn trong nhóm tiến độ đã chọn':'Mở một đơn để xem thông tin và xử lý tiếp'}</p></div><div className="recent-actions"><div className="segmented"><button aria-pressed={!selectedLane&&list==='attention'} className={!selectedLane&&list==='attention'?'active':''} onClick={()=>{setLane('all');setList('attention')}}>Cần theo dõi</button><button aria-pressed={!selectedLane&&list==='recent'} className={!selectedLane&&list==='recent'?'active':''} onClick={()=>{setLane('all');setList('recent')}}>Gần đây</button></div><button className="text-btn" onClick={onOrders}>Xem tất cả <ArrowRight size={16}/></button></div></div><Table data={data} orders={shown} onOpen={onOpen}/></section>
    <div className="workspace-signature"><GlobeHemisphereWest size={20}/><span>Chất lượng Việt Nam. Kết nối toàn cầu.</span><b>{new Set(data.customers.map(c=>c.country)).size} thị trường <span>·</span> {data.customers.length} khách hàng</b></div>
  </div>;
}

export function OrderBoard({orders,data,onOpen}) {
  return <div className="order-board" aria-label="Bảng tiến độ đơn hàng">{[...lanes,...(orders.some(o=>o.cancelledAt)?[{id:'cancelled',label:'Đã hủy',stages:[-1],tone:'slate',Icon:Package}]:[])].map(({id,label,stages,tone,Icon})=>{
    const rows=orders.filter(o=>stages.includes(o.stage)).sort((a,b)=>b.date.localeCompare(a.date));
    return <section className={`board-lane ${tone}`} key={id}><div className="board-heading"><Icon size={18}/><h3>{label}</h3><span>{rows.length}</span></div><div className="board-cards">{rows.map(o=>{const c=data.customers.find(c=>c.id===o.customerId);return <button className="board-card" key={o.id} onClick={()=>onOpen(o)}><span className="board-id">{orderLabel(o)}<ArrowUpRight size={15}/></span><strong>{c?.name}</strong><small>{c?.company}</small><div className="board-product"><Package size={15}/>{o.items[0]?.name||'Chưa có sản phẩm'}{o.items.length>1&&<span>+{o.items.length-1}</span>}</div><div className="board-value">{money(totals(o).receive)}<small>USD</small></div><div className="board-meta"><span className={o.stage>0&&o.stage<9&&o.due<today()?'late':''}><CalendarBlank size={13}/>{dateText(o.due)}</span><span>{displayLabel(status(o))}</span></div></button>})}{!rows.length&&<p className="board-empty">Chưa có đơn trong nhóm này</p>}</div></section>;
  })}</div>;
}

export function OrderSnapshot({order}) {
  const t=totals(order);
  return <div className="order-snapshot">{[[Receipt,'Tổng gửi khách',t.total,''],[Wallet,'Tiền đã xác nhận',t.paid,'green'],[Clock,'Công nợ còn lại',order.cancelledAt?0:t.debt,'amber']].map(([Icon,label,value,tone])=><div key={label} className={tone}><span className="snapshot-icon"><Icon size={22}/></span><span><small>{label}</small><strong><AnimatedNumber value={value} format="money"/></strong></span></div>)}<div className="snapshot-delivery"><CalendarBlank size={22}/><span><small>Dự kiến giao hàng</small><strong>{dateText(order.due)}</strong></span></div></div>;
}

export function DemoGuide({data,onCreate,onOpen,onRevenue,onCustomers,onReset}) {
  const check=data.orders.find(o=>o.stage===5);
  const sample=data.orders.find(o=>o.stage>0);
  return <div className="demo-guide"><div className="guide-intro"><span className="guide-symbol"><ArtIcon name="overview"/></span><div><h3>Một đơn hàng. Trọn vẹn trải nghiệm kinh doanh.</h3><p>Chọn một điểm bắt đầu và thao tác trực tiếp với dữ liệu mẫu.</p></div></div><div className="guide-journey">{[
    [Users,'01','Hồ sơ khách hàng','Thông tin liên hệ, phân loại và lịch sử mua.',onCustomers],
    [Plus,'02','Tạo đơn của bạn','Chọn sản phẩm, thêm quà tặng và lưu bản nháp.',onCreate],
    [Package,'03',check?'Kiểm tra hàng từ Xưởng':'Khám phá chi tiết đơn',check?'Xem yêu cầu, phản hồi hoặc xác nhận tiếp nhận.':'Theo dõi sản phẩm, thanh toán và lịch sử.',()=>sample&&onOpen(check||sample)],
    [Wallet,'04','Doanh thu & công nợ','Xem tiền đã xác nhận, khoản còn nợ và xuất báo cáo.',onRevenue],
  ].map(([Icon,n,title,copy,action])=><button key={n} onClick={action}><span className="journey-number">{n}</span><Icon size={23}/><span><b>{title}</b><small>{copy}</small></span><ArrowUpRight size={19}/></button>)}</div><div className="guide-footnote"><p>Dữ liệu minh họa riêng cho trình duyệt này. Các bước Kế toán và Xưởng trong đơn mẫu là tình huống thử nghiệm.</p><button className="text-btn" onClick={onReset}>Khôi phục dữ liệu mẫu</button></div></div>;
}
