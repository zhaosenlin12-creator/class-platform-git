# Server Rollout Guide - 2026-04-07

This guide is the precise rollout sequence for the current server layout already documented in this repo.

Confirmed server facts:

- Project root: `/www/wwwroot/teaching-platform`
- Frontend project directory: `/www/wwwroot/teaching-platform/web`
- Frontend static bundle directory actually served by Nginx: `/www/wwwroot/teaching-platform/web/dist`
- Backend code directory: `/www/wwwroot/teaching-platform/backend`
- Backend container name: `teaching-backend`
- Public domain: `https://class.codebn.cn`

## 1. Upload artifacts

Use the packaged artifacts generated under the local repo `release/<timestamp>/` directory:

1. Frontend package:
   - `class-platform-frontend-dist-<timestamp>.zip`
   - This zip already contains a top-level `dist/` folder.
2. Backend package:
   - `class-platform-backend-docker-<timestamp>.zip`
   - This zip already contains:
     - `backend/`
     - `docker-compose.prod.yml`
     - `BACKEND_DOCKER_RUNBOOK.md`
     - `docs/`
     - `ops/functional-verify.sh`
     - `scripts/server/update-backend-docker.sh`
     - `scripts/server/verify-release.sh`

## 2. Frontend rollout

Upload the frontend zip to:

```bash
/www/wwwroot/teaching-platform/web/
```

Extract it in that directory so the packaged `dist/` folder lands at:

```bash
/www/wwwroot/teaching-platform/web/dist/
```

Recommended backup + rollout commands:

```bash
cd /www/wwwroot/teaching-platform/web
mkdir -p ../backup
tar -czf ../backup/web-dist-before-$(date +%Y%m%d-%H%M%S).tar.gz dist
unzip -o class-platform-frontend-dist-<timestamp>.zip -d .
```

Validation:

```bash
ls -la /www/wwwroot/teaching-platform/web/dist/
head -20 /www/wwwroot/teaching-platform/web/dist/index.html
nginx -t && nginx -s reload
```

Important SPA routing note:

- if your Nginx config contains a catch-all `location /teacher/ { proxy_pass ...; }`, you must place the Vue teacher SPA routes before it with `try_files`.
- the safest production fix is to add exact-match routes for the concrete teacher pages so refresh/open will always fall back to `index.html` instead of the backend `/teacher/*` proxy.
- at minimum, keep these as frontend routes instead of backend proxy routes:
  - `/teacher/dashboard`
  - `/teacher/course-management`
  - `/teacher/course-content`
  - `/teacher/resource-library`
  - `/teacher/student-management`
  - `/teacher/student-analytics`
- `/teacher/homework-review`
  - `/teacher/classroom`
- otherwise these pages may work when clicked inside the SPA but fail with `401` JSON on direct refresh/open.

Recommended exact-match block inside the active `server_name class.codebn.cn` server:

```nginx
location = /teacher/dashboard { try_files $uri $uri/ /index.html; }
location = /teacher/course-management { try_files $uri $uri/ /index.html; }
location = /teacher/course-content { try_files $uri $uri/ /index.html; }
location = /teacher/resource-library { try_files $uri $uri/ /index.html; }
location = /teacher/student-management { try_files $uri $uri/ /index.html; }
location = /teacher/student-analytics { try_files $uri $uri/ /index.html; }
location = /teacher/homework-review { try_files $uri $uri/ /index.html; }
location = /teacher/classroom { try_files $uri $uri/ /index.html; }
```

## 3. Backend rollout

Upload the backend zip to:

```bash
/www/wwwroot/teaching-platform/
```

Extract it in the project root. Keep the existing production environment file:

- keep `/www/wwwroot/teaching-platform/backend/.env`
- do not copy local `backend/node_modules`
- do not delete `/www/wwwroot/teaching-platform/uploads`
- do not delete `/www/wwwroot/teaching-platform/logs`

Recommended backup + rollout commands:

```bash
cd /www/wwwroot/teaching-platform
mkdir -p backup
tar -czf backup/backend-before-$(date +%Y%m%d-%H%M%S).tar.gz backend docker-compose.prod.yml BACKEND_DOCKER_RUNBOOK.md scripts/server ops docs
unzip -o class-platform-backend-docker-<timestamp>.zip
```

Then rebuild and recreate the backend container using the repo-maintained script:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/update-backend-docker.sh --run-resource-taxonomy-migration --prune-unused
```

If you are doing a heavier maintenance window and want swap/cache cleanup too:

```bash
cd /www/wwwroot/teaching-platform
sudo bash ./scripts/server/update-backend-docker.sh --run-resource-taxonomy-migration --prune-unused --refresh-swap --drop-cache
```

Notes:

- `update-backend-docker.sh` already removes the old `teaching-backend` container before recreating it.
- `--prune-unused` will clean exited containers, dangling images, and builder cache, so you do not need a separate manual prune flow for this rollout.
- Compose already uses `restart: unless-stopped`, so the recreated `teaching-backend` container will auto-start after server reboot as long as Docker is enabled.

## 4. Post-deploy verification

Base verification:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/verify-release.sh --base-url https://class.codebn.cn --local-url http://127.0.0.1:8081
```

This verifies:

- `teaching-backend` is running
- local `/health` is healthy
- public `/health` is healthy
- `/uploads/test.txt` is still blocked with `404`
- recent container logs can be read
- teacher SPA refresh routes return frontend HTML instead of backend `401` JSON:

```bash
curl -I https://class.codebn.cn/teacher/course-content
curl -I https://class.codebn.cn/teacher/student-management
curl -I https://class.codebn.cn/teacher/homework-review
```

Optional functional smoke with a real account:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/verify-release.sh --base-url https://class.codebn.cn --local-url http://127.0.0.1:8081 --username admin --password 'your-password'
```

If production temporarily allows captcha skip:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/verify-release.sh --base-url https://class.codebn.cn --local-url http://127.0.0.1:8081 --username admin --password 'your-password' --captcha-skip
```

## 5. Local deeper smoke after server update

These scripts are included in the backend package for follow-up validation:

1. API student create/delete smoke:

```bash
AUDIT_API_BASE_URL=https://class.codebn.cn node scripts/agent/api-student-create-smoke.js admin 'your-password'
```

2. Local Playwright class/student audit:

```bash
python scripts/agent/playwright-class-student-audit.py admin your-password
```

The API smoke creates and deletes a temporary student record. Use it only when you are ready for a real production smoke.

## 6. Rollback

If this rollout fails:

1. restore the previous frontend `dist` backup
2. restore the previous backend backup into `/www/wwwroot/teaching-platform`
3. rebuild backend again:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/update-backend-docker.sh --prune-unused
```

Detailed rollback notes remain in:

- `docs/rollback-runbook-20260331.md`
