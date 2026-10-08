// Read-only public production smoke. Never logs in or changes customer/order data.
import {chromium,webkit,devices,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.LIVE_URL||'https://hqhaircrm.io.vn';
const output='data/mobile-audit/live';mkdirSync(output,{recursive:true});
const health=await(await fetch(base+'/api/health')).json();assert.equal(health.ok,true);
const checks=[],errors=[];
for(const [engine,device] of [[chromium,'Pixel 7'],[webkit,'iPhone 13']]){
 const browser=await engine.launch(engine===chromium?{headless:true,channel:'msedge'}:{headless:true});
 try{
  const ctx=await browser.newContext({...devices[device],reducedMotion:'reduce'});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push({device,error:e.message}));
  for(const route of ['/workspace','/demo']){
   const response=await page.goto(base+route);assert.equal(response.status(),200);
   if(route==='/workspace')await expect(page.getByRole('button',{name:'Vào không gian làm việc'})).toBeVisible();
   else await page.locator('main').waitFor();
   for(const [width,height] of [[320,740],[390,844],[430,932],[844,390]]){
    await page.setViewportSize({width,height});
    const scroll=await page.evaluate(()=>document.documentElement.scrollWidth);assert.ok(scroll<=width+2,`${device} ${route} ${width}: ${scroll}`);
    await page.screenshot({path:`${output}/${engine.name()}-${route.slice(1)}-${width}.png`,fullPage:true});checks.push({device,route,width,height,scroll});
   }
  }
 }finally{await browser.close()}
}
assert.deepEqual(errors,[]);writeFileSync(`${output}/results.json`,JSON.stringify({health,checks,errors},null,2));
console.log(`PASS live ${health.revision}: ${checks.length} public mobile screens, Chromium + WebKit`);
