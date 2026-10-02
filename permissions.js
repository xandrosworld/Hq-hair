// Customer confirmation 2026-09-30: factory may view full order information.
export function factoryView(user){return user.factory_view||user.factoryView||'full'}
export function canReadRecord(user,record){
 if(!record)return false;
 if(['manager','sales_lead'].includes(user.role))return true;
 if(user.role==='sale')return record.ownerId===user.id;
 // Factory gets submitted orders. Drafts remain the Sale's work in progress.
 if(user.role==='accounting')return Number.isInteger(record.stage)&&(record.stage>=2||!!record.cancelledAt);
 if(user.role==='factory')return Number.isInteger(record.stage)&&(record.stage>=2||!!record.cancelledAt);
 return false;
}
export function factoryOrder(order){
 // Allowlist: never include customer/payment data, snapshots or unknown future fields.
 return {contentLockedAt:order.contentLockedAt,cancelledAt:order.cancelledAt,qc:order.qc,qcMedia:order.qcMedia,id:order.id,stage:order.stage,version:order.version,date:order.date,due:order.due,sale:order.sale,
  items:order.items.map(i=>({name:i.name,origin:i.origin,lengthCm:i.lengthCm,texture:i.texture,segment:i.segment,color:i.color,productNote:i.productNote,spec:i.spec,kind:i.kind,unit:i.unit,qty:i.qty})),
  messages:order.messages.map(m=>({id:m.id,text:m.text,author:m.author,time:m.time,images:m.images})),
  history:order.history.map(h=>({title:h.title,actor:h.actor,time:h.time}))};
}

export const leadReadOnly=user=>user?.role==='sales_lead'&&!user.leadEdit;
