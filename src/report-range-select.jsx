import React,{useState} from 'react';
import {DateInput} from './date-input.jsx';
import {today} from '../shared.js';
import {monthReportRange} from '../report-range.js';
export const defaultReportRange=()=>monthReportRange(today().slice(0,7),today().slice(0,7),today());
export function ReportRangeSelect({value,onChange}){
 const [draft,setDraft]=useState({from:value.from.slice(0,7),to:value.to.slice(0,7)});
 const valid=monthReportRange(draft.from,draft.to,today());
 const update=(key,month)=>{const next={...draft,[key]:month};setDraft(next);const range=monthReportRange(next.from,next.to,today());if(range)onChange(range)};
 return <div className="period-filter report-range-filter"><label>Từ tháng<DateInput aria-label="Báo cáo từ tháng" type="month" max={today().slice(0,7)} value={draft.from} onChange={e=>update('from',e.target.value)}/></label><label>Đến tháng<DateInput aria-label="Báo cáo đến tháng" type="month" max={today().slice(0,7)} value={draft.to} onChange={e=>update('to',e.target.value)}/></label>{!valid&&<span role="alert">Chọn đủ hai tháng, từ tháng không sau đến tháng và không vượt tháng hiện tại. Số liệu vẫn theo khoảng hợp lệ trước đó.</span>}<small>Tháng cũ tính trọn tháng; tháng hiện tại tính đến hôm nay.</small></div>;
}
