const models = require('../models');
const { logger } = require('../middleware/logger');

const RESOURCE_TABLE_NAME = 'teaching_resource';
const OPTIONAL_RESOURCE_FIELDS = new Set([
  'course_id',
  'course_name',
  'course_system',
  'course_stage',
  'file_extension',
  'mime_type',
  'file_url',
  'storage_type',
  'folder_id',
  'tags'
]);

let cachedResourceColumnSetPromise = null;

function getResourceRawAttributes() {
  return (models.TeachingResource && models.TeachingResource.rawAttributes) || {};
}

function getFallbackSelectableAttributes() {
  const rawAttributes = getResourceRawAttributes();

  return Object.keys(rawAttributes).filter((attributeName) => {
    const fieldName = rawAttributes[attributeName].field || attributeName;
    return !OPTIONAL_RESOURCE_FIELDS.has(fieldName);
  });
}

async function getTeachingResourceColumnSet() {
  if (!cachedResourceColumnSetPromise) {
    cachedResourceColumnSetPromise = models.sequelize
      .getQueryInterface()
      .describeTable(RESOURCE_TABLE_NAME)
      .then((schema) => new Set(Object.keys(schema || {})))
      .catch((error) => {
        logger.warn('Failed to describe teaching_resource table, falling back to model attributes', {
          error: error.message
        });
        return null;
      });
  }

  return cachedResourceColumnSetPromise;
}

async function getTeachingResourceSelectableAttributes() {
  const columnSet = await getTeachingResourceColumnSet();
  const rawAttributes = getResourceRawAttributes();
  const attributeNames = Object.keys(rawAttributes);

  if (!columnSet) {
    return getFallbackSelectableAttributes();
  }

  return attributeNames.filter((attributeName) => {
    const fieldName = rawAttributes[attributeName].field || attributeName;
    return columnSet.has(fieldName);
  });
}

async function filterTeachingResourcePayload(payload) {
  const columnSet = await getTeachingResourceColumnSet();
  const rawAttributes = getResourceRawAttributes();
  const fallbackSelectableFields = new Set(getFallbackSelectableAttributes());

  return Object.entries(payload || {}).reduce((result, [attributeName, value]) => {
    const fieldName = rawAttributes[attributeName] && rawAttributes[attributeName].field
      ? rawAttributes[attributeName].field
      : attributeName;

    if (columnSet ? columnSet.has(fieldName) : fallbackSelectableFields.has(attributeName)) {
      result[attributeName] = value;
    }

    return result;
  }, {});
}

async function getTeachingResourceSchemaSupport() {
  const columnSet = await getTeachingResourceColumnSet();
  const hasColumn = (fieldName) => Boolean(columnSet && columnSet.has(fieldName));

  return {
    courseId: hasColumn('course_id'),
    courseName: hasColumn('course_name'),
    courseSystem: hasColumn('course_system'),
    courseStage: hasColumn('course_stage'),
    fileUrl: hasColumn('file_url'),
    storageType: hasColumn('storage_type')
  };
}

module.exports = {
  filterTeachingResourcePayload,
  getTeachingResourceColumnSet,
  getTeachingResourceSchemaSupport,
  getTeachingResourceSelectableAttributes
};
