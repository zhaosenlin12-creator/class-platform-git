require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_NAME = process.env.DB_NAME || 'teaching_platform';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? '123456';

const { DataTypes } = require('sequelize');
const sequelize = require('../src/config/database');

async function columnExists(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(table, columnName);
}

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const exists = await columnExists(queryInterface, tableName, columnName);
  if (exists) {
    console.log(`[MIGRATION] ${tableName}.${columnName} already exists, skipping`);
    return;
  }

  console.log(`[MIGRATION] adding ${tableName}.${columnName}`);
  await queryInterface.addColumn(tableName, columnName, definition);
}

(async () => {
  const queryInterface = sequelize.getQueryInterface();
  const tableName = 'teaching_class';

  try {
    await addColumnIfMissing(queryInterface, tableName, 'schedule_weekdays', {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '班级上课星期配置(JSON array)'
    });

    await addColumnIfMissing(queryInterface, tableName, 'schedule_time_slots', {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '班级上课时间段配置(JSON array)'
    });

    await sequelize.close();
    console.log('[MIGRATION] class schedule fields ready');
    process.exit(0);
  } catch (error) {
    console.error('[MIGRATION] failed to add class schedule fields:', error);
    await sequelize.close();
    process.exit(1);
  }
})();
