/**
 * API通用路由
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const courseController = require('../controllers/courseController');
const auth = require('../middleware/auth');
const { logger } = require('../middleware/logger');

// 用户相关
router.get('/user/current', auth.verifyToken, authController.getCurrentUser);

// ========== 性能分析API（前端性能监控）==========
// 前端性能数据收集
router.post('/analytics/performance', (req, res) => {
  // 记录性能数据（可以存入数据库或日志）
  logger.debug('Performance analytics payload received', { payload: req.body });
  res.json({
    success: true,
    message: '性能数据已记录',
    timestamp: new Date().toISOString()
  });
});

router.get('/analytics/performance', (req, res) => {
  // 返回性能分析数据
  res.json({
    success: true,
    message: '性能分析数据',
    result: {
      pageLoadTime: 1234,
      apiResponseTime: 567,
      renderTime: 890
    }
  });
});

// ========== 通知API ==========
// 获取未读通知数量
router.get('/notifications/unread', auth.verifyToken, (req, res) => {
  // 返回未读通知数量（暂时返回0）
  res.json({
    success: true,
    result: {
      count: 0,
      notifications: []
    },
    message: '获取未读通知成功',
    code: 200
  });
});

// ========== 课程相关API（兼容旧接口）==========
// 课程列表接口（兼容前端直接调用/course/list）
router.get('/course/list', auth.verifyToken, courseController.getCourseList);
router.get('/course/listAll', auth.verifyToken, courseController.getCourseList);
// 课程包（使用course表）
router.get('/course/packages', auth.verifyToken, courseController.getCourseList);

module.exports = router;


