import test from 'node:test';
import assert from 'node:assert/strict';
import {matchingOrderPrices,matchedPriceFields} from '../order-price-match.js';
import {productAmount} from '../product-fields.js';
const data={version:2,colors:[{code:'#1',tone:'black'}],prices:[{id:'a',tier:'Basic',product:'Bulk',segment:'Super Double Drawn',lengthCm:50,tone:'black',price:200,priceBasis:'100g'},{id:'b',tier:'Basic',product:'Bulk',segment:'Double Drawn',lengthCm:50,tone:'black',price:150,priceBasis:'100g'}]};
const item={name:'Bulk',origin:'Raw Hair',segment:'Super Double Drawn',lengthCm:50,color:'1',qty:150};
test('Matches exact segment and color code, then calculates grams',()=>{const rows=matchingOrderPrices(item,data);assert.deepEqual(rows.map(p=>p.id),['a']);assert.equal(productAmount({...item,...matchedPriceFields(rows[0],data)}),300)});
test('Incomplete and unlisted colors do not guess a price',()=>{assert.deepEqual(matchingOrderPrices({...item,color:''},data),[]);assert.deepEqual(matchingOrderPrices({...item,color:'Omb'},data),[])});
test('Preserves ambiguous variants for explicit selection',()=>{const prices=[...data.prices,{...data.prices[0],id:'c',variant:'wide',price:220}];assert.equal(matchingOrderPrices(item,{...data,prices}).length,2)});
