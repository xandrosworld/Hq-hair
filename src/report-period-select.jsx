import React from 'react';
import {DateInput} from './date-input.jsx';
import {today} from '../shared.js';
export function ReportPeriodSelect({mode,setMode,month,setMonth,year,setYear,years,label='Kỳ thống kê'}){
 return <><label>{label}<select aria-label={label} value={mode} onChange={e=>setMode(e.target.value)}><option value="all">Đến hiện tại</option><option value="month">Theo tháng</option><option value="year">Theo năm</option></select></label>{mode==='month'&&<label>Tháng<DateInput aria-label={label+' tháng'} type="month" value={month} max={today().slice(0,7)} onChange={e=>{if(/^\d{4}-\d{2}$/.test(e.target.value)&&e.target.value<=today().slice(0,7))setMonth(e.target.value)}}/></label>}{mode==='year'&&<label>Năm<select aria-label={label+' năm'} value={year} onChange={e=>setYear(e.target.value)}>{years.filter(y=>y<=today().slice(0,4)).map(y=><option key={y}>{y}</option>)}</select></label>}</>;
}
