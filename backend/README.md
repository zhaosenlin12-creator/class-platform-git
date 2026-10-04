# 🎓 教学平台后端API服务

> **基于 Node.js + Express + Sequelize + MySQL 构建的完整教学管理系统后端**

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## ✨ 功能特性

- ✅ **用户认证**: JWT Token认证、权限管理、角色管理
- ✅ **学生管理**: 学生信息CRUD、状态管理、学习进度追踪
- ✅ **班级管理**: 班级创建、学生分配、班级归档
- ✅ **课程管理**: 课程创建、单元管理、资源关联
- ✅ **作业管理**: 作业发布、在线提交、批改反馈
- ✅ **课堂管理**: 在线教室、学生签到、时长统计
- ✅ **统计分析**: 教学数据可视化、学生学习分析

---

## 🛠️ 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Node.js | 18.x | 运行环境 |
| Express | 4.x | Web框架 |
| Sequelize | 6.x | ORM框架 |
| MySQL | 8.0 | 关系型数据库 |
| JWT | 9.x | Token认证 |
| Winston | 3.x | 日志管理 |
| PM2 | 5.x | 进程管理 |

---

## 🚀 快速开始

## Backend Docker Maintenance

For the current production server under `/www/wwwroot/teaching-platform`, use the concise Docker update and maintenance runbook:

- [`../BACKEND_DOCKER_RUNBOOK.md`](../BACKEND_DOCKER_RUNBOOK.md)

This is the file to check for:

- backend package overwrite rules
- rebuild and recreate commands
- `uploads/logs` permission fixes
- post-update verification commands

### 方式1：本地开发（开发人员）

```bash
# 1. 克隆项目
git clone <repository-url>
cd backend

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，根据下方“环境变量说明”更新数据库、域名等配置

# 4. 创建数据库
mysql -u root -p
CREATE DATABASE teaching_platform;

# 导入SQL文件
# 在phpMyAdmin或命令行依次执行：
# - database/schema.sql（表结构）
# - database/init-data.sql（初始数据）

# 5. 启动服务
npm run dev  # 开发环境（nodemon自动重启）
# 或
npm start    # 生产环境
```

**访问**: `http://localhost:8081/health`

---

### 方式2：宝塔面板部署（推荐新手）⭐

**📖 完整教程**: [快速开始.md](快速开始.md)  
**📚 详细指南**: [宝塔部署详细指南.md](宝塔部署详细指南.md)

```bash
# 1. 上传代码到服务器
/www/wwwroot/teaching-platform-backend/

# 2. 安装依赖
cd /www/wwwroot/teaching-platform-backend
npm install --production

# 3. 启动服务（PM2）
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 📁 项目结构

```
backend/
├── database/                   # 数据库文件
│   ├── schema.sql             # ✅ 表结构（23个表）
│   └── init-data.sql          # ✅ 初始数据
│
├── src/                       # 源代码
│   ├── config/                # 配置
│   │   └── database.js        # Sequelize配置
│   │
│   ├── models/                # 数据模型（18个）
│   │   ├── index.js           # 模型总入口
│   │   ├── SysUser.js         # 用户模型
│   │   ├── TeachingStudent.js # 学生模型
│   │   ├── TeachingCourse.js  # 课程模型
│   │   └── ...
│   │
│   ├── controllers/           # 控制器（6个）
│   │   ├── authController.js
│   │   ├── studentController.js
│   │   ├── courseController.js
│   │   └── ...
│   │
│   ├── routes/                # 路由（10个）
│   │   ├── index.js
│   │   ├── authRoutes.js
│   │   └── ...
│   │
│   ├── middleware/            # 中间件
│   │   ├── auth.js            # JWT认证
│   │   ├── errorHandler.js    # 错误处理
│   │   └── logger.js          # 日志
│   │
│   ├── utils/                 # 工具函数
│   │   ├── response.js        # 统一响应
│   │   ├── jwt.js             # JWT工具
│   │   └── ...
│   │
│   ├── app.js                 # Express应用
│   └── server.js              # 启动入口
│
├── .env.example               # 环境变量示例
├── .gitignore                 # Git忽略
├── package.json               # 项目依赖
├── ecosystem.config.js        # PM2配置
├── nginx.conf.example         # Nginx配置
├── deploy.sh                  # 部署脚本
└── README.md                  # 本文档
```

---

## 🔐 默认账号

| 字段 | 值 |
|------|-----|
| 用户名 | `admin` |
| 密码 | `admin123` |

⚠️ **重要**: 首次登录后请立即在个人设置中修改密码！

---

## 📡 API接口文档

## ⚙️ 环境变量说明

| 变量 | 说明 | 默认值 |
|------|------|--------|
| NODE_ENV | 运行环境 (development/production) | development |
| HOST | 服务监听地址 | 0.0.0.0 |
| PORT | HTTP 服务端口 | 8081 |
| SOCKET_PORT | Socket.IO 端口（默认与 PORT 相同） | 8081 |
| JWT_SECRET | JWT 签名密钥（必须修改） | please-change-me |
| JWT_EXPIRES_IN | Token 有效期 | 7d |
| CORS_ORIGIN | 允许的前端域名 | http://localhost:8080 |
| CORS_CREDENTIALS | 是否允许跨域携带凭据 | false |
| RATE_LIMIT_WINDOW_MS | 限流窗口（毫秒） | 900000 |
| RATE_LIMIT_MAX_REQUESTS | 窗口内最大请求数 | 200 |
| SKIP_RATE_LIMIT | 开发环境是否跳过限流 | true |
| DB_HOST | 数据库主机地址 | localhost |
| DB_PORT | 数据库端口 | 3306 |
| DB_NAME | 数据库名称 | teaching_platform |
| DB_USER | 数据库用户名 | teaching_user |
| DB_PASSWORD | 数据库密码（必须修改） | please-set-password |
| API_URL | 后端基础 URL，用于生成文件访问地址 | http://localhost:8081 |
| STATIC_URL | 静态资源路径 | /uploads |
| LOG_LEVEL | 日志级别 | info |
| LOG_DIR | 日志输出目录 | ./logs |
| LOG_MAX_SIZE | 单个日志文件大小上限 | 20m |
| LOG_MAX_FILES | 日志保留天数 | 14d |
| OSS_* | 阿里云 OSS 配置（可选） | - |
| SMTP_* | 邮件通知配置（可选） | - |

### 系统接口（/sys）

```bash
POST   /sys/login                              # 登录
POST   /sys/logout                             # 登出
GET    /sys/permission/getUserPermissionByToken # 获取权限
GET    /sys/config/getCurrentConfig            # 系统配置
```

### 学生管理（/student）

```bash
GET    /student/list         # 学生列表（支持分页、搜索）
GET    /student/:id          # 学生详情
POST   /student              # 创建学生
PUT    /student/:id          # 更新学生
DELETE /student/:id          # 删除学生（软删除）
PUT    /student/:id/status   # 更新学生状态
```

### 班级管理（/class）

```bash
GET    /class/list                           # 班级列表
POST   /class                                # 创建班级
PUT    /class/:id                            # 更新班级
DELETE /class/:id                            # 删除班级
GET    /class/:id/students                   # 班级学生列表
POST   /class/:id/students                   # 添加学生到班级
DELETE /class/:id/students/:studentId        # 移除学生
```

### 课程管理（/course, /teaching）

```bash
GET    /course/list                           # 课程列表
POST   /teaching/teachingCourse/create        # 创建课程
POST   /teaching/teachingCourse/update        # 更新课程
POST   /course/delete                         # 删除课程
GET    /teaching/teachingCourseUnit/list      # 课程单元列表
POST   /teaching/teachingCourseUnit/add       # 添加单元
```

### 作业管理（/homework, /teacher）

```bash
GET    /homework/list                    # 作业列表（学生）
POST   /homework/submit                  # 提交作业
GET    /teacher/homework/list            # 作业列表（教师）
POST   /teacher/homework/create          # 创建作业
POST   /homework/review                  # 批改作业
```

### 统计分析（/teaching/teacher）

```bash
GET    /teaching/teacher/statistics/dashboard          # 仪表盘统计
GET    /teaching/teacher/statistics/activities         # 教学活动统计
GET    /teaching/teacher/statistics/course-completion  # 课程完成度
```

**📖 完整API文档**: 查看 [代码生成完成报告.md](代码生成完成报告.md)

---

## 🧪 测试

### 健康检查

```bash
curl http://localhost:8081/health

# 预期返回：
# {"status":"ok","timestamp":"...","uptime":123.456}
```

### 登录测试

```bash
curl -X POST http://localhost:8081/sys/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 成功返回：
# {"success":true,"result":{"userInfo":{...},"token":"eyJhbG..."}}
```

### 获取学生列表

```bash
TOKEN="你的JWT Token"

curl "http://localhost:8081/student/list?pageNo=1&pageSize=10" \
  -H "X-Access-Token: $TOKEN"
```

**📋 完整测试清单**: [功能测试清单.md](功能测试清单.md)

---

## 🔧 常用命令

### PM2进程管理

```bash
pm2 status                      # 查看状态
pm2 logs teaching-backend       # 查看日志（实时）
pm2 logs --lines 100            # 查看最近100行日志
pm2 restart teaching-backend    # 重启服务
pm2 stop teaching-backend       # 停止服务
pm2 delete teaching-backend     # 删除进程
pm2 monit                       # 监控面板
```

### 数据库操作

```bash
# 连接数据库
mysql -u teaching_user -p teaching_platform

# 备份数据库
mysqldump -u teaching_user -p teaching_platform > backup_$(date +%Y%m%d).sql

# 恢复数据库
mysql -u teaching_user -p teaching_platform < backup_20251021.sql

# 查看表结构
mysql -u teaching_user -p -e "USE teaching_platform; SHOW TABLES;"
```

### 日志查看

```bash
# PM2日志
pm2 logs teaching-backend

# 应用日志（如果配置了Winston）
tail -f logs/error.log
tail -f logs/combined.log
```

---

## 📚 文档导航

| 文档 | 说明 | 适合人群 |
|------|------|----------|
| [快速开始.md](快速开始.md) | 5分钟快速部署 | ⭐ 新手必读 |
| [宝塔部署详细指南.md](宝塔部署详细指南.md) | 完整部署教程（新手友好） | 新手 |
| [功能测试清单.md](功能测试清单.md) | 完整测试Checklist | 测试人员 |
| [代码生成完成报告.md](代码生成完成报告.md) | 技术架构文档 | 开发人员 |
| [阶段2生产环境详细计划.md](../阶段2生产环境详细计划.md) | 部署规划和FAQ | 项目管理 |

---

## 🐛 故障排查

### 问题1：后端启动失败

**症状**: `pm2 status` 显示 `errored` 或 `stopped`

**排查步骤**:
```bash
# 1. 查看详细错误日志
pm2 logs teaching-backend --lines 50

# 2. 常见原因：
#    - 数据库密码错误 → 检查 .env 文件中的 DB_PASSWORD
#    - 数据库未创建 → 创建数据库并导入SQL
#    - 端口被占用 → 修改 .env 的 PORT，或停止占用进程
#    - 依赖未安装 → npm install

# 3. 手动启动查看错误
node src/server.js
```

---

### 问题2：接口返回401 Unauthorized

**原因**: Token未提供、Token过期或Token无效

**解决**:
```bash
# 1. 重新登录获取新Token
curl -X POST http://localhost:8081/sys/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 2. 在请求头中携带Token
curl http://localhost:8081/student/list \
  -H "X-Access-Token: 你的Token"
```

---

### 问题3：数据库连接失败

**症状**: 日志显示 "Cannot connect to database"

**排查步骤**:
```bash
# 1. 检查MySQL是否启动
systemctl status mysql  # Linux
# 或在宝塔面板查看MySQL状态

# 2. 测试数据库连接
mysql -u teaching_user -p
# 输入密码，能进入 = 数据库正常

# 3. 检查.env配置
cat .env | grep DB_

# 4. 确认数据库和用户已创建
mysql -u root -p
SHOW DATABASES;
SELECT user FROM mysql.user;
```

---

### 问题4：端口被占用

**症状**: 启动时提示 "Port 8081 is already in use"

**解决**:
```bash
# 查看8081端口占用情况
netstat -tunlp | grep 8081  # Linux
netstat -ano | findstr :8081  # Windows

# 停止占用进程
kill -9 <PID>  # Linux
taskkill /PID <PID> /F  # Windows

# 或修改.env中的PORT
PORT=8082
```

---

## 🔒 安全特性

- ✅ JWT Token认证（有效期24小时）
- ✅ 密码bcrypt哈希存储（旧MD5登录时自动升级）
- ✅ SQL注入防护（Sequelize参数化查询）
- ✅ XSS防护（Helmet安全头）
- ✅ CORS跨域配置
- ✅ 接口限流（15分钟100次）
- ✅ HTTPS加密传输（Nginx配置）
- ✅ 软删除机制（del_flag标记）

---

## 📈 性能优化

- ✅ PM2集群模式（2个实例，负载均衡）
- ✅ Gzip响应压缩
- ✅ 数据库索引优化
- ✅ 请求体大小限制（10MB）
- ✅ 日志分级和轮转

---

## 📊 系统架构

```
┌─────────────────┐
│   前端 Vue.js   │
└────────┬────────┘
         │ HTTPS (443)
         ↓
┌─────────────────┐
│  Nginx 反向代理  │ ← SSL证书、Gzip压缩、静态文件
└────────┬────────┘
         │ HTTP (8081)
         ↓
┌─────────────────┐
│  Express API    │ ← JWT认证、业务逻辑、限流
│  (PM2 Cluster)  │
└────────┬────────┘
         │ Sequelize ORM
         ↓
┌─────────────────┐
│   MySQL 8.0     │ ← 数据持久化（23个表）
└─────────────────┘
```

---

## 🤝 开发指南

### 添加新功能

1. **创建数据模型** (如需要)
   - 在 `src/models/` 创建新的Model文件
   - 在 `src/models/index.js` 注册模型

2. **编写业务逻辑**
   - 在 `src/controllers/` 创建Controller文件
   - 实现CRUD操作和业务逻辑

3. **定义路由**
   - 在 `src/routes/` 创建Routes文件
   - 在 `src/routes/index.js` 注册路由

4. **测试接口**
   - 使用Postman或curl测试
   - 更新功能测试清单

### 代码规范

- 遵循 **6A规则** （用户自定义规则）
- 函数不超过30行
- 组件不超过150行
- 统一使用 `Response.success()` 和 `Response.error()` 返回数据
- 添加必要的注释说明"为什么"

---

## 📄 License

MIT License

---

## 📞 技术支持

- **项目地址**: https://codebona.cn
- **问题反馈**: 查看日志文件或提交Issue
- **日志位置**: 
  - PM2日志: `/root/.pm2/logs/`
  - Nginx日志: `/www/wwwlogs/`
  - MySQL日志: `/www/server/mysql/`

---

**🎉 祝您使用愉快！如有问题请查看文档或联系技术支持。**
