/**
 * 关联关系路由（课程-学生、学习进度等）
 */

const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const auth = require('../middleware/auth');
const teacherOrAdminOnly = auth.requireUserIdentity([1, 2], '浠呮暀甯堟垨绠＄悊鍛樺彲璁块棶鍏宠仈鏁版嵁');

// 所有关联路由都需要认证
router.use(auth.verifyToken);
router.use(teacherOrAdminOnly);

// 课程相关
router.get('/getStudentsByCourse', courseController.getStudentsByCourse);
router.get('/getStudentProgress', courseController.getStudentProgress);

module.exports = router;








