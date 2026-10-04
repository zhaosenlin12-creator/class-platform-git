const models = require('../models');
const { logger } = require('../middleware/logger');

const COURSE_TABLE_NAME = 'teaching_course';
const OPTIONAL_COURSE_FIELDS = new Set([
  'cover',
  'category',
  'level',
  'description',
  'duration',
  'price',
  'teacher_id',
  'teacher_name',
  'student_count',
  'avg_rating',
  'update_time'
]);

let cachedCourseColumnSetPromise = null;

function getCourseRawAttributes() {
  return (models.TeachingCourse && models.TeachingCourse.rawAttributes) || {};
}

function getFallbackSelectableAttributes() {
  const rawAttributes = getCourseRawAttributes();

  return Object.keys(rawAttributes).filter((attributeName) => {
    const fieldName = rawAttributes[attributeName].field || attributeName;
    return !OPTIONAL_COURSE_FIELDS.has(fieldName);
  });
}

async function getTeachingCourseColumnSet() {
  if (!cachedCourseColumnSetPromise) {
    cachedCourseColumnSetPromise = models.sequelize
      .getQueryInterface()
      .describeTable(COURSE_TABLE_NAME)
      .then((schema) => new Set(Object.keys(schema || {})))
      .catch((error) => {
        logger.warn('Failed to describe teaching_course table, falling back to base course attributes', {
          error: error.message
        });
        return null;
      });
  }

  return cachedCourseColumnSetPromise;
}

async function getTeachingCourseSelectableAttributes() {
  const columnSet = await getTeachingCourseColumnSet();
  const rawAttributes = getCourseRawAttributes();
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
  getTeachingCourseColumnSet,
  getTeachingCourseSelectableAttributes
};
