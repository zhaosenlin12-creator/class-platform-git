/**
 * 修复学生登录账号
 * 为所有teaching_student表中的学生创建或更新sys_user记录
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'teaching_platform'
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function hashPassword(str) {
  return await bcrypt.hash(str, 12);
}

function generateUUID() {
  return uuidv4().replace(/-/g, '');
}

async function fixStudentLogin() {
  let connection;
  
  try {
    log('\n╔════════════════════════════════════════╗', 'blue');
    log('║     修复学生登录账号                   ║', 'blue');
    log('╚════════════════════════════════════════╝', 'blue');
    
    connection = await mysql.createConnection(dbConfig);
    log('\n✓ 数据库连接成功', 'green');
    
    // 1. 查询所有学生
    log('\n=== 1. 查询所有学生 ===', 'blue');
    const [students] = await connection.execute(
      'SELECT * FROM teaching_student WHERE del_flag = 0'
    );
    
    log(`找到 ${students.length} 个学生`, 'yellow');
    
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    // 2. 为每个学生创建或更新sys_user记录
    log('\n=== 2. 处理学生登录账号 ===', 'blue');
    
    for (const student of students) {
      const username = student.username || student.student_no;
      
      log(`\n处理学生: ${student.realname} (${username})`, 'cyan');
      
      // 检查是否已存在sys_user记录
      const [existingUsers] = await connection.execute(
        'SELECT * FROM sys_user WHERE username = ? AND del_flag = 0',
        [username]
      );
      
      if (existingUsers.length > 0) {
        // 已存在，检查是否需要更新
        const existingUser = existingUsers[0];
        
        if (existingUser.user_identity !== 3) {
          log(`  ⚠ 用户名 ${username} 已被其他身份占用 (identity=${existingUser.user_identity})`, 'red');
          skippedCount++;
          continue;
        }
        
        // 更新用户信息
        await connection.execute(
          `UPDATE sys_user SET 
            realname = ?,
            phone = ?,
            email = ?,
            sex = ?,
            birthday = ?,
            status = 1,
            update_time = NOW()
          WHERE id = ?`,
          [
            student.realname,
            student.phone,
            student.email,
            student.sex,
            student.birthday,
            existingUser.id
          ]
        );
        
        log(`  ✓ 更新已有账号`, 'green');
        updatedCount++;
        
      } else {
        // 不存在，创建新账号
        const defaultPassword = '123456';
        const passwordHash = await hashPassword(defaultPassword);
        const userId = generateUUID();
        
        await connection.execute(
          `INSERT INTO sys_user (
            id, username, password, realname, avatar, birthday, sex, email, phone,
            user_identity, status, del_flag, create_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            userId,
            username,
            passwordHash,
            student.realname,
            null,
            student.birthday,
            student.sex,
            student.email,
            student.phone,
            3, // user_identity = 3 表示学生
            1, // status = 1 表示正常
            0  // del_flag = 0 表示未删除
          ]
        );
        
        log(`  ✓ 创建新账号 (密码: ${defaultPassword})`, 'green');
        createdCount++;
      }
    }
    
    // 3. 总结
    log('\n=== 3. 处理完成 ===', 'blue');
    log(`\n创建新账号: ${createdCount} 个`, 'green');
    log(`更新已有账号: ${updatedCount} 个`, 'yellow');
    log(`跳过: ${skippedCount} 个`, 'red');
    
    // 4. 验证结果
    log('\n=== 4. 验证结果 ===', 'blue');
    const [finalCheck] = await connection.execute(
      `SELECT s.realname, s.student_no, s.username as student_username, 
              u.username as sys_username, u.status, u.user_identity
       FROM teaching_student s
       LEFT JOIN sys_user u ON (u.username = s.username OR u.username = s.student_no) AND u.del_flag = 0
       WHERE s.del_flag = 0
       ORDER BY s.create_time DESC`
    );
    
    log('\n学生登录账号对应关系:', 'cyan');
    finalCheck.forEach((row, i) => {
      if (row.sys_username) {
        log(`${i + 1}. ✓ ${row.realname} (${row.student_username || row.student_no}) → 登录账号: ${row.sys_username}`, 'green');
      } else {
        log(`${i + 1}. ✗ ${row.realname} (${row.student_username || row.student_no}) → 无登录账号`, 'red');
      }
    });
    
    log('\n=== 5. 登录测试信息 ===', 'blue');
    log('\n所有学生账号的默认密码都是: 123456', 'yellow');
    log('可以使用以下任一账号测试登录:', 'cyan');
    
    const [testUsers] = await connection.execute(
      `SELECT username, realname FROM sys_user WHERE user_identity = 3 AND del_flag = 0 LIMIT 3`
    );
    
    testUsers.forEach((u, i) => {
      log(`${i + 1}. 用户名: ${u.username}, 姓名: ${u.realname}, 密码: 123456`, 'yellow');
    });
    
  } catch (error) {
    log(`\n✗ 错误: ${error.message}`, 'red');
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
      log('\n✓ 数据库连接已关闭', 'green');
    }
  }
}

fixStudentLogin();
