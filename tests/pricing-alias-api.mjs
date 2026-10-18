import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-price-alias-')),base='http://127.0.0.1:3197';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3197',DATA_DIR:dir,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});

try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 const {request}=await import('@playwright/test');const ctx=await request.newContext({baseURL:base});
 const login=await(await ctx.post('/api/work/login',{data:{email:'owner@example.com',password:'Initial-Password-2026'}})).json();
 const auth=await(await ctx.post('/api/work/password',{headers:{'X-CSRF-Token':login.csrf},data:{currentPassword:'Initial-Password-2026',password:'Owner-Personal-Password'}})).json();
 const get=async()=>await(await ctx.get('/api/work/pricing')).json();
 const initial=await get();assert.ok(initial.prices.some(p=>p.segment==='Basic'));assert.ok(!initial.prices.some(p=>p.segment==='Double Drawn'));
 for(const category of ['Ombre','Piano','Balayage'])for(const [tones,expected] of [[['black','brown'],'brown'],[['brown','blonde'],'blonde'],[['black','blonde'],'blonde']]){
  const data=await get();const components=tones.map(t=>data.colors.find(c=>c.tone===t&&['Black','Brown','Blonde'].includes(c.category)).id);
  const code=category+' '+tones.join('-');const res=await ctx.post('/api/work/pricing/colors',{headers:{'X-CSRF-Token':auth.csrf,'Idempotency-Key':crypto.randomUUID()},data:{version:data.version,code,category,components,note:''}});
  assert.equal(res.status(),200,await res.text());const saved=await get();assert.equal(saved.colors.find(c=>c.code===code).tone,expected);assert.deepEqual(saved.prices,initial.prices);
 }
 await ctx.dispose();console.log('PASS live API: legacy Basic alias; all three mixed-color types use highest tone, all prices unchanged');
}finally{server.kill();await new Promise(r=>server.once('exit',r));rmSync(dir,{recursive:true,force:true})}
