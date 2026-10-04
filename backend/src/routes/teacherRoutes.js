/**
 * Teacher-facing compatibility routes.
 *
 * Only keep real business handlers here. Legacy mock/stub routes must fail
 * closed so production traffic never receives fabricated success responses.
 */
const express = require('express');
const router = express.Router();
const Response = require('../utils/response');
const auth = require('../middleware/auth');
const homeworkController = require('../controllers/homeworkController');
const { logger } = require('../middleware/logger');

const teacherOnlyAccess = auth.requireUserIdentity([1, 2], '仅教师或管理员可访问教师工作台');

router.use(auth.verifyToken);
router.use(teacherOnlyAccess);

function retireLegacyRoute(routeName, replacement) {
  return (req, res) => {
    logger.warn('Blocked retired teacher compatibility route', {
      route: routeName,
      method: req.method,
      userId: req.user && req.user.id ? req.user.id : null
    });

    const message = replacement
      ? `Legacy teacher route has been retired. Use ${replacement} instead.`
      : 'Legacy teacher route has been retired.';

    return res.status(410).json(Response.error(message, 410));
  };
}

router.get('/homework/list', homeworkController.getTeacherHomeworkList);

router.get('/homework/submissions', (req, res, next) => {
  const homeworkId = req.query.homeworkId || req.query.id;

  if (!homeworkId) {
    return res.status(400).json(Response.error('homeworkId is required', 400));
  }

  req.params.homeworkId = homeworkId;
  return homeworkController.getHomeworkSubmissions(req, res, next);
});

router.post('/homework/create', homeworkController.createHomework);
router.post('/homework/update', homeworkController.updateHomework);
router.post('/homework/delete', homeworkController.deleteHomework);
router.post('/homework/grade', homeworkController.reviewHomework);

router.post('/homework/autoGrade', retireLegacyRoute('/teacher/homework/autoGrade', '/homework/review'));
router.get('/homework/gradeHistory', retireLegacyRoute('/teacher/homework/gradeHistory', '/homework/submissions/:homeworkId'));
router.get('/homework/lateSubmissions', retireLegacyRoute('/teacher/homework/lateSubmissions', '/homework/submissions/:homeworkId'));
router.get('/homework/unsubmittedStudents', retireLegacyRoute('/teacher/homework/unsubmittedStudents', '/homework/assignments'));
router.post('/homework/markOverdue', retireLegacyRoute('/teacher/homework/markOverdue'));
router.post('/homework/updateSubmissionScore', retireLegacyRoute('/teacher/homework/updateSubmissionScore', '/homework/review'));
router.post('/homework/batchUpdateDeadlines', retireLegacyRoute('/teacher/homework/batchUpdateDeadlines'));
router.post('/homework/scheduleReminders', retireLegacyRoute('/teacher/homework/scheduleReminders'));
router.get('/students/all', retireLegacyRoute('/teacher/students/all', '/student/list'));
router.post('/students/byClasses', retireLegacyRoute('/teacher/students/byClasses', '/class/:id/students'));
router.post('/notifications/send', retireLegacyRoute('/teacher/notifications/send'));

module.exports = router;
