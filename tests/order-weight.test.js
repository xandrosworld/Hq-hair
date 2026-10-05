import test from 'node:test';
import assert from 'node:assert/strict';
import {totalGrams} from '../order-weight.js';
test('Weight sums base, extras and gram gifts without treating units as grams',()=>{
 assert.equal(totalGrams([{kind:'base',unit:'Gram',qty:150},{kind:'base',unit:'G',qty:450},{kind:'extra',unit:'grams',qty:100.5},{kind:'gift',unit:'g',qty:20},{unit:'Piece',qty:10}]),720.5);
 assert.equal(totalGrams([]),0);
});
