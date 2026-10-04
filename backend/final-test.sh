#!/bin/bash

echo "=========================================="
echo "教学平台 - 最终诊断测试"
echo "=========================================="
echo ""

cd /www/wwwroot/teaching-platform/backend

echo "1. 检查后端进程"
echo "-------------------"
pm2 list | grep teaching-backend
echo ""

echo "2. 检查8081端口"
echo "-------------------"
netstat -antp | grep 8081
lsof -i:8081 2>/dev/null || echo "lsof命令不可用"
echo ""

echo "3. 测试健康检查接口（多种方式）"
echo "-------------------"
echo "方式1: curl"
curl -s http://127.0.0.1:8081/health
echo ""
echo ""

echo "方式2: wget"
wget -q -O - http://127.0.0.1:8081/health
echo ""
echo ""

echo "方式3: telnet测试端口"
(echo "GET /health HTTP/1.0"; echo "") | nc 127.0.0.1 8081
echo ""

echo "4. 测试系统配置接口"
echo "-------------------"
curl -s http://127.0.0.1:8081/sys/config/getCurrentConfig
echo ""
echo ""

echo "5. 测试通过域名访问"
echo "-------------------"
curl -s https://class.codebn.cn/sys/config/getCurrentConfig
echo ""
echo ""

echo "6. 查看最新的后端日志"
echo "-------------------"
pm2 logs teaching-backend --lines 10 --nostream
echo ""

echo "7. 检查Nginx状态"
echo "-------------------"
nginx -t
systemctl status nginx | grep Active
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "如果步骤3的curl返回JSON数据，说明后端正常"
echo "如果步骤5返回404或错误，说明是Nginx配置问题"
echo ""
