const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('teaching_platform', 'root', 'Zsl13177068887', {
  host: '127.0.0.1',
  dialect: 'mysql',
  logging: false
});

async function checkDatabase() {
  try {
    console.log('=== 检查数据库表结构 ===\n');
    
    // 1. 查看所有表
    const [tables] = await sequelize.query('SHOW TABLES');
    console.log('📋 数据库表列表:');
    tables.forEach(t => console.log(`  - ${Object.values(t)[0]}`));
    
    // 2. 检查teaching_homework表
    console.log('\n📊 teaching_homework 表结构:');
    const [homeworkCols] = await sequelize.query('DESCRIBE teaching_homework');
    homeworkCols.forEach(c => {
      console.log(`  ${c.Field.padEnd(20)} ${c.Type.padEnd(20)} ${c.Null === 'NO' ? 'NOT NULL' : 'NULL    '} ${c.Key.padEnd(4)} ${c.Default || ''}`);
    });
    
    // 3. 查看最新的作业记录
    console.log('\n📝 最新5条作业记录:');
    const [homework] = await sequelize.query(`
      SELECT id, homework_title, homework_type, status, is_template, create_time 
      FROM teaching_homework 
      WHERE del_flag=0 
      ORDER BY create_time DESC 
      LIMIT 5
    `);
    homework.forEach(h => {
      console.log(`  ID: ${h.id}`);
      console.log(`    标题: ${h.homework_title}`);
      console.log(`    类型: ${h.homework_type}`);
      console.log(`    状态: ${h.status}`);
      console.log(`    是否模板: ${h.is_template}`);
      console.log(`    创建时间: ${h.create_time}`);
      console.log('');
    });
    
    // 4. 检查是否有homework_assignment表
    const hasAssignmentTable = tables.some(t => Object.values(t)[0] === 'homework_assignment');
    if (hasAssignmentTable) {
      console.log('✅ homework_assignment 表存在');
      const [assignCols] = await sequelize.query('DESCRIBE homework_assignment');
      assignCols.forEach(c => {
        console.log(`  ${c.Field.padEnd(20)} ${c.Type.padEnd(20)}`);
      });
      
      const [assignments] = await sequelize.query('SELECT * FROM homework_assignment LIMIT 5');
      console.log(`\n  记录数: ${assignments.length}`);
    } else {
      console.log('❌ homework_assignment 表不存在 - 需要创建！');
    }
    
    await sequelize.close();
    console.log('\n✅ 检查完成');
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

checkDatabase();
