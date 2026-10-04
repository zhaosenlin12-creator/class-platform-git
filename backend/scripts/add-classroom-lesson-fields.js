require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_NAME = process.env.DB_NAME || 'teaching_platform';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? '123456';

const sequelize = require('../src/config/database');

async function columnExists(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(table, columnName);
}

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const exists = await columnExists(queryInterface, tableName, columnName);
  if (!exists) {
    console.log(`🔧 [MIGRATION] 添加字段 ${columnName} 到 ${tableName}`);
    await queryInterface.addColumn(tableName, columnName, definition);
  } else {
    console.log(`ℹ️  [MIGRATION] 字段 ${columnName} 已存在，跳过`);
  }
}

(async () => {
  const queryInterface = sequelize.getQueryInterface();
  const tableName = 'teaching_classroom';

  try {
    await addColumnIfMissing(queryInterface, tableName, 'lesson_id', {
      type: require('sequelize').DataTypes.STRING(32),
      allowNull: true,
      comment: '关联课节ID'
    });

    await addColumnIfMissing(queryInterface, tableName, 'lesson_name', {
      type: require('sequelize').DataTypes.STRING(200),
      allowNull: true,
      comment: '课节名称'
    });

    await addColumnIfMissing(queryInterface, tableName, 'resource_id', {
      type: require('sequelize').DataTypes.STRING(32),
      allowNull: true,
      comment: '关联资源ID'
    });

    await addColumnIfMissing(queryInterface, tableName, 'resource_name', {
      type: require('sequelize').DataTypes.STRING(200),
      allowNull: true,
      comment: '资源名称'
    });

    await addColumnIfMissing(queryInterface, tableName, 'resource_url', {
      type: require('sequelize').DataTypes.STRING(500),
      allowNull: true,
      comment: '资源访问URL'
    });

    await addColumnIfMissing(queryInterface, tableName, 'content_type', {
      type: require('sequelize').DataTypes.STRING(50),
      allowNull: true,
      comment: '课堂内容类型（scratch/ppt/code等）'
    });

    await addColumnIfMissing(queryInterface, tableName, 'selected_language', {
      type: require('sequelize').DataTypes.STRING(50),
      allowNull: true,
      comment: '教师默认演示语言'
    });

    await sequelize.close();
    console.log('✅ 所有课堂扩展字段检查完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 添加课堂扩展字段失败:', error);
    await sequelize.close();
    process.exit(1);
  }
})();

