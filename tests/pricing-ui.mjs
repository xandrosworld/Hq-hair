import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-price-ui-')),base='http://127.0.0.1:3195';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3195',DATA_DIR:dir,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});
let browser;

try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({headless:true,channel:'msedge'});const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const login=await(await ctx.request.post(base+'/api/work/login',{data:{email:'owner@example.com',password:'Initial-Password-2026'}})).json();
 const auth=await(await ctx.request.post(base+'/api/work/password',{headers:{'X-CSRF-Token':login.csrf},data:{currentPassword:'Initial-Password-2026',password:'Owner-Personal-Password'}})).json();
 const customer={name:'Pricing Buyer',company:'',phone:'+123456789',email:'',country:'United States',group:'Salon',address:'Street 1',recipient:'Buyer',recipientPhone:'+123456789',social:'example.com',source:'Website',purchase:'Đơn đầu tiên'};
 await ctx.request.post(base+'/api/work/customers',{headers:{'X-CSRF-Token':auth.csrf,'Idempotency-Key':crypto.randomUUID()},data:customer});
 await page.goto(base+'/workspace');await page.getByRole('button',{name:'Bảng giá & màu',exact:true}).click();await page.getByRole('heading',{name:'Giá rõ ràng. Tư vấn tự tin.'}).waitFor();
 await page.getByLabel('Loại sản phẩm bảng giá').selectOption('Bulk');await page.getByLabel('Phân khúc',{exact:true}).selectOption('Super Double Drawn');await page.getByLabel('Chiều dài bảng giá').selectOption('55');await page.getByLabel('Tông giá',{exact:true}).selectOption('blonde');await page.locator('.price-table').getByText('$98.50',{exact:true}).waitFor();
 mkdirSync('screenshots/pricing',{recursive:true});await page.screenshot({path:'screenshots/pricing/price-book.png',fullPage:true});
 await page.getByRole('button',{name:'Danh mục màu',exact:true}).click();await page.getByLabel('Tìm mã màu').fill('#1H');await page.locator('.color-card').first().waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('.color-card img')].every(i=>i.complete&&i.naturalWidth>0));
 await page.getByRole('button',{name:'Thêm mẫu màu',exact:true}).click();await page.getByLabel('Mã / Tên mẫu').fill('#UI COLOR');await page.getByLabel('Loại màu',{exact:true}).selectOption('Other');await page.getByRole('button',{name:'Lưu mẫu màu'}).click();await page.getByText('Đã lưu mẫu màu vào danh mục dùng chung.').waitFor();await page.getByLabel('Tìm mã màu').fill('#UI COLOR');await page.locator('.color-card').getByText('Giá Sáng',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Điều chỉnh & lịch sử'}).click();await page.getByLabel('Sản phẩm',{exact:true}).selectOption('Bulk');await page.getByLabel('Tỷ lệ điều chỉnh (%)').fill('5');await page.getByRole('button',{name:'Xem trước thay đổi'}).click();await page.getByRole('heading',{name:'96 mức giá sẽ thay đổi 5%'}).waitFor();await page.getByRole('button',{name:'Xác nhận áp dụng 5%'}).click();await page.getByText('Đã cập nhật bảng giá. Các đơn đã lưu giữ nguyên.').waitFor();await page.getByRole('button',{name:'Khôi phục lần này'}).click();await page.getByRole('button',{name:'Xác nhận khôi phục'}).click();await page.getByText('Đã khôi phục giá và lưu lịch sử.').waitFor();
 await page.getByRole('button',{name:'Tạo đơn hàng',exact:true}).click();await page.getByLabel('Khách hàng',{exact:true}).selectOption({index:1});
 await page.getByRole('button',{name:'Chọn từ bảng giá & màu'}).click();await page.getByLabel('Loại sản phẩm bảng giá').selectOption('Bulk');await page.getByLabel('Phân khúc',{exact:true}).selectOption('Super Double Drawn');await page.getByLabel('Chiều dài bảng giá').selectOption('55');await page.getByLabel('Tông giá',{exact:true}).selectOption('blonde');await page.getByRole('button',{name:'Thêm vào đơn',exact:true}).click();await page.getByLabel('Số lượng 1',{exact:true}).fill('800');assert.equal(await page.getByLabel('Đơn giá 1',{exact:true}).inputValue(),'98.5');assert.equal(await page.getByLabel('Ngu\u1ed3n t\u00f3c 1',{exact:true}).inputValue(),'Raw Hair');assert.equal(await page.getByLabel('Ph\u00e2n kh\u00fac t\u00f3c 1',{exact:true}).inputValue(),'Super Double Drawn');
 await page.locator('.price-tier-tabs button').filter({hasText:'Premium'}).click();await page.locator('.price-table button').first().click();assert.equal(await page.getByLabel('Ngu\u1ed3n t\u00f3c 2',{exact:true}).inputValue(),'Raw Hair');
 await page.locator('.price-tier-tabs button').filter({hasText:'Baby'}).click();await page.locator('.price-table button').first().click();assert.equal(await page.getByLabel('Ngu\u1ed3n t\u00f3c 3',{exact:true}).inputValue(),'');
 await page.locator('.hair-editor .remove').nth(2).click();await page.locator('.hair-editor .remove').nth(1).click();
 await page.locator('.hair-editor').getByText('$788.00',{exact:true}).waitFor();await page.getByRole('button',{name:'Đóng bảng tra giá'}).click();await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).first().click();await page.getByRole('button',{name:'In hóa đơn',exact:true}).waitFor();
 await page.getByRole('button',{name:'Bảng giá & màu',exact:true}).click();await page.getByRole('button',{name:'Danh mục màu',exact:true}).click();await page.getByLabel('Tìm mã màu').fill('#Ombre Grey-9C');await page.locator('.color-card').getByText('Giá Sáng',{exact:true}).waitFor();assert.ok(await page.getByRole('button',{name:'Tra giá',exact:true}).isEnabled());
 const state=await(await ctx.request.get(base+'/api/work/state')).json(),saved=state.orders[0];
 assert.equal(saved.items[0].origin,'Raw Hair');assert.equal(saved.items[0].segment,'Super Double Drawn');
 const submitted=await ctx.request.post(base+'/api/work/orders',{headers:{'X-CSRF-Token':auth.csrf,'Idempotency-Key':crypto.randomUUID()},data:{...saved,due:saved.date,submit:true}});assert.equal(submitted.status(),200);
 await page.reload();await page.locator('.nav-item').filter({hasText:'\u0110\u01a1n h\u00e0ng'}).click();await page.getByRole('button',{name:saved.id,exact:true}).click();
 for(const width of [1120,1280,1440,1920]){
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);
  const layout=await page.evaluate(()=>{const table=document.querySelector('.detail-layout .hair-read'),wrap=table.parentElement,nav=document.querySelector('.sidebar'),timeline=document.querySelector('.timeline-panel');return {available:wrap.clientWidth,scroll:wrap.scrollWidth,nav:nav.getBoundingClientRect().width,timeline:timeline.getBoundingClientRect().width,page:document.documentElement.scrollWidth}});
  assert.ok(layout.scroll<=layout.available+1,JSON.stringify(layout));assert.ok(layout.page<=width+1,JSON.stringify(layout));assert.ok(layout.nav<=196);if(width>=1200)assert.ok(layout.timeline<=196);
  await page.screenshot({path:`screenshots/pricing/order-layout-${width}.png`,fullPage:true});
 }
 await page.locator('.nav-item').filter({hasText:'B\u1ea3ng gi\u00e1 & m\u00e0u'}).click();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'screenshots/pricing/mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 console.log('PASS: browser price filters, images, color creation, percent preview/apply/restore, price selection into order, 800g calculation, save, confirmed Grey bright-tone pricing and mobile layout.');
}finally{await browser?.close();server.kill();await new Promise(r=>server.once('exit',r));rmSync(dir,{recursive:true,force:true})}
