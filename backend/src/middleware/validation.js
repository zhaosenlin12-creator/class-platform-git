/**
 * 输入验证中间件
 * 使用 express-validator 进行统一验证
 */

const { body, param, validationResult } = require('express-validator');
const Response = require('../utils/response');

/**
 * 处理验证错误
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(Response.error(
      `输入验证失败: ${errors.array().map(item => item.msg).join(', ')}`,
      400
    ));
  }

  next();
};

/**
 * 学生相关验证规则
 */
const studentValidation = {
  create: [
    body('realname').notEmpty().withMessage('学生姓名不能为空'),
    body('studentNo').notEmpty().withMessage('学号不能为空'),
    body('phone').optional({ checkFalsy: true, nullable: true }).isMobilePhone('zh-CN').withMessage('手机号格式不正确'),
    body('email').optional({ checkFalsy: true, nullable: true }).isEmail().withMessage('邮箱格式不正确'),
    handleValidationErrors
  ],

  update: [
    param('id').notEmpty().withMessage('学生ID不能为空'),
    body('phone').optional({ checkFalsy: true, nullable: true }).isMobilePhone('zh-CN').withMessage('手机号格式不正确'),
    body('email').optional({ checkFalsy: true, nullable: true }).isEmail().withMessage('邮箱格式不正确'),
    handleValidationErrors
  ]
};

/**
 * 课程相关验证规则
 */
const courseValidation = {
  create: [
    body('courseName').notEmpty().withMessage('课程名称不能为空'),
    body('category')
      .optional({ checkFalsy: true, nullable: true })
      .isIn(['scratch', 'python', 'javascript', 'scratchjr', 'blockly'])
      .withMessage('课程类别无效'),
    handleValidationErrors
  ],

  createUnit: [
    body('courseId').notEmpty().withMessage('课程ID不能为空'),
    body('unitName').notEmpty().withMessage('课节名称不能为空'),
    body('unitNo').isInt({ min: 1 }).withMessage('课节编号必须为正整数'),
    body('duration').optional({ checkFalsy: true, nullable: true }).isInt({ min: 1 }).withMessage('时长必须为正整数'),
    handleValidationErrors
  ]
};

/**
 * 课堂相关验证规则
 */
const classroomValidation = {
  create: [
    body('classroomName').notEmpty().withMessage('课堂名称不能为空'),
    body('maxStudents')
      .optional({ checkFalsy: true, nullable: true })
      .isInt({ min: 1, max: 200 })
      .withMessage('最大学生数必须在 1-200 之间'),
    handleValidationErrors
  ],

  join: [
    param('id').notEmpty().withMessage('课堂ID不能为空'),
    handleValidationErrors
  ]
};

/**
 * 资源相关验证规则
 */
const resourceValidation = {
  upload: [
    body('resourceType')
      .optional({ checkFalsy: true, nullable: true })
      .isIn(['ppt', 'document', 'video', 'code', 'pdf', 'image', 'audio', 'ai_package', 'other'])
      .withMessage('资源类型无效'),
    body('courseSystem')
      .optional({ checkFalsy: true, nullable: true })
      .isString()
      .isLength({ max: 100 })
      .withMessage('课程体系不合法'),
    body('courseStage')
      .optional({ checkFalsy: true, nullable: true })
      .isString()
      .isLength({ max: 100 })
      .withMessage('课程阶段不合法'),
    body('description')
      .optional({ checkFalsy: true, nullable: true })
      .isLength({ max: 1000 })
      .withMessage('资源说明不能超过1000个字符'),
    handleValidationErrors
  ]
};

module.exports = {
  studentValidation,
  courseValidation,
  classroomValidation,
  resourceValidation,
  handleValidationErrors
};
