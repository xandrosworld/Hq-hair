import React from 'react';
import {totals,money,dateText} from '../shared.js';
import {invoiceOrderLabel} from '../order-identity.js';
import {ProductReadTable} from './product-table.jsx';
import './invoice.css';

const Facts=({rows})=><dl className="invoice-facts">{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'—'}</dd></div>)}</dl>;
export function InvoiceContent({order:o,customer:c,orders=[],demo=false}){
 const t=totals(o);
 return <article className="invoice" id="invoice"><div className="invoice-top"><div><h1>HQ HAIR</h1><p>Vietnamese Hair · Global Beauty</p></div><div><h2>COMMERCIAL INVOICE</h2><p>{invoiceOrderLabel(o,orders)}</p><p>{dateText(o.date)}</p></div></div>
 <div className="invoice-parties"><section><h3>SELLER</h3><Facts rows={[
 ['Seller','HQ HAIR HOUSEHOLD BUSINESS'],['Website','hqhair.com.vn'],['Hotline','+84 389023690'],['Representative',o.sale],['Direct phone',o.salePhone]
 ]}/></section><section><h3>BUYER</h3><Facts rows={[
 ['Company',c?.company],['Customer',c?.name],['Phone',c?.phone],['Email',c?.email]
 ]}/></section></div>
 <ProductReadTable items={o.items} language="en"/>
 <div className="invoice-settlement"><section className="invoice-shipping"><h3>SHIPPING DETAILS</h3><Facts rows={[
 ['Recipient',o.recipient],['Phone',o.phone],['Email',o.email],['Address',o.address],['Country',o.country],['Carrier',[o.carrier,o.service].filter(Boolean).join(' · ')],['Tracking',o.tracking],['Expected delivery',o.due?dateText(o.due):'']
 ]}/></section><div className="invoice-totals">{[['Subtotal',t.base+t.extra],['Discount',-o.discount],['Shipping (collected on behalf)',o.shippingFee],['Tất cả phí thanh toán và phí giao dịch do người mua chịu. Người bán phải nhận đủ số tiền.',t.total]].map(([k,v])=><div key={k}><span>{k}</span><b>{money(v)}</b></div>)}</div></div>
 <div className="invoice-bottom">Thank you for choosing HQ Hair.{demo&&<small>DEMO · Sample document, not valid for payment.</small>}</div></article>;
}
