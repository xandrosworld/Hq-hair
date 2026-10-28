import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createSign} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import {accountingSheetData} from '../accounting-sheet-data.js';
import {accountingSpreadsheetId,accountingTab,accountingSheetPlan} from '../accounting-sheet-plan.js';

// One-shot worker. Default is read-only preview. Schedule only after review of
// the initial backup/plan and explicit --write activation by the operator.
const write=process.argv.includes('--write');
const year=Number(process.env.ACCOUNTING_SHEET_YEAR);
if(year!==2026)throw Error('This workbook is configured for 2026 only; review a new workbook before rollover.');
const credentialPath=process.env.GOOGLE_APPLICATION_CREDENTIALS;
if(!credentialPath)throw Error('GOOGLE_APPLICATION_CREDENTIALS is required (private service-account JSON file).');
const key=JSON.parse(readFileSync(credentialPath,'utf8'));
if(key.type!=='service_account'||!key.client_email||!key.private_key)throw Error('Invalid service account');
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const now=Math.floor(Date.now()/1000);
const unsigned=b64({alg:'RS256',typ:'JWT'})+'.'+b64({iss:key.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
const jwt=unsigned+'.'+createSign('RSA-SHA256').update(unsigned).sign(key.private_key,'base64url');
const auth=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt}),signal:AbortSignal.timeout(30000)});
if(!auth.ok)throw Error(`Google authorization failed (${auth.status})`);
const {access_token:token}=await auth.json();
const base=`https://sheets.googleapis.com/v4/spreadsheets/${accountingSpreadsheetId}`;
async function api(route,body){
 const response=await fetch(base+route,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`Sheets request failed (${response.status}); no success recorded`);
 return response.json();
}
const range=encodeURIComponent(`'${accountingTab}'!A1:R226`);
const live=await api(`/values/${range}?valueRenderOption=UNFORMATTED_VALUE`);
const db=new DatabaseSync(path.join(process.env.DATA_DIR||'data','workspace.sqlite'),{readOnly:true});
let payload;
try{
 db.exec('BEGIN');
 const state=JSON.parse(db.prepare('SELECT data FROM workspace WHERE id=1').get().data);
 const users=db.prepare('SELECT id,code,name,role FROM users WHERE deleted_at IS NULL').all();
 payload=accountingSheetData(state.orders,users,year);
 db.exec('COMMIT');
}finally{db.close();}
const data=accountingSheetPlan(payload,live.values||[]);
const backupDir=path.join(process.env.DATA_DIR||'data','accounting-sheet-backups');
mkdirSync(backupDir,{recursive:true,mode:0o700});
const original=await api(`/values/${range}?valueRenderOption=FORMULA`);
const filename=path.join(backupDir,`${Date.now()}-${write?'write':'preview'}.json`);
writeFileSync(filename,JSON.stringify({spreadsheetId:accountingSpreadsheetId,original,plan:data}),{mode:0o600});
if(write){
 await api('/values:batchUpdate',{valueInputOption:'RAW',data});
 const query=data.map(d=>'ranges='+encodeURIComponent(d.range)).join('&');
 const verification=await api(`/values:batchGet?valueRenderOption=UNFORMATTED_VALUE&${query}`);
 for(let i=0;i<data.length;i++)for(let col=0;col<13;col++){
  if((verification.valueRanges?.[i]?.values?.[0]?.[col]??'')!==data[i].values[0][col])throw Error('Read-back verification failed; inspect backup before retry.');
 }
}
console.log(JSON.stringify({mode:write?'written-and-verified':'preview',rows:data.length,asOf:payload.asOf,backup:filename}));
