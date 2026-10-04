# 前端部署指南

## 环境变量

- `.env.development`：本地开发使用，已默认指向 `http://127.0.0.1:8081`。
- `.env.production`：生产环境使用，请将 `VUE_APP_API_BASE_URL` 修改为真实域名，并根据需要设置 `VUE_APP_PUBLIC_PATH`。
- `.env.production.example`：示例文件，可复制为 `.env.production` 后再修改。

## 构建步骤

```bash
# 安装依赖
npm install

# 生产构建
npm run build

# 构建产物位于 dist/ 目录
```

## 部署建议

1. 将 `dist/` 目录上传至服务器（例如 `/www/wwwroot/teaching-platform-web`）。
2. Nginx 示例配置：
   - `root /www/wwwroot/teaching-platform-web;`
   - `index index.html;`
   - 确保前端 API 代理指向后端域名。
3. 如需测试环境，可复制 `.env.production` 为 `.env.staging` 并设置不同 API 地址。
4. 部署完成后参考 `SECURITY-NOTES.md`，验证剩余风险项是否可接受并记录计划。
