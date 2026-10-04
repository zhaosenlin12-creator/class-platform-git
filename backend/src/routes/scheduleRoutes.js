/**
 * 课程计划/安排路由
 */

const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const auth = require('../middleware/auth');
const teacherOrAdminOnly = auth.requireUserIdentity([1, 2], '仅管理员或教师可访问课程排期');

// 所有计划路由都需要认证
router.use(auth.verifyToken);
router.use(teacherOrAdminOnly);

// 课程计划CRUD
router.get('/list', scheduleController.getScheduleList);
router.get('/today', scheduleController.getTodaySchedule);
router.get('/week', scheduleController.getWeekSchedule);
router.get('/calendar', scheduleController.getScheduleCalendar);
router.get('/statistics', scheduleController.getScheduleStatistics);
router.get('/:id', scheduleController.getScheduleById);

router.post('/create', scheduleController.createSchedule);
router.put('/update', scheduleController.updateSchedule);
router.delete('/:id', scheduleController.deleteSchedule);

// 课程操作
router.post('/start/:scheduleId', scheduleController.startSchedule);
router.post('/complete/:scheduleId', scheduleController.completeSchedule);
router.post('/cancel/:scheduleId', scheduleController.cancelSchedule);

module.exports = router;






