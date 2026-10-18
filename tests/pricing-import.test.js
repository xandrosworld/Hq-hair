import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planPricingImport} from '../pricing-import.js';
const row={kind:'price',tier:'Premium',product:'Bulk',segment:'',variant:'',inches:10,lengthCm:25,tone:'black',priceBasis:'100g',price:50,note:''};
const data={version:3,prices:[{...row,id:'p'}],colors:[]};
const plan=(rows,mode='add',d=data)=>planPricingImport(d,{version:3,mode,rows});
test('import preserves existing by default, explicitly updates, and identifies no-op',()=>{
 assert.equal(plan([{...row,price:60}]).counts.skip,1);
 assert.equal(plan([{...row,price:60}],'upsert').counts.update,1);
 assert.equal(plan([row]).counts.same,1);
 assert.equal(data.prices[0].price,50);
 assert.equal(plan([{...row,lengthCm:30,inches:12}]).counts.create,1);
});
test('import rejects duplicate keys, incorrect units, invalid prices, stale versions and permissions',()=>{
 assert.equal(plan([row,{...row,product:' bulk '}]).errors.length,1);
 assert.equal(plan([{...row,priceBasis:'unit'}]).errors.length,1);
 for(const price of [-1,0,NaN,Infinity,100001,2.123,'42'])assert.equal(plan([{...row,price}]).errors.length,1);
 assert.throws(()=>planPricingImport(data,{version:2,rows:[row],mode:'add'}),/thay đổi/);
 assert.equal(planPricingImport(data,{version:3,rows:[row],mode:'add'},{prices:false}).errors.length,1);
 assert.equal(plan([row],'upsert',{...data,prices:[...data.prices,{...row,id:'p2'}]}).errors.length,1);
});
test('color imports check permission, duplicate codes and preserve category',()=>{
 const c={kind:'color',code:'#New',category:'Blonde',note:''};
 assert.equal(plan([c]).counts.create,1);
 assert.equal(plan([c,{...c,code:'new'}]).errors.length,1);
 assert.equal(plan([{...c,category:'Ombre'}]).errors.length,1);
 assert.equal(planPricingImport(data,{version:3,rows:[c],mode:'add'},{prices:true,colors:false}).errors.length,1);
 assert.equal(plan([c],'upsert',{...data,colors:[{id:'c',code:'new',category:'Black'}]}).errors.length,1);
});

test('Basic rename matches legacy prices without duplicate imports or changing amounts',()=>{
 const old={...row,tier:'Basic',segment:'Double Drawn',id:'old'};
 const d={...data,prices:[old]};const before=structuredClone(d);
 assert.equal(plan([{...old,segment:'Basic'}],'add',d).counts.same,1);
 const update=plan([{...old,segment:'Basic',price:60}],'upsert',d);
 assert.equal(update.counts.update,1);assert.equal(update.changes[0].existingId,'old');
 assert.equal(plan([old,{...old,segment:'Basic'}],'add',d).errors.length,1);
 assert.deepEqual(d,before);
});
