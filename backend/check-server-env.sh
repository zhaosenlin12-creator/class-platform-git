#!/bin/bash
# ===========================================
# 服务器环境检查脚本
# 用途：在部署前检查服务器环境是否满足要求
# ===========================================

echo "=========================================="
echo "  🔍 教学平台服务器环境检查"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# 检查函数
check_command() {
    local cmd=$1
    local name=$2
    local required=$3
    
    if command -v $cmd &> /dev/null; then
        local version=$($cmd --version 2>&1 | head -n 1)
        echo -e "${GREEN}✅ $name${NC}: 已安装"
        echo "   版本: $version"
        PASS_COUNT=$((PASS_COUNT + 1))
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}❌ $name${NC}: 未安装 (必需)"
            FAIL_COUNT=$((FAIL_COUNT + 1))
        else
            echo -e "${YELLOW}⚠️  $name${NC}: 未安装 (可选)"
            WARN_COUNT=$((WARN_COUNT + 1))
        fi
        return 1
    fi
}

# ===========================================
# 1. 操作系统信息
# ===========================================
echo "1️⃣  操作系统信息"
echo "-------------------------------------------"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "系统: $NAME"
    echo "版本: $VERSION"
else
    echo "系统: $(uname -s)"
fi
echo "内核: $(uname -r)"
echo "架构: $(uname -m)"
echo ""

# ===========================================
# 2. 硬件资源
# ===========================================
echo "2️⃣  硬件资源"
echo "-------------------------------------------"

# CPU
CPU_CORES=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "未知")
echo "CPU核心数: $CPU_CORES"

if [ "$CPU_CORES" -lt 2 ]; then
    echo -e "${YELLOW}⚠️  建议至少2核CPU${NC}"
    WARN_COUNT=$((WARN_COUNT + 1))
else
    echo -e "${GREEN}✅ CPU核心数满足要求${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

# 内存
if command -v free &> /dev/null; then
    TOTAL_MEM=$(free -h | grep Mem | awk '{print $2}')
    AVAIL_MEM=$(free -h | grep Mem | awk '{print $7}')
    echo "总内存: $TOTAL_MEM"
    echo "可用内存: $AVAIL_MEM"
    
    TOTAL_MEM_MB=$(free -m | grep Mem | awk '{print $2}')
    if [ "$TOTAL_MEM_MB" -lt 2048 ]; then
        echo -e "${YELLOW}⚠️  建议至少2GB内存${NC}"
        WARN_COUNT=$((WARN_COUNT + 1))
    else
        echo -e "${GREEN}✅ 内存满足要求${NC}"
        PASS_COUNT=$((PASS_COUNT + 1))
    fi
fi

# 磁盘空间
echo ""
echo "磁盘使用情况:"
df -h | grep -E '^/dev/' | awk '{print $1 "\t" $5 "\t" $6}'

DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo -e "${YELLOW}⚠️  磁盘使用率${DISK_USAGE}%，建议清理空间${NC}"
    WARN_COUNT=$((WARN_COUNT + 1))
else
    echo -e "${GREEN}✅ 磁盘空间充足${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
fi

echo ""

# ===========================================
# 3. 必需软件检查
# ===========================================
echo "3️⃣  必需软件检查"
echo "-------------------------------------------"

check_command "node" "Node.js" "true"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | sed 's/v//')
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -lt 16 ]; then
        echo -e "${RED}   ❌ Node.js版本需要 >= 16.x${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    else
        echo -e "${GREEN}   ✅ Node.js版本满足要求${NC}"
    fi
fi

check_command "npm" "npm" "true"
check_command "pm2" "PM2" "true"
check_command "mysql" "MySQL客户端" "true"
check_command "nginx" "Nginx" "true"
check_command "git" "Git" "false"

echo ""

# ===========================================
# 4. 服务运行状态
# ===========================================
echo "4️⃣  服务运行状态"
echo "-------------------------------------------"

# MySQL
if command -v systemctl &> /dev/null; then
    if systemctl is-active --quiet mysql || systemctl is-active --quiet mysqld; then
        echo -e "${GREEN}✅ MySQL${NC}: 运行中"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${RED}❌ MySQL${NC}: 未运行"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    
    # Nginx
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✅ Nginx${NC}: 运行中"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${RED}❌ Nginx${NC}: 未运行"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
else
    echo -e "${YELLOW}⚠️  无法检查服务状态（未找到systemctl）${NC}"
fi

echo ""

# ===========================================
# 5. 端口占用检查
# ===========================================
echo "5️⃣  端口占用检查"
echo "-------------------------------------------"

check_port() {
    local port=$1
    local service=$2
    
    if command -v netstat &> /dev/null; then
        if netstat -tuln | grep -q ":$port "; then
            echo -e "${YELLOW}⚠️  端口 $port${NC}: 已被占用 ($service)"
            if [ "$service" = "应用端口" ]; then
                WARN_COUNT=$((WARN_COUNT + 1))
            fi
        else
            echo -e "${GREEN}✅ 端口 $port${NC}: 可用 ($service)"
            PASS_COUNT=$((PASS_COUNT + 1))
        fi
    else
        echo -e "${YELLOW}⚠️  无法检查端口（未找到netstat）${NC}"
    fi
}

check_port 80 "HTTP"
check_port 443 "HTTPS"
check_port 3306 "MySQL"
check_port 8081 "应用端口"

echo ""

# ===========================================
# 6. 目录权限检查
# ===========================================
echo "6️⃣  目录权限检查"
echo "-------------------------------------------"

check_directory() {
    local dir=$1
    local name=$2
    
    if [ -d "$dir" ]; then
        if [ -w "$dir" ]; then
            echo -e "${GREEN}✅ $name${NC}: 可写"
            PASS_COUNT=$((PASS_COUNT + 1))
        else
            echo -e "${RED}❌ $name${NC}: 无写入权限"
            FAIL_COUNT=$((FAIL_COUNT + 1))
        fi
    else
        echo -e "${YELLOW}⚠️  $name${NC}: 目录不存在"
        WARN_COUNT=$((WARN_COUNT + 1))
    fi
}

check_directory "/www/wwwroot" "网站根目录"
check_directory "/www/wwwroot/teaching-platform-backend" "后端目录"
check_directory "/www/wwwroot/teaching-platform-web" "前端目录"

echo ""

# ===========================================
# 7. 网络连接检查
# ===========================================
echo "7️⃣  网络连接检查"
echo "-------------------------------------------"

# DNS解析
if command -v dig &> /dev/null; then
    echo "测试DNS解析..."
    if dig +short google.com &> /dev/null; then
        echo -e "${GREEN}✅ DNS解析${NC}: 正常"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${RED}❌ DNS解析${NC}: 失败"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
elif command -v nslookup &> /dev/null; then
    echo "测试DNS解析..."
    if nslookup google.com &> /dev/null; then
        echo -e "${GREEN}✅ DNS解析${NC}: 正常"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${RED}❌ DNS解析${NC}: 失败"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
fi

# 外网连接
echo "测试外网连接..."
if curl -s --connect-timeout 5 http://www.baidu.com &> /dev/null; then
    echo -e "${GREEN}✅ 外网连接${NC}: 正常"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${YELLOW}⚠️  外网连接${NC}: 可能受限"
    WARN_COUNT=$((WARN_COUNT + 1))
fi

echo ""

# ===========================================
# 8. PM2配置检查
# ===========================================
echo "8️⃣  PM2配置检查"
echo "-------------------------------------------"

if command -v pm2 &> /dev/null; then
    PM2_PROCESSES=$(pm2 jlist 2>/dev/null | grep -c "teaching-backend" || echo "0")
    
    if [ "$PM2_PROCESSES" -gt 0 ]; then
        echo -e "${GREEN}✅ PM2进程${NC}: 已有teaching-backend进程"
        echo "   进程数: $PM2_PROCESSES"
        pm2 list | grep teaching
    else
        echo -e "${YELLOW}⚠️  PM2进程${NC}: 未找到teaching-backend进程"
        echo "   (首次部署正常)"
    fi
    
    # 检查PM2开机自启
    if pm2 startup 2>&1 | grep -q "already"; then
        echo -e "${GREEN}✅ PM2开机自启${NC}: 已配置"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${YELLOW}⚠️  PM2开机自启${NC}: 未配置"
        echo "   运行: pm2 startup"
        WARN_COUNT=$((WARN_COUNT + 1))
    fi
fi

echo ""

# ===========================================
# 9. 配置文件检查
# ===========================================
echo "9️⃣  配置文件检查"
echo "-------------------------------------------"

BACKEND_DIR="/www/wwwroot/teaching-platform-backend"

if [ -f "$BACKEND_DIR/.env" ]; then
    echo -e "${GREEN}✅ .env文件${NC}: 存在"
    
    # 检查关键配置
    check_env_config() {
        local key=$1
        local value=$(grep "^$key=" "$BACKEND_DIR/.env" 2>/dev/null | cut -d'=' -f2-)
        
        if [ -z "$value" ]; then
            echo -e "   ${RED}❌ $key${NC}: 未配置"
            FAIL_COUNT=$((FAIL_COUNT + 1))
        elif [[ "$value" == *"your_"* ]] || [[ "$value" == *"change"* ]]; then
            echo -e "   ${RED}❌ $key${NC}: 使用示例值"
            FAIL_COUNT=$((FAIL_COUNT + 1))
        else
            echo -e "   ${GREEN}✅ $key${NC}: 已配置"
            PASS_COUNT=$((PASS_COUNT + 1))
        fi
    }
    
    check_env_config "NODE_ENV"
    check_env_config "DB_PASSWORD"
    check_env_config "JWT_SECRET"
    check_env_config "CORS_ORIGIN"
else
    echo -e "${RED}❌ .env文件${NC}: 不存在"
    echo "   需要从 .env.production.example 创建"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

echo ""

# ===========================================
# 总结
# ===========================================
echo "=========================================="
echo "  📊 检查结果总结"
echo "=========================================="
echo -e "${GREEN}✅ 通过: $PASS_COUNT${NC}"
echo -e "${YELLOW}⚠️  警告: $WARN_COUNT${NC}"
echo -e "${RED}❌ 失败: $FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 环境检查通过！可以开始部署。${NC}"
    echo ""
    echo "下一步："
    echo "  1. 上传代码到服务器"
    echo "  2. 配置 .env 文件"
    echo "  3. 导入数据库"
    echo "  4. 运行部署脚本"
    exit 0
else
    echo -e "${RED}⚠️  发现 $FAIL_COUNT 个问题，请先解决后再部署。${NC}"
    echo ""
    echo "建议："
    echo "  1. 检查上方标记为 ❌ 的项目"
    echo "  2. 安装缺失的软件"
    echo "  3. 配置必需的服务"
    echo "  4. 重新运行此检查脚本"
    exit 1
fi
