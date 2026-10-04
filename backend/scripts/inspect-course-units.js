const models = require('../src/models');

(async () => {
  try {
    const units = await models.TeachingCourseUnit.findAll({
      where: { course_id: 'course-001', del_flag: 0 },
      attributes: ['id', 'course_id', 'unit_name', 'content_type', 'content_url', 'resource_id', 'resource_name'],
      order: [['unit_no', 'ASC']],
      raw: true
    });

    console.log(JSON.stringify(units, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();

