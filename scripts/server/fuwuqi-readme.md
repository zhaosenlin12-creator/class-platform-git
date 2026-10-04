# 服务器安全运维手册

**服务器**: 120.26.114.244 (阿里云ECS)  
**系统**: CentOS/AliyunLinux  
**面板**: 宝塔面板  
**应用**: 教学平台 (Docker部署)  
**更新日期**: 2026-02-11

---

## 📋 目录

1. [当前安全状态](#当前安全状态)
2. [已部署的安全措施](#已部署的安全措施)
3. [日常运维指令](#日常运维指令)
4. [监控服务管理](#监控服务管理)
5. [应急响应流程](#应急响应流程)
6. [定期检查清单](#定期检查清单)
7. [常见问题处理](#常见问题处理)

---

## 当前安全状态

### ✅ 已完成的安全加固

- **jumpserver插件已删除** - 高风险宝塔插件已清理
- **已封锁2个恶意IP**:
  - 47.238.151.9 (可疑端口+可疑进程)
  - 47.83.133.27 (可疑端口+可疑进程)
- **无挖矿进程** - 系统干净
- **无可疑网络连接** - 未发现矿池连接
- **CPU占用正常** - 系统负载健康



📋 你需要做的日常维护
每天检查（1分钟）
# 查看最近的安全检查结果
tail -50 /var/log/security-check.log

# 或手动运行一次检查
bash /root/verify-security-status.sh
每周检查（5分钟）
# 查看完整日志
cat /var/log/security-check.log | grep "⚠️"

# 检查系统负载
uptime

# 检查应用状态
docker ps
bt status
📚 重要文档位置
本地（Windows）:

服务器安全运维手册.md - 完整的运维指南
verify-security-status.sh - 安全检查脚本

















### 📊 系统资源状态

```bash
# 查看系统负载
uptime
# 正常值: load average < CPU核心数

# 查看CPU占用
ps aux --sort=-%cpu | head -10

# 查看内存使用
free -h
```

---

## 已部署的安全措施

### 1. 安全监控脚本

**位置**: `/root/security-scripts/`

| 脚本 | 功能 | 自动运行 |
|------|------|----------|
| `security-monitor.sh` | 持续监控，自动处理威胁 | ✅ systemd服务 |
| `quick-check.sh` | 快速安全检查 | ❌ 手动运行 |
| `emergency-response.sh` | 应急响应清理 | ❌ 手动运行 |

### 2. 自动防护功能

监控服务会自动执行以下操作：

- ✅ **自动终止挖矿进程** - 检测到立即终止
- ✅ **自动封锁恶意IP** - 发现可疑连接立即封锁
- ✅ **自动删除恶意文件** - 清理/tmp等目录的可疑文件
- ✅ **告警记录** - 所有安全事件记录到日志

### 3. 监控范围

- 挖矿进程检测（xmrig, minerd, cpuminer等）
- 可疑网络连接（矿池端口3333,4444,5555,7777,8888）
- 高CPU占用进程（>80%且在可疑目录）
- 可疑文件（/tmp, /var/tmp, /dev/shm）
- crontab变化监控
- 宝塔插件监控（jumpserver, webssh, terminal）
- 系统登录监控

---

## 日常运维指令

### 快速安全检查（每天执行1次）

```bash
# 方法1: 使用快速检查脚本
cd /root
bash verify-security-status.sh

# 方法2: 使用项目脚本
cd /root/security-scripts
bash quick-check.sh
```

**预期输出**:
```
【安全状态总结】
✅ 服务器安全状态良好
```

### 查看监控日志

```bash
# 实时查看监控日志
tail -f /var/log/security-monitor/monitor.log

# 查看告警日志
cat /var/log/security-monitor/alerts.log

# 查看最近10条告警
tail -10 /var/log/security-monitor/alerts.log

# 查看已封锁的IP
cat /var/log/security-monitor/blocked_ips.txt
```

### 查看系统状态

```bash
# CPU占用TOP 10
ps aux --sort=-%cpu | head -10

# 内存占用TOP 10
ps aux --sort=-%mem | head -10

# 系统负载
uptime

# 磁盘使用
df -h

# 网络连接
ss -tnp | grep ESTAB
```

### 宝塔面板管理

```bash
# 查看宝塔状态
bt status

# 重启宝塔
bt restart

# 查看宝塔访问信息
bt default

# 宝塔常用命令
bt 1   # 重启面板
bt 5   # 查看面板端口
bt 6   # 修改面板端口
bt 7   # 修改面板密码
bt 14  # 修复面板
```

### Docker应用管理

```bash
# 查看容器状态
docker ps

# 查看容器日志
docker logs -f 容器名

# 重启容器
docker restart 容器名

# 查看容器资源占用
docker stats
```

---

## 监控服务管理

### 服务状态检查

```bash
# 查看服务状态
systemctl status security-monitor

# 查看服务是否开机自启
systemctl is-enabled security-monitor
```

### 服务控制

```bash
# 启动服务
systemctl start security-monitor

# 停止服务
systemctl stop security-monitor

# 重启服务
systemctl restart security-monitor

# 查看服务日志
journalctl -u security-monitor -f
```

### 修复监控服务（如果服务未运行）

```bash
cd /root
bash fix-security-monitor.sh
```

### 监控配置调整

编辑监控脚本配置：

```bash
vi /root/security-scripts/security-monitor.sh

# 关键配置项:
# AUTO_BLOCK_ENABLED=true    # 自动封锁IP
# AUTO_KILL_ENABLED=true     # 自动终止进程
# CHECK_INTERVAL=60          # 检测间隔（秒）
```

修改后重启服务：
```bash
systemctl restart security-monitor
```

---

## 应急响应流程

### 发现CPU异常高

```bash
# 1. 快速诊断
bash diagnose-cpu-issue.sh

# 2. 如果发现问题，运行清理
bash cleanup-cpu-issue.sh

# 3. 或使用应急响应脚本
cd /root/security-scripts
bash emergency-response.sh --auto
```

### 发现可疑进程

```bash
# 1. 查看进程详情
ps aux | grep 进程名

# 2. 查看进程路径
ls -l /proc/PID/exe

# 3. 终止进程
kill -9 PID

# 4. 删除可疑文件
rm -f /path/to/suspicious/file
```

### 发现可疑网络连接

```bash
# 1. 查看连接详情
ss -tnp | grep 可疑IP

# 2. 封锁IP
iptables -I OUTPUT -d 可疑IP -j DROP
iptables -I INPUT -s 可疑IP -j DROP

# 3. 保存规则
iptables-save > /etc/sysconfig/iptables
```

### 宝塔面板无法访问

```bash
# 1. 运行修复脚本
bash fix-baota-access.sh

# 2. 或手动修复
bt status
bt restart
sleep 10
bt default
```

---

## 定期检查清单

### 每天检查（5分钟）

```bash
# 1. 运行安全检查
bash verify-security-status.sh

# 2. 查看告警日志
tail -20 /var/log/security-monitor/alerts.log

# 3. 检查系统负载
uptime

# 4. 检查应用状态
docker ps
bt status
```

### 每周检查（15分钟）

```bash
# 1. 查看完整监控日志
cat /var/log/security-monitor/monitor.log | grep ALERT

# 2. 检查已封锁的IP
cat /var/log/security-monitor/blocked_ips.txt

# 3. 检查磁盘空间
df -h

# 4. 检查系统更新
yum check-update

# 5. 备份重要数据
# 数据库备份
# 代码备份
# 配置文件备份
```

### 每月检查（30分钟）

```bash
# 1. 查看系统登录记录
last -20

# 2. 检查失败登录
lastb | head -20

# 3. 检查crontab
crontab -l
cat /etc/crontab

# 4. 检查宝塔插件
ls -la /www/server/panel/plugin/

# 5. 更新系统（谨慎）
# yum update -y

# 6. 清理日志（如果磁盘空间不足）
# 清理旧日志，保留最近30天
find /var/log/security-monitor/ -name "*.log" -mtime +30 -delete
```

---

## 常见问题处理

### Q1: 监控服务未运行

**现象**: `systemctl status security-monitor` 显示未运行

**解决**:
```bash
cd /root
bash fix-security-monitor.sh
```

### Q2: CPU占用突然升高

**现象**: `uptime` 显示负载很高

**解决**:
```bash
# 1. 快速诊断
bash diagnose-cpu-issue.sh

# 2. 查看CPU占用
ps aux --sort=-%cpu | head -10

# 3. 如果是挖矿病毒，运行清理
bash cleanup-cpu-issue.sh
```

### Q3: 宝塔面板无法访问

**现象**: 浏览器无法打开宝塔面板

**解决**:
```bash
bash fix-baota-access.sh
```

### Q4: Docker容器停止

**现象**: `docker ps` 看不到容器

**解决**:
```bash
# 查看所有容器（包括停止的）
docker ps -a

# 启动容器
docker start 容器名

# 或使用docker-compose
cd /path/to/app
docker-compose up -d
```

### Q5: 磁盘空间不足

**现象**: `df -h` 显示使用率>90%

**解决**:
```bash
# 1. 查看大文件
du -sh /* | sort -hr | head -10

# 2. 清理Docker
docker system prune -a

# 3. 清理日志
find /var/log -name "*.log" -mtime +30 -delete

# 4. 清理宝塔日志
rm -f /www/wwwlogs/*.log.old
```

### Q6: 发现新的告警

**现象**: 监控日志中出现新的ALERT

**解决**:
```bash
# 1. 查看告警详情
tail -50 /var/log/security-monitor/alerts.log

# 2. 根据告警类型处理:
# - 可疑进程 → 检查进程，必要时终止
# - 可疑连接 → 检查连接，必要时封锁IP
# - 可疑文件 → 检查文件，必要时删除
# - 高风险插件 → 删除插件

# 3. 如果不确定，运行应急响应
cd /root/security-scripts
bash emergency-response.sh
```

---

## 📞 紧急联系和备份

### 重要文件位置

```
/root/security-scripts/          # 安全脚本
/root/verify-security-status.sh  # 快速验证脚本
/root/fix-security-monitor.sh    # 修复监控服务
/root/diagnose-cpu-issue.sh      # CPU诊断
/root/cleanup-cpu-issue.sh       # CPU清理
/root/fix-baota-access.sh        # 宝塔修复

/var/log/security-monitor/       # 监控日志
/etc/systemd/system/security-monitor.service  # 监控服务配置
```

### 备份建议

定期备份以下内容：

1. **数据库** - 每天自动备份
2. **代码** - 使用Git管理
3. **配置文件** - 定期备份到本地
4. **宝塔面板配置** - 使用宝塔备份功能
5. **安全脚本** - 保存到本地

### 恢复流程

如果服务器需要重装：

1. 重装系统
2. 安装宝塔面板
3. 恢复数据库
4. 部署应用（Docker）
5. 部署安全脚本
6. 恢复配置文件

---

## 🎯 总结

### 当前状态

✅ **服务器安全** - jumpserver已删除，无挖矿进程  
✅ **监控部署** - 安全脚本已部署（需修复服务）  
✅ **自动防护** - 配置了自动终止和封锁  
✅ **日志记录** - 所有安全事件有记录  

### 日常维护

- **每天**: 运行 `bash verify-security-status.sh`
- **每周**: 查看告警日志
- **每月**: 检查系统更新和备份

### 自动防护

监控服务会自动：
- 终止挖矿进程
- 封锁恶意IP
- 删除可疑文件
- 记录安全事件

你只需要定期查看日志，确认没有新的安全问题即可。

---

**文档版本**: 1.0  
**维护**: 根据实际情况更新  
**最后更新**: 2026-02-11

