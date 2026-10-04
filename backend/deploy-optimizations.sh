#!/bin/bash

echo "=========================================="
echo "教学平台 - 生产环境优化部署"
echo "=========================================="
echo ""

cd /www/wwwroot/teaching-platform/backend

echo "1. 备份当前配置"
echo "-------------------"
timestamp=$(date +%Y%m%d_%H%M%S)
cp .env.production .env.production.backup.$timestamp
cp src/config/database.js src/config/database.js.backup.$timestamp
cp src/controllers/resourceController.js src/controllers/resourceController.js.backup.$timestamp
echo "✓ 备份完成: .backup.$timestamp"
echo ""

echo "2. 检查修改的文件"
echo "-------------------"
echo "需要上传的文件："
echo "  - src/config/database.js"
echo "  - src/controllers/resourceController.js"
echo "  - .env.production"
echo ""
read -p "文件已上传？(y/n): " uploaded

if [ "$uploaded" != "y" ]; then
    echo "请先上传修改后的文件，然后重新运行此脚本"
    exit 1
fi

echo ""
echo "3. 验证配置文件"
echo "-------------------"
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production 不存在！"
    exit 1
fi
echo "✓ .env.production 存在"

if [ ! -f "src/config/database.js" ]; then
    echo "❌ database.js 不存在！"
    exit 1
fi
echo "✓ database.js 存在"

if [ ! -f "src/controllers/resourceController.js" ]; then
    echo "❌ resourceController.js 不存在！"
    exit 1
fi
echo "✓ resourceController.js 存在"
echo ""

echo "4. 测试数据库连接"
echo "-------------------"
DB_USER=$(grep "^DB_USER=" .env.production | cut -d'=' -f2)
DB_PASSWORD=$(grep "^DB_PASSWORD=" .env.production | cut -d'=' -f2)
DB_NAME=$(grep "^DB_NAME=" .env.production | cut -d'=' -f2)

mysql -u"$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT 'OK' as status;" 2>&1 | grep -q "OK"

if [ $? -eq 0 ]; then
    echo "✅ 数据库连接成功"
else
    echo "❌ 数据库连接失败！"
    echo "请检查 .env.production 中的数据库配置"
    exit 1
fi
echo ""

echo "5. 停止当前服务"
echo "-------------------"
pm2 stop teaching-backend 2>/dev/null || echo "进程未运行"
sleep 2
echo ""

echo "6. 启动优化后的服务"
echo "-------------------"
NODE_ENV=production pm2 start ecosystem.config.js --update-env
sleep 3
echo ""

echo "7. 检查服务状态"
echo "-------------------"
pm2 list | grep teaching-backend
echo ""

echo "8. 验证API"
echo "-------------------"
sleep 2
echo "测试健康检查接口："
curl -s http://127.0.0.1:8081/health | head -20
echo ""
echo ""

echo "9. 保存PM2配置"
echo "-------------------"
pm2 save
echo "✓ PM2配置已保存"
echo ""

echo "10. 查看最新日志"
echo "-------------------"
pm2 logs teaching-backend --lines 20 --nostream
echo ""

echo "=========================================="
echo "✅ 优化部署完成！"
echo "=========================================="
echo ""
echo "📊 优化内容："
echo "  ✓ 关闭生产环境调试日志"
echo "  ✓ 优化数据库连接日志"
echo "  ✓ 改进文件下载错误处理"
echo "  ✓ 添加友好的错误提示"
echo ""
echo "📝 后续操作："
echo "  1. 在浏览器测试文件下载功能"
echo "  2. 检查错误提示是否友好"
echo "  3. 监控服务器性能"
echo ""
echo "🔍 监控命令："
echo "  pm2 logs teaching-backend    # 查看实时日志"
echo "  pm2 monit                    # 监控资源使用"
echo "  tail -f logs/error.log       # 查看错误日志"
echo ""
