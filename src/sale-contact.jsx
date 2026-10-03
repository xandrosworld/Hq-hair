import React,{useState} from 'react';
import {workspaceAPI} from './workspace-access.jsx';
export function SaleContact({user}){
 const [phone,setPhone]=useState(user.phone||''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 return <section className="panel panel-body"><h3>Điện thoại trên invoice</h3><form onSubmit={async e=>{e.preventDefault();setBusy(true);try{await workspaceAPI('/profile-contact',{phone});setMessage('Đã lưu. Invoice của các đơn bạn phụ trách sẽ dùng số này.')}catch(e){setMessage(e.message)}finally{setBusy(false)}}}><label className="field"><span>Số điện thoại cá nhân</span><input type="tel" maxLength={40} value={phone} onChange={e=>setPhone(e.target.value)}/></label><button className="btn" disabled={busy}>Lưu số điện thoại</button>{message&&<p role="status">{message}</p>}</form></section>;
}
