#!/bin/bash
# ===========================================
# 教学平台后端部署脚本
# 适用于宝塔面板服务器
# ===========================================

set -e  # 遇到错误立即退出

echo "=========================================="
echo "  🚀 开始部署教学平台后端"
echo "=========================================="

# 配置变量
APP_NAME="teaching-platform-backend"
APP_DIR="/www/wwwroot/teaching-platform-backend"
BACKUP_DIR="/www/backup/teaching-platform"
LOG_DIR="/www/wwwlogs"

# 创建备份目录
mkdir -p $BACKUP_DIR
mkdir -p $LOG_DIR

# 1. 备份当前版本（如果存在）
if [ -d "$APP_DIR" ]; then
    echo "📦 备份当前版本..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    tar -czf "$BACKUP_DIR/backend_backup_$TIMESTAMP.tar.gz" -C "$APP_DIR" .
    echo "✅ 备份完成: backend_backup_$TIMESTAMP.tar.gz"
fi

# 2. 创建应用目录（如果不存在）
mkdir -p $APP_DIR
cd $APP_DIR

# 3. 安装依赖
echo "📦 安装npm依赖..."
npm install --production

# 4. 检查 .env 文件
if [ ! -f ".env" ]; then
  echo "❌ 未找到 .env 文件，请先复制 .env.example 并填写数据库密码、JWT密钥、CORS 域名"
  exit 1
fi

# 5. 停止旧的PM2进程
echo "🛑 停止旧进程..."
pm2 stop $APP_NAME || true
pm2 delete $APP_NAME || true

# 6. 启动新进程
echo "🚀 启动新进程..."
pm2 start ecosystem.config.js

# 7. 保存PM2配置
pm2 save

# 8. 显示运行状态
echo ""
echo "=========================================="
echo "  ✅ 部署完成！"
echo "=========================================="
echo ""
pm2 status
echo ""
echo "📌 后续操作:"
echo "   1. 编辑配置文件: vim $APP_DIR/.env"
echo "   2. 查看日志: pm2 logs $APP_NAME"
echo "   3. 重启服务: pm2 restart $APP_NAME"
echo "   4. 访问健康检查: http://localhost:8081/health"
echo ""








