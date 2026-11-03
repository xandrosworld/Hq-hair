#!/usr/bin/env bash
set -euo pipefail
umask 077
ROOT=/opt/hqhaircrm
[[ $(realpath "$ROOT/backups") == "$ROOT/backups" ]]
exec 9>"$ROOT/state/backup.lock"
flock 9
name="snapshot-$(date -u +%Y%m%dT%H%M%S)-$$"
stage="$ROOT/backups/.partial-$name"
target="$ROOT/backups/$name"
trap '[[ ! -d "$stage" ]] || rm -rf -- "$stage"' EXIT
mkdir "$stage"
for db in workspace demo; do
 sqlite3 "$ROOT/data/$db.sqlite" ".backup '$stage/$db.sqlite'"
 [[ $(sqlite3 "$stage/$db.sqlite" 'PRAGMA integrity_check;') == ok ]]
done
cp "$ROOT/state/current" "$stage/revision"
mv "$stage" "$target"
# Fixed, verified root; no symlink traversal, only known backup directory names.
find "$ROOT/backups" -mindepth 1 -maxdepth 1 -type d \( -name 'daily-*' -o -name 'predeploy-*' -o -name 'before-migration-*' -o -name 'snapshot-*' \) ! -name "$name" -exec rm -rf -- {} +
echo "Verified single backup: $target"
