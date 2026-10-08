import {expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const mediaChecks=[];
let fixtures;
function videos(){
 if(fixtures)return fixtures;
 const dir=mkdtempSync(path.join(os.tmpdir(),'hq-mobile-video-'));
 fixtures=['mp4','webm'].map(ext=>{
  const file=path.join(dir,`mobile-portrait.${ext}`);
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=180x320:rate=12','-t','1',...ext==='mp4'?['-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart']:['-c:v','libvpx','-b:v','100k'],file],{windowsHide:true});
  return {name:path.basename(file),mimeType:`video/${ext}`,buffer:readFileSync(file)};
 });
 return fixtures;
}
async function choose(page,trigger,file){const event=page.waitForEvent('filechooser');await trigger.tap();await(await event).setFiles(file)}
async function verifyBytes(client,url,bytes){
 const r=await client.ctx.request.get(url);assert.equal(r.status(),200);assert.deepEqual(await r.body(),bytes);
 const partial=await client.ctx.request.get(url,{headers:{Range:'bytes=0-31'}});assert.equal(partial.status(),206);assert.deepEqual(await partial.body(),bytes.subarray(0,32));
}
async function playback(video){
 const recovery=video.locator('..').getByRole('button',{name:'Tải video để phát',exact:true});
 await expect.poll(async()=>await recovery.isVisible()||await video.evaluate(v=>v.videoWidth===180&&v.videoHeight===320),{timeout:15000}).toBe(true);
 if(await recovery.isVisible())await recovery.tap();
 // WebKit can expose metadata before the decoded frame dimensions are populated.
 await expect.poll(()=>video.evaluate(v=>({width:v.videoWidth,height:v.videoHeight})),{timeout:15000}).toEqual({width:180,height:320});
 const state=await video.evaluate(v=>({error:v.error?.message,width:v.videoWidth,height:v.videoHeight}));
 assert.ok(!state.error,`Video decode failed: ${state.error}`);
 assert.ok(state.height>state.width,'Portrait video remains upright');
 await video.evaluate(v=>{v.muted=true;v.currentTime=0;v.play().catch(()=>{})});
 await expect.poll(()=>video.evaluate(v=>v.currentTime),{timeout:15000}).toBeGreaterThan(0);
 assert.equal(await video.getAttribute('playsinline'),'');
}
async function webkitDownload(page,video,file){
 const wrapper=video.locator('..');
 await wrapper.getByRole('button',{name:'Tải video để phát',exact:true}).tap();
 const link=wrapper.getByRole('link',{name:'Tải video gốc',exact:true});await expect(link).toBeVisible();
 const event=page.waitForEvent('download');await link.tap();const download=await event;
 const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
 assert.deepEqual(Buffer.concat(chunks),file.buffer);assert.equal(download.suggestedFilename(),file.name);
 console.log(`VERIFIED authenticated fallback download ${file.name}; Windows WebKit decoder remains unverified`);
}
export async function chatVideos(page,client,orderId){
 for(const file of videos()){
  await choose(page,page.getByRole('button',{name:'Thêm ảnh/video',exact:true}),file);
  await expect(page.getByRole('button',{name:`Bỏ ảnh ${file.name}`})).toBeVisible();
  await page.getByRole('button',{name:'Gửi',exact:true}).tap();
  await page.getByRole('button',{name:`Xem ảnh ${file.name}`}).tap();
  const video=page.locator('.chat-lightbox video');
  if(process.env.MOBILE_BROWSER==='webkit'&&process.platform==='win32'){
   await webkitDownload(page,video,file);
   mediaChecks.push({area:'chat',mime:file.mimeType,playback:'unverified: Windows WebKit native media/Blob backend',authenticatedFallbackDownload:'verified'});
  }else{await playback(video);mediaChecks.push({area:'chat',mime:file.mimeType,playback:'verified'})}
  const direct=page.locator('.chat-lightbox').getByRole('link',{name:'Mở ảnh gốc'});await verifyBytes(client,new URL(await direct.getAttribute('href'),page.url()).href,file.buffer);
  await page.getByRole('button',{name:'Đóng',exact:true}).tap();
 }
 console.log('PASS chat video: MP4/WebM upload, authenticated bytes and range seeking; playback results:',JSON.stringify(mediaChecks));
}
export async function qcVideo(page,client,orderId){
 const file={...videos()[0],name:'qc-portrait.mp4'};
 await choose(page,page.getByLabel('Tệp kiểm định 1',{exact:true}),file);
 await expect(page.getByRole('button',{name:`Bỏ tệp ${file.name}`})).toBeVisible();
 const video=page.locator('.qc-media video');if(process.env.MOBILE_BROWSER==='webkit'&&process.platform==='win32'){await webkitDownload(page,video,file);mediaChecks.push({area:'QC',mime:file.mimeType,playback:'unverified: Windows WebKit native media/Blob backend',authenticatedFallbackDownload:'verified'})}else await playback(video);
 const state=(await client.call('/state')).orders.find(o=>o.id===orderId),media=state.qcMedia.find(m=>m.name===file.name);await verifyBytes(client,new URL(`/api/work/orders/${orderId}/qc-media/${media.id}`,page.url()).href,file.buffer);
 await page.getByRole('button',{name:'Lưu QC',exact:true}).tap();
 await expect(page.getByText('Đã lưu phiếu kiểm định.',{exact:true})).toBeVisible();
 const order=(await client.call('/state')).orders.find(o=>o.id===orderId);
 assert.ok(order.qc.rows[0].mediaIds.some(id=>order.qcMedia.find(m=>m.id===id)?.name===file.name));
 console.log('PASS QC video: MP4 upload, authenticated transport and saved row; playback covered only where decoder available');
}
