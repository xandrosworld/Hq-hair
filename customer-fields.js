import {countries,groups} from './shared.js';
import {isOfficialOrder} from './order-identity.js';
export const purchaseHistory=(id,orders=[])=>orders.some(o=>o.customerId===id&&isOfficialOrder(o))?'Đã mua trước đây':'Chưa có đơn được duyệt';
export function cleanCustomer(body,previous){
 const c={};for(const key of ['name','company','phone','email','country','group','address','recipient','recipientPhone','recipientEmail','shippingCountry','social','website','source'])c[key]=typeof body[key]==='string'?body[key].trim().slice(0,500):'';
 // Old clients and existing profiles used one country for both sections.
 if(!Object.hasOwn(body,'shippingCountry'))c.shippingCountry=c.country;
 const fail=message=>{throw Object.assign(new Error(message),{status:400})};
 if(!(c.name||c.company)||!c.phone||!c.address||!c.recipient||!c.recipientPhone||!c.source||!groups.includes(c.group)||!countries.includes(c.country)||!countries.includes(c.shippingCountry))fail('Điền tên khách hàng hoặc công ty và đầy đủ thông tin bắt buộc.');
 for(const key of ['email','recipientEmail'])if(c[key]&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c[key]))fail('Email chưa đúng định dạng.');
 for(const key of ['social','website'])if(c[key]&&c[key]!==previous?.[key]){
  try{const url=new URL(c[key]);if(!['http:','https:'].includes(url.protocol)||!url.hostname.includes('.'))throw Error()}catch{fail('Mạng xã hội và trang web phải là đường link hợp lệ, bắt đầu bằng https:// hoặc http://.');}
 }
 return c;
}
