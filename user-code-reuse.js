export function releaseDeletedUserCode(db,code){
 const old=db.prepare('SELECT id,code,deleted_at FROM users WHERE code=?').get(code);
 if(!old)return null;
 const fail=message=>{throw Object.assign(Error(message),{status:409})};
 if(!old.deleted_at)fail('Mã tài khoản đã được sử dụng. Chọn mã khác.');
 const data=JSON.parse(db.prepare('SELECT data FROM workspace WHERE id=1').get().data);
 const prefixed=value=>typeof value==='string'&&(value===code||value.startsWith(code+'-'));
 if((data.customers||[]).some(c=>c.ownerId===old.id||prefixed(c.id))||(data.orders||[]).some(o=>o.ownerId===old.id||prefixed(o.customerId)||prefixed(o.orderCode)))fail('Mã của tài khoản đã xóa vẫn liên quan đến khách hàng hoặc đơn hàng. Chọn mã khác để giữ đúng lịch sử.');
 const archivedCode='DELETED-'+old.id;
 db.prepare('UPDATE users SET original_code=COALESCE(original_code,code),code=? WHERE id=?').run(archivedCode,old.id);
 return {id:old.id,code,archivedCode};
}
