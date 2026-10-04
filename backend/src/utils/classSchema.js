const models = require('../models');
const { logger } = require('../middleware/logger');

const CLASS_TABLE_NAME = 'teaching_class';
const OPTIONAL_CLASS_FIELDS = new Set([
  'schedule_weekdays',
  'schedule_time_slots',
  'description'
]);

let cachedClassColumnSetPromise = null;

function getClassRawAttributes() {
  return (models.TeachingClass && models.TeachingClass.rawAttributes) || {};
}

function getFallbackSelectableAttributes() {
  const rawAttributes = getClassRawAttributes();

  return Object.keys(rawAttributes).filter((attributeName) => {
    const fieldName = rawAttributes[attributeName].field || attributeName;
    return !OPTIONAL_CLASS_FIELDS.has(fieldName);
  });
}

async function getTeachingClassColumnSet() {
  if (!cachedClassColumnSetPromise) {
    cachedClassColumnSetPromise = models.sequelize
      .getQueryInterface()
      .describeTable(CLASS_TABLE_NAME)
      .then((schema) => new Set(Object.keys(schema || {})))
      .catch((error) => {
        logger.warn('Failed to describe teaching_class table, falling back to base class attributes', {
          error: error.message
        });
        return null;
      });
  }

  return cachedClassColumnSetPromise;
}

async function getTeachingClassSelectableAttributes() {
  const columnSet = await getTeachingClassColumnSet();
  const rawAttributes = getClassRawAttributes();
  const attributeNames = Object.keys(rawAttributes);

  if (!columnSet) {
    return getFallbackSelectableAttributes();
  }

  return attributeNames.filter((attributeName) => {
    const fieldName = rawAttributes[attributeName].field || attributeName;
    return columnSet.has(fieldName);
  });
}

async function filterTeachingClassPayload(payload) {
  const columnSet = await getTeachingClassColumnSet();
  const rawAttributes = getClassRawAttributes();
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
  filterTeachingClassPayload,
  getTeachingClassColumnSet,
  getTeachingClassSelectableAttributes
};
