# Server Rollout Guide - 2026-04-13

This rollout is for the current stable server layout already used in production.

Confirmed production layout:

- Project root: `/www/wwwroot/teaching-platform`
- Frontend upload target: `/www/wwwroot/teaching-platform/web`
- Frontend live dist path: `/www/wwwroot/teaching-platform/web/dist`
- Backend upload target: `/www/wwwroot/teaching-platform`
- Backend code path: `/www/wwwroot/teaching-platform/backend`
- Backend container: `teaching-backend`
- Public domain: `https://class.codebn.cn`
- Local backend health URL: `http://127.0.0.1:8081/health`

This release contains two important fixes:

1. Student work upload:
   - longer frontend upload timeout
   - visible upload progress
   - upload request retry disabled for large files
2. Classroom review persistence:
   - latest teacher demo content is forced into persistent storage on key exit/end flows
   - classroom end API can persist the final demo snapshot

## 1. Release artifacts

Use the generated release directory under local repo:

- `release/<timestamp>/class-platform-frontend-dist-<timestamp>.zip`
- `release/<timestamp>/class-platform-backend-docker-<timestamp>.zip`
- `release/<timestamp>/RELEASE-MANIFEST.txt`

Frontend zip contains top-level `dist/`.

Backend zip contains:

- `backend/`
- `docker-compose.prod.yml`
- `BACKEND_DOCKER_RUNBOOK.md`
- `docs/`
- `scripts/server/`
- `ops/functional-verify.sh`

## 2. Frontend update

Upload the frontend zip to:

```bash
/www/wwwroot/teaching-platform/web/
```

Then execute:

```bash
cd /www/wwwroot/teaching-platform/web
mkdir -p ../backup
tar -czf ../backup/web-dist-before-$(date +%Y%m%d-%H%M%S).tar.gz dist
unzip -o class-platform-frontend-dist-<timestamp>.zip -d .
```

Validation:

```bash
ls -la /www/wwwroot/teaching-platform/web/dist
head -20 /www/wwwroot/teaching-platform/web/dist/index.html
nginx -t && nginx -s reload
```

## 3. Backend update

Upload the backend zip to:

```bash
/www/wwwroot/teaching-platform/
```

Then execute:

```bash
cd /www/wwwroot/teaching-platform
mkdir -p backup
tar -czf backup/backend-before-$(date +%Y%m%d-%H%M%S).tar.gz backend docker-compose.prod.yml BACKEND_DOCKER_RUNBOOK.md scripts/server ops docs
unzip -o class-platform-backend-docker-<timestamp>.zip
```

Important:

- keep `backend/.env`
- do not upload `backend/node_modules`
- do not delete `/www/wwwroot/teaching-platform/uploads`
- do not delete `/www/wwwroot/teaching-platform/logs`
- do not touch database files

Then rebuild and recreate backend:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/update-backend-docker.sh --run-resource-taxonomy-migration --prune-unused
```

## 4. Verification after backend update

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/verify-release.sh --base-url https://class.codebn.cn --local-url http://127.0.0.1:8081
```

Expected healthy signs:

- `docker ps` shows `teaching-backend`
- `curl http://127.0.0.1:8081/health` returns JSON with `"status":"ok"`
- `curl -I https://class.codebn.cn/health` returns `200`
- backend logs no longer show restart loops

## 5. Nginx upload timeout check

The frontend now allows larger uploads for a longer time.
To avoid false timeout on large work packages, production Nginx should allow at least 300 seconds for proxied API upload flows.

Do not replace the whole site config if the site is already stable.
Only verify or add the following timeout lines inside the active `server_name class.codebn.cn` HTTPS server block:

```nginx
client_max_body_size 100M;
proxy_connect_timeout 60s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
send_timeout 300s;
```

Safe check command:

```bash
nginx -T | grep -nE 'client_max_body_size|proxy_send_timeout|proxy_read_timeout|send_timeout'
```

If the values are already present and not smaller than above, do not change Nginx for this rollout.

If you add them, only reload after syntax check:

```bash
nginx -t && nginx -s reload
```

## 6. Recommended real smoke path

After update, use real accounts and verify:

1. Admin or teacher uploads a larger work package and sees progress.
2. Teacher opens a classroom, edits demo content, switches language, ends classroom.
3. Re-enter classroom review and confirm the latest demo content is still present.
4. Student opens work resource library and downloads uploaded package successfully.

## 7. Rollback

If this release fails:

1. Restore previous frontend dist backup.
2. Restore previous backend backup into `/www/wwwroot/teaching-platform`.
3. Rebuild backend again:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/update-backend-docker.sh --prune-unused
```
