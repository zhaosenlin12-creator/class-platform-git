# Server Maintenance Runbook

This runbook is tailored for the current production layout used in this repo:

- Project root: `/www/wwwroot/teaching-platform`
- BaoTa panel backups: `/www/backup`
- Main business sites under `/www/wwwroot`
- Backend container runtime: Docker

## What the maintenance script does

`safe-maintenance.sh` is designed for production-safe cleanup. By default it:

- reports disk, inode, memory, swap, Docker, journal, and top directory usage
- prunes unused Docker containers/images/builder cache/networks
- vacuums `journalctl` logs to 7 days
- cleans package manager cache
- removes old files from `/tmp` and `/var/tmp`
- removes root build caches such as `~/.npm/_cacache`
- removes old teaching-platform deploy archives from:
  - `/www/wwwroot/teaching-platform/backup`
  - `/www/wwwroot/teaching-platform/packages`
  - `/www/wwwroot/teaching-platform/*.zip|*.tar.gz|*.tgz`

By default it does **not**:

- delete BaoTa panel/site/database backups
- delete MySQL data
- delete Docker volumes
- drop Linux page cache
- refresh swap

## Immediate usage

Preview only:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/safe-maintenance.sh --report-only
```

Safe cleanup:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/safe-maintenance.sh
```

Preview cleanup targets without deleting:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/safe-maintenance.sh --dry-run
```

Also clean old BaoTa backups:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/safe-maintenance.sh --cleanup-panel-backups --panel-backup-days 21 --db-backup-days 30
```

Emergency one-off memory housekeeping:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/safe-maintenance.sh --refresh-swap --drop-cache
```

Use the memory options only when you are actively handling memory pressure or swap thrash.

## Install daily cron

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/install-maintenance-cron.sh
```

This installs:

- daily safe maintenance at `03:17`
- weekly report-only snapshot at `03:35` on Sunday

If you also want weekly BaoTa backup cleanup:

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/install-maintenance-cron.sh --enable-panel-backup-cleanup
```

## Recommended policy for this server

Based on the observed server layout:

- the teaching platform itself is not the largest space consumer
- `/www/wwwroot/pay` is currently much larger than `/www/wwwroot/teaching-platform`
- Docker cache and builder cache are safe, high-value cleanup targets
- BaoTa panel backup zip files can accumulate over time and should be retained for a fixed window
- the swap file `/www/swap` should not be deleted as part of routine cleanup

Recommended retention:

- teaching-platform deploy archives: 14 days
- BaoTa panel/site zip backups: 21 days
- BaoTa DB backups: 30 days

## Logs

Maintenance logs are written to:

```bash
/var/log/server-maintenance/
```

Cron log:

```bash
/var/log/server-maintenance/cron.log
```
