import React,{useId,useState} from 'react';
import {countries,countryLabels} from '../countries.js';
const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim();
const sorted=[...countries].sort((a,b)=>countryLabels[a].localeCompare(countryLabels[b],'vi'));
export function CountrySelect({value='',onChange,label='Quốc gia',required=false}){
 const [query,setQuery]=useState(''),id=useId();
 const matches=sorted.filter(country=>normalize(countryLabels[country]+' '+country).includes(normalize(query)));
 const keepSelected=value&&!matches.includes(value);
 return <div className="country-picker"><input type="search" aria-label={'Tìm kiếm '+label.toLowerCase()} placeholder="Tìm quốc gia…" autoComplete="off" value={query} onChange={e=>setQuery(e.target.value)} aria-controls={id} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();document.getElementById(id)?.focus()}}}/><select id={id} aria-label={label} required={required} value={value} onChange={e=>{onChange(e.target.value);setQuery('')}}><option value="">Chọn {label.toLowerCase()}</option>{keepSelected&&<option value={value}>{countryLabels[value]||value} · Đang chọn</option>}{matches.map(country=><option key={country} value={country}>{countryLabels[country]}</option>)}</select>{query&&<small role="status">{matches.length?`${matches.length} quốc gia phù hợp · chọn trong danh sách bên dưới ô tìm.`:'Không tìm thấy quốc gia. Thử tên tiếng Việt hoặc tiếng Anh.'}</small>}</div>;
}
