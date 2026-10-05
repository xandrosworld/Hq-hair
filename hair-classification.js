// Workbook labels can include the source; order product names must not.
export function hairProductName(value=''){
 const name=value.replace(/\bbaby(?:\s+hair)?\b/gi,'').replace(/\s+/g,' ').trim();
 const aliases={'genius':'Genius Weft','weft hair':'Weft','normal clip-in':'Normal Clip-In','normal tape':'Normal Tape','seamless clip':'Seamless clip in'};
 return aliases[name.toLowerCase()]||name;
}
export function priceHairFields(price){
 return {name:hairProductName(price.product),origin:price.tier==='Baby'?'Baby Hair':'Raw Hair',segment:price.tier==='Basic'?'Super Double Drawn':price.tier==='Premium'?'Premium':''};
}
