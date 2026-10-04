const express = require('express');
const router = express.Router();
const homeworkController = require('../controllers/homeworkController');
const auth = require('../middleware/auth');

const teacherOrAdminOnly = auth.requireUserIdentity([1, 2], '仅管理员或教师可执行作业管理操作');
const studentOnly = auth.requireUserIdentity([3], '仅学生可执行此操作');

router.use(auth.verifyToken);

router.get('/templates', teacherOrAdminOnly, homeworkController.getTemplateList);
router.post('/templates', teacherOrAdminOnly, homeworkController.createTemplate);
router.get('/templates/:id', teacherOrAdminOnly, homeworkController.getTemplateDetail);
router.put('/templates/:id', teacherOrAdminOnly, homeworkController.updateTemplate);
router.delete('/templates/:id', teacherOrAdminOnly, homeworkController.deleteTemplate);

router.post('/assign', teacherOrAdminOnly, homeworkController.assignHomework);
router.get('/assignments', teacherOrAdminOnly, homeworkController.getAssignmentList);
router.delete('/assignments/:id', teacherOrAdminOnly, homeworkController.cancelAssignment);

router.get('/list', teacherOrAdminOnly, homeworkController.getHomeworkList);
router.get('/student/my-homework', studentOnly, homeworkController.getStudentHomework);
router.post('/submit', studentOnly, homeworkController.submitHomework);
router.post('/review', teacherOrAdminOnly, homeworkController.reviewHomework);

router.get('/submissions/:homeworkId', teacherOrAdminOnly, homeworkController.getHomeworkSubmissions);
router.get('/statistics/:homeworkId', teacherOrAdminOnly, homeworkController.getHomeworkStatistics);

router.post('/', teacherOrAdminOnly, homeworkController.createHomework);
router.post('/create', teacherOrAdminOnly, homeworkController.createHomework);
router.post('/delete', teacherOrAdminOnly, homeworkController.deleteHomework);
router.post('/update', teacherOrAdminOnly, homeworkController.updateHomework);
router.delete('/:id', teacherOrAdminOnly, homeworkController.deleteHomework);

module.exports = router;
