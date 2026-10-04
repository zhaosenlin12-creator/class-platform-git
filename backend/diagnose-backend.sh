#!/bin/bash

echo "=========================================="
echo "教学平台后端诊断脚本"
echo "=========================================="
echo ""

echo "1. 检查PM2进程状态"
echo "-------------------"
pm2 list | grep teaching-backend
echo ""

echo "2. 检查端口监听情况"
echo "-------------------"
echo "检查8081端口是否被监听："
netstat -antp | grep 8081
echo ""
lsof -i:8081 2>/dev/null || echo "端口8081未被监听"
echo ""

echo "3. 查看PM2日志（最近30行）"
echo "-------------------"
pm2 logs teaching-backend --lines 30 --nostream
echo ""

echo "4. 检查后端目录和文件"
echo "-------------------"
ls -la /www/wwwroot/teaching-platform/backend/src/server.js
echo ""

echo "5. 检查环境变量文件"
echo "-------------------"
cat /www/wwwroot/teaching-platform/backend/.env.production | grep -E "PORT|DB_"
echo ""

echo "6. 测试本地API连接"
echo "-------------------"
echo "测试健康检查接口："
curl -s http://127.0.0.1:8081/health || echo "无法连接到后端"
echo ""

echo "7. 检查Node.js进程"
echo "-------------------"
ps aux | grep node | grep -v grep
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="
