"""Pull verified online SQLite snapshots to this operator PC; secrets stay in .env.
Requires Python, paramiko, python-dotenv and the host key pinned by vps-ssh.py.
Scheduled backups require this PC to be on, logged in and connected.
"""
from pathlib import Path
from datetime import datetime, timezone, timedelta
import hashlib
import json
import shutil
import sqlite3
import sys
import uuid
import paramiko
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'data' / 'offsite-backups'

def run():
    DEST.mkdir(parents=True, exist_ok=True)
    config = dotenv_values(ROOT / '.env')
    client = paramiko.SSHClient()
    client.load_host_keys(str(ROOT / 'data' / 'vps-known-hosts'))
    client.set_missing_host_key_policy(paramiko.RejectPolicy())
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    token = uuid.uuid4().hex
    remote = '/opt/hqhaircrm/backups/operator-' + token
    stage = DEST / ('.partial-' + token)
    stage.mkdir()
    names = ['workspace.sqlite', 'demo.sqlite', 'revision', 'SHA256SUMS']
    try:
        client.connect(config['VPS_HOST'], port=int(config['VPS_SSH_PORT']), username=config['VPS_SSH_USER'],
                       password=config.get('VPS_SSH_PASSWORD') or None,
                       key_filename=config.get('VPS_SSH_KEY_PATH') or None,
                       passphrase=config.get('VPS_SSH_KEY_PASSPHRASE') or None,
                       look_for_keys=False, allow_agent=False, timeout=30)
        # Only a generated hexadecimal token is interpolated into shell code.
        command = f'''set -eu
umask 077
mkdir '{remote}'
for db in workspace demo; do
 sqlite3 "/opt/hqhaircrm/data/$db.sqlite" ".backup '{remote}/$db.sqlite'"
 test "$(sqlite3 '{remote}/'"$db.sqlite" 'PRAGMA integrity_check;')" = ok
done
cp /opt/hqhaircrm/state/current '{remote}/revision'
cd '{remote}'
sha256sum workspace.sqlite demo.sqlite revision > SHA256SUMS
'''
        stdin, stdout, stderr = client.exec_command(command, timeout=300)
        stdin.channel.shutdown_write()
        stdout.read()
        error = stderr.read().decode('utf-8', errors='replace')
        if stdout.channel.recv_exit_status() != 0:
            raise RuntimeError('Remote snapshot failed: ' + error[:300])
        with client.open_sftp() as sftp:
            for name in names:
                sftp.get(remote + '/' + name, str(stage / name))
        for line in (stage / 'SHA256SUMS').read_text().splitlines():
            expected, name = line.split()
            if name not in names[:3]:
                raise RuntimeError('Unexpected manifest path')
            with (stage / name).open('rb') as stream:
                if hashlib.file_digest(stream, 'sha256').hexdigest() != expected:
                    raise RuntimeError('Snapshot checksum mismatch')
        counts = {}
        for name in names[:2]:
            db = sqlite3.connect((stage / name).as_uri() + '?mode=ro', uri=True)
            try:
                if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                    raise RuntimeError('Snapshot integrity failed')
                if name == 'workspace.sqlite':
                    state = json.loads(db.execute('SELECT data FROM workspace WHERE id=1').fetchone()[0])
                    counts = {'customers': len(state['customers']), 'orders': len(state['orders'])}
            finally:
                db.close()
        target = DEST / ('snapshot-' + stamp + '-' + token[:8])
        stage.rename(target)
        result = {'ok': True, 'time': datetime.now(timezone.utc).isoformat(), 'folder': target.name, **counts}
        temporary = DEST / 'status.tmp'
        temporary.write_text(json.dumps(result, indent=2), encoding='utf-8')
        temporary.replace(DEST / 'status.json')
        snapshots = sorted(DEST.glob('snapshot-*'), reverse=True)
        kept_days = set()
        cutoff = (datetime.now(timezone.utc) - timedelta(days=14)).strftime('%Y%m%d')
        for folder in snapshots:
            if folder.is_symlink() or not folder.is_dir() or folder.resolve().parent != DEST.resolve():
                continue
            day = folder.name[9:17]
            if day in kept_days or day < cutoff:
                shutil.rmtree(folder)
            else:
                kept_days.add(day)
        return result
    finally:
        try:
            with client.open_sftp() as sftp:
                for name in names:
                    try:
                        sftp.remove(remote + '/' + name)
                    except FileNotFoundError:
                        pass
                sftp.rmdir(remote)
        except (OSError, paramiko.SSHException):
            pass
        client.close()
        if stage.exists() and stage.resolve().parent == DEST.resolve():
            shutil.rmtree(stage)

if __name__ == '__main__':
    try:
        result = run()
        if sys.stdout:
            print(json.dumps(result))
    except Exception as error:
        DEST.mkdir(parents=True, exist_ok=True)
        (DEST / 'last-error.json').write_text(json.dumps({'time': datetime.now(timezone.utc).isoformat(), 'error': str(error)[:500]}), encoding='utf-8')
        raise
