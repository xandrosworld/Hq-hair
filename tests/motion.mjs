import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import sharp from 'sharp';

const base=process.env.TEST_URL||'http://127.0.0.1:3100';
mkdirSync('screenshots/motion',{recursive:true});
for(const name of ['overview','orders','customers','revenue']){
 const {data,info}=await sharp(`public/assets/icons/${name}.webp`).raw().toBuffer({resolveWithObject:true});
 assert.equal(info.channels,4,`${name} alpha channel`);
 const alpha=Array.from({length:info.width*info.height},(_,i)=>data[i*4+3]);
 assert(alpha.some(a=>a===0)&&alpha.some(a=>a===255),`${name} transparent background and opaque subject`);
}
const browser=await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference',recordVideo:{dir:'screenshots/motion/video',size:{width:1440,height:1000}}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base);
 await page.getByRole('heading',{name:'Tổng quan kinh doanh'}).waitFor();
 const counter=page.locator('.metric-0 .animated-number');
 const goal=Number(await counter.getAttribute('data-value'));
 const numeric=async()=>Number((await counter.locator('[aria-hidden="true"]').innerText()).replace(/[^0-9.-]/g,''));
 const start=await numeric();assert(start<Math.round(goal),'Counter has visible intermediate value');
 await page.waitForFunction(()=>document.querySelector('.metric-0 .animated-number>[aria-hidden]')?.dataset.animating==='false');
 assert.equal(await numeric(),Math.round(goal));
 assert.equal(await page.locator('nav .art-icon').count(),4);
 await page.waitForFunction(()=>[...document.querySelectorAll('.art-icon')].every(n=>n.complete&&n.naturalWidth>0));
 assert(await page.locator('.art-icon').evaluateAll(nodes=>nodes.every(n=>n.complete&&n.naturalWidth>0)));
 await page.locator('.metric-0').hover();
 await page.waitForTimeout(450);
 assert.equal(await numeric(),Math.round(goal),'Hover does not replay or change data');
 assert.notEqual(await page.locator('.metric-0').evaluate(n=>getComputedStyle(n).translate),'none');
 await page.getByLabel('Kỳ tổng quan').selectOption('2026-08');
 await page.waitForFunction(()=>document.querySelector('.metric-0 .animated-number>[aria-hidden]')?.dataset.animating==='false');
 const filtered=Number(await counter.getAttribute('data-value'));
 assert.notEqual(filtered,goal);assert.equal(await numeric(),Math.round(filtered));
 await page.getByLabel('Kỳ tổng quan').selectOption('all');
 await page.waitForTimeout(1500);
 await page.locator('.sales-chart-panel').scrollIntoViewIfNeeded();
 await page.waitForTimeout(1650);
 const chart=page.getByRole('button',{name:'Xem doanh thu tháng 7',exact:true});
 await chart.focus();await page.waitForTimeout(750);
 await page.getByText('Tháng 07 / 2026',{exact:true}).waitFor();
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await page.waitForTimeout(350);
 await page.screenshot({path:'screenshots/motion/01-dashboard.png',fullPage:true});
 await page.locator('nav').getByRole('button',{name:/Đơn hàng/}).hover();
 await page.waitForTimeout(450);
 await page.locator('nav').getByRole('button',{name:/Đơn hàng/}).click();
 await page.getByRole('button',{name:'Bảng tiến độ',exact:true}).click();
 await page.waitForTimeout(900);
 await page.locator('.board-card').first().hover();await page.waitForTimeout(400);
 await page.screenshot({path:'screenshots/motion/02-board.png',fullPage:true});
 await page.locator('.board-card').filter({hasText:'HQ-JD-3-1'}).click();
 await page.getByRole('heading',{name:/HQ-JD-3-1/}).waitFor();
 await page.waitForTimeout(1500);
 await page.getByRole('button',{name:'In hóa đơn'}).click();await page.waitForTimeout(550);
 await page.screenshot({path:'screenshots/motion/03-invoice.png'});
 await page.keyboard.press('Escape');
 await page.locator('nav').getByRole('button',{name:'Tổng quan',exact:true}).click();
 await page.waitForTimeout(150);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForTimeout(100);
 assert.equal(await numeric(),Math.round(goal),'Live reduced-motion switch finishes counters');
 assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0,'Reduced motion stops all motion');
 for(const width of [1120,1280,1440,1920]){
  await page.setViewportSize({width,height:1000});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`Page overflow ${width}`);
  assert(await page.locator('.nav-item>span').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth)),`Navigation label clipping ${width}`);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: transparent generated assets, animated intermediate and exact final KPI values, hover feedback, filter updates, chart focus, board/invoice motion, live reduced-motion switch, desktop layout.');
}finally{await context.close();await browser.close();}
