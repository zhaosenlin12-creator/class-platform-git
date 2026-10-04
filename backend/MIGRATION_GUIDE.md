# 课堂聊天文件字段迁移指南

## 概述

此迁移为 `teaching_classroom_chat` 表添加文件上传支持所需的字段。

## 迁移内容

添加以下字段到 `teaching_classroom_chat` 表:
- `file_name` VARCHAR(255) - 文件名
- `file_size` INT - 文件大小（字节）
- `file_type` VARCHAR(100) - 文件MIME类型
- `file_url` VARCHAR(500) - 文件URL（OSS key）

## 执行方式

### 方式1: 使用Node.js脚本（推荐）

```bash
cd backend
node run-chat-migration.js
```

**前提条件:**
- 数据库可访问
- `.env` 文件配置正确
- 已安装 `mysql2` 和 `dotenv` 包

### 方式2: 直接执行SQL

如果Node.js脚本无法连接数据库，可以直接在MySQL客户端执行SQL文件:

```bash
mysql -h <host> -u <user> -p <database> < backend/migrations/add-classroom-chat-file-fields.sql
```

或者在MySQL命令行中:

```sql
USE teaching_platform;
SOURCE backend/migrations/add-classroom-chat-file-fields.sql;
```

### 方式3: 在生产服务器上执行

如果数据库在Docker容器中:

```bash
# 进入数据库容器
docker exec -it <mysql_container_name> mysql -u teaching_user -p teaching_platform

# 然后执行SQL
ALTER TABLE teaching_classroom_chat 
ADD COLUMN IF NOT EXISTS file_name VARCHAR(255) COMMENT '文件名' AFTER content,
ADD COLUMN IF NOT EXISTS file_size INT COMMENT '文件大小（字节）' AFTER file_name,
ADD COLUMN IF NOT EXISTS file_type VARCHAR(100) COMMENT '文件MIME类型' AFTER file_size,
ADD COLUMN IF NOT EXISTS file_url VARCHAR(500) COMMENT '文件URL' AFTER file_type;
```

## 验证迁移

### 使用验证脚本

```bash
cd backend
node verify-chat-migration.js
```

### 手动验证

在MySQL中执行:

```sql
DESCRIBE teaching_classroom_chat;
```

应该看到新增的4个字段:
- file_name
- file_size
- file_type
- file_url

## 回滚

如果需要回滚迁移:

```sql
ALTER TABLE teaching_classroom_chat
DROP COLUMN file_name,
DROP COLUMN file_size,
DROP COLUMN file_type,
DROP COLUMN file_url;
```

## 注意事项

1. **向后兼容**: 此迁移不会影响现有数据，新字段允许NULL值
2. **无数据丢失**: 现有聊天记录保持不变
3. **安全执行**: 使用 `ADD COLUMN IF NOT EXISTS` 避免重复执行错误
4. **生产环境**: 建议在低峰期执行，虽然此迁移很快（通常<1秒）

## 故障排除

### 连接失败

如果遇到连接错误:

1. 检查 `.env` 文件中的数据库配置:
   ```
   DB_HOST=<数据库地址>
   DB_PORT=3306
   DB_NAME=teaching_platform
   DB_USER=teaching_user
   DB_PASSWORD=<密码>
   ```

2. 确认数据库服务正在运行:
   ```bash
   # 检查MySQL进程
   ps aux | grep mysql
   
   # 或检查Docker容器
   docker ps | grep mysql
   ```

3. 测试数据库连接:
   ```bash
   cd backend
   node check-db-connection.js
   ```

### 权限错误

如果遇到权限错误，确保数据库用户有 ALTER TABLE 权限:

```sql
GRANT ALTER ON teaching_platform.* TO 'teaching_user'@'%';
FLUSH PRIVILEGES;
```

## 相关文件

- `backend/run-chat-migration.js` - 迁移执行脚本
- `backend/migrations/add-classroom-chat-file-fields.sql` - SQL迁移文件
- `backend/verify-chat-migration.js` - 验证脚本
- `backend/check-db-connection.js` - 连接测试脚本
- `backend/src/models/TeachingClassroomChat.js` - 数据模型（已包含新字段）

## 下一步

迁移完成后，可以继续实施OSS上传升级的其他任务。
