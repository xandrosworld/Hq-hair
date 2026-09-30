import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {deploymentGate} from '../deployment-mode.js';
test('Migration freeze blocks writes, retains health and redirects only safe methods',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'hq-gate-'));
 try{
  let next=false;const gate=deploymentGate(dir);const res={set(){return this},status(s){this.code=s;return this},type(){return this},json(v){this.body=v;return this},send(v){this.body=v;return this},redirect(s,url){this.code=s;this.url=url;return this}};
  gate({path:'/api/orders',method:'POST'},res,()=>next=true);assert.equal(next,true);
  writeFileSync(path.join(dir,'deployment-mode.json'),JSON.stringify({mode:'maintenance'}));
  next=false;gate({path:'/api/orders',method:'POST'},res,()=>next=true);assert.equal(next,false);assert.equal(res.code,503);
  gate({path:'/api/health'},res,()=>next=true);assert.equal(next,true);
  writeFileSync(path.join(dir,'deployment-mode.json'),JSON.stringify({mode:'redirect',target:'https://hqhaircrm.io.vn'}));
  gate({path:'/workspace',originalUrl:'/workspace',method:'GET'},res,()=>{});assert.equal(res.url,'https://hqhaircrm.io.vn/workspace');
  gate({path:'/api/work/login',method:'POST'},res,()=>{});assert.equal(res.code,503);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
