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
  if (await columnExists(queryInterface, tableName, columnName)) {
    console.log(`[MIGRATION] ${tableName}.${columnName} already exists, skipping`);
    return;
  }

  console.log(`[MIGRATION] adding ${tableName}.${columnName}`);
  await queryInterface.addColumn(tableName, columnName, definition);
}

async function indexExists(queryInterface, tableName, indexName) {
  const indexes = await queryInterface.showIndex(tableName);
  return indexes.some((index) => index.name === indexName);
}

async function addIndexIfMissing(queryInterface, tableName, indexName, fields) {
  if (await indexExists(queryInterface, tableName, indexName)) {
    console.log(`[MIGRATION] ${tableName}.${indexName} already exists, skipping`);
    return;
  }

  console.log(`[MIGRATION] adding index ${tableName}.${indexName}`);
  await queryInterface.addIndex(tableName, fields, {
    name: indexName
  });
}

async function printVerification(queryInterface, tableName) {
  const table = await queryInterface.describeTable(tableName);
  const indexes = await queryInterface.showIndex(tableName);
  const relevantIndexes = indexes
    .filter((index) => ['idx_teaching_resource_course_system', 'idx_teaching_resource_course_stage'].includes(index.name))
    .map((index) => ({
      name: index.name,
      columns: (index.fields || []).map((field) => field.attribute).join(',')
    }));

  console.log('[MIGRATION] verification');
  console.log(`  - ${tableName}.course_system: ${table.course_system ? 'present' : 'missing'}`);
  console.log(`  - ${tableName}.course_stage: ${table.course_stage ? 'present' : 'missing'}`);
  relevantIndexes.forEach((index) => {
    console.log(`  - ${index.name}: ${index.columns}`);
  });
}

(async () => {
  const queryInterface = sequelize.getQueryInterface();
  const tableName = 'teaching_resource';

  try {
    await addColumnIfMissing(queryInterface, tableName, 'course_system', {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '课程体系/系列'
    });

    await addColumnIfMissing(queryInterface, tableName, 'course_stage', {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '课程阶段'
    });

    await addIndexIfMissing(queryInterface, tableName, 'idx_teaching_resource_course_system', ['course_system']);
    await addIndexIfMissing(queryInterface, tableName, 'idx_teaching_resource_course_stage', ['course_stage']);

    await printVerification(queryInterface, tableName);
    await sequelize.close();
    console.log('[MIGRATION] resource taxonomy fields ready');
    process.exit(0);
  } catch (error) {
    console.error('[MIGRATION] failed to ensure resource taxonomy fields:', error);
    await sequelize.close();
    process.exit(1);
  }
})();
