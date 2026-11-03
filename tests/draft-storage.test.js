import test from 'node:test';
import assert from 'node:assert/strict';
function storage(){const values=new Map();return {get length(){return values.size},key(i){return [...values.keys()][i]},getItem(k){return values.get(k)??null},setItem(k,v){values.set(k,v)},removeItem(k){values.delete(k)}}}
test('drafts migrate only for owner, survive refresh, clear at logout and reject late writes',async()=>{
 globalThis.localStorage=storage();globalThis.sessionStorage=storage();
 localStorage.setItem('hq-draft:a:c','draft');localStorage.setItem('hq-draft:b:c','private');localStorage.setItem('preference','keep');
 const m=await import('../src/draft-storage.js');m.setDraftOwner('a');
 assert.equal(m.draftStorage.getItem('hq-draft:a:c'),'draft');assert.equal(m.draftStorage.getItem('hq-draft:b:c'),null);assert.equal(localStorage.getItem('hq-draft:a:c'),null);
 m.setDraftOwner('a');assert.equal(m.draftStorage.getItem('hq-draft:a:c'),'draft');
 m.endDraftSession();m.draftStorage.setItem('hq-draft:a:c','late network response');assert.equal(sessionStorage.length,0);assert.equal(localStorage.getItem('preference'),'keep');
 m.setDraftOwner('b');assert.equal(m.draftStorage.getItem('hq-draft:a:c'),null);
});

test('blocked browser storage cannot break authentication or editing',async()=>{
 const m=await import('../src/draft-storage.js');
 for(const name of ['localStorage','sessionStorage'])Object.defineProperty(globalThis,name,{configurable:true,get(){throw Error('blocked')}});
 assert.doesNotThrow(()=>m.setDraftOwner('c'));assert.doesNotThrow(()=>m.draftStorage.setItem('hq-draft:c:c','draft'));assert.equal(m.draftStorage.getItem('hq-draft:c:c'),null);assert.doesNotThrow(()=>m.endDraftSession());
});
