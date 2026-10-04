/**
 * 认证路由
 * 处理登录、登出、权限等
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { logger } = require('../middleware/logger');

// 公开路由（不需要认证）
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/config/getCurrentConfig', authController.getConfig);
router.get('/config/getConfigInit', authController.getConfig);

// 验证码图片接口（公开，不需要认证）
router.get('/randomImage/:timestamp', (req, res) => {
  try {
    logger.debug('Captcha request received', { timestamp: req.params.timestamp });
    const captchaUtil = require('../utils/captcha');
    const captcha = captchaUtil.generateCaptcha();
    
    // 确保captcha.data存在
    if (!captcha || !captcha.data) {
      logger.error('Captcha generation returned empty data', {
        hasCaptcha: !!captcha,
        hasData: !!(captcha && captcha.data)
      });
      return res.status(500).json({
        success: false,
        message: '获取验证码失败'
      });
    }
    
    // 设置响应头，确保SVG正确显示
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // 直接返回，不使用Response工具类，避免数据被处理
    const responseData = {
      success: true,
      code: captcha.key, // 返回验证码key
      result: captcha.data, // SVG图片数据（重要！）
      data: captcha.data, // 兼容字段
      img: captcha.data, // 兼容字段  
      checkKey: captcha.key // 兼容旧接口字段名
    };
    
    logger.debug('Captcha response generated', {
      success: responseData.success, 
      code: responseData.code, 
      hasResult: !!responseData.result,
      resultLength: responseData.result ? responseData.result.length : 0,
      resultPreview: responseData.result ? responseData.result.substring(0, 100) : 'null'
    });
    
    res.json(responseData);
  } catch (error) {
    logger.error('Captcha generation failed', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: '获取验证码失败: ' + (error.message || '未知错误')
    });
  }
});

// 需要认证的路由
router.get('/permission/getUserPermissionByToken', auth.verifyToken, authController.getUserPermission);
router.get('/duplicate/check', auth.verifyToken, authController.duplicateCheck);

// ========== 用户密码管理 ==========
router.put('/user/updatePassword', auth.verifyToken, authController.updatePassword);

// ========== 系统日志API ==========
router.get('/loginfo', auth.verifyToken, (req, res) => {
  const Response = require('../utils/response');
  res.json(Response.success({
    todayIp: '127.0.0.1',
    todayVisitCount: '156',
    totalVisitCount: '12456'
  }));
});

// ========== 访问统计API ==========
router.get('/visitInfo', auth.verifyToken, (req, res) => {
  const Response = require('../utils/response');
  res.json(Response.success([
    { date: '2025-10-19', ip: 120, visit: 234 },
    { date: '2025-10-20', ip: 132, visit: 267 },
    { date: '2025-10-21', ip: 101, visit: 189 },
    { date: '2025-10-22', ip: 134, visit: 298 },
    { date: '2025-10-23', ip: 156, visit: 321 },
    { date: '2025-10-24', ip: 178, visit: 356 },
    { date: '2025-10-25', ip: 189, visit: 389 }
  ]));
});

// ========== 文件上传接口 ==========
const { upload, handleUploadError } = require('../middleware/upload');
// 使用带错误处理的上传中间件
router.post('/common/upload', auth.verifyToken, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    next();
  });
}, authController.uploadFile);

// ========== 文件记录接口（编辑器使用） ==========
router.post('/sysFile/add', auth.verifyToken, authController.addFileRecord);
router.delete('/sysFile/deleteByPath', auth.verifyToken, authController.deleteFileRecordByPath);
router.get('/sysFile/deleteByPath', auth.verifyToken, authController.deleteFileRecordByPath);

// 教师管理相关路由
const teacherController = require('../controllers/teacherController');
const teacherReadAccess = auth.requireUserIdentity([1, 2], '仅教师或管理员可查看教师列表');
const adminOnlyAccess = auth.requireUserIdentity([1], '仅管理员可执行该操作');

// 获取教师列表
router.get('/user/teacherList', auth.verifyToken, teacherReadAccess, teacherController.getTeacherList);

// 添加教师
router.post('/user/addTeacher', auth.verifyToken, adminOnlyAccess, teacherController.addTeacher);

// 编辑教师
router.put('/user/editTeacher', auth.verifyToken, adminOnlyAccess, teacherController.editTeacher);

// 删除教师
router.delete('/user/deleteTeacher', auth.verifyToken, adminOnlyAccess, teacherController.deleteTeacher);

// 重置教师密码
router.post('/user/resetPassword', auth.verifyToken, adminOnlyAccess, teacherController.resetPassword);

module.exports = router;


