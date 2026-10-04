import test from 'node:test';
import assert from 'node:assert/strict';
import {parseChatImages,MAX_IMAGE_BYTES} from '../chat-images.js';
test('Chat image limits reject wrong types, invalid signatures, oversized data and excess count',()=>{
 assert.deepEqual(parseChatImages(),[]);
 for(const input of [null,{},Array(21).fill({}),[{data:'data:image/svg+xml;base64,PHN2Zz4='}],[{data:'data:image/png;base64,ZmFrZWZha2VmYWtl'}]])assert.throws(()=>parseChatImages(input),e=>e.status===400);
 const bytes=Buffer.alloc(MAX_IMAGE_BYTES+1);bytes.set([137,80,78,71,13,10,26,10]);
 assert.throws(()=>parseChatImages([{data:'data:image/png;base64,'+bytes.toString('base64')}]),e=>e.status===400);
});
test('Chat accepts twenty attachments and video, enforcing aggregate size',()=>{
 const png=Buffer.alloc(12);png.set([137,80,78,71,13,10,26,10]);
 const file={data:'data:image/png;base64,'+png.toString('base64')};
 assert.equal(parseChatImages(Array(20).fill(file)).length,20);
 const mp4=Buffer.alloc(24);mp4.write('ftyp',4);mp4.write('isom',8);
 assert.equal(parseChatImages([{data:'data:video/mp4;base64,'+mp4.toString('base64')}])[0].mime,'video/mp4');
 assert.throws(()=>parseChatImages([{data:'data:video/webm;base64,'+mp4.toString('base64')}]),e=>e.status===400);
 const large=Buffer.alloc(MAX_IMAGE_BYTES);large.set(png);
 assert.throws(()=>parseChatImages(Array(6).fill({data:'data:image/png;base64,'+large.toString('base64')})),/50 MB/);
});
