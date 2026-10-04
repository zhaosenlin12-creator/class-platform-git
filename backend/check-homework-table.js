const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('teaching_platform', 'root', 'Zsl13177068887', {
  host: '127.0.0.1',
  dialect: 'mysql',
  logging: false
});

async function checkTable() {
  try {
    const [results] = await sequelize.query('DESCRIBE teaching_homework');
    console.log('teaching_homework 表结构:');
    console.table(results);
    
    const [count] = await sequelize.query('SELECT COUNT(*) as count FROM teaching_homework WHERE status = "template"');
    console.log('\n模板数量:', count[0].count);
    
    const [templates] = await sequelize.query('SELECT id, homework_title, status FROM teaching_homework LIMIT 5');
    console.log('\n最近的作业记录:');
    console.table(templates);
    
    await sequelize.close();
  } catch (error) {
    console.error('错误:', error.message);
  }
}

checkTable();
