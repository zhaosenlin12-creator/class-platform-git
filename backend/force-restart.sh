#!/bin/bash

echo "=========================================="
echo "教学平台后端 - 强制重启脚本"
echo "=========================================="
echo ""

cd /www/wwwroot/teaching-platform/backend

echo "1. 停止并删除所有teaching-backend进程"
echo "-------------------"
pm2 stop teaching-backend 2>/dev/null
pm2 delete teaching-backend 2>/dev/null
pm2 kill 2>/dev/null
sleep 2
echo "✓ PM2进程已清理"
echo ""

echo "2. 清理.env文件（避免冲突）"
echo "-------------------"
if [ -f ".env" ]; then
    mv .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✓ .env已备份并移除"
else
    echo "✓ .env不存在，无需清理"
fi
echo ""

echo "3. 验证.env.production配置"
echo "-------------------"
cat .env.production | grep -E "DB_USER|DB_PASSWORD|PORT"
echo ""

echo "4. 测试数据库连接"
echo "-------------------"
DB_USER=$(grep "^DB_USER=" .env.production | cut -d'=' -f2)
DB_PASSWORD=$(grep "^DB_PASSWORD=" .env.production | cut -d'=' -f2)
DB_NAME=$(grep "^DB_NAME=" .env.production | cut -d'=' -f2)

echo "测试连接: $DB_USER@localhost/$DB_NAME"
mysql -u"$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT 'Database OK' as status;" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 数据库连接成功"
else
    echo "❌ 数据库连接失败！"
    echo ""
    echo "请检查："
    echo "1. 用户名: $DB_USER"
    echo "2. 密码是否正确"
    echo "3. 数据库: $DB_NAME 是否存在"
    echo ""
    read -p "是否继续启动后端？(y/n): " continue
    if [ "$continue" != "y" ]; then
        exit 1
    fi
fi
echo ""

echo "5. 启动后端（使用.env.production）"
echo "-------------------"
NODE_ENV=production pm2 start ecosystem.config.js --env production --update-env
sleep 3
echo ""

echo "6. 检查进程状态"
echo "-------------------"
pm2 list
echo ""

echo "7. 检查端口监听"
echo "-------------------"
netstat -antp | grep 8081
echo ""

echo "8. 测试API"
echo "-------------------"
sleep 2
curl -s http://127.0.0.1:8081/health
echo ""
echo ""

echo "9. 查看启动日志"
echo "-------------------"
pm2 logs teaching-backend --lines 30 --nostream
echo ""

echo "=========================================="
echo "完成！"
echo "=========================================="
echo ""
echo "如果还有问题，查看实时日志："
echo "pm2 logs teaching-backend"
echo ""
