import assert from 'node:assert/strict';

export async function inspectMobile(page,name,shots,checks){
 const original=page.viewportSize();
 const sizes=process.env.MOBILE_DEEP==='1'?[[320,740],[360,800],[390,844],[390,360],[430,932],[768,1024],[844,390],[932,430],[1024,768],[1119,800],[1120,900],[1440,1000]]:[[original.width,original.height]];
 try{
  for(const [width,height] of sizes){
   await page.setViewportSize({width,height});
   await page.evaluate(()=>document.fonts.ready);
   const result=await page.evaluate(()=>{
    const viewport=document.documentElement.clientWidth;
    const escapes=e=>{
     const rect=e.getBoundingClientRect();if(!rect.width||!rect.height||getComputedStyle(e).visibility==='hidden')return false;
     if(rect.right<=viewport+2&&rect.left>=-2)return false;
     for(let parent=e.parentElement;parent;parent=parent.parentElement){
      const style=getComputedStyle(parent);
      if(['auto','scroll','hidden','clip'].includes(style.overflowX))return false;
     }
     return true;
    };
    return {width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('main *,[role=dialog] *')].filter(escapes).slice(0,15).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,80)}))};
   });
   checks.push({name,height,...result});
   if(result.scroll>width+2||result.offenders.length)await page.screenshot({path:`${shots}/overflow-${name}-${width}.png`,fullPage:true,animations:'disabled'});
   assert.ok(result.scroll<=width+2,JSON.stringify({name,...result}));
   assert.deepEqual(result.offenders,[],`${name} at ${width}: content outside scroll containers`);
   if(width<=430){
    // Upload and editing controls must be usable without sideways table scrolling.
    for(const control of await page.locator('.hair-editor input,.hair-editor select,.hair-editor textarea,.qc-review-fields textarea,.qc-upload').all()){
     const box=await control.boundingBox();if(box)assert.ok(box.x>=-2&&box.x+box.width<=width+2,`${name}: offscreen edit/upload control`);
    }
   }
  }
 }finally{await page.setViewportSize(original)}
 await page.screenshot({path:`${shots}/${name}.png`,fullPage:true,animations:'disabled'});
}
