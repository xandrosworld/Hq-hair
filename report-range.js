export const inReportPeriod=(date,period)=>typeof period==='object'?date>=period.from&&date<=period.to:date.startsWith(period);
export function validReportRange(range,asOf){
 const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 return !!range&&valid(range.from)&&valid(range.to)&&range.from<=range.to&&range.to<=asOf;
}
