import test from 'node:test';import assert from 'node:assert/strict';import {matchesFinalReview} from '../accounting-follow.js';
test('final review filters preserve credit decision even after debt settlement',()=>{
 const base={accountingApproval:{status:'partial'},stage:8};
 assert.equal(matchesFinalReview(base,'all'),false);
 const credit={...base,finalPaymentCheck:{status:'credit'},payments:[{confirmed:true,amount:100}]};
 assert.equal(matchesFinalReview(credit,'credit'),true);assert.equal(matchesFinalReview(credit,'full'),false);
 assert.equal(matchesFinalReview({...base,finalPaymentCheck:{status:'full'}},'full'),true);
 assert.equal(matchesFinalReview({...credit,cancelledAt:'now'},'credit'),false);
});
