/**
 * Route registration entry.
 */

const authRoutes = require('./authRoutes');
const studentRoutes = require('./studentRoutes');
const classRoutes = require('./classRoutes');
const courseRoutes = require('./courseRoutes');
const teachingRoutes = require('./teachingRoutes');
const homeworkRoutes = require('./homeworkRoutes');
const teacherRoutes = require('./teacherRoutes');
const classroomRoutes = require('./classroomRoutes');
const relationRoutes = require('./relationRoutes');
const apiRoutes = require('./apiRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const resourceRoutes = require('./resourceRoutes');
const programmingRoutes = require('./programmingRoutes');
const learningRoutes = require('./learningRoutes');
const dictRoutes = require('./dictRoutes');
const { logger } = require('../middleware/logger');

module.exports = (app) => {
  app.use('/sys', authRoutes);
  app.use('/sys', dictRoutes);
  app.use('/student', studentRoutes);
  app.use('/class', classRoutes);
  app.use('/course', courseRoutes);
  app.use('/course/resource', resourceRoutes);
  app.use('/teaching', teachingRoutes);
  app.use('/homework', homeworkRoutes);
  app.use('/teacher', teacherRoutes);
  app.use('/classroom', classroomRoutes);
  app.use('/teaching/classroom', classroomRoutes);
  app.use('/api/teaching/classroom', classroomRoutes);
  app.use('/relation', relationRoutes);
  app.use('/api', apiRoutes);
  app.use('/learning', learningRoutes);
  app.use('/resource', resourceRoutes);
  app.use('/api/resource', resourceRoutes);
  app.use('/teaching/teacher/schedule', scheduleRoutes);
  app.use('/teaching/course/resources', resourceRoutes);
  app.use('/programming', programmingRoutes);

  app.use('/api/teaching', teachingRoutes);
  app.use('/api/system', authRoutes);

  logger.info('Route registration completed');
};
