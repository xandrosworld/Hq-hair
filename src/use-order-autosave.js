import {useEffect,useRef,useState} from 'react';
export function useOrderAutosave({order,value,setValue,api,userId,enabled,onUpdate}){
 const current=useRef(value),identity=useRef({id:order.id,version:order.version}),saved=useRef(order._restoredLocal?'':JSON.stringify(order)),task=useRef(null),alive=useRef(true),blocked=useRef(false);
 const [status,setStatus]=useState(''),[working,setWorking]=useState(false);
 current.current=value;
 const key=o=>`hq-draft:${userId||'demo'}:${o.customerId}`;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 async function flush(){
  if(!enabled||!current.current.customerId)return current.current;
  if(task.current){await task.current;return flush()}
  if(blocked.current)throw Error('Bản nháp đã thay đổi ở nơi khác. Tải lại trang để tiếp tục.');
  const snapshot={...current.current,...Object.fromEntries(Object.entries(identity.current).filter(([,v])=>v!==undefined))};
  if(saved.current===JSON.stringify(current.current))return snapshot;
  if(alive.current){setWorking(true);setStatus('Đang tự lưu…')}
  const promise=(async()=>{
   try{
    const response=await api('/orders',{...snapshot,submit:false,autosave:true}),next=response.state.orders.find(o=>o.id===response.id);
    identity.current={id:next.id,version:next.version};
    const merged={...current.current,...identity.current,draftCode:next.draftCode};current.current=merged;
    if(alive.current){setValue(merged);onUpdate(response.state);setStatus('Đã tự lưu')}
    if(JSON.stringify({...snapshot,id:undefined,version:undefined,draftCode:undefined})===JSON.stringify({...merged,id:undefined,version:undefined,draftCode:undefined})){saved.current=JSON.stringify(merged);try{localStorage.removeItem(key(snapshot))}catch{}}
    else try{localStorage.setItem(key(merged),JSON.stringify(merged))}catch{}
    return merged;
   }catch(e){if(e.status===409||e.status===403||e.status===404)blocked.current=true;if(alive.current)setStatus('Chưa lưu lên hệ thống: '+e.message);throw e}
   finally{task.current=null;if(alive.current)setWorking(false)}
  })();task.current=promise;return promise;
 }
 useEffect(()=>{
  if(!enabled||!value.customerId||saved.current===JSON.stringify(value))return;
  try{localStorage.setItem(key(value),JSON.stringify(value))}catch{}
  const timer=setTimeout(()=>flush().catch(()=>{}),700);return()=>clearTimeout(timer);
 },[value,enabled]);
 return {flush,status,working,clear:()=>{try{if(current.current.customerId)localStorage.removeItem(key(current.current))}catch{}},pending:enabled&&saved.current!==JSON.stringify(value)};
}
