/**
 * 编程内容控制器
 * 使用teaching_course_unit表存储编程练习内容
 */

const models = require('../models');
const Response = require('../utils/response');
const uuidUtil = require('../utils/uuid');
const { logger } = require('../middleware/logger');

/**
 * 获取编程内容列表
 * GET /programming/content/list
 */
exports.getProgrammingContentList = async (req, res, next) => {
  try {
    const { pageNo = 1, pageSize = 10 } = req.query;
    const offset = (pageNo - 1) * pageSize;
    
    const where = {
      del_flag: 0,
      content_type: 'programming' // 使用content_type标识编程内容
    };
    
    const { count, rows } = await models.TeachingCourseUnit.findAndCountAll({
      where,
      limit: parseInt(pageSize),
      offset: parseInt(offset),
      order: [['create_time', 'DESC']]
    });
    
    // 解析objectives JSON字段（编程内容存储在objectives中）
    const formattedRows = rows.map(row => {
      const rowData = row.toJSON();
      try {
        const contentData = JSON.parse(rowData.objectives || '{}');
        return {
          id: rowData.id,
          title: rowData.unit_name,
          code: contentData.code || '',
          language: contentData.language || 'python',
          difficulty: contentData.difficulty || '入门',
          description: rowData.description || '',
          status: 'published',
          createTime: rowData.create_time
        };
      } catch (e) {
        return {
          id: rowData.id,
          title: rowData.unit_name,
          code: '',
          language: 'python',
          difficulty: '入门',
          description: rowData.description || '',
          status: 'published',
          createTime: rowData.create_time
        };
      }
    });
    
    res.json(Response.page(formattedRows, count, pageNo, pageSize));
    
  } catch (error) {
    logger.error('Get programming content list failed', { error: error.message, stack: error.stack });
    next(error);
  }
};

/**
 * 创建编程内容
 * POST /programming/content/create 或 POST /programming/content
 */
exports.createProgrammingContent = async (req, res, next) => {
  try {
    logger.debug('Create programming content request received', { payload: req.body });
    
    const { title, language, difficulty, description, code, courseId } = req.body;
    
    if (!title) {
      return res.json(Response.error('标题不能为空', 400));
    }
    
    const contentData = {
      id: uuidUtil.generate(),
      unit_name: title,
      course_id: courseId || 'default-programming', // 默认编程课程ID
      content_type: 'programming', // 标识为编程内容
      content_url: null, // 编程内容存储在content字段
      description: description || '',
      objectives: JSON.stringify({
        code: code || '',
        language: language || 'python',
        difficulty: difficulty || '入门'
      }),
      sort_no: 0,
      del_flag: 0,
      create_by: req.user?.id,
      create_time: new Date()
    };
    
    logger.debug('Create programming content payload prepared', { contentData });
    
    const newContent = await models.TeachingCourseUnit.create(contentData);
    
    logger.debug('Programming content created', { content: newContent.toJSON() });
    
    res.json(Response.success(newContent, '创建成功'));
    
  } catch (error) {
    logger.error('Create programming content failed', { error: error.message, stack: error.stack });
    next(error);
  }
};

/**
 * 更新编程内容
 * PUT /programming/content/:id
 */
exports.updateProgrammingContent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, language, difficulty, description, code } = req.body;
    
    const updateData = {
      unit_name: title,
      description: description || '',
      objectives: JSON.stringify({
        code: code || '',
        language: language || 'python',
        difficulty: difficulty || '入门'
      }),
      update_by: req.user?.id,
      update_time: new Date()
    };
    
    const [updated] = await models.TeachingCourseUnit.update(updateData, {
      where: { id, del_flag: 0 }
    });
    
    if (updated === 0) {
      return res.json(Response.error('编程内容不存在', 404));
    }
    
    res.json(Response.success(null, '更新成功'));
    
  } catch (error) {
    logger.error('Update programming content failed', { error: error.message, stack: error.stack });
    next(error);
  }
};

/**
 * 删除编程内容
 * DELETE /programming/content/:id
 */
exports.deleteProgrammingContent = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const [deleted] = await models.TeachingCourseUnit.update(
      { del_flag: 1, update_by: req.user?.id, update_time: new Date() },
      { where: { id, del_flag: 0 } }
    );
    
    if (deleted === 0) {
      return res.json(Response.error('编程内容不存在', 404));
    }
    
    res.json(Response.success(null, '删除成功'));
    
  } catch (error) {
    logger.error('Delete programming content failed', { error: error.message, stack: error.stack });
    next(error);
  }
};

module.exports = exports;

