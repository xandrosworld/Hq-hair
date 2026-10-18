import test from 'node:test';
import assert from 'node:assert/strict';
import {matchingOrderPrices,matchedPriceFields} from '../order-price-match.js';
import {productAmount} from '../product-fields.js';
const data={version:2,colors:[{code:'#1',tone:'black'}],prices:[{id:'a',tier:'Basic',product:'Bulk',segment:'Super Double Drawn',lengthCm:50,tone:'black',price:200,priceBasis:'100g'},{id:'b',tier:'Basic',product:'Bulk',segment:'Double Drawn',lengthCm:50,tone:'black',price:150,priceBasis:'100g'}]};
const item={name:'Bulk',origin:'Raw Hair',segment:'Super Double Drawn',lengthCm:50,color:'1',qty:150};
test('Matches exact segment and color code, then calculates grams',()=>{const rows=matchingOrderPrices(item,data);assert.deepEqual(rows.map(p=>p.id),['a']);assert.equal(productAmount({...item,...matchedPriceFields(rows[0],data)}),300)});
test('Incomplete and unlisted colors do not guess a price',()=>{assert.deepEqual(matchingOrderPrices({...item,color:''},data),[]);assert.deepEqual(matchingOrderPrices({...item,color:'Omb'},data),[])});
test('Preserves ambiguous variants for explicit selection',()=>{const prices=[...data.prices,{...data.prices[0],id:'c',variant:'wide',price:220}];assert.equal(matchingOrderPrices(item,{...data,prices}).length,2)});

test('Baby matches without segment, Raw Double Drawn matches only its own prices',()=>{
 const baby={id:'baby',tier:'Baby',product:'Baby Bulk',segment:'',lengthCm:50,tone:'black',price:250,priceBasis:'100g'};
 assert.deepEqual(matchingOrderPrices({...item,origin:'Baby Hair',segment:''},{...data,prices:[...data.prices,baby]}).map(p=>p.id),['baby']);
 assert.deepEqual(matchingOrderPrices({...item,segment:'Double Drawn'},data).map(p=>p.id),['b']);
 assert.deepEqual(matchingOrderPrices({...item,segment:'Double Drawn'},{...data,prices:[{...data.prices[0],segment:''}]}),[]);
});

test('Basic and legacy Double Drawn select the same price for every mixed tone',()=>{
 for(const segment of ['Basic','Double Drawn'])for(const stored of ['Basic','Double Drawn'])for(const tone of ['black','brown','blonde']){
  const prices=['black','brown','blonde'].map((tone,i)=>({id:String(i),tier:'Basic',segment:stored,product:'Bulk',lengthCm:50,tone,price:50+i*10}));
  const result=matchingOrderPrices({name:'Bulk',origin:'Raw Hair',segment,lengthCm:50,color:'mix'},{prices,colors:[{code:'mix',tone}]});
  assert.equal(result.length,1);assert.equal(result[0].tone,tone);
 }
});
