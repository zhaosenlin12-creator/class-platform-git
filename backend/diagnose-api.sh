#!/bin/bash

echo "=========================================="
echo "教学平台 - API连接诊断"
echo "=========================================="
echo ""

echo "1. 检查后端进程和端口"
echo "-------------------"
pm2 list | grep teaching-backend
echo ""
netstat -antp | grep 8081
echo ""

echo "2. 测试后端本地API（绕过Nginx）"
echo "-------------------"
echo "测试健康检查："
curl -s http://127.0.0.1:8081/health
echo ""
echo ""

echo "测试系统配置接口："
curl -s http://127.0.0.1:8081/sys/config/getCurrentConfig
echo ""
echo ""

echo "3. 测试通过Nginx访问（HTTP）"
echo "-------------------"
echo "测试 /sys/config/getCurrentConfig："
curl -s http://127.0.0.1/sys/config/getCurrentConfig
echo ""
echo ""

echo "4. 测试通过域名访问（HTTPS）"
echo "-------------------"
echo "测试 https://class.codebn.cn/sys/config/getCurrentConfig："
curl -s https://class.codebn.cn/sys/config/getCurrentConfig
echo ""
echo ""

echo "5. 检查Nginx配置"
echo "-------------------"
echo "检查Nginx配置语法："
nginx -t
echo ""

echo "查看 /sys/ 代理配置："
grep -A 5 "location.*\/sys\/" /www/server/panel/vhost/nginx/class.codebn.cn.conf
echo ""

echo "6. 检查Nginx错误日志（最近20行）"
echo "-------------------"
tail -20 /www/wwwlogs/class-codebn-error.log
echo ""

echo "7. 检查Nginx访问日志（最近10行）"
echo "-------------------"
tail -10 /www/wwwlogs/class-codebn-access.log
echo ""

echo "8. 检查防火墙和端口"
echo "-------------------"
echo "检查8081端口是否开放："
firewall-cmd --list-ports 2>/dev/null || echo "防火墙未启用或使用其他工具"
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "如果本地API (127.0.0.1:8081) 可以访问，"
echo "但通过域名无法访问，说明是Nginx配置问题。"
echo ""
echo "解决方案："
echo "1. 重新加载Nginx: nginx -s reload"
echo "2. 检查Nginx配置文件是否正确"
echo "3. 查看Nginx错误日志找到具体原因"
echo ""
