#!/usr/bin/env bash
set -Eeuo pipefail
umask 027
ROOT=/opt/hqhaircrm
exec 9>"$ROOT/state/deploy.lock"
flock -n 9 || exit 0
cd "$ROOT/repo"
git fetch --quiet origin main
revision=$(git rev-parse origin/main)
if [[ -f "$ROOT/state/current" ]] && [[ $(cat "$ROOT/state/current") == "$revision" ]]; then exit 0; fi
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || exit 1
release="$ROOT/releases/$revision"
mkdir -p "$release"
git archive "$revision" | tar -x -C "$release"
image="hqhaircrm:$revision"
echo "Building revision $revision"
docker build --label io.hqhaircrm.revision="$revision" -t "$image" "$release"
# SQLite online backups before any container replacement.
stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$ROOT/backups/predeploy-$stamp"
for db in workspace demo; do
 if [[ -f "$ROOT/data/$db.sqlite" ]]; then
  sqlite3 "$ROOT/data/$db.sqlite" ".backup '$ROOT/backups/predeploy-$stamp/$db.sqlite'"
  [[ $(sqlite3 "$ROOT/backups/predeploy-$stamp/$db.sqlite" 'PRAGMA integrity_check;') == ok ]]
 fi
done
[[ ! -f "$ROOT/config/runtime.env" ]] || cp "$ROOT/config/runtime.env" "$ROOT/state/previous.env"
printf 'APP_IMAGE=%s\nAPP_REVISION=%s\n' "$image" "$revision" > "$ROOT/config/runtime.env"
# Stable compose is installed by the operator, not replaced during an automatic deployment.
compose=(docker compose --env-file "$ROOT/config/runtime.env" -f "$ROOT/config/compose.yml")
rollback(){
 echo 'Deployment failed; restoring previous application image.' >&2
 if [[ -f "$ROOT/state/previous.env" ]]; then
  cp "$ROOT/state/previous.env" "$ROOT/config/runtime.env"
  "${compose[@]}" up -d --no-deps app
 fi
 # Never roll back the database automatically: preserve writes and migration evidence.
}
if ! "${compose[@]}" up -d --no-deps app; then rollback; exit 1; fi
healthy=false
for _ in $(seq 1 40); do
 if curl --fail --silent --max-time 3 http://127.0.0.1:3000/api/health | grep -q "\"revision\":\"$revision\""; then healthy=true; break; fi
 sleep 2
done
if [[ "$healthy" != true ]]; then rollback; exit 1; fi
if [[ -f "$ROOT/state/current" ]]; then cp "$ROOT/state/current" "$ROOT/state/previous"; fi
printf '%s\n' "$revision" > "$ROOT/state/current"
printf '%s %s\n' "$(date -u +%FT%TZ)" "$revision" >> "$ROOT/state/deployments.log"
echo "Healthy deployment: $revision"
# Keep current + previous application images. Never remove application data or volumes.
previous=$(cat "$ROOT/state/previous" 2>/dev/null || true)
while read -r tag; do
 [[ "$tag" == "$revision" || "$tag" == "$previous" || "$tag" == '<none>' ]] && continue
 docker image rm "hqhaircrm:$tag" >/dev/null 2>&1 || true
done < <(docker images hqhaircrm --format '{{.Tag}}')
docker builder prune --force --filter 'until=168h' >/dev/null
