# Rollback Runbook - 2026-03-31

This runbook matches the current deployment style:

- frontend rollback by restoring the previous built static package
- backend rollback by restoring the previous backend code package and rebuilding the Docker service

## 1. Rollback triggers

Rollback immediately if one or more of these happen after release:

1. Backend health check fails.
2. Backend container keeps restarting.
3. Teacher or student login is broken.
4. Core teaching flows fail:
   - resource center
   - homework management
   - classroom entry
5. Frontend bundle loads but major pages fail at runtime.

## 2. Mandatory rollback inputs

Keep these before every release:

1. Previous frontend package
2. Previous backend package
3. Current `backend/.env`
4. Current database backup or snapshot according to your normal server policy

## 3. Frontend rollback

1. Remove or archive the newly deployed frontend static files.
2. Upload the last known-good `web/dist/` package.
3. Extract and overwrite the frontend deployment directory.
4. Hard-refresh the browser and confirm the old bundle is being served.

## 4. Backend rollback

1. Upload the last known-good backend package.
2. Extract it into `/www/wwwroot/teaching-platform/`.
3. Keep `backend/.env` unchanged.
4. Rebuild and recreate the backend service:

```bash
cd /www/wwwroot/teaching-platform
mkdir -p uploads/classroom logs
chown -R 10001:10001 uploads logs
chmod -R 775 uploads logs

docker rm -f teaching-backend 2>/dev/null
docker compose -f docker-compose.prod.yml up -d --build backend
```

Legacy command variant:

```bash
cd /www/wwwroot/teaching-platform
docker rm -f teaching-backend 2>/dev/null
docker-compose -f docker-compose.prod.yml up -d --build backend
```

## 5. Database rollback policy

For the current stable-upgrade line, the known taxonomy migration is additive only.

Safer rollback policy:

1. Roll back application code first.
2. Keep the added nullable columns and indexes in place unless there is a proven database-level issue.
3. Do not drop columns in an emergency rollback just to match older code; the older code should tolerate extra columns better than data loss.

Known additive migration:

- `backend/migrations/20260328_add_resource_taxonomy_fields.sql`

Only consider manual schema reversal after data review and off-peak approval.

## 6. Rollback verification

After rollback, verify:

```bash
docker ps | grep teaching-backend
docker logs --tail 100 teaching-backend
curl http://127.0.0.1:8081/health
curl -I https://class.codebn.cn/health
```

Then confirm:

1. Homepage loads.
2. Teacher login works.
3. Student login works.
4. Homework and resource center can load.
5. Classroom list and classroom entry work.

## 7. Rollback record

Record these facts after rollback:

1. Release package that was rolled back
2. Restored package timestamp
3. Trigger reason
4. Verification result
5. Whether database changes were left in place
