"""Local operator helper. Reads ignored .env; never prints credentials.
Usage: python scripts/vps-ssh.py command.sh [local-file remote-path ...]
Uploads optional pairs before running the shell file on the VPS.
"""
from pathlib import Path
import sys,hashlib,uuid,shlex
import paramiko
from dotenv import dotenv_values

config=dotenv_values(Path(__file__).resolve().parents[1]/'.env')
known=Path(__file__).resolve().parents[1]/'data'/'vps-known-hosts'
known.parent.mkdir(exist_ok=True)
client=paramiko.SSHClient()
if known.exists():client.load_host_keys(str(known))
class FirstKnownHost(paramiko.MissingHostKeyPolicy):
 def missing_host_key(self,client,hostname,key):
  # Fingerprint observed during the user's initial VPS connection.
  if hashlib.md5(key.asbytes()).hexdigest()!='16117a212bbff010e459270dc85924da':
   raise RuntimeError('VPS host key changed; verify before connecting.')
  client.get_host_keys().add(hostname,key.get_name(),key);client.save_host_keys(str(known))
client.set_missing_host_key_policy(FirstKnownHost())
remote_script=None
try:
 client.connect(config['VPS_HOST'],port=int(config['VPS_SSH_PORT']),username=config['VPS_SSH_USER'],password=config.get('VPS_SSH_PASSWORD') or None,key_filename=config.get('VPS_SSH_KEY_PATH') or None,passphrase=config.get('VPS_SSH_KEY_PASSPHRASE') or None,look_for_keys=False,allow_agent=False,timeout=20)
 if len(sys.argv)>2:
  with client.open_sftp() as sftp:
   for local,remote in zip(sys.argv[2::2],sys.argv[3::2]):sftp.put(local,remote);sftp.chmod(remote,0o600)
 script=Path(sys.argv[1]).read_text(encoding='utf-8-sig')
 remote_script='/tmp/hq-operator-'+uuid.uuid4().hex+'.sh'
 with client.open_sftp() as sftp:
  with sftp.open(remote_script,'w') as f:f.write(script)
  sftp.chmod(remote_script,0o700)
 stdin,stdout,stderr=client.exec_command('bash -e '+shlex.quote(remote_script),get_pty=False)
 stdin.channel.shutdown_write()
 # Merge remote stderr into stdout; keep only script output, never local auth values.
 stdout.channel.set_combine_stderr(True)
 for line in stdout:print(line,end='',flush=True)
 raise SystemExit(stdout.channel.recv_exit_status())
finally:
 if remote_script:
  try:
   with client.open_sftp() as sftp:sftp.remove(remote_script)
  except Exception:pass
 client.close()
