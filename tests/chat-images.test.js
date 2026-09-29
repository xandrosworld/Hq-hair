import test from 'node:test';
import assert from 'node:assert/strict';
import {parseChatImages,MAX_IMAGE_BYTES} from '../chat-images.js';
test('Chat image limits reject wrong types, invalid signatures, oversized data and excess count',()=>{
 assert.deepEqual(parseChatImages(),[]);
 for(const input of [null,{},Array(5).fill({}),[{data:'data:image/svg+xml;base64,PHN2Zz4='}],[{data:'data:image/png;base64,ZmFrZWZha2VmYWtl'}]])assert.throws(()=>parseChatImages(input),e=>e.status===400);
 const bytes=Buffer.alloc(MAX_IMAGE_BYTES+1);bytes.set([137,80,78,71,13,10,26,10]);
 assert.throws(()=>parseChatImages([{data:'data:image/png;base64,'+bytes.toString('base64')}]),e=>e.status===400);
});
