# 生产环境优化方案

## 📋 问题清单

### 1. 调试日志过多
- ❌ 生产环境输出大量调试信息
- ❌ 暴露敏感的数据库配置
- ❌ 影响性能和安全

### 2. 文件下载错误处理不友好
- ❌ PPT等文件下载失败时没有友好提示
- ❌ 前端显示原始错误信息
- ❌ 用户体验差

### 3. 系统整体优化需求
- ❌ 缺少统一的错误处理机制
- ❌ 日志级别未按环境区分
- ❌ 性能监控不足

---

## ✅ 已完成的优化

### 1. 数据库日志优化
- ✅ 生产环境关闭SQL查询日志
- ✅ 关闭数据库连接池调试信息
- ✅ 添加 `DB_LOGGING` 环境变量控制

**修改文件**：
- `backend/src/config/database.js`
- `backend/.env.production`

### 2. 日志级别优化
- ✅ 生产环境日志级别改为 `warn`
- ✅ 开发环境保持 `debug`

---

## 🔧 待修复问题

### 1. 文件下载错误处理

**问题描述**：
- 课堂回顾中下载PPT时，如果文件不存在或路径错误
- 前端显示原始错误，没有友好提示
- 用户不知道是什么问题

**修复方案**：
```javascript
// resourceController.js - downloadResource 方法
exports.downloadResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const resource = await models.TeachingResource.findOne({
      where: { id, del_flag: 0 }
    });

    if (!resource) {
      return res.status(404).json(Response.error('资源不存在，可能已被删除', 404));
    }

    // 处理OSS文件
    if (resource.storage_type === 'oss' && resource.file_url) {
      // 增加下载计数
      await resource.increment('download_count');
      
      return res.json(Response.success({
        downloadUrl: resource.file_url,
        fileName: resource.resource_name,
        isRemote: true
      }, '获取下载链接成功'));
    }

    // 处理本地文件
    const fileName = resource.file_path.includes('/') || resource.file_path.includes('\\')
      ? path.basename(resource.file_path)
      : resource.file_path;
    const filePath = path.join(uploadDir, fileName);

    if (!fs.existsSync(filePath)) {
      logger.error(`文件不存在: ${filePath}`);
      return res.status(404).json(Response.error(
        '文件不存在，可能已被移动或删除。请联系管理员或重新上传。',
        404
      ));
    }

    // 检查文件是否可读
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch (err) {
      logger.error(`文件无法读取: ${filePath}`, err);
      return res.status(403).json(Response.error(
        '文件无法访问，请联系管理员检查文件权限。',
        403
      ));
    }

    // 增加下载计数
    await resource.increment('download_count');

    // 设置下载响应头
    const downloadName = resource.resource_name + (resource.file_extension ? `.${resource.file_extension}` : '');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
    res.setHeader('Content-Type', resource.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', resource.file_size);

    // 流式传输文件
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      logger.error('文件流读取错误:', error);
      if (!res.headersSent) {
        res.status(500).json(Response.error('文件下载失败，请稍后重试', 500));
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    logger.error('下载资源失败:', error);
    next(error);
  }
};
```

### 2. 前端错误提示优化

**前端需要添加**：
```javascript
// 下载文件时的错误处理
async downloadFile(resourceId) {
  try {
    const response = await axios.get(`/api/resource/download/${resourceId}`, {
      responseType: 'blob'
    });
    
    // 处理下载...
    
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      
      // 尝试解析错误消息
      let errorMessage = '下载失败';
      
      if (data instanceof Blob) {
        const text = await data.text();
        try {
          const json = JSON.parse(text);
          errorMessage = json.message || errorMessage;
        } catch (e) {
          errorMessage = '文件下载失败，请稍后重试';
        }
      }
      
      // 友好的错误提示
      if (status === 404) {
        this.$message.error(errorMessage || '文件不存在，可能已被删除');
      } else if (status === 403) {
        this.$message.error(errorMessage || '没有权限访问此文件');
      } else {
        this.$message.error(errorMessage || '下载失败，请稍后重试');
      }
    } else {
      this.$message.error('网络错误，请检查网络连接');
    }
  }
}
```

---

## 📊 性能优化建议

### 1. 数据库连接池
当前配置：
```javascript
pool: {
  max: 30,
  min: 5,
  acquire: 60000,
  idle: 30000
}
```

**建议**：
- 2GB内存服务器，连接池可以适当减小
- 建议 `max: 20, min: 3`

### 2. 日志轮转
- ✅ 已配置日志文件大小限制（20MB）
- ✅ 已配置日志保留时间（14天）

### 3. 静态资源缓存
- Nginx已配置静态资源缓存（30天）
- 建议添加CDN加速

---

## 🔒 安全优化

### 1. 敏感信息保护
- ✅ 生产环境不输出数据库配置
- ✅ 错误信息不暴露内部路径
- ⚠️ 建议：定期更换JWT密钥

### 2. 文件上传安全
- ✅ 已限制文件大小（100MB）
- ✅ 已限制文件类型
- ⚠️ 建议：添加文件内容检测（防止恶意文件）

### 3. API限流
- ✅ 已配置限流（1分钟1000次）
- ✅ 生产环境已启用

---

## 📝 部署检查清单

### 启动前检查
- [ ] 确认 `.env.production` 配置正确
- [ ] 确认数据库连接信息正确
- [ ] 确认OSS配置正确（如果使用）
- [ ] 确认日志目录有写权限

### 启动后验证
- [ ] PM2进程状态正常（online）
- [ ] 数据库连接成功
- [ ] API健康检查通过：`curl http://127.0.0.1:8081/health`
- [ ] 前端可以正常访问
- [ ] 文件上传下载功能正常

### 监控检查
- [ ] PM2日志正常：`pm2 logs teaching-backend`
- [ ] 错误日志无异常：`tail -f logs/error.log`
- [ ] 服务器内存使用正常：`free -h`
- [ ] 数据库连接数正常：`SHOW PROCESSLIST;`

---

## 🚀 快速修复脚本

```bash
#!/bin/bash
# 应用所有优化并重启服务

cd /www/wwwroot/teaching-platform/backend

echo "1. 备份当前配置"
cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)

echo "2. 更新配置文件"
# 已通过本地修改并上传

echo "3. 重启服务"
pm2 restart teaching-backend

echo "4. 验证服务"
sleep 3
pm2 list | grep teaching-backend
curl -s http://127.0.0.1:8081/health | jq .

echo "5. 查看日志"
pm2 logs teaching-backend --lines 20

echo "✅ 优化完成！"
```

---

## 📞 问题排查

### 如果服务无法启动
1. 检查PM2日志：`pm2 logs teaching-backend --lines 50`
2. 检查数据库连接：`mysql -uteaching_user -p teaching_platform`
3. 检查端口占用：`netstat -antp | grep 8081`
4. 检查文件权限：`ls -la /www/wwwroot/teaching-platform/backend`

### 如果文件下载失败
1. 检查文件是否存在：`ls -la /www/wwwroot/teaching-platform/backend/uploads/`
2. 检查文件权限：`chmod 644 uploads/*`
3. 检查Nginx配置：`nginx -t`
4. 查看错误日志：`tail -f logs/error.log`

---

## 📅 维护计划

### 每日
- 检查PM2进程状态
- 检查错误日志

### 每周
- 清理旧日志文件
- 检查磁盘空间
- 数据库备份

### 每月
- 更新依赖包（安全更新）
- 性能分析
- 数据库优化

---

**最后更新**: 2025-01-18
**维护人员**: 系统管理员
