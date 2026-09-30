export const toneNames={black:'Đen',brown:'Nâu',blonde:'Sáng'};
export function highestTone(tones){
 if(!tones.length||tones.some(t=>!Object.hasOwn(toneNames,t)))return null;
 return ['black','brown','blonde'][Math.max(...tones.map(t=>['black','brown','blonde'].indexOf(t)))];
}
// Integer cents and basis points avoid binary-float half-cent errors (76.30 + 5% = 80.12).
export function adjustedPrice(price,percent){const cents=Math.round(price*100),factor=10000+Math.round(percent*100);return Math.floor((cents*factor+5000)/10000)/100}
export function matchingPrices(prices,scope={}){return prices.filter(p=>['tier','product','tone'].every(k=>!scope[k]||p[k]===scope[k]))}
