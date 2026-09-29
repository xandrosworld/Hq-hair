import sharp from 'sharp';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
const source=process.argv[2];
if(!source)throw new Error('Pass the generated image directory.');
const files={overview:'exec-574dab77-17d3-47ee-9b39-071369e76d59.png',orders:'exec-1026f9df-9b53-4cac-95ef-1f0662a3d46a.png',customers:'exec-53fd4f03-9640-4455-94c2-ad524fb4c722.png',revenue:'exec-b7ff6bbb-81d7-4442-9e07-d153c472da32.png'};
mkdirSync('public/assets/icons',{recursive:true});
for(const [name,file] of Object.entries(files)){
 const input=path.join(source,file),metadata=await sharp(input).metadata();
 if(!metadata.hasAlpha)throw new Error(`${name} is missing transparency`);
 await sharp(input).resize(256,256,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toFile(`public/assets/icons/${name}.png`);
 await sharp(input).resize(128,128,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:90,alphaQuality:100}).toFile(`public/assets/icons/${name}.webp`);
 console.log(`${name}: transparent PNG and WebP saved`);
}
