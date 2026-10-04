/**
 * 更新资源路径
 */
require('dotenv').config();
const sequelize = require('../src/config/database');

async function updateResourcePaths() {
  try {
    console.log('🚀 开始更新资源路径...\n');

    // 更新所有资源的file_path，移除路径前缀
    await sequelize.query(`
      UPDATE teaching_resource 
      SET 
        file_path = SUBSTRING_INDEX(file_path, '/', -1),
        file_url = CONCAT('/api/resource/download/', id)
      WHERE del_flag = 0
    `);

    console.log('✅ 资源路径更新成功！');

    // 查询并显示更新后的数据
    const [resources] = await sequelize.query(`
      SELECT id, resource_name, file_path, file_url 
      FROM teaching_resource 
      WHERE del_flag = 0
    `);

    console.log('\n📋 更新后的资源列表:');
    resources.forEach(r => {
      console.log(`  - ${r.resource_name}: ${r.file_path} -> ${r.file_url}`);
    });

    console.log('\n✅ 更新完成！');
    process.exit(0);

  } catch (error) {
    console.error('❌ 更新失败:', error);
    process.exit(1);
  }
}

updateResourcePaths();





