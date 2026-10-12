import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchStandardsPdf} from '../src/standards-download.js';
test('PDF download saves only complete PDF, rejects interrupted, HTML and invalid responses',async()=>{
 const original=globalThis.fetch;
 try{
 const body='%PDF-1.7\nTest\n%%EOF';let progress;
 globalThis.fetch=async()=>new Response(body,{headers:{'content-type':'application/pdf','content-length':String(body.length)}});
 assert.equal(await(await fetchStandardsPdf(p=>progress=p)).text(),body);assert.equal(progress.received,body.length);
 for(const [text,type,length] of [[body,'application/pdf',999],['login','text/html',5],['%PDF-1.7 truncated','application/pdf',0]]){
 globalThis.fetch=async()=>new Response(text,{headers:{'content-type':type,'content-length':String(length)}});
 await assert.rejects(fetchStandardsPdf(()=>{}));
 }
 globalThis.fetch=async()=>{throw new Error('connection lost')};await assert.rejects(fetchStandardsPdf(()=>{}));
 }finally{globalThis.fetch=original}
});
