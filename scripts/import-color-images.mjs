// Developer import helper. Raw Airtable responses remain in ignored data/imports.
// Run with --capture to refresh the public source, then run import-price-workbooks.py,
// then run this script again to materialize images. Production never calls Airtable.
import {chromium} from '@playwright/test';
import {unpack} from 'msgpackr';
import sharp from 'sharp';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
const url='https://airtable.com/appwCEKi3pHQ4CFEB/shrOpuqhphiyQyyQ8/tblOuyQezeDc71KAw/viwoZzKUus5StmDHt';
mkdirSync('data/imports',{recursive:true});
if(process.argv.includes('--capture')){
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
 let captured=false;
 try{
  const page=await browser.newPage();
  await page.route('**/v0.3/application/*/read?*',async route=>{
   const response=await route.fetch();const data=unpack(await response.body());
   if(data.data?.tableDatas?.[0]?.rows?.length){writeFileSync('data/imports/colors-public.json',JSON.stringify(data,null,2));captured=true}
   await route.fulfill({response});
  });
  await page.goto(url,{waitUntil:'networkidle'});
  if(!captured)throw Error('No public table data captured; inspect Airtable access.');
 }finally{await browser.close()}
 console.log('Captured public source. Run the workbook importer before materializing images.');
}else{
 const source=JSON.parse(readFileSync('data/imports/colors-public.json','utf8')).data;
 const seed=JSON.parse(readFileSync('resources/pricing-seed.json','utf8'));
 const table=source.tableDatas[0],urls=table.signedUserContentUrls;
 const attachments=new Map();for(const row of table.rows)for(const values of Object.values(row.cellValuesByColumnId))if(Array.isArray(values))for(const a of values)if(a?.type?.startsWith('image/'))attachments.set(a.id,a);
 mkdirSync('resources/color-images',{recursive:true});const jobs=seed.colors.flatMap(c=>c.images);const failures=[];
 for(let i=0;i<jobs.length;i+=6)await Promise.all(jobs.slice(i,i+6).map(async image=>{
  const file='resources/color-images/'+image.id+'.webp';if(existsSync(file))return;
  try{const a=attachments.get(image.id);if(!a)throw Error('Missing source attachment');const link=a.largeThumbUrl||a.url;const response=await fetch(urls[link]||link,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('HTTP '+response.status);const bytes=await sharp(Buffer.from(await response.arrayBuffer())).resize(640,640,{fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();writeFileSync(file,bytes)}catch(e){failures.push({id:image.id,error:e.message})}
 }));
 if(failures.length)throw Error(JSON.stringify(failures));
 console.log(`Verified ${jobs.length} local color images.`);
}
