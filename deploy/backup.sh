#!/usr/bin/env bash
set -euo pipefail
umask 077
ROOT=/opt/hqhaircrm
exec 9>"$ROOT/state/backup.lock"
flock -n 9 || exit 0
target="$ROOT/backups/daily-$(date -u +%Y%m%d)"
mkdir -p "$target"
for db in workspace demo; do
 sqlite3 "$ROOT/data/$db.sqlite" ".backup '$target/$db.sqlite'"
 [[ $(sqlite3 "$target/$db.sqlite" 'PRAGMA integrity_check;') == ok ]]
done
cp "$ROOT/state/current" "$target/revision"
# Only named backup directories inside the verified application backup root.
find "$ROOT/backups" -mindepth 1 -maxdepth 1 -type d \( -name 'daily-*' -o -name 'predeploy-*' \) -mtime +14 -exec rm -rf -- {} +
echo "Verified daily backup: $target"
