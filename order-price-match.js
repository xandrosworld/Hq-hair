import {hairProductName} from './hair-classification.js';
export function matchingOrderPrices(item,data){
 if(!data||!item.name||!item.origin||!item.lengthCm||!item.color||!item.segment)return [];
 const code=value=>String(value).trim().replace(/^#/,'').toLowerCase();
 const color=data.colors.find(c=>code(c.code)===code(item.color));
 if(!color?.tone)return [];
 const tier=item.origin==='Baby Hair'?'Baby':item.origin==='Raw Hair'?(item.segment==='Premium'?'Premium':item.segment==='Super Double Drawn'?'Basic':null):null;
 if(!tier)return [];
 let rows=data.prices.filter(p=>p.tier===tier&&hairProductName(p.product).toLowerCase()===hairProductName(item.name).toLowerCase()&&Number(p.lengthCm)===Number(item.lengthCm)&&p.tone===color.tone);
 const exact=rows.filter(p=>p.segment===item.segment);
 if(exact.length)rows=exact;
 else if(tier==='Basic')rows=rows.filter(p=>!p.segment);
 return rows;
}
export function matchedPriceFields(price,data){return {price:price.price,priceBasis:price.priceBasis,unit:price.priceBasis==='100g'?'Gram':'Piece',priceReference:{id:price.id,version:data.version,tier:price.tier,tone:price.tone,variant:price.variant||''}}}
