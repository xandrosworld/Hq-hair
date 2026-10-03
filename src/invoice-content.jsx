import React from 'react';
import {totals,money,dateText} from '../shared.js';
import {orderLabel} from '../order-identity.js';
import {ProductReadTable} from './product-table.jsx';
import './invoice.css';

const Facts=({rows})=><dl className="invoice-facts">{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'—'}</dd></div>)}</dl>;
export function InvoiceContent({order:o,customer:c,demo=false}){
 const t=totals(o);
 return <article className="invoice" id="invoice"><div className="invoice-top"><div><h1>HQ HAIR</h1><p>Vietnamese Hair · Global Beauty</p></div><div><h2>COMMERCIAL INVOICE</h2><p>{orderLabel(o)}</p><p>{dateText(o.date)}</p></div></div>
 <div className="invoice-parties"><section><h3>BÊN BÁN / SELLER</h3><Facts rows={[
 ['Bên bán / Seller','HQ HAIR HOUSEHOLD BUSINESS'],['Website','hqhair.com.vn'],['Hotline','+84 389023690'],['Đại diện / Representative',o.sale],['Điện thoại / Direct phone',o.salePhone]
 ]}/></section><section><h3>BÊN MUA / BUYER</h3><Facts rows={[
 ['Công ty / Company',c?.company],['Khách hàng / Customer',c?.name],['Điện thoại / Phone',c?.phone],['Email',c?.email]
 ]}/></section></div>
 <ProductReadTable items={o.items} language="en"/>
 <div className="invoice-settlement"><section className="invoice-shipping"><h3>THÔNG TIN GIAO HÀNG / SHIPPING DETAILS</h3><Facts rows={[
 ['Người nhận / Recipient',o.recipient],['Điện thoại / Phone',o.phone],['Email',o.email],['Địa chỉ / Address',o.address],['Quốc gia / Country',o.country],['Vận chuyển / Carrier',[o.carrier,o.service].filter(Boolean).join(' · ')],['Mã vận đơn / Tracking',o.tracking],['Dự kiến giao / Expected delivery',o.due?dateText(o.due):'']
 ]}/></section><div className="invoice-totals">{[['Subtotal',t.base+t.extra],['Discount',-o.discount],['Shipping',o.shippingFee],['Payment fee',o.paymentFee],['TOTAL USD',t.total]].map(([k,v])=><div key={k}><span>{k}</span><b>{money(v)}</b></div>)}</div></div>
 <div className="invoice-bottom">Thank you for choosing HQ Hair.{demo&&<small>DEMO · Sample document, not valid for payment.</small>}</div></article>;
}
