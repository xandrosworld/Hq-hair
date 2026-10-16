import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanPriceEntry,priceEntryKey} from '../price-entry.js';
const row={tier:'Basic',product:'Bulk',segment:'Super Double Drawn',variant:'',lengthCm:55,inches:22,tone:'brown',priceBasis:'100g',price:98.5,note:''};
test('Manual prices validate units, dimensions and cent precision',()=>{
 assert.deepEqual(cleanPriceEntry(row),row);
 for(const patch of [{price:0},{price:-1},{price:100001},{price:1.001},{price:NaN},{price:'1'},{lengthCm:0},{lengthCm:301},{inches:0},{tone:'unknown'},{tier:'other'},{priceBasis:'kg'},{product:''},{product:'x'.repeat(121)},{note:{bad:1}}])assert.throws(()=>cleanPriceEntry({...row,...patch}),{status:400});
 assert.equal(cleanPriceEntry({...row,priceBasis:'unit'}).priceBasis,'unit');
});
test('Editing changes amount and note, preserving the identity of an existing specification',()=>{
 const previous={...row,id:'stable',source:{sheet:'Original'}};
 const edited=cleanPriceEntry({...row,price:91.25,product:'Injected product',tone:'black',note:'New rate'},previous);
 assert.equal(edited.price,91.25);assert.equal(edited.product,previous.product);assert.equal(edited.tone,previous.tone);assert.deepEqual(edited.source,previous.source);assert.equal(previous.price,98.5);
});
test('Duplicate detection normalizes names, case and whitespace, including alternate price basis',()=>{
 assert.equal(priceEntryKey(row),priceEntryKey({...row,product:' bulk ',segment:'super double drawn',priceBasis:'unit'}));
 assert.notEqual(priceEntryKey(row),priceEntryKey({...row,tone:'blonde'}));
 assert.notEqual(priceEntryKey(row),priceEntryKey({...row,variant:'13x4'}));
});
