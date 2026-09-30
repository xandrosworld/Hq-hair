import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {highestTone,adjustedPrice,matchingPrices} from '../pricing-domain.js';
import {confirmBrightColors,migrateBrightColors} from '../color-confirmations.js';
import {DatabaseSync} from 'node:sqlite';
const seed=JSON.parse(readFileSync(new URL('../resources/pricing-seed.json',import.meta.url)));

test('Confirmation migration runs once and preserves later authorized changes',()=>{
 const db=new DatabaseSync(':memory:');const logs=[];
 try{
  db.exec('CREATE TABLE pricing(id INTEGER PRIMARY KEY,data TEXT NOT NULL)');
  db.prepare('INSERT INTO pricing VALUES (1,?)').run(JSON.stringify(seed));
  migrateBrightColors(db,(...args)=>logs.push(args));
  const data=JSON.parse(db.prepare('SELECT data FROM pricing').get().data);
  assert.equal(data.version,seed.version+1);assert.equal(data.colors.length,96);
  data.colors.find(c=>c.code==='#Grey').note='Later customer correction';data.prices[0].price=123;
  db.prepare('UPDATE pricing SET data=?').run(JSON.stringify(data));
  migrateBrightColors(db,(...args)=>logs.push(args));
  assert.deepEqual(JSON.parse(db.prepare('SELECT data FROM pricing').get().data),data);assert.equal(logs.length,1);
 }finally{db.close()}
});

test('Confirmed 60A/Grey resolve both mixes without changing prices or images',()=>{
 const data=structuredClone(seed);confirmBrightColors(data);
 assert.equal(data.colors.length,96);assert.equal(data.colors.filter(c=>!c.tone).length,0);
 for(const code of ['#60A','#Grey','#Balayage 2-4/60A','#Ombre Grey-9C'])assert.equal(data.colors.find(c=>c.code===code).tone,'blonde');
 assert.deepEqual(data.prices,seed.prices);
 for(const original of seed.colors)assert.deepEqual(data.colors.find(c=>c.id===original.id).images,original.images);
 const once=structuredClone(data);confirmBrightColors(data);assert.deepEqual(data,once);
});
test('All 38 source sheets imported, correct item/weight basis and unique prices',()=>{
 assert.equal(seed.prices.length,2874);assert.equal(new Set(seed.prices.map(p=>p.tier+':'+p.product)).size,38);
 assert.equal(new Set(seed.prices.map(p=>p.id)).size,2874);
 for(const p of seed.prices){assert.ok(p.price>0);assert.equal(p.priceBasis,/closure|frontal|ponytail|topper/i.test(p.product)?'unit':'100g')}
 const row=seed.prices.find(p=>p.tier==='Basic'&&p.product==='Bulk'&&p.lengthCm===55&&p.segment==='Super Double Drawn'&&p.tone==='blonde');assert.equal(row.price,98.5);
});
test('Mixed tones use highest tone, unknown components cannot silently default to black',()=>{
 for(const [tones,result] of [[['black','black'],'black'],[['black','brown'],'brown'],[['black','brown','blonde'],'blonde'],[['brown','blonde'],'blonde'],[['black','blonde'],'blonde'],[[] ,null],[['missing','black'],null]])assert.equal(highestTone(tones),result);
 assert.equal(seed.colors.length,94);assert.equal(seed.colors.filter(c=>!c.tone).length,2);
 for(const c of seed.colors.filter(c=>c.category==='Other'))assert.equal(c.tone,'blonde');
 for(const c of seed.colors)for(const i of c.images)assert.ok(existsSync(new URL('../resources/color-images/'+i.id+'.webp',import.meta.url)));
});
test('Percentage changes round to cents and restrict scope without mutating source',()=>{
 assert.equal(adjustedPrice(98.5,5),103.43);assert.equal(adjustedPrice(100,-5),95);
 assert.equal(adjustedPrice(76.3,5),80.12);assert.equal(adjustedPrice(66.3,5),69.62);assert.equal(adjustedPrice(155.1,5),162.86);
 const rows=matchingPrices(seed.prices,{tier:'Baby',product:'Ponytail Baby'});assert.ok(rows.length);assert.ok(rows.every(p=>p.priceBasis==='unit'));assert.equal(seed.prices.find(p=>p.id===rows[0].id).price,rows[0].price);
});
