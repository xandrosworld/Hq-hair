// Draft recovery is scoped to the current tab and authenticated user.
let owner=null;
function clear(storage){try{for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key?.startsWith('hq-draft:'))storage.removeItem(key)}}catch{}}
export function setDraftOwner(id){
 try{if(owner!==null&&owner!==id)clear(sessionStorage)}catch{}
 owner=id;
 // Migrate this user's existing recovery drafts before removing persistent copies.
 try{for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(!key?.startsWith('hq-draft:'))continue;if(key.startsWith(`hq-draft:${id}:`)&&!sessionStorage.getItem(key))sessionStorage.setItem(key,localStorage.getItem(key));localStorage.removeItem(key)}}catch{}
}
export function endDraftSession(){owner=null;try{clear(sessionStorage)}catch{};try{clear(localStorage)}catch{}}
function permitted(key){return owner!==null&&key.startsWith(`hq-draft:${owner}:`)}
export const draftStorage={
 getItem(key){try{return permitted(key)?sessionStorage.getItem(key):null}catch{return null}},
 setItem(key,value){try{if(permitted(key))sessionStorage.setItem(key,value)}catch{}},
 removeItem(key){try{if(permitted(key))sessionStorage.removeItem(key)}catch{}}
};
if(typeof location!=='undefined'&&!location.pathname.startsWith('/workspace'))owner='demo';
