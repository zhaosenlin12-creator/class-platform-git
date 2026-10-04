const models = require('../models');
const { logger } = require('../middleware/logger');

const CLASSROOM_TABLE_NAME = 'teaching_classroom';
const OPTIONAL_CLASSROOM_FIELDS = new Set([
  'class_id',
  'course_id',
  'course_name',
  'lesson_id',
  'lesson_name',
  'resource_id',
  'resource_name',
  'resource_url',
  'content_type',
  'selected_language',
  'demo_content',
  'demo_language'
]);

let cachedClassroomColumnSetPromise = null;

function getClassroomRawAttributes() {
  return (models.TeachingClassroom && models.TeachingClassroom.rawAttributes) || {};
}

function getFallbackSelectableAttributes() {
  const rawAttributes = getClassroomRawAttributes();

  return Object.keys(rawAttributes).filter((attributeName) => {
    const fieldName = rawAttributes[attributeName].field || attributeName;
    return !OPTIONAL_CLASSROOM_FIELDS.has(fieldName);
  });
}

async function getTeachingClassroomColumnSet() {
  if (!cachedClassroomColumnSetPromise) {
    cachedClassroomColumnSetPromise = models.sequelize
      .getQueryInterface()
      .describeTable(CLASSROOM_TABLE_NAME)
      .then((schema) => new Set(Object.keys(schema || {})))
      .catch((error) => {
        logger.warn('Failed to describe teaching_classroom table, falling back to base classroom attributes', {
          error: error.message
        });
        return null;
      });
  }

  return cachedClassroomColumnSetPromise;
}

async function getTeachingClassroomSelectableAttributes() {
  const columnSet = await getTeachingClassroomColumnSet();
  const rawAttributes = getClassroomRawAttributes();
  const attributeNames = Object.keys(rawAttributes);

  if (!columnSet) {
    return getFallbackSelectableAttributes();
  }

  return attributeNames.filter((attributeName) => {
    const fieldName = rawAttributes[attributeName].field || attributeName;
    return columnSet.has(fieldName);
  });
}

async function filterTeachingClassroomPayload(payload) {
  const columnSet = await getTeachingClassroomColumnSet();
  const rawAttributes = getClassroomRawAttributes();
  const fallbackSelectableFields = new Set(getFallbackSelectableAttributes());

  return Object.entries(payload || {}).reduce((result, [attributeName, value]) => {
    const fieldName = rawAttributes[attributeName] && rawAttributes[attributeName].field
      ? rawAttributes[attributeName].field
      : attributeName;

    if (columnSet) {
      if (columnSet.has(fieldName)) {
        result[attributeName] = value;
      }
      return result;
    }

    if (fallbackSelectableFields.has(attributeName)) {
      result[attributeName] = value;
    }
    return result;
  }, {});
}

module.exports = {
  filterTeachingClassroomPayload,
  getTeachingClassroomColumnSet,
  getTeachingClassroomSelectableAttributes
};
