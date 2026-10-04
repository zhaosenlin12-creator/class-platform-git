# Backend Docker Runbook

Last updated: 2026-04-04
Applies to current server layout:

- Project root: `/www/wwwroot/teaching-platform`
- Backend code: `/www/wwwroot/teaching-platform/backend`
- Frontend static files: `/www/wwwroot/teaching-platform/web`
- Backend container name: `teaching-backend`

Related release docs:

- `docs/release-readiness-checklist-20260331.md`
- `docs/rollback-runbook-20260331.md`

Fast runtime diagnosis:

- `bash ./scripts/server/check-backend-db.sh`
- `bash ./scripts/server/recover-backend-503.sh`

## 1. Current deployment facts

- Backend runs inside Docker, not the host Node environment.
- The host `node -v` does not control backend runtime behavior; the runtime is defined by [backend/Dockerfile](/D:/kaifa/_tmp/class-platform/backend/Dockerfile).
- The backend image is built from `./backend`, so code changes require rebuild and recreate.
- The compose service uses `restart: unless-stopped`, so the container will auto-start after server reboot as long as Docker itself is enabled.
- Backend startup now validates key production environment variables before serving traffic.
- Required in production: `DB_NAME`, `DB_USER`, `JWT_SECRET`
- Strongly recommended in production: `CORS_ORIGIN`, `AUTH_COOKIE_DOMAIN`
- Docker is already confirmed enabled on the current server:

```bash
systemctl is-enabled docker
systemctl status docker
```

## 2. What to upload for backend updates

Preferred method:

1. Upload the full backend deployment package.
2. Extract it into `/www/wwwroot/teaching-platform/`.
3. Do not overwrite `backend/.env`.

Current packaged backend release layout:

- `backend/`
- `docker-compose.prod.yml`
- `BACKEND_DOCKER_RUNBOOK.md`

If uploading manually, sync the whole `backend/` directory except:

- `backend/.env`
- `backend/node_modules`
- `backend/uploads`
- `backend/package-lock.json` should come from the release package and stay in sync with the release build

Do not delete these runtime data directories:

- `/www/wwwroot/teaching-platform/uploads`
- `/www/wwwroot/teaching-platform/logs`
- database data

## 3. Standard backend update commands

Run from the project root:

```bash
cd /www/wwwroot/teaching-platform

mkdir -p uploads/classroom logs
chown -R 10001:10001 uploads logs
chmod -R 775 uploads logs

docker ps -a | grep teaching-backend
docker rm -f teaching-backend 2>/dev/null
docker compose -f docker-compose.prod.yml up -d --build backend
```

Recommended one-command method:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/update-backend-docker.sh
```

If login suddenly starts returning `503` after an update, do not change Nginx first.
Recover local backend health first:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/recover-backend-503.sh
```

The most common failure mode on this server is:

- backend container is still running
- host MySQL is no longer listening on `127.0.0.1:3306`
- `/health` returns `503 {"status":"degraded"...}`

This rollout script now checks MySQL listener state before rebuilding the backend,
so it can fail fast instead of finishing the deploy and leaving the site broken.

For this rollout, because the real backend has been verified to ignore
`courseSystem/courseStage` writes while still accepting `courseId/courseName`,
run the resource taxonomy migration during backend update:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/update-backend-docker.sh --run-resource-taxonomy-migration
```

If you also want to prune old exited containers/build cache during this release:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/update-backend-docker.sh --prune-unused
```

If you are doing a heavy maintenance window and want to refresh swap/cache as well, run as root:

```bash
cd /www/wwwroot/teaching-platform
sudo bash ./scripts/server/update-backend-docker.sh --prune-unused --refresh-swap --drop-cache
```

If the server uses the legacy binary:

```bash
cd /www/wwwroot/teaching-platform

mkdir -p uploads/classroom logs
chown -R 10001:10001 uploads logs
chmod -R 775 uploads logs

docker ps -a | grep teaching-backend
docker rm -f teaching-backend 2>/dev/null
docker-compose -f docker-compose.prod.yml up -d --build backend
```

## 4. Post-update verification

```bash
docker ps | grep teaching-backend
docker logs --tail 100 teaching-backend
curl http://127.0.0.1:8081/health
curl -I https://class.codebn.cn/health
```

Healthy signs:

- `docker ps` shows `teaching-backend`
- `docker logs` no longer loops with restart errors
- `/health` returns JSON containing `"status":"ok"`
- startup logs do not report missing required environment variables

## 5. Common maintenance commands

View logs:

```bash
docker logs --tail 100 teaching-backend
docker logs -f teaching-backend
```

Restart container without code changes:

```bash
docker restart teaching-backend
```

Runtime diagnosis when the API starts returning `503 数据库连接失败`:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/check-backend-db.sh
```

What this checks:

- whether `teaching-backend` is still running
- whether `http://127.0.0.1:8081/health` is healthy
- effective `DB_HOST/DB_PORT/DB_NAME/DB_USER` inside the container
- direct MySQL ping from inside the container
- latest backend container logs

Important:

- `docker restart` is only for simple restart scenarios.
- After backend code changes, dependency changes, lockfile changes, or `.env` changes, use rebuild and recreate, not restart only.
- `docker restart` alone will not apply a rebuilt image or refreshed environment settings.

Rebuild after code/config update:

```bash
cd /www/wwwroot/teaching-platform
docker rm -f teaching-backend 2>/dev/null
docker compose -f docker-compose.prod.yml up -d --build backend
```

Reusable script entry:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/update-backend-docker.sh --prune-unused
```

Run the resource taxonomy migration manually inside the container when needed:

```bash
cd /www/wwwroot/teaching-platform
docker exec teaching-backend node scripts/ensure-resource-taxonomy-fields.js
```

Expected healthy output:

- `teaching_resource.course_system: present`
- `teaching_resource.course_stage: present`
- `resource taxonomy fields ready`

## 6. Troubleshooting from this rollout

### Case A: container name conflict

Error pattern:

```text
Conflict. The container name "/teaching-backend" is already in use
```

Fix:

```bash
docker ps -a | grep teaching-backend
docker rm -f teaching-backend
docker compose -f docker-compose.prod.yml up -d --build backend
```

### Case B: missing module after partial upload

Error pattern:

```text
Cannot find module '../controllers/classroomSecureController'
```

Cause:

- Only part of `backend/src` was uploaded, leaving the server codebase inconsistent.

Fix:

- Upload and overwrite the full `backend/` code package, then rebuild.

### Case C: upload directory permission denied

Error pattern:

```text
EACCES: permission denied, mkdir '/app/uploads/classroom'
```

Fix:

```bash
cd /www/wwwroot/teaching-platform
mkdir -p uploads/classroom logs
chown -R 10001:10001 uploads logs
chmod -R 775 uploads logs

docker rm -f teaching-backend 2>/dev/null
docker compose -f docker-compose.prod.yml up -d --build backend
```

If still blocked, verify current ownership:

```bash
ls -ld /www/wwwroot/teaching-platform/uploads
ls -ld /www/wwwroot/teaching-platform/uploads/classroom
ls -ld /www/wwwroot/teaching-platform/logs
```

### Case D: compose warns that variables are not set

Error pattern:

```text
WARN[0000] The "XXX" variable is not set. Defaulting to a blank string.
```

Cause:

- Values in `backend/.env` contain `$`, and compose tries to expand them.

Recommended follow-up:

- Review `backend/.env` for passwords or secrets containing `$`

### Case E: API returns `503` with "数据库连接失败"

Typical symptom:

```text
POST /teaching/classroom/create -> 503 Service Unavailable
```

First check:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/check-backend-db.sh
```

Safe recovery order:

1. If the container is stopped, rebuild the backend container:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/update-backend-docker.sh
```

2. If the container is running but the internal DB ping fails, do not delete any database data. First inspect:

```bash
docker logs --tail 150 teaching-backend
curl http://127.0.0.1:8081/health
```

3. Only after the DB ping inside the container becomes healthy again, retry the business action.
- Escape literal dollar signs as `$$` when needed

This warning did not block the successful startup in the current rollout, but it should be cleaned up later.

## 7. Auto-start behavior

The current compose file uses:

```yaml
restart: unless-stopped
```

That means:

- server reboot -> Docker starts -> container auto-starts
- manual `docker stop teaching-backend` may keep it stopped until recreated or started again

## 8. Recommended update habit going forward

For each backend release:

1. Upload the full backend deployment package.
2. Keep `backend/.env` unchanged unless config really changed.
3. If `.env` changed, verify `DB_NAME`, `DB_USER`, `JWT_SECRET`, `CORS_ORIGIN`, and `AUTH_COOKIE_DOMAIN`.
4. Re-apply `uploads/logs` ownership to `10001:10001`.
5. Prefer `bash ./scripts/server/update-backend-docker.sh --prune-unused` instead of hand-typing the full rebuild chain.
6. Run the health checks.

## 9. Pre-release validation

Run these checks locally before uploading a new release package:

```bash
cd /path/to/class-platform/backend
npm run verify:ci

cd /path/to/class-platform/web
npm run verify:ci
```

Notes:

- `backend` validation is expected to pass fully, including production audit.
- `web` validation currently guarantees production build health and a smoke check over critical files and built output.
- Frontend production audit is still advisory at this stage because legacy Vue 2 era dependencies remain and are tracked separately in the upgrade execution log.
