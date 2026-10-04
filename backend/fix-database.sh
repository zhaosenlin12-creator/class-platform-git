#!/bin/bash

echo "=========================================="
echo "教学平台 - 数据库连接修复脚本"
echo "=========================================="
echo ""

# 进入后端目录
cd /www/wwwroot/teaching-platform/backend

echo "1. 当前.env.production配置"
echo "-------------------"
cat .env.production | grep -E "DB_"
echo ""

echo "2. 检查MySQL服务状态"
echo "-------------------"
systemctl status mysql | grep Active
echo ""

echo "3. 测试数据库连接"
echo "-------------------"
echo "请输入MySQL root密码（用于检查数据库用户）："
read -s MYSQL_ROOT_PASSWORD
echo ""

# 检查数据库和用户是否存在
echo "检查数据库 teaching_platform 是否存在："
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW DATABASES LIKE 'teaching_platform';" 2>/dev/null
echo ""

echo "检查用户 teaching_user 的权限："
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT user, host FROM mysql.user WHERE user='teaching_user';" 2>/dev/null
echo ""

echo "=========================================="
echo "修复选项"
echo "=========================================="
echo ""
echo "选择修复方式："
echo "1. 重置 teaching_user 密码为配置文件中的密码"
echo "2. 创建新的数据库用户"
echo "3. 查看宝塔面板中的数据库配置"
echo "4. 退出"
echo ""
read -p "请选择 (1-4): " choice

case $choice in
  1)
    echo ""
    DB_PASSWORD=$(grep "^DB_PASSWORD=" .env.production | cut -d'=' -f2-)
    if [ -z "$DB_PASSWORD" ]; then
        echo "❌ 未在 .env.production 中找到 DB_PASSWORD"
        exit 1
    fi
    echo "重置密码为: (已从 .env.production 读取)"
    mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<EOF
ALTER USER 'teaching_user'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
FLUSH PRIVILEGES;
EOF
    echo "✓ 密码已重置"
    ;;
  2)
    echo ""
    echo "创建新用户: teaching_user"
    DB_PASSWORD=$(grep "^DB_PASSWORD=" .env.production | cut -d'=' -f2-)
    if [ -z "$DB_PASSWORD" ]; then
        echo "❌ 未在 .env.production 中找到 DB_PASSWORD"
        exit 1
    fi
    mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<EOF
CREATE USER IF NOT EXISTS 'teaching_user'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON teaching_platform.* TO 'teaching_user'@'localhost';
FLUSH PRIVILEGES;
EOF
    echo "✓ 用户已创建"
    ;;
  3)
    echo ""
    echo "请登录宝塔面板 -> 数据库 -> teaching_platform"
    echo "查看实际的数据库用户名和密码"
    echo ""
    echo "然后修改 .env.production 文件："
    echo "vi /www/wwwroot/teaching-platform/backend/.env.production"
    ;;
  4)
    echo "退出"
    exit 0
    ;;
  *)
    echo "无效选择"
    exit 1
    ;;
esac

echo ""
echo "=========================================="
echo "测试修复结果"
echo "=========================================="
echo ""

# 测试连接
echo "测试数据库连接..."
DB_PASSWORD=$(grep "^DB_PASSWORD=" .env.production | cut -d'=' -f2-)
mysql -uteaching_user -p"$DB_PASSWORD" -e "USE teaching_platform; SELECT 'Connection OK' as status;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ 数据库连接成功！"
    echo ""
    echo "现在重启后端服务："
    echo "pm2 restart teaching-backend"
else
    echo "❌ 数据库连接仍然失败"
    echo ""
    echo "请检查："
    echo "1. 宝塔面板中的数据库密码"
    echo "2. .env.production 中的配置"
fi

echo ""
echo "=========================================="
echo "完成"
echo "=========================================="
