import {DatabaseSync,backup} from 'node:sqlite';
import {existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';

// Restore into a NEW directory, never over a running database.
const [source,target]=process.argv.slice(2);
if(!source||!target)throw Error('Usage: node scripts/restore-workspace.mjs <backup.sqlite> <new-data-directory>');
const destination=path.resolve(target);
if(existsSync(destination))throw Error('Destination must not exist. Choose a new directory; no existing data is overwritten.');
const input=new DatabaseSync(path.resolve(source),{readOnly:true});
try{
 if(input.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Backup integrity check failed.');
 const data=JSON.parse(input.prepare('SELECT data FROM workspace WHERE id=1').get().data);
 if(!Array.isArray(data.customers)||!Array.isArray(data.orders)||!input.prepare('SELECT COUNT(*) n FROM users').get().n)throw Error('Not a valid HQ Hair workspace backup.');
 mkdirSync(destination,{recursive:true});await backup(input,path.join(destination,'workspace.sqlite'));
}finally{input.close()}
const restored=new DatabaseSync(path.join(destination,'workspace.sqlite'));
try{restored.exec('DELETE FROM auth_sessions; DELETE FROM requests; DELETE FROM login_limits; PRAGMA wal_checkpoint(TRUNCATE);');if(restored.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Restored database integrity check failed.')}finally{restored.close()}
console.log('Restored and verified:',destination,'All old login sessions revoked. Set DATA_DIR to this directory before starting the server.');
