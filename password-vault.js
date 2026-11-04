import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
export function passwordVault(dir,hasStoredPasswords=false){
 const file=process.env.HQ_PASSWORD_VAULT_KEY_FILE||path.join(dir,'.password-vault.key');
 if(!existsSync(file)){
  if(hasStoredPasswords)throw new Error('Password vault key missing; restore the original key.');
  writeFileSync(file,randomBytes(32),{flag:'wx',mode:0o600});
 }
 const key=readFileSync(file);if(key.length!==32)throw new Error('Invalid password vault key');
 return {
  seal(value,id){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);c.setAAD(Buffer.from(id));const encrypted=Buffer.concat([c.update(value,'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),encrypted]).toString('base64')},
  open(value,id){const raw=Buffer.from(value,'base64'),d=createDecipheriv('aes-256-gcm',key,raw.subarray(0,12));d.setAAD(Buffer.from(id));d.setAuthTag(raw.subarray(12,28));return Buffer.concat([d.update(raw.subarray(28)),d.final()]).toString('utf8')}
 };
}
