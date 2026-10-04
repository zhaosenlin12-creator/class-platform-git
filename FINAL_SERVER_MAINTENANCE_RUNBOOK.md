# 服务器安全维护最终执行版

适用服务器现状：

- BaoTa 面板服务器
- 教学平台项目根目录：`/www/wwwroot/teaching-platform`
- 生产环境前端目录：`/www/wwwroot/teaching-platform/web/dist`
- 生产环境后端容器：`teaching-backend`
- BaoTa 备份目录：`/www/backup`
- 站点主目录：`/www/wwwroot`

本目录下配套文件：

- `safe-maintenance.sh`
- `install-maintenance-cron.sh`
- `MAINTENANCE.md`
- `FINAL_SERVER_MAINTENANCE_RUNBOOK.md`

## 1. 维护原则

这套维护流程默认遵循以下原则：

- 不删除数据库真实数据
- 不删除运行中的 Docker 容器
- 不删除 Docker volumes
- 不删除站点上传目录
- 不删除教学平台业务源码
- 不默认删除 BaoTa 数据库备份
- 不默认执行 `drop_caches`
- 不默认执行 `swapoff -a && swapon -a`

默认会清理的内容：

- Docker 无用容器
- Docker 无用镜像
- Docker builder 缓存
- Docker 无用网络
- `journalctl` 历史日志
- 包管理器缓存
- `/tmp`、`/var/tmp` 旧临时文件
- `root` 的 `npm/pip/yarn` 构建缓存
- 教学平台自己的旧部署压缩包和旧发布包

## 2. 先上传脚本

把下面两个脚本上传到服务器项目目录：

- `/www/wwwroot/teaching-platform/scripts/server/safe-maintenance.sh`
- `/www/wwwroot/teaching-platform/scripts/server/install-maintenance-cron.sh`

可选一起上传这两份说明文档：

- `/www/wwwroot/teaching-platform/scripts/server/MAINTENANCE.md`
- `/www/wwwroot/teaching-platform/scripts/server/FINAL_SERVER_MAINTENANCE_RUNBOOK.md`

上传完成后执行：

```bash
cd /www/wwwroot/teaching-platform
chmod +x ./scripts/server/safe-maintenance.sh ./scripts/server/install-maintenance-cron.sh
```

## 3. 日常检查命令

先看总空间和 inode：

```bash
df -h
df -ih
```

看大目录：

```bash
du -xhd1 /www 2>/dev/null | sort -h
du -xhd1 /var 2>/dev/null | sort -h
du -xhd1 /root 2>/dev/null | sort -h
```

看站点目录和备份目录：

```bash
du -xhd1 /www/wwwroot 2>/dev/null | sort -h
du -xhd1 /www/backup 2>/dev/null | sort -h
```

看 Docker 占用：

```bash
docker system df
```

看大文件：

```bash
find /www /var -xdev -type f -size +200M 2>/dev/null | xargs -r ls -lhS | head -30
```

## 4. 教学平台专用安全清理

先只查看报告，不删除任何内容：

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/safe-maintenance.sh --report-only
```

预演删除目标，但不真正删除：

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/safe-maintenance.sh --dry-run
```

执行一轮安全清理：

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/safe-maintenance.sh
```

这个命令默认会：

- 清理 Docker 无用缓存
- 清理系统日志
- 清理临时文件
- 清理 root 缓存
- 清理教学平台旧部署包

## 5. 更精准的手工清理命令

### 5.1 清教学平台旧部署包

先看：

```bash
find /www/wwwroot/teaching-platform/backup -type f \( -name "*.zip" -o -name "*.tar.gz" -o -name "*.tgz" \) -mtime +14 -print
find /www/wwwroot/teaching-platform/packages -type f \( -name "*.zip" -o -name "*.tar.gz" -o -name "*.tgz" \) -mtime +14 -print
find /www/wwwroot/teaching-platform -maxdepth 1 -type f \( -name "*.zip" -o -name "*.tar.gz" -o -name "*.tgz" \) -mtime +14 -print
```

确认后再删：

```bash
find /www/wwwroot/teaching-platform/backup -type f \( -name "*.zip" -o -name "*.tar.gz" -o -name "*.tgz" \) -mtime +14 -delete
find /www/wwwroot/teaching-platform/packages -type f \( -name "*.zip" -o -name "*.tar.gz" -o -name "*.tgz" \) -mtime +14 -delete
find /www/wwwroot/teaching-platform -maxdepth 1 -type f \( -name "*.zip" -o -name "*.tar.gz" -o -name "*.tgz" \) -mtime +14 -delete
```

### 5.2 清 BaoTa 面板 / 站点备份

先看 21 天前的旧备份：

```bash
find /www/backup/panel -type f \( -name "*.zip" -o -name "*.tar.gz" -o -name "*.tgz" \) -mtime +21 -print | xargs -r ls -lh
find /www/backup/site -type f \( -name "*.zip" -o -name "*.tar.gz" -o -name "*.tgz" \) -mtime +21 -print | xargs -r ls -lh
```

确认后再删：

```bash
find /www/backup/panel -type f \( -name "*.zip" -o -name "*.tar.gz" -o -name "*.tgz" \) -mtime +21 -delete
find /www/backup/site -type f \( -name "*.zip" -o -name "*.tar.gz" -o -name "*.tgz" \) -mtime +21 -delete
```

### 5.3 清 BaoTa 数据库备份

先看 30 天前的旧库备份：

```bash
find /www/backup/database -type f \( -name "*.sql" -o -name "*.sql.gz" -o -name "*.gz" -o -name "*.zip" \) -mtime +30 -print | xargs -r ls -lh
```

确认后再删：

```bash
find /www/backup/database -type f \( -name "*.sql" -o -name "*.sql.gz" -o -name "*.gz" -o -name "*.zip" \) -mtime +30 -delete
```

## 6. 一键安装定时任务

安装每日安全维护：

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/install-maintenance-cron.sh
```

安装后默认会创建：

- 每天 `03:17` 自动执行一次安全清理
- 每周日 `03:35` 输出一次纯报告

如果你也想每周自动清理 BaoTa 旧备份：

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/install-maintenance-cron.sh --enable-panel-backup-cleanup
```

查看定时任务文件：

```bash
cat /etc/cron.d/server-safe-maintenance
```

查看维护日志：

```bash
ls -lh /var/log/server-maintenance
tail -100 /var/log/server-maintenance/cron.log
```

## 7. 内存维护命令

只有在内存压力高、swap 抖动明显时才手动执行，不建议做成每天自动任务。

查看内存和 swap：

```bash
free -h
swapon --show
```

手动刷新 swap 并释放文件系统缓存：

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/safe-maintenance.sh --refresh-swap --drop-cache
```

注意：

- 这是手动维护动作
- 不建议加入日常 cron
- 只在系统明显卡顿、缓存压力异常、swap 占用持续偏高时使用

## 8. 这台服务器当前的重点关注目录

从当前实际检查结果看，后续优先关注：

- `/www/wwwroot/pay`
- `/www/server`
- `/var/lib`
- `/www/backup`

教学平台目录本身不是目前最大的空间来源。

如果磁盘继续上涨，优先执行：

```bash
du -xhd1 /www/wwwroot/pay 2>/dev/null | sort -h
find /www/wwwroot/pay -type f -size +200M 2>/dev/null | xargs -r ls -lhS | head -30
```

再判断是否存在日志、缓存、旧发布包堆积，不要盲删。

## 9. 不要执行的危险命令

生产机上不要直接执行下面这些命令：

```bash
docker system prune -a --volumes
rm -rf /var/lib/docker/volumes/*
rm -rf /var/lib/mysql/*
rm -rf /www/server/data/*
rm -rf /www/wwwroot/*/uploads/*
```

这些命令可能会直接破坏业务数据或运行环境。

## 10. 最终推荐使用方式

日常最推荐的实际流程：

1. 每天让 cron 自动跑 `safe-maintenance.sh`
2. 每周手工看一次 `/var/log/server-maintenance/cron.log`
3. 每月手工审一次 `/www/backup` 和大站点目录
4. 只有出现明显内存问题时，再手动执行 `--refresh-swap --drop-cache`

## 11. 最短可执行版

只想立刻完成一次安全维护，就执行下面这组：

```bash
cd /www/wwwroot/teaching-platform
chmod +x ./scripts/server/safe-maintenance.sh ./scripts/server/install-maintenance-cron.sh
bash ./scripts/server/safe-maintenance.sh
bash ./scripts/server/install-maintenance-cron.sh
df -h
docker system df
tail -50 /var/log/server-maintenance/cron.log 2>/dev/null || true
```

这就是最稳的最终执行版。
