const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('teaching_platform', 'root', 'Zsl13177068887', {
  host: '127.0.0.1',
  dialect: 'mysql',
  logging: false
});

async function check() {
  try {
    console.log('=== teaching_homework_class table ===\n');
    
    const [cols] = await sequelize.query('DESCRIBE teaching_homework_class');
    console.log('Table structure:');
    cols.forEach(c => {
      console.log(`  ${c.Field.padEnd(20)} ${c.Type.padEnd(20)} ${c.Null === 'NO' ? 'NOT NULL' : ''}`);
    });
    
    const [records] = await sequelize.query(`
      SELECT * FROM teaching_homework_class 
      ORDER BY create_time DESC 
      LIMIT 10
    `);
    
    console.log(`\nRecent assignments (${records.length} records):`);
    records.forEach(r => {
      console.log(`  Homework ID: ${r.homework_id}, Class ID: ${r.class_id}, Created: ${r.create_time}`);
    });
    
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

check();
