const models = require('../models');
const { logger } = require('../middleware/logger');

const STUDENT_TABLE_NAME = 'teaching_student';
const OPTIONAL_STUDENT_FIELDS = new Set([
  'username',
  'avatar',
  'id_card',
  'parent_phone',
  'parent_name',
  'address',
  'enrollment_date',
  'learning_status',
  'seat',
  'remark',
  'update_time'
]);

let cachedStudentColumnSetPromise = null;

function getStudentRawAttributes() {
  return (models.TeachingStudent && models.TeachingStudent.rawAttributes) || {};
}

function getFallbackSelectableAttributes() {
  const rawAttributes = getStudentRawAttributes();

  return Object.keys(rawAttributes).filter((attributeName) => {
    const fieldName = rawAttributes[attributeName].field || attributeName;
    return !OPTIONAL_STUDENT_FIELDS.has(fieldName);
  });
}

async function getTeachingStudentColumnSet() {
  if (!cachedStudentColumnSetPromise) {
    cachedStudentColumnSetPromise = models.sequelize
      .getQueryInterface()
      .describeTable(STUDENT_TABLE_NAME)
      .then((schema) => new Set(Object.keys(schema || {})))
      .catch((error) => {
        logger.warn('Failed to describe teaching_student table, falling back to base student attributes', {
          error: error.message
        });
        return null;
      });
  }

  return cachedStudentColumnSetPromise;
}

async function getTeachingStudentSelectableAttributes() {
  const columnSet = await getTeachingStudentColumnSet();
  const rawAttributes = getStudentRawAttributes();
  const attributeNames = Object.keys(rawAttributes);

  if (!columnSet) {
    return getFallbackSelectableAttributes();
  }

  return attributeNames.filter((attributeName) => {
    const fieldName = rawAttributes[attributeName].field || attributeName;
    return columnSet.has(fieldName);
  });
}

module.exports = {
  getTeachingStudentColumnSet,
  getTeachingStudentSelectableAttributes
};
