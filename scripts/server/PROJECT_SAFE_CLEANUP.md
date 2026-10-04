# 教学平台专用安全清理

这套脚本比 `safe-maintenance.sh` 更保守，只针对你的教学平台目录做清理。

## 清理范围

- `/www/wwwroot/teaching-platform` 下旧发布包
- `/www/wwwroot/teaching-platform/backup` 下旧备份文件和旧备份目录
- `/www/wwwroot/teaching-platform/release-backup` 下旧文件和旧目录
- `/www/wwwroot/teaching-platform/logs` 下旧日志
- Docker builder cache

## 不会删除

- 正在运行的容器
- MySQL 数据
- `uploads`
- `backend/.env`
- `web/dist`
- 当前代码目录

## 文件

- `safe-project-cleanup.sh`
- `install-project-cleanup-cron.sh`

## 手动执行

只看不删：

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/safe-project-cleanup.sh --report-only
```

模拟删除：

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/safe-project-cleanup.sh --dry-run
```

正式执行：

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/safe-project-cleanup.sh
```

## 安装定时任务

```bash
cd /www/wwwroot/teaching-platform
chmod +x ./scripts/server/safe-project-cleanup.sh ./scripts/server/install-project-cleanup-cron.sh
bash ./scripts/server/install-project-cleanup-cron.sh
```

## 日志

- `/var/log/teaching-platform-maintenance/cron.log`
- `/var/log/teaching-platform-maintenance/project-cleanup-*.log`
