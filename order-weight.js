export function totalGrams(items=[]){
 return Math.round(items.reduce((sum,item)=>/^(g|gam|grams?)$/i.test(String(item.unit||'').trim())&&Number.isFinite(Number(item.qty))&&Number(item.qty)>0?sum+Number(item.qty):sum,0)*1000)/1000;
}
