#!/bin/bash
# ===========================================
# 教学平台快速部署脚本（更新版）
# 用途：快速更新服务器上的代码
# 适用：已完成初次部署，仅需更新代码
# ===========================================

set -e  # 遇到错误立即退出

echo "=========================================="
echo "  🔄 开始更新教学平台"
echo "=========================================="

# 配置变量（根据实际情况修改）
BACKEND_DIR="/www/wwwroot/teaching-platform-backend"
FRONTEND_DIR="/www/wwwroot/teaching-platform-web"
APP_NAME="teaching-backend"
BACKUP_DIR="/www/backup/teaching-platform"

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  请使用root用户或sudo执行此脚本"
    exit 1
fi

# 创建备份目录
mkdir -p $BACKUP_DIR

# ===========================================
# 步骤1: 备份当前版本
# ===========================================
echo ""
echo "📦 步骤1: 备份当前版本..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 备份后端
if [ -d "$BACKEND_DIR" ]; then
    cd $BACKEND_DIR
    tar -czf "$BACKUP_DIR/backend_$TIMESTAMP.tar.gz" \
        --exclude=node_modules \
        --exclude=uploads \
        --exclude=logs \
        .
    echo "✅ 后端备份完成: backend_$TIMESTAMP.tar.gz"
fi

# 备份前端
if [ -d "$FRONTEND_DIR" ]; then
    cd $FRONTEND_DIR
    tar -czf "$BACKUP_DIR/frontend_$TIMESTAMP.tar.gz" .
    echo "✅ 前端备份完成: frontend_$TIMESTAMP.tar.gz"
fi

# ===========================================
# 步骤2: 更新后端代码
# ===========================================
echo ""
echo "🔄 步骤2: 更新后端代码..."
cd $BACKEND_DIR

# 如果使用Git
if [ -d ".git" ]; then
    echo "📥 从Git拉取最新代码..."
    git pull origin main || git pull origin master
else
    echo "⚠️  未检测到Git仓库，请手动上传代码"
    echo "💡 提示: 将代码上传到 $BACKEND_DIR"
    read -p "代码已上传？按Enter继续..." 
fi

# 安装/更新依赖
echo "📦 安装npm依赖..."
npm install --production

echo "✅ 后端代码更新完成"

# ===========================================
# 步骤3: 更新前端代码
# ===========================================
echo ""
echo "🔄 步骤3: 更新前端代码..."

# 检查是否存在dist.zip
if [ -f "/tmp/dist.zip" ]; then
    echo "📥 解压前端构建文件..."
    cd $FRONTEND_DIR
    rm -rf *
    unzip -o /tmp/dist.zip
    mv dist/* .
    rm -rf dist
    echo "✅ 前端代码更新完成"
else
    echo "⚠️  未找到 /tmp/dist.zip"
    echo "💡 请先上传前端构建文件到 /tmp/dist.zip"
    read -p "已上传？按Enter继续..." 
    if [ -f "/tmp/dist.zip" ]; then
        cd $FRONTEND_DIR
        rm -rf *
        unzip -o /tmp/dist.zip
        mv dist/* .
        rm -rf dist
        echo "✅ 前端代码更新完成"
    else
        echo "❌ 仍未找到dist.zip，跳过前端更新"
    fi
fi

# ===========================================
# 步骤4: 检查配置文件
# ===========================================
echo ""
echo "⚙️  步骤4: 检查配置文件..."
cd $BACKEND_DIR

if [ ! -f ".env" ]; then
    echo "❌ 错误: 未找到 .env 配置文件"
    echo "💡 请从 .env.production.example 复制并修改"
    exit 1
fi

# 检查关键配置
echo "🔍 检查关键配置项..."
check_env_var() {
    local var_name=$1
    local var_value=$(grep "^$var_name=" .env | cut -d'=' -f2-)
    
    if [ -z "$var_value" ]; then
        echo "  ⚠️  $var_name: 未设置"
        return 1
    elif [[ "$var_value" == *"your_"* ]] || [[ "$var_value" == *"change"* ]]; then
        echo "  ❌ $var_name: 使用了示例值，需要修改"
        return 1
    else
        echo "  ✅ $var_name: 已配置"
        return 0
    fi
}

CONFIG_OK=true

check_env_var "NODE_ENV" || CONFIG_OK=false
check_env_var "DB_PASSWORD" || CONFIG_OK=false
check_env_var "JWT_SECRET" || CONFIG_OK=false
check_env_var "CORS_ORIGIN" || CONFIG_OK=false
check_env_var "TRUST_PROXY_ENABLED" || CONFIG_OK=false

if [ "$CONFIG_OK" = false ]; then
    echo ""
    echo "❌ 配置检查失败，请修改 .env 文件"
    read -p "是否继续部署？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# ===========================================
# 步骤5: 执行数据库迁移（如果有新的SQL文件）
# ===========================================
echo ""
echo "🗄️  步骤5: 检查数据库迁移..."

if [ -d "migrations" ] && [ "$(ls -A migrations/*.sql 2>/dev/null)" ]; then
    echo "发现迁移文件，是否执行？"
    ls -la migrations/*.sql
    read -p "执行数据库迁移？(y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        DB_HOST=$(grep "^DB_HOST=" .env | cut -d'=' -f2-)
        DB_USER=$(grep "^DB_USER=" .env | cut -d'=' -f2-)
        DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d'=' -f2-)
        DB_NAME=$(grep "^DB_NAME=" .env | cut -d'=' -f2-)
        
        for sql_file in migrations/*.sql; do
            echo "执行: $sql_file"
            mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$sql_file"
            echo "✅ 完成: $sql_file"
        done
    fi
else
    echo "✅ 无新的迁移文件"
fi

# ===========================================
# 步骤6: 重启后端服务
# ===========================================
echo ""
echo "🔄 步骤6: 重启后端服务..."

# 检查PM2进程是否存在
if pm2 list | grep -q "$APP_NAME"; then
    echo "重启现有进程..."
    pm2 restart $APP_NAME
else
    echo "启动新进程..."
    pm2 start ecosystem.config.js
fi

# 保存PM2配置
pm2 save

echo "✅ 后端服务已重启"

# ===========================================
# 步骤7: 重启Nginx
# ===========================================
echo ""
echo "🔄 步骤7: 重启Nginx..."

# 测试Nginx配置
nginx -t

if [ $? -eq 0 ]; then
    nginx -s reload
    echo "✅ Nginx已重启"
else
    echo "❌ Nginx配置错误，请检查"
    exit 1
fi

# ===========================================
# 步骤8: 健康检查
# ===========================================
echo ""
echo "🏥 步骤8: 健康检查..."

# 等待服务启动
sleep 3

# 检查PM2状态
echo "PM2状态:"
pm2 status

# 检查后端健康
echo ""
echo "后端健康检查:"
HEALTH_CHECK=$(curl -s http://localhost:8081/health || echo "failed")

if echo "$HEALTH_CHECK" | grep -q '"status":"ok"'; then
    echo "✅ 后端服务正常"
else
    echo "❌ 后端服务异常"
    echo "详细信息: $HEALTH_CHECK"
    echo "查看日志: pm2 logs $APP_NAME"
fi

# ===========================================
# 完成
# ===========================================
echo ""
echo "=========================================="
echo "  ✅ 部署完成！"
echo "=========================================="
echo ""
echo "📋 后续操作:"
echo "  1. 查看日志: pm2 logs $APP_NAME"
echo "  2. 查看状态: pm2 status"
echo "  3. 访问网站: https://class.codebn.cn"
echo "  4. 健康检查: https://class.codebn.cn/health"
echo ""
echo "📦 备份位置: $BACKUP_DIR"
echo "📝 备份时间: $TIMESTAMP"
echo ""
echo "⚠️  如果遇到问题，可以回滚到备份版本:"
echo "   cd $BACKEND_DIR"
echo "   tar -xzf $BACKUP_DIR/backend_$TIMESTAMP.tar.gz"
echo "   pm2 restart $APP_NAME"
echo ""
