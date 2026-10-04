#!/bin/bash

echo "=========================================="
echo "教学平台 - 服务器清理脚本"
echo "=========================================="
echo ""

cd /www/wwwroot/teaching-platform/backend

echo "⚠️  此脚本将清理以下内容："
echo "  - 备份的配置文件 (.backup.*)"
echo "  - 14天前的日志文件"
echo "  - 临时文件"
echo "  - 诊断脚本（已不需要）"
echo ""
read -p "确认继续？(y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "已取消"
    exit 0
fi

echo ""
echo "1. 清理备份文件"
echo "-------------------"
find . -name "*.backup.*" -type f | while read file; do
    echo "删除: $file"
    rm -f "$file"
done
echo "✓ 完成"
echo ""

echo "2. 清理旧日志文件（保留14天）"
echo "-------------------"
if [ -d "logs" ]; then
    find logs/ -name "*.log" -mtime +14 | while read file; do
        echo "删除: $file"
        rm -f "$file"
    done
    echo "✓ 完成"
else
    echo "logs目录不存在"
fi
echo ""

echo "3. 清理临时文件"
echo "-------------------"
rm -f *.tmp *.temp
echo "✓ 完成"
echo ""

echo "4. 清理诊断脚本"
echo "-------------------"
scripts_to_remove=(
    "diagnose-backend.sh"
    "diagnose-api.sh"
    "fix-database.sh"
    "force-restart.sh"
    "final-test.sh"
    "restart-backend.sh"
)

for script in "${scripts_to_remove[@]}"; do
    if [ -f "$script" ]; then
        echo "删除: $script"
        rm -f "$script"
    fi
done
echo "✓ 完成"
echo ""

echo "5. 清理PM2旧日志"
echo "-------------------"
pm2 flush
echo "✓ 完成"
echo ""

echo "6. 显示磁盘使用情况"
echo "-------------------"
df -h /www/wwwroot/teaching-platform
echo ""

echo "7. 显示目录大小"
echo "-------------------"
du -sh /www/wwwroot/teaching-platform/*
echo ""

echo "=========================================="
echo "✅ 清理完成！"
echo "=========================================="
echo ""
echo "保留的重要文件："
echo "  ✓ ecosystem.config.js （核心配置）"
echo "  ✓ deploy-optimizations.sh （部署脚本）"
echo "  ✓ PRODUCTION_OPTIMIZATION.md （优化文档）"
echo "  ✓ 最近14天的日志文件"
echo ""
