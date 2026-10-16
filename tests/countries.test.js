import test from 'node:test';
import assert from 'node:assert/strict';
import {countries} from '../shared.js';
import {countryLabels} from '../countries.js';
import {cleanCustomer} from '../customer-fields.js';
test('Expanded countries use the same accepted values for customer and shipping addresses',()=>{
 for(const country of ['Netherlands','Belgium','Poland','Sweden','Italy','Spain','Ukraine','Switzerland']){
  assert.ok(countries.includes(country));assert.ok(countryLabels[country]);
  const c=cleanCustomer({name:'Buyer',phone:'123456',address:'Street',recipient:'Buyer',recipientPhone:'123456',source:'Website',group:'Salon',country,shippingCountry:country});assert.equal(c.shippingCountry,country);
 }
 for(const old of ['United States','United Kingdom','France','Germany','Australia','Canada','Nigeria','South Africa','Vietnam'])assert.ok(countries.includes(old));
 assert.equal(new Set(countries).size,countries.length);
});
