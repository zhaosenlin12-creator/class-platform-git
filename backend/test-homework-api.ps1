# 测试作业模板和分配API

$baseUrl = "http://localhost:8081"
$token = ""
$templateId = ""

Write-Host "`n========================================"
Write-Host "🧪 开始测试作业模板和分配API"
Write-Host "========================================`n"

# 1. 登录
Write-Host "1️⃣ 登录..."
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/sys/login" -Method Post -Body $loginBody -ContentType "application/json"

if ($loginResponse.success) {
    $token = $loginResponse.result.token
    Write-Host "✅ 登录成功" -ForegroundColor Green
} else {
    Write-Host "❌ 登录失败" -ForegroundColor Red
    exit
}

# 2. 创建作业模板
Write-Host "`n2️⃣ 创建作业模板..."
$templateBody = @{
    homeworkTitle = "测试作业模板"
    homeworkType = "编程作业"
    difficulty = 3
    description = "这是一个测试作业模板"
    requirements = "请完成以下要求：`n1. 编写代码`n2. 提交报告"
    totalScore = 100
    passScore = 60
} | ConvertTo-Json

$headers = @{
    "X-Access-Token" = $token
    "Content-Type" = "application/json"
}

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/homework/templates" -Method Post -Body $templateBody -Headers $headers
    
    if ($createResponse.success) {
        $templateId = $createResponse.result.id
        Write-Host "✅ 创建模板成功，模板ID: $templateId" -ForegroundColor Green
    } else {
        Write-Host "❌ 创建模板失败: $($createResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ 创建模板失败: $_" -ForegroundColor Red
}

# 3. 获取模板列表
Write-Host "`n3️⃣ 获取模板列表..."
try {
    $listResponse = Invoke-RestMethod -Uri "$baseUrl/homework/templates?pageNo=1&pageSize=10" -Method Get -Headers $headers
    
    if ($listResponse.success) {
        Write-Host "✅ 获取模板列表成功，共 $($listResponse.result.total) 个模板" -ForegroundColor Green
        $listResponse.result.records | ForEach-Object {
            Write-Host "   - $($_.homework_title) (难度: $($_.difficulty))"
        }
    }
} catch {
    Write-Host "❌ 获取模板列表失败: $_" -ForegroundColor Red
}

# 4. 获取模板详情
Write-Host "`n4️⃣ 获取模板详情..."
try {
    $detailResponse = Invoke-RestMethod -Uri "$baseUrl/homework/templates/$templateId" -Method Get -Headers $headers
    
    if ($detailResponse.success) {
        Write-Host "✅ 获取模板详情成功" -ForegroundColor Green
        Write-Host "   标题: $($detailResponse.result.homework_title)"
        Write-Host "   难度: $($detailResponse.result.difficulty)"
    }
} catch {
    Write-Host "❌ 获取模板详情失败: $_" -ForegroundColor Red
}

# 5. 获取班级列表（用于分配）
Write-Host "`n5️⃣ 获取班级列表..."
try {
    $classResponse = Invoke-RestMethod -Uri "$baseUrl/class/list?pageNo=1&pageSize=1" -Method Get -Headers $headers
    
    if ($classResponse.success -and $classResponse.result.total -gt 0) {
        $classId = $classResponse.result.records[0].id
        Write-Host "✅ 找到班级: $($classResponse.result.records[0].class_name)" -ForegroundColor Green
        
        # 6. 分配作业
        Write-Host "`n6️⃣ 分配作业..."
        $assignBody = @{
            templateId = $templateId
            classIds = @($classId)
            publishTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
            deadline = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss")
            allowLateSubmit = 0
        } | ConvertTo-Json
        
        $assignResponse = Invoke-RestMethod -Uri "$baseUrl/homework/assign" -Method Post -Body $assignBody -Headers $headers
        
        if ($assignResponse.success) {
            Write-Host "✅ 作业分配成功，作业ID: $($assignResponse.result.id)" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️  没有可用的班级，跳过作业分配测试" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 分配作业失败: $_" -ForegroundColor Red
}

# 7. 获取已分配作业列表
Write-Host "`n7️⃣ 获取已分配作业列表..."
try {
    $assignmentResponse = Invoke-RestMethod -Uri "$baseUrl/homework/assignments?pageNo=1&pageSize=10" -Method Get -Headers $headers
    
    if ($assignmentResponse.success) {
        Write-Host "✅ 获取已分配作业列表成功，共 $($assignmentResponse.result.total) 个作业" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ 获取已分配作业列表失败: $_" -ForegroundColor Red
}

Write-Host "`n========================================"
Write-Host "✅ 所有测试完成！"
Write-Host "========================================`n"
