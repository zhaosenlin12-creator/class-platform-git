const models = require('../models');
const { logger } = require('../middleware/logger');

const COURSE_UNIT_TABLE_NAME = 'teaching_course_unit';
const OPTIONAL_COURSE_UNIT_FIELDS = new Set([
  'resource_id',
  'resource_name',
  'objectives'
]);

let cachedCourseUnitColumnSetPromise = null;

function getCourseUnitRawAttributes() {
  return (models.TeachingCourseUnit && models.TeachingCourseUnit.rawAttributes) || {};
}

function getFallbackSelectableAttributes() {
  const rawAttributes = getCourseUnitRawAttributes();

  return Object.keys(rawAttributes).filter((attributeName) => {
    const fieldName = rawAttributes[attributeName].field || attributeName;
    return !OPTIONAL_COURSE_UNIT_FIELDS.has(fieldName);
  });
}

async function getTeachingCourseUnitColumnSet() {
  if (!cachedCourseUnitColumnSetPromise) {
    cachedCourseUnitColumnSetPromise = models.sequelize
      .getQueryInterface()
      .describeTable(COURSE_UNIT_TABLE_NAME)
      .then((schema) => new Set(Object.keys(schema || {})))
      .catch((error) => {
        logger.warn('Failed to describe teaching_course_unit table, falling back to base course unit attributes', {
          error: error.message
        });
        return null;
      });
  }

  return cachedCourseUnitColumnSetPromise;
}

async function getTeachingCourseUnitSelectableAttributes() {
  const columnSet = await getTeachingCourseUnitColumnSet();
  const rawAttributes = getCourseUnitRawAttributes();
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
  getTeachingCourseUnitColumnSet,
  getTeachingCourseUnitSelectableAttributes
};
