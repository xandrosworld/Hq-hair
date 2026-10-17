export const inReportPeriod=(date,period)=>typeof period==='object'?date>=period.from&&date<=period.to:date.startsWith(period);
export function validReportRange(range,asOf){
 const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 return !!range&&valid(range.from)&&valid(range.to)&&range.from<=range.to&&range.to<=asOf;
}

export function monthReportRange(fromMonth,toMonth,asOf){
 const valid=m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m);
 if(!valid(fromMonth)||!valid(toMonth)||fromMonth>toMonth||toMonth>asOf.slice(0,7))return null;
 const end=new Date(Date.UTC(Number(toMonth.slice(0,4)),Number(toMonth.slice(5)),0)).toISOString().slice(0,10);
 return {from:fromMonth+'-01',to:end<asOf?end:asOf,monthly:true};
}
// Classify by each receipt's calendar month, never by the report start date.
export function receiptPartition(approved,received,period){
 if(!approved||!received||approved>received)return 'unclassified';
 const approvalMonth=approved.slice(0,7),receiptMonth=received.slice(0,7);
 return approvalMonth===receiptMonth?'current':approvalMonth<receiptMonth?'recovered':'unclassified';
}
