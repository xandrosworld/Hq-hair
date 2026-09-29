import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
const base=process.env.TEST_URL||'http://127.0.0.1:3000';
const errors=[];page.on('pageerror',e=>errors.push(e.message));
mkdirSync('screenshots/refined',{recursive:true});
async function shot(name){await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`screenshots/refined/${name}.png`,fullPage:true,animations:'disabled'})}
try{
 await page.goto(base);await page.getByRole('heading',{name:'Tổng quan kinh doanh'}).waitFor();await page.evaluate(()=>document.fonts.ready);
 assert(await page.locator('.welcome-art img').evaluate(i=>i.complete&&i.naturalWidth>0));
 await shot('01-dashboard');
 await page.getByLabel('Kỳ tổng quan').selectOption('2026-08');
 const total=await page.locator('.metric-0 .metric-middle strong').innerText();
 await page.getByLabel('Kỳ tổng quan').selectOption('2026-09');
 assert.notEqual(total,await page.locator('.metric-0 .metric-middle strong').innerText());
 await page.getByRole('button',{name:'Xem doanh thu tháng 7',exact:true}).focus();
 await page.getByText('Tháng 07 / 2026',{exact:true}).waitFor();
 await page.getByLabel('Kỳ tổng quan').selectOption('all');
 await page.keyboard.press('Control+k');
 await page.getByRole('dialog',{name:'Tìm kiếm nhanh'}).waitFor();
 await page.getByLabel('Tìm kiếm toàn hệ thống').fill('HQ-JD-3-1');
 await shot('02-search');
 await page.getByRole('dialog',{name:'Tìm kiếm nhanh'}).getByRole('button',{name:/HQ-JD-3-1/}).click();
 await page.getByRole('heading',{name:/HQ-JD-3-1/}).waitFor();
 await shot('03-detail');
 await page.getByRole('button',{name:'Việc cần chú ý'}).click();
 await page.getByRole('dialog',{name:'Việc cần chú ý'}).waitFor();
 await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
 await page.locator('nav').getByRole('button',{name:/Đơn hàng/}).click();
 await shot('04-orders');
 await page.locator('nav').getByRole('button',{name:'Khách hàng',exact:true}).click();
 await shot('05-customers');
 await page.getByRole('button',{name:'Tạo khách hàng',exact:true}).click();
 await shot('06-customer-form');
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Tạo đơn hàng',exact:true}).first().click();
 await page.getByLabel('Khách hàng',{exact:false}).selectOption('HQ-JD-1');
 await shot('07-create-order');
 await page.getByRole('button',{name:'Thanh toán & giao hàng',exact:true}).last().click();
 await shot('08-payment-shipping');
 await page.locator('nav').getByRole('button',{name:'Doanh thu & công nợ',exact:true}).click();
 await page.getByRole('dialog',{name:'Đơn đang có thay đổi chưa lưu'}).getByRole('button',{name:'Rời và bỏ thay đổi'}).click();
 await shot('09-revenue');
 await page.locator('nav').getByRole('button',{name:'Tổng quan',exact:true}).click();
 for(const width of [1280,1920]){
  await page.setViewportSize({width,height:1000});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Horizontal page overflow at '+width);
  await shot(`10-dashboard-${width}`);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: period filter, chart keyboard focus, Ctrl+K search and navigation, notifications, responsive desktop widths 1280/1440/1920, 11 visual screenshots.');
}finally{await browser.close()}
