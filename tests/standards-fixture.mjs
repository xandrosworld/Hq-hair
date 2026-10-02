import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
// Synthetic files exercise protected delivery without committing the customer's PDF.
export async function standardsFixture(dir){
 const target=path.join(dir,'product-standards');mkdirSync(target,{recursive:true});
 const image=await sharp(Buffer.from('<svg width="2160" height="1215"><rect width="2160" height="1215" fill="white"/><text x="80" y="150" font-size="80">Product standards test fixture</text></svg>')).webp().toBuffer();
 for(let n=1;n<=14;n++)writeFileSync(path.join(target,`page-${n}.webp`),image);
 writeFileSync(path.join(target,'original.pdf'),'%PDF-1.4\nTransport test fixture only\n');
 return target;
}
