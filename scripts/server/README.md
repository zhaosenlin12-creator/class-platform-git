# 服务器运维脚本

本目录包含服务器安全监控和运维相关的脚本。

## 脚本列表

| 脚本 | 用途 | 运行方式 |
|------|------|----------|
| `security-monitor.sh` | 安全监控守护脚本 | 持续运行/定时任务 |
| `install-security-monitor.sh` | 安装监控脚本 | 一次性执行 |
| `emergency-response.sh` | 应急响应脚本 | 发现入侵时执行 |

## 快速部署

### 1. 上传脚本到服务器

```bash
# 方法1: 使用 scp
scp -r scripts/server/ root@120.26.114.244:/tmp/

# 方法2: 使用宝塔文件管理上传
```

### 2. 安装安全监控

```bash
cd /www/server
chmod +x *.sh
bash install-security-monitor.sh
```

### 3. 验证安装

```bash
# 查看服务状态
systemctl status security-monitor

# 手动运行一次检查
security-monitor -s

# 查看日志
tail -f /var/log/security-monitor/monitor.log
```


#清理应用缓存
sync && echo 3 > /proc/sys/vm/drop_caches


内存泄漏重启
# 比如重启 PM2 管理的应用
pm2 restart all

# 或者重启 Docker 容器
docker restart <container_name>

## security-monitor.sh 功能说明

### 检测项目

1. **挖矿进程检测**
   - 通过进程名匹配已知挖矿软件
   - 检测高 CPU 占用的可疑进程
   - 检测从可疑目录启动的进程

2. **网络连接检测**
   - 检测连接到已知矿池 IP
   - 检测连接到可疑端口（3333, 4444 等）
   - 自动封锁恶意 IP

3. **文件系统检测**
   - 检测 /tmp 等目录下的隐藏可执行文件
   - 检测可疑配置文件（包含 pool, stratum 等关键词）

4. **定时任务检测**
   - 监控 crontab 变化
   - 检测可疑的定时任务

5. **宝塔插件检测**
   - 检测高风险插件（jumpserver, webssh 等）
   - 监控插件目录变化

6. **登录检测**
   - 监控失败登录尝试
   - 记录登录来源

### 配置选项

编辑脚本头部的配置区域：

```bash
# 告警配置
ALERT_ENABLED=true
WEBHOOK_URL="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"

# 自动响应配置
AUTO_BLOCK_ENABLED=true   # 自动封锁恶意 IP
AUTO_KILL_ENABLED=true    # 自动终止恶意进程

# 检测间隔（守护模式）
CHECK_INTERVAL=60
```

### 使用方式

```bash
# 单次检查
security-monitor -s

# 守护模式（持续监控）
security-monitor -d

# 后台运行守护模式
nohup security-monitor -d &

# 作为 systemd 服务运行（推荐）
systemctl start security-monitor
```

## emergency-response.sh 应急响应

当发现服务器被入侵时，执行此脚本进行快速处置：

```bash
# 交互模式（每步确认）
bash emergency-response.sh

# 自动模式（无需确认，适合紧急情况）
bash emergency-response.sh --auto
```

### 处置流程

1. 收集系统信息（保存到报告文件）
2. 检测并终止恶意进程
3. 检测并封锁恶意 IP
4. 检测并删除恶意文件
5. 检查并删除高风险宝塔插件
6. 添加矿池 IP 封锁规则

## 告警配置

### 企业微信机器人

1. 在企业微信群中添加机器人
2. 复制 webhook 地址
3. 配置到脚本中：

```bash
WEBHOOK_URL="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY"
```

### 钉钉机器人

1. 在钉钉群中添加自定义机器人
2. 复制 webhook 地址
3. 配置方式同上

### Telegram

```bash
TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN"
TELEGRAM_CHAT_ID="YOUR_CHAT_ID"
```

## 日志说明

| 日志文件 | 内容 |
|----------|------|
| `/var/log/security-monitor/monitor.log` | 主日志，记录所有检测活动 |
| `/var/log/security-monitor/alerts.log` | 告警日志，仅记录发现的问题 |
| `/var/log/security-monitor/blocked_ips.txt` | 已封锁的 IP 列表 |
| `/var/log/security-monitor/cron.log` | 定时任务执行日志 |

## 常见问题

### Q: 脚本误杀了正常进程怎么办？

A: 在脚本中添加白名单：

```bash
WHITELIST_PROCESSES="nginx|mysql|php-fpm|node|python|pm2|docker|your_app"
```

### Q: 如何排除某个 IP 不被封锁？

A: 在白名单中添加：

```bash
WHITELIST_IPS="127.0.0.1|100.100.|172.26.|your_ip"
```

### Q: 服务无法启动？

A: 检查脚本权限和日志：

```bash
chmod +x /usr/local/security-monitor/security-monitor.sh
journalctl -u security-monitor -f
```

## 更新日志

### v2.0.0 (2026-02-02)
- 新增：已知矿池 IP 特征库
- 新增：宝塔插件检测
- 新增：自动封锁恶意 IP
- 新增：企业微信/钉钉/Telegram 告警
- 优化：CPU 使用率检测逻辑
- 优化：白名单机制
