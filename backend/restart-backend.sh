#!/bin/bash

echo "=========================================="
echo "教学平台后端 - 一键重启脚本"
echo "=========================================="
echo ""

# 进入后端目录
cd /www/wwwroot/teaching-platform/backend

echo "1. 停止现有进程"
echo "-------------------"
pm2 stop teaching-backend 2>/dev/null || echo "进程未运行"
pm2 delete teaching-backend 2>/dev/null || echo "进程不存在"
echo ""

echo "2. 清理旧日志"
echo "-------------------"
mkdir -p logs
echo "日志目录已准备"
echo ""

echo "3. 检查配置文件"
echo "-------------------"
if [ ! -f ".env.production" ]; then
    echo "错误：.env.production 文件不存在！"
    exit 1
fi
echo "✓ .env.production 存在"

if [ ! -f "ecosystem.config.js" ]; then
    echo "错误：ecosystem.config.js 文件不存在！"
    exit 1
fi
echo "✓ ecosystem.config.js 存在"

if [ ! -f "src/server.js" ]; then
    echo "错误：src/server.js 文件不存在！"
    exit 1
fi
echo "✓ src/server.js 存在"
echo ""

echo "4. 启动后端服务（单实例模式）"
echo "-------------------"
pm2 start ecosystem.config.js --env production
echo ""

echo "5. 等待服务启动（5秒）"
echo "-------------------"
sleep 5
echo ""

echo "6. 检查服务状态"
echo "-------------------"
pm2 list | grep teaching-backend
echo ""

echo "7. 检查端口监听"
echo "-------------------"
netstat -antp | grep 8081 || echo "警告：8081端口未监听"
echo ""

echo "8. 测试API连接"
echo "-------------------"
curl -s http://127.0.0.1:8081/health && echo "" || echo "警告：无法连接到后端API"
echo ""

echo "9. 查看最新日志"
echo "-------------------"
pm2 logs teaching-backend --lines 20 --nostream
echo ""

echo "=========================================="
echo "重启完成！"
echo "=========================================="
echo ""
echo "如果服务正常，请访问："
echo "https://class.codebn.cn"
echo ""
echo "查看实时日志："
echo "pm2 logs teaching-backend"
echo ""
