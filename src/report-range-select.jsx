import React,{useState} from 'react';
import {DateInput} from './date-input.jsx';
import {today} from '../shared.js';
import {validReportRange} from '../report-range.js';
export const defaultReportRange=()=>({from:today().slice(0,7)+'-01',to:today()});
export function ReportRangeSelect({value,onChange}){
 const [draft,setDraft]=useState(value);
 const valid=validReportRange(draft,today());
 const update=(key,date)=>{const next={...draft,[key]:date};setDraft(next);if(validReportRange(next,today()))onChange(next)};
 return <div className="period-filter report-range-filter"><label>Từ ngày<DateInput aria-label="Báo cáo từ ngày" type="date" max={today()} value={draft.from} onChange={e=>update('from',e.target.value)}/></label><label>Đến ngày<DateInput aria-label="Báo cáo đến ngày" type="date" max={today()} value={draft.to} onChange={e=>update('to',e.target.value)}/></label>{!valid&&<span role="alert">Chọn đủ hai ngày, từ ngày không sau đến ngày và không vượt hôm nay. Số liệu vẫn theo khoảng hợp lệ trước đó.</span>}</div>;
}
