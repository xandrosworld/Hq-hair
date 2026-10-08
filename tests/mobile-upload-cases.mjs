import {expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import sharp from 'sharp';

const jpg=await sharp(randomBytes(1800*2400*3),{raw:{width:2400,height:1800,channels:3}}).withMetadata({orientation:6}).jpeg({quality:96}).toBuffer();
assert.ok(jpg.length>1024*1024);
const png=await sharp({create:{width:900,height:1200,channels:3,background:'#25748a'}}).png().toBuffer();
const webp=await sharp(png).webp().toBuffer();
const image=(name,buffer=png,mimeType='image/png')=>({name,mimeType,buffer});
const pick=async(page,trigger,files)=>{const event=page.waitForEvent('filechooser');await trigger.tap();await(await event).setFiles(files)};
const decoded=async(locator)=>expect.poll(()=>locator.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);

export async function paymentUploads(page){
 const input=page.getByRole('dialog').locator('input[type=file]');
 await pick(page,input,image('phone-portrait.jpg',jpg,'image/jpeg'));
 await expect(page.getByText('Đã chọn: phone-portrait.jpg',{exact:true})).toBeVisible({timeout:30000});
 const data=await page.getByRole('link',{name:'Tải tệp đã chọn để kiểm tra'}).getAttribute('href');
 const bytes=Buffer.from(data.split(',')[1],'base64');assert.ok(bytes.length<=1024*1024);const meta=await sharp(bytes).metadata();assert.ok(meta.height>meta.width);
 await page.getByRole('button',{name:'Bỏ tệp đã chọn'}).tap();
 await pick(page,input,image('phone-portrait.jpg',jpg,'image/jpeg'));
 await expect(page.getByText('Đã chọn: phone-portrait.jpg',{exact:true})).toBeVisible();
 await pick(page,input,image('iphone.heic',Buffer.from('unsupported'),'image/heic'));
 await expect(page.getByRole('alert')).toContainText('HEIC');
 await expect(page.getByRole('dialog').getByRole('button',{name:'Thêm thanh toán',exact:true})).toBeDisabled();
 await pick(page,input,image('broken.png',Buffer.from('broken')));
 await expect(page.getByRole('alert')).toContainText('Không mở được ảnh');
 await pick(page,input,image('large.pdf',Buffer.alloc(1024*1024+1),'application/pdf'));
 await expect(page.getByRole('alert')).toContainText('PDF tối đa');
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>','<< /Length 0 >>\nstream\n\nendstream'];
 let pdf='%PDF-1.4\n',offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`}const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 5\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 await pick(page,input,image('receipt.pdf',Buffer.from(pdf),'application/pdf'));
 await expect(page.getByText('Đã chọn: receipt.pdf',{exact:true})).toBeVisible();
 const downloadEvent=page.waitForEvent('download');await page.getByRole('link',{name:'Tải tệp đã chọn để kiểm tra'}).tap();const download=await downloadEvent;assert.equal(download.suggestedFilename(),'receipt.pdf');const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);assert.equal(Buffer.concat(chunks).toString(),pdf);
 await pick(page,input,image('receipt.png'));
 await expect(page.getByText('Đã chọn: receipt.png',{exact:true})).toBeVisible();
 await expect(page.getByRole('alert')).toHaveCount(0);
 await decoded(page.getByAltText('Ảnh chứng từ đã chọn'));
 await page.screenshot({path:'data/mobile-audit/payment-upload.png',fullPage:true});
 console.log('PASS payment: native chooser event, >1 MB portrait compression, remove/reselect, HEIC/corrupt/oversize rejection, recovery');
}

export async function chatUploads(page,sale,orderId){
 const add=page.getByRole('button',{name:'Thêm ảnh/video',exact:true});
 await pick(page,add,[image('chat-one.png'),image('chat-two.webp',webp,'image/webp')]);
 await page.getByRole('button',{name:'Bỏ ảnh chat-one.png'}).tap();
 await pick(page,add,image('chat-one.png'));
 await pick(page,add,image('too-big.png',Buffer.alloc(10*1024*1024+1)));
 await expect(page.locator('.chat-error')).toContainText('10 MB');
 await expect(page.locator('.chat-attachment')).toHaveCount(2);
 await page.getByLabel('Nội dung trao đổi').fill('Mobile offline upload retry');
 const endpoint=`**/api/work/orders/${orderId}/action`;
 await page.route(endpoint,route=>route.abort('internetdisconnected'));
 await page.getByRole('button',{name:'Gửi',exact:true}).tap();
 await expect(page.locator('.chat-error')).toBeVisible();
 await expect(page.getByRole('button',{name:'Gửi',exact:true})).toBeEnabled();
 await expect(page.locator('.chat-attachment')).toHaveCount(2);
 await page.unroute(endpoint);
 await page.getByRole('button',{name:'Gửi',exact:true}).tap();
 await expect(page.locator('.chat-attachment')).toHaveCount(0);
 const order=(await sale.call('/state')).orders.find(o=>o.id===orderId);
 const messages=order.messages.filter(m=>m.text==='Mobile offline upload retry');assert.equal(messages.length,1);assert.equal(messages[0].images.length,2);
 await page.getByRole('button',{name:'Xem ảnh chat-two.webp'}).tap();
 await decoded(page.locator('.chat-lightbox img'));
 const url=await page.getByRole('link',{name:'Mở ảnh gốc'}).getAttribute('href');const response=await sale.ctx.request.get(new URL(url,page.url()).href);assert.equal(response.status(),200);assert.deepEqual(await response.body(),webp);
 await page.getByRole('button',{name:'Đóng',exact:true}).tap();
 await pick(page,add,image('response-lost.png'));
 await page.getByLabel('Nội dung trao đổi').fill('Server saved but response lost');
 let first=true;
 await page.route(endpoint,async route=>{if(first){first=false;await route.fetch();await route.abort('internetdisconnected')}else await route.continue()});
 await page.getByRole('button',{name:'Gửi',exact:true}).tap();
 await expect(page.locator('.chat-attachment')).toHaveCount(0);
 await page.unroute(endpoint);
 const saved=(await sale.call('/state')).orders.find(o=>o.id===orderId).messages.filter(m=>m.text==='Server saved but response lost');assert.equal(saved.length,1);assert.equal(saved[0].images.length,1);
 console.log('PASS chat: chooser, multiple files, remove/reselect, size rejection preserves selection, offline retry once, decoded preview and original bytes');
}

export async function qcUploads(page,sale,orderId){
 const input=page.getByLabel('Tệp kiểm định 1',{exact:true});
 await pick(page,input,image('qc-over.png',Buffer.alloc(5*1024*1024+1)));
 await expect(page.locator('.qc-sheet')).toContainText('tối đa 5 MiB');
 const endpoint=`**/api/work/orders/${orderId}/qc-upload`;
 await page.route(endpoint,route=>route.abort('internetdisconnected'));
 await pick(page,input,image('qc-retry.png'));
 await expect(page.locator('.qc-sheet')).toContainText('Mất kết nối');
 await expect(input).toBeEnabled();await page.unroute(endpoint);
 await pick(page,input,image('qc-retry.png'));
 await expect(page.getByRole('button',{name:'Bỏ tệp qc-retry.png'})).toBeVisible();
 await page.getByRole('button',{name:'Bỏ tệp qc-retry.png'}).tap();
 await pick(page,input,image('qc-retry.png'));
 await expect(page.getByRole('button',{name:'Bỏ tệp qc-retry.png'})).toHaveCount(1);
 await decoded(page.locator('.qc-media img').first());
 await page.getByRole('button',{name:'Lưu QC',exact:true}).tap();
 await expect(page.getByText('Đã lưu phiếu kiểm định.',{exact:true})).toBeVisible();
 const order=(await sale.call('/state')).orders.find(o=>o.id===orderId);assert.equal(order.qc.rows[0].mediaIds.length,1);
 console.log('PASS QC: size rejection, offline retry, remove/reselect same file, image decoding and persisted row');
}
