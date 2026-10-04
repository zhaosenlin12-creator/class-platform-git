/**
 * 编程工作台路由
 * 处理在线编程、代码执行、内容部署等功能
 */

const express = require('express');
const router = express.Router();
const Response = require('../utils/response');
const auth = require('../middleware/auth');
const programmingController = require('../controllers/programmingController');

// ========== 编程内容管理（使用真实数据库）==========

// 获取编程内容列表
router.get('/content/list', auth.verifyToken, programmingController.getProgrammingContentList);

// 创建编程内容（兼容前端调用 /content/create）
router.post('/content/create', auth.verifyToken, programmingController.createProgrammingContent);

// 创建编程内容（保留 /content 兼容性）
router.post('/content', auth.verifyToken, programmingController.createProgrammingContent);

// 更新编程内容
router.put('/content/:id', auth.verifyToken, programmingController.updateProgrammingContent);

// 删除编程内容（支持多种路径）
router.delete('/content/:id', auth.verifyToken, programmingController.deleteProgrammingContent);
router.delete('/content/delete/:id', auth.verifyToken, programmingController.deleteProgrammingContent);

// 发布编程内容
router.post('/content/publish/:id', auth.verifyToken, (req, res) => {
  const { id } = req.params;
  res.json(Response.success({ id, status: 'published' }, '发布成功'));
});

// 部署编程内容到课堂
router.post('/content/deploy/:id', auth.verifyToken, (req, res) => {
  try {
    const { id } = req.params;
    const { classroomId, deployType } = req.body;
    
    res.json(Response.success({
      contentId: id,
      classroomId,
      deployType: deployType || 'exercise',
      deployTime: new Date().toISOString(),
      status: 'deployed'
    }, '部署成功'));
  } catch (error) {
    res.status(500).json(Response.error('部署编程内容失败'));
  }
});

// ========== 代码执行 ==========

// 执行代码
router.post('/execute', auth.verifyToken, (req, res) => {
  try {
    const { code, language, input } = req.body;
    
    // Mock代码执行结果
    res.json(Response.success({
      output: `执行结果：\nHello, World!\n程序执行成功！`,
      executionTime: 0.123,
      memory: 2.5,
      status: 'success'
    }));
  } catch (error) {
    res.status(500).json(Response.error('代码执行失败'));
  }
});

module.exports = router;


