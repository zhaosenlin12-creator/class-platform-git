/**
 * 课程路由（直接挂载在/course下）
 * 处理前端直接调用/course/*的请求
 */

const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const auth = require('../middleware/auth');
const teacherOnlyAccess = auth.requireUserIdentity([1, 2], '仅教师或管理员可访问课程管理');

router.use(auth.verifyToken);
router.use(teacherOnlyAccess);

// ========== 课程管理 ==========
router.get('/list', courseController.getCourseList);
router.get('/listAll', courseController.getCourseList);
// 课程包列表（必须放在/:id之前，避免packages被当作id参数）
router.get('/packages', courseController.getCourseList);
router.get('/:id', courseController.getCourseById);
router.post('/', courseController.createCourse);
router.put('/:id', courseController.updateCourse);
router.delete('/:id', courseController.deleteCourse);

// 兼容前端POST请求删除（前端调用 POST /course/delete）
router.post('/delete', courseController.deleteCourse);

module.exports = router;

