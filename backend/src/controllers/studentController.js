/**
 * 学生管理控制器
 * 处理学生的CRUD操作
 */

const models = require('../models');
const Response = require('../utils/response');
const uuidUtil = require('../utils/uuid');
const { Op } = require('sequelize');
const { logger } = require('../middleware/logger');
const avatarUtil = require('../utils/avatar');

function resolveStudentLifecycle(learningStatus, status) {
  const normalizedLearningStatus = String(learningStatus || '').trim().toLowerCase();
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const parsedStatus = Number(status);

  if (normalizedLearningStatus === 'need_attention') {
    return {
      learningStatus: 'need_attention',
      status: 3
    };
  }

  if (normalizedLearningStatus === 'paused' || normalizedLearningStatus === 'suspended') {
    return {
      learningStatus: 'paused',
      status: 2
    };
  }

  if (normalizedStatus === 'need_attention') {
    return {
      learningStatus: 'need_attention',
      status: 3
    };
  }

  if (normalizedStatus === 'paused' || normalizedStatus === 'suspended' || normalizedStatus === 'inactive') {
    return {
      learningStatus: 'paused',
      status: 2
    };
  }

  if (Number.isFinite(parsedStatus) && parsedStatus === 3) {
    return {
      learningStatus: 'need_attention',
      status: 3
    };
  }

  if (Number.isFinite(parsedStatus) && parsedStatus === 2) {
    return {
      learningStatus: 'paused',
      status: 2
    };
  }

  return {
    learningStatus: 'normal',
    status: 1
  };
}

function mapStudentGender(sex) {
  if (sex === 1 || sex === '1') {
    return 'male';
  }
  if (sex === 2 || sex === '2') {
    return 'female';
  }
  return 'other';
}

function normalizeProgressRatio(rawProgress) {
  const parsed = Number(rawProgress);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  if (parsed > 1) {
    return Math.min(parsed / 100, 1);
  }

  return Math.min(parsed, 1);
}

function isSchemaCompatibilityError(error) {
  if (!error) {
    return false;
  }

  const message = [
    error.name,
    error.message,
    error.original && error.original.code,
    error.original && error.original.sqlMessage
  ]
    .filter(Boolean)
    .join(' ');

  return /ER_NO_SUCH_TABLE|ER_BAD_FIELD_ERROR|ER_BAD_TABLE_ERROR|Unknown column|doesn't exist|Unknown table/i.test(message);
}

async function safeFindAllCompat(model, query, context) {
  if (!model || typeof model.findAll !== 'function') {
    logger.warn('Compat fallback: model is unavailable, returning empty rows', { context });
    return [];
  }

  try {
    return await model.findAll(query);
  } catch (error) {
    if (isSchemaCompatibilityError(error)) {
      logger.warn('Compat fallback: query skipped because table/column is missing', {
        context,
        error: error.message
      });
      return [];
    }
    throw error;
  }
}

async function safeCountCompat(model, query, context) {
  if (!model || typeof model.count !== 'function') {
    logger.warn('Compat fallback: count model is unavailable, returning zero', { context });
    return 0;
  }

  try {
    return await model.count(query);
  } catch (error) {
    if (isSchemaCompatibilityError(error)) {
      logger.warn('Compat fallback: count skipped because table/column is missing', {
        context,
        error: error.message
      });
      return 0;
    }
    throw error;
  }
}

const TEACHING_STUDENT_BASE_ATTRIBUTES = [
  'id',
  'student_no',
  'realname',
  'sex',
  'phone',
  'email',
  'status',
  'create_time',
  'update_time'
];
const TEACHING_STUDENT_OPTIONAL_FIELDS = [
  'username',
  'avatar',
  'birthday',
  'id_card',
  'parent_phone',
  'parent_name',
  'address',
  'enrollment_date',
  'learning_status',
  'seat',
  'remark'
];
let cachedTeachingStudentColumnSetPromise = null;

async function getTeachingStudentColumnSet() {
  if (!cachedTeachingStudentColumnSetPromise) {
    cachedTeachingStudentColumnSetPromise = models.sequelize
      .getQueryInterface()
      .describeTable('teaching_student')
      .then((schema) => new Set(Object.keys(schema || {})))
      .catch((error) => {
        logger.warn('Compat fallback: failed to describe teaching_student table', {
          error: error.message
        });
        return null;
      });
  }

  return cachedTeachingStudentColumnSetPromise;
}

async function getTeachingStudentSelectableAttributes() {
  const columnSet = await getTeachingStudentColumnSet();
  const rawAttributes = (models.TeachingStudent && models.TeachingStudent.rawAttributes) || {};
  const preferredAttributes = [...TEACHING_STUDENT_BASE_ATTRIBUTES, ...TEACHING_STUDENT_OPTIONAL_FIELDS];

  return preferredAttributes.filter((attributeName) => {
    const fieldName = rawAttributes[attributeName] && rawAttributes[attributeName].field
      ? rawAttributes[attributeName].field
      : attributeName;
    return !columnSet || columnSet.has(fieldName);
  });
}

function csvEscape(value) {
  if (value === null || value === undefined) {
    return '""';
  }

  return `"${String(value).replace(/"/g, '""')}"`;
}

async function syncStudentLoginUser({
  existingUser,
  finalUsername,
  realname,
  birthday,
  sex,
  email,
  phone,
  operatorId,
  transaction
}) {
  const defaultPassword = '123456';
  const encryptUtil = require('../utils/encrypt');
  const passwordHash = await encryptUtil.hashPassword(defaultPassword);
  const now = new Date();

  const baseData = {
    username: finalUsername,
    password: passwordHash,
    realname,
    // Keep persisted avatar empty. Read APIs already generate inline fallbacks,
    // which avoids oversized data URLs breaking older sys_user avatar columns.
    avatar: null,
    birthday: birthday || null,
    sex: sex ?? null,
    email: email || null,
    phone: phone || null,
    user_identity: 3,
    status: 1,
    del_flag: 0,
    update_by: operatorId,
    update_time: now
  };

  if (existingUser) {
    await existingUser.update(baseData, { transaction });
    return defaultPassword;
  }

  await models.SysUser.create({
    id: uuidUtil.generate(),
    ...baseData,
    create_by: operatorId,
    create_time: now
  }, { transaction });

  return defaultPassword;
}

/**
 * 获取学生列表（支持分页、搜索、筛选）
 * GET /student/list
 */
exports.getStudentList = async (req, res, next) => {
  try {
    const studentAttributes = await getTeachingStudentSelectableAttributes();
    const { 
      pageNo = 1, 
      pageSize = 10, 
      realname, 
      studentNo,
      keyword,  // 支持关键词搜索
      status,
      learningStatus,
      phone,
      classId  // 支持班级筛选
    } = req.query;
    
    // 构建查询条件
    const where = { del_flag: 0 };
    
    // 支持关键词搜索（姓名或学号）
    if (keyword) {
      where[Op.or] = [
        { realname: { [Op.like]: `%${keyword}%` } },
        { student_no: { [Op.like]: `%${keyword}%` } }
      ];
    }
    
    if (realname) {
      where.realname = { [Op.like]: `%${realname}%` };
    }
    
    if (studentNo) {
      where.student_no = { [Op.like]: `%${studentNo}%` };
    }
    
    if (status) {
      const normalizedStatus = String(status).trim().toLowerCase();
      if (normalizedStatus === 'need_attention') {
        where.learning_status = 'need_attention';
      } else if (normalizedStatus === 'active') {
        where.status = 1;
      } else if (normalizedStatus === 'inactive' || normalizedStatus === 'paused' || normalizedStatus === 'suspended') {
        where.status = 2;
      } else if (/^\d+$/.test(normalizedStatus)) {
        where.status = Number(normalizedStatus);
      }
    }
    
    if (learningStatus) {
      where.learning_status = learningStatus;
    }
    
    if (phone) {
      where.phone = { [Op.like]: `%${phone}%` };
    }
    
    // 如果有班级筛选，需要先查询该班级的学生ID
    if (classId) {
      const classStudents = await models.TeachingClassStudent.findAll({
        where: { class_id: classId, del_flag: 0 },
        attributes: ['student_id']
      });
      const studentIds = classStudents.map(cs => cs.student_id);
      
      if (studentIds.length > 0) {
        where.id = { [Op.in]: studentIds };
      } else {
        // 如果该班级没有学生，返回空列表
        return res.json(Response.page([], 0, pageNo, pageSize));
      }
    }
    
    // 分页查询
    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(pageNo, 10) - 1) * limit;
    
    const { count, rows } = await models.TeachingStudent.findAndCountAll({
      where,
      limit,
      offset,
      order: [['create_time', 'DESC']],
      attributes: studentAttributes
    });

    const studentIds = rows.map(row => row.id);
    const classLinks = studentIds.length > 0
      ? await models.TeachingClassStudent.findAll({
          where: {
            student_id: { [Op.in]: studentIds },
            del_flag: 0
          },
          attributes: ['student_id', 'class_id', 'join_date'],
          raw: true
        })
      : [];

    const linkedClassIds = Array.from(new Set(classLinks.map(item => item.class_id).filter(Boolean)));
    const classRows = linkedClassIds.length > 0
      ? await models.TeachingClass.findAll({
          where: {
            id: { [Op.in]: linkedClassIds },
            del_flag: 0
          },
          attributes: ['id', 'class_name'],
          raw: true
        })
      : [];

    const classMap = new Map(classRows.map(item => [item.id, item.class_name]));
    const studentClassMap = new Map();

    classLinks.forEach((item) => {
      const className = classMap.get(item.class_id);
      if (!className) {
        return;
      }

      if (!studentClassMap.has(item.student_id)) {
        studentClassMap.set(item.student_id, []);
      }

      studentClassMap.get(item.student_id).push({
        id: item.class_id,
        name: className,
        className,
        joinDate: item.join_date
      });
    });

    const normalizedStudents = rows.map((student) => {
      const data = student.toJSON();
      const classes = studentClassMap.get(data.id) || [];

      return {
        id: data.id,
        studentNo: data.student_no,
        username: data.username,
        realname: data.realname,
        sex: data.sex,
        gender: mapStudentGender(data.sex),
        phone: data.phone,
        email: data.email,
        birthday: data.birthday,
        idCard: data.id_card,
        parentPhone: data.parent_phone,
        parentName: data.parent_name,
        address: data.address,
        enrollmentDate: data.enrollment_date,
        seat: data.seat,
        status: data.status,
        learningStatus: data.learning_status,
        remark: data.remark,
        createTime: data.create_time,
        updateTime: data.update_time,
        classes,
        currentClass: classes.length > 0 ? classes[0] : null
      };
    });

    return res.json(Response.page(normalizedStudents, count, pageNo, pageSize));
  } catch (error) {
    next(error);
  }
};

/**
 * 获取学生详情
 * GET /student/:id
 */
exports.getStudentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const student = await models.TeachingStudent.findOne({
      where: { id, del_flag: 0 }
    });
    
    if (!student) {
      return res.json(Response.error('学生不存在', 404));
    }
    
    res.json(Response.success(student));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 创建学生
 * POST /student
 */
exports.createStudent = async (req, res, next) => {
  let transaction;

  try {
    transaction = await models.sequelize.transaction();
    const { 
      realname, 
      studentNo, 
      sex, 
      birthday,
      phone, 
      email,
      idCard,
      parentPhone,
      parentName,
      address,
      enrollmentDate,
      seat,
      remark,
      learningStatus,
      status
    } = req.body;
    
    // 验证必填字段
    if (!realname || !studentNo) {
      return res.json(Response.error('学生姓名和学号不能为空', 400));
    }
    
    // 检查学号是否重复（只检查未删除的）
    const existing = await models.TeachingStudent.findOne({
      where: { student_no: studentNo, del_flag: 0 },
      transaction
    });
    
    if (existing) {
      await transaction.rollback();
      transaction = null;
      return res.json(Response.error('学号已存在', 400));
    }
    
    // 确保teaching_student和sys_user使用相同的username
    const finalUsername = req.body.username || studentNo;
    
    // 检查sys_user中是否有同名激活账号
    const activeSysUser = await models.SysUser.findOne({
      where: {
        username: finalUsername,
        del_flag: 0
      },
      transaction
    });
    
    if (activeSysUser) {
      await transaction.rollback();
      transaction = null;
      return res.json(Response.error('用户名已存在', 400));
    }

    const deletedSysUser = await models.SysUser.findOne({
      where: {
        username: finalUsername,
        del_flag: 1
      },
      transaction
    });
    
    // 检查teaching_student中是否有已删除的同学号记录
    const deletedStudent = await models.TeachingStudent.findOne({
      where: { student_no: studentNo, del_flag: 1 },
      transaction
    });
    
    const lifecycle = resolveStudentLifecycle(learningStatus, status);
    const now = new Date();
    const studentPayload = {
      realname,
      student_no: studentNo,
      username: finalUsername,
      sex: sex ?? null,
      birthday: birthday || null,
      phone: phone || null,
      email: email || null,
      id_card: idCard || null,
      parent_phone: parentPhone || null,
      parent_name: parentName || null,
      address: address || null,
      enrollment_date: enrollmentDate || now,
      seat: seat || null,
      remark: remark || null,
      status: lifecycle.status,
      learning_status: lifecycle.learningStatus,
      del_flag: 0,
      update_by: req.user?.id,
      update_time: now
    };

    let student;
    if (deletedStudent) {
      // 恢复已删除的学生记录
      await deletedStudent.update(studentPayload, { transaction });
      logger.info('[Student] Restored soft-deleted student', { studentNo, username: finalUsername });
      student = deletedStudent;
    } else {
      student = await models.TeachingStudent.create({
        id: uuidUtil.generate(),
        ...studentPayload,
        create_by: req.user?.id,
        create_time: now
      }, { transaction });
    }

    const defaultPassword = await syncStudentLoginUser({
      existingUser: deletedSysUser,
      finalUsername,
      realname,
      birthday,
      sex,
      email,
      phone,
      operatorId: req.user?.id,
      transaction
    });

    await transaction.commit();
    transaction = null;
    
    return res.json(Response.success({
      ...student.toJSON(),
      username: finalUsername,
      defaultPassword
    }, deletedStudent ? '学生已恢复' : '创建成功'));
    
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        logger.error('[Student] createStudent rollback failed', {
          error: rollbackError.message
        });
      }
    }
    next(error);
  }
};

/**
 * 更新学生信息
 * PUT /student/:id
 */
exports.updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // 查找学生
    const student = await models.TeachingStudent.findOne({
      where: { id, del_flag: 0 }
    });
    
    if (!student) {
      return res.json(Response.error('学生不存在', 404));
    }
    
    // 如果修改了学号，检查是否重复
    if (updateData.studentNo && updateData.studentNo !== student.student_no) {
      const existing = await models.TeachingStudent.findOne({
        where: { 
          student_no: updateData.studentNo, 
          del_flag: 0,
          id: { [Op.ne]: id }
        }
      });
      
      if (existing) {
        return res.json(Response.error('学号已存在', 400));
      }
    }
    
    // 更新学生信息
    const lifecycle = resolveStudentLifecycle(updateData.learningStatus, updateData.status);

    await student.update({
      realname: updateData.realname || student.realname,
      student_no: updateData.studentNo || student.student_no,
      sex: updateData.sex !== undefined ? updateData.sex : student.sex,
      birthday: updateData.birthday !== undefined ? updateData.birthday : student.birthday,
      phone: updateData.phone !== undefined ? updateData.phone : student.phone,
      email: updateData.email !== undefined ? updateData.email : student.email,
      id_card: updateData.idCard !== undefined ? updateData.idCard : student.id_card,
      parent_phone: updateData.parentPhone !== undefined ? updateData.parentPhone : student.parent_phone,
      parent_name: updateData.parentName !== undefined ? updateData.parentName : student.parent_name,
      address: updateData.address !== undefined ? updateData.address : student.address,
      seat: updateData.seat !== undefined ? updateData.seat : student.seat,
      remark: updateData.remark !== undefined ? updateData.remark : student.remark,
      status: updateData.status !== undefined || updateData.learningStatus !== undefined ? lifecycle.status : student.status,
      learning_status: updateData.learningStatus !== undefined || updateData.status !== undefined ? lifecycle.learningStatus : student.learning_status,
      update_by: req.user?.id,
      update_time: new Date()
    });
    
    res.json(Response.success(student, '更新成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 删除学生（软删除）
 * DELETE /student/:id
 */
exports.deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const student = await models.TeachingStudent.findOne({
      where: { id, del_flag: 0 }
    });
    
    if (!student) {
      return res.json(Response.error('学生不存在', 404));
    }
    
    // 软删除
    await student.update({
      del_flag: 1,
      update_by: req.user?.id,
      update_time: new Date()
    });
    
    res.json(Response.success(null, '删除成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 重置学生密码
 * PUT /student/:id/reset-password
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    // 查找学生
    const student = await models.TeachingStudent.findOne({
      where: { id, del_flag: 0 }
    });
    
    if (!student) {
      return res.json(Response.error('学生不存在', 404));
    }
    
    // 使用学生的username或student_no查找sys_user记录
    const username = student.username || student.student_no;
    
    const sysUser = await models.SysUser.findOne({
      where: { username, del_flag: 0 }
    });
    
    if (!sysUser) {
      // 如果没有sys_user记录，创建一个
      const defaultPassword = password || '123456';
      const encryptUtil = require('../utils/encrypt');
      const passwordHash = await encryptUtil.hashPassword(defaultPassword);
      
      const sysUserData = {
        id: uuidUtil.generate(),
        username: username,
        password: passwordHash,
        realname: student.realname,
        avatar: null,
        birthday: student.birthday || null,
        sex: student.sex || null,
        email: student.email || null,
        phone: student.phone || null,
        user_identity: 3, // 3表示学生
        status: 1,
        del_flag: 0,
        create_by: req.user?.id,
        create_time: new Date()
      };
      
      await models.SysUser.create(sysUserData);
      
      return res.json(Response.success({
        username: username,
        password: defaultPassword
      }, '密码重置成功（已创建登录账号）'));
    }
    
    // 重置密码
    const newPassword = password || '123456';
    const encryptUtil = require('../utils/encrypt');
    const passwordHash = await encryptUtil.hashPassword(newPassword);
    
    await sysUser.update({
      password: passwordHash,
      update_by: req.user?.id,
      update_time: new Date()
    });
    
    res.json(Response.success({
      username: username,
      password: newPassword
    }, '密码重置成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 更新学生状态（暂停/恢复学习）
 * PUT /student/:id/status
 */
exports.updateStudentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { learningStatus, reason } = req.body;
    
    if (!learningStatus) {
      return res.json(Response.error('学习状态不能为空', 400));
    }
    
    const student = await models.TeachingStudent.findOne({
      where: { id, del_flag: 0 }
    });
    
    if (!student) {
      return res.json(Response.error('学生不存在', 404));
    }
    
    const oldStatus = student.learning_status;
    
    // 更新状态
    await student.update({
      learning_status: learningStatus,
      status: learningStatus === 'normal' ? 1 : (learningStatus === 'paused' ? 2 : 3),
      update_by: req.user?.id,
      update_time: new Date()
    });
    
    // 记录状态变更日志
    await models.TeachingStudentStatusLog.create({
      id: uuidUtil.generate(),
      student_id: id,
      old_status: oldStatus,
      new_status: learningStatus,
      reason: reason || null,
      operator: req.user?.id,
      create_time: new Date()
    });
    
    res.json(Response.success(student, '状态更新成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 获取教师所有学生
 * GET /teacher/students/all
 */
exports.getAllStudents = async (req, res, next) => {
  try {
    const students = await models.TeachingStudent.findAll({
      where: { del_flag: 0 },
      attributes: ['id', 'student_no', 'realname', 'phone', 'status', 'learning_status'],
      order: [['create_time', 'DESC']]
    });
    
    res.json(Response.success(students));
    
  } catch (error) {
    next(error);
  }
};

// ========== 教学视角的学生管理扩展API ==========

/**
 * 获取教学视角的学生列表
 * GET /teaching/student/list
 */
exports.getTeachingStudentList = async (req, res, next) => {
  try {
    // 与getStudentList相同，复用逻辑
    return exports.getStudentList(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取学生班级列表
 * GET /teaching/student/classes
 */
exports.getStudentClasses = async (req, res, next) => {
  try {
    const { studentId } = req.query;
    
    // legacy placeholder implementation retained below for compatibility override cleanup
    const classes = [
      {
        classId: 'class_001',
        className: '一年级1班',
        courseCount: 5,
        enrollTime: '2025-09-01',
        status: 'active'
      }
    ];
    
    res.json(Response.success(classes));
  } catch (error) {
    next(error);
  }
};

/**
 * 获取学生详细信息
 * GET /teaching/student/details/:studentId
 */
exports.getStudentDetails = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    
    const student = await models.TeachingStudent.findOne({
      where: { id: studentId, del_flag: 0 }
    });
    
    if (!student) {
      return res.json(Response.error('学生不存在', 404));
    }
    
    // 附加学习进度、作业统计等信息
    const details = {
      ...student.toJSON(),
      learningProgress: {
        completedCourses: 3,
        totalCourses: 10,
        completionRate: 0.3
      },
      homeworkStats: {
        submitted: 15,
        total: 20,
        averageScore: 85
      }
    };
    
    res.json(Response.success(details));
  } catch (error) {
    next(error);
  }
};

/**
 * 获取学生学习进度
 * GET /teaching/student/progress/:studentId
 */
exports.getStudentProgress = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    
    // legacy placeholder progress payload retained below for compatibility override cleanup
    const progress = {
      studentId,
      courses: [
        {
          courseId: 'course_001',
          courseName: 'Python基础编程',
          progress: 0.75,
          completedUnits: 15,
          totalUnits: 20,
          lastStudyTime: '2025-10-24 15:30:00'
        }
      ],
      totalProgress: 0.65,
      studyDays: 45,
      totalStudyHours: 120
    };
    
    res.json(Response.success(progress));
  } catch (error) {
    next(error);
  }
};

/**
 * 获取学生作业情况
 * GET /teaching/student/homework/:studentId
 * 或 GET /teaching/student/homework (从token获取学生ID)
 */
exports.getStudentHomework = async (req, res, next) => {
  try {
    // 支持从参数或token获取学生ID
    const studentId = req.params.studentId || req.user?.id || req.user?.username;
    
    if (!studentId) {
      return res.json(Response.error('学生ID不能为空', 400));
    }
    
    // 1. 查询学生所在的班级
    const student = await models.SysUser.findOne({
      where: { username: studentId }
    });
    
    if (!student || !student.depart_ids) {
      return res.json(Response.success({
        studentId,
        homeworkList: [],
        statistics: {
          totalHomework: 0,
          submitted: 0,
          pending: 0,
          graded: 0,
          averageScore: 0
        }
      }));
    }
    
    // 解析班级ID（可能是逗号分隔的字符串）
    const classIds = student.depart_ids.split(',').filter(id => id);
    
    // 2. 查询分配给这些班级的作业
    const homeworkClasses = await models.TeachingHomeworkClass.findAll({
      where: {
        class_id: {
          [models.Sequelize.Op.in]: classIds
        }
      }
    });
    
    const homeworkIds = homeworkClasses.map(hc => hc.homework_id);
    
    if (homeworkIds.length === 0) {
      return res.json(Response.success({
        studentId,
        homeworkList: [],
        statistics: {
          totalHomework: 0,
          submitted: 0,
          pending: 0,
          graded: 0,
          averageScore: 0
        }
      }));
    }
    
    // 3. 查询作业详情
    const homeworks = await models.TeachingHomework.findAll({
      where: {
        id: {
          [models.Sequelize.Op.in]: homeworkIds
        },
        del_flag: 0
      },
      order: [['create_time', 'DESC']]
    });
    
    // 4. 查询学生的提交记录
    const submissions = await models.TeachingHomeworkSubmission.findAll({
      where: {
        student_id: studentId,
        homework_id: {
          [models.Sequelize.Op.in]: homeworkIds
        }
      }
    });
    
    // 5. 组装返回数据
    const submissionMap = {};
    let totalScore = 0;
    let gradedCount = 0;
    
    submissions.forEach(sub => {
      submissionMap[sub.homework_id] = sub;
      if (sub.score !== null && sub.score !== undefined) {
        totalScore += parseFloat(sub.score);
        gradedCount++;
      }
    });
    
    const homeworkList = homeworks.map(hw => {
      const submission = submissionMap[hw.id];
      return {
        homeworkId: hw.id,
        homeworkTitle: hw.homework_title,
        homeworkType: hw.homework_type,
        courseName: hw.course_name || '未知课程',
        description: hw.description,
        requirements: hw.requirements,
        deadline: hw.deadline,
        totalScore: hw.total_score,
        submitTime: submission ? submission.submit_time : null,
        score: submission ? submission.score : null,
        status: submission ? (submission.score !== null ? 'graded' : 'submitted') : 'pending',
        feedback: submission ? submission.feedback : null,
        createTime: hw.create_time
      };
    });
    
    const statistics = {
      totalHomework: homeworks.length,
      submitted: submissions.length,
      pending: homeworks.length - submissions.length,
      graded: gradedCount,
      averageScore: gradedCount > 0 ? Math.round(totalScore / gradedCount) : 0
    };
    
    res.json(Response.success({
      studentId,
      homeworkList,
      statistics
    }));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 更新学生信息（教学视角）
 * PUT /teaching/student/update/:studentId
 */
exports.updateStudentInfo = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    // 复用updateStudent逻辑
    req.params.id = studentId;
    return exports.updateStudent(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * 批量更新学生状态
 * POST /teaching/student/batch-update-status
 */
exports.batchUpdateStudentStatus = async (req, res, next) => {
  try {
    const { studentIds, learningStatus, reason } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds)) {
      return res.json(Response.error('学生ID列表不能为空', 400));
    }
    
    // 批量更新
    await models.TeachingStudent.update(
      {
        learning_status: learningStatus,
        update_by: req.user?.id,
        update_time: new Date()
      },
      {
        where: {
          id: { [Op.in]: studentIds },
          del_flag: 0
        }
      }
    );
    
    res.json(Response.success(null, `成功更新${studentIds.length}个学生的状态`));
  } catch (error) {
    next(error);
  }
};

/**
 * 创建学习标记
 * POST /teaching/student/create-learning-mark
 */
exports.createLearningMark = async (req, res, next) => {
  try {
    const markData = req.body;
    
    // legacy placeholder mark creation retained below for compatibility override cleanup
    const mark = {
      id: uuidUtil.generate(),
      ...markData,
      createTime: new Date().toISOString()
    };
    
    res.json(Response.success(mark, '学习标记创建成功'));
  } catch (error) {
    next(error);
  }
};

/**
 * 获取学生统计数据
 * GET /teaching/student/statistics
 */
exports.getStudentStatistics = async (req, res, next) => {
  try {
    // 获取学生总数
    const totalCount = await models.TeachingStudent.count({
      where: { del_flag: 0 }
    });
    
    const statistics = {
      totalStudents: totalCount,
      activeStudents: Math.floor(totalCount * 0.8),
      newStudentsThisMonth: 15,
      averageProgress: 0.65,
      statusDistribution: {
        normal: Math.floor(totalCount * 0.8),
        paused: Math.floor(totalCount * 0.15),
        completed: Math.floor(totalCount * 0.05)
      }
    };
    
    res.json(Response.success(statistics));
  } catch (error) {
    next(error);
  }
};

/**
 * 导出学生数据
 * POST /teaching/student/export
 */
exports.exportStudentData = async (req, res, next) => {
  try {
    const { studentIds, format = 'excel' } = req.body;
    
    // legacy placeholder export payload retained below for compatibility override cleanup
    const exportData = {
      fileUrl: `/exports/students_${Date.now()}.${format}`,
      filename: `学生数据_${new Date().toISOString().split('T')[0]}.${format}`,
      recordCount: studentIds?.length || 0
    };
    
    res.json(Response.success(exportData, '导出成功'));
  } catch (error) {
    next(error);
  }
};

function normalizeTeachingStudentStatus(rawStatus, learningStatus) {
  const normalizedLearningStatus = String(learningStatus || '').toLowerCase();

  if (normalizedLearningStatus === 'need_attention') {
    return 'need_attention';
  }

  if (normalizedLearningStatus === 'paused' || normalizedLearningStatus === 'suspended') {
    return 'suspended';
  }

  const parsedStatus = Number(rawStatus);
  if (Number.isFinite(parsedStatus)) {
    if (parsedStatus === 3) {
      return 'need_attention';
    }
    if (parsedStatus === 2) {
      return 'suspended';
    }
    return 'active';
  }

  const normalizedStatus = String(rawStatus || '').toLowerCase();
  if (normalizedStatus === 'active' || normalizedStatus === 'suspended' || normalizedStatus === 'need_attention') {
    return normalizedStatus;
  }

  return 'active';
}

exports.getTeachingStudentList = async (req, res, next) => {
  try {
    const {
      pageNo = 1,
      pageSize = 10,
      keyword,
      classId,
      status,
      learningStatus
    } = req.query;

    const where = { del_flag: 0 };

    if (keyword) {
      where[Op.or] = [
        { realname: { [Op.like]: `%${keyword}%` } },
        { student_no: { [Op.like]: `%${keyword}%` } }
      ];
    }

    if (learningStatus) {
      where.learning_status = learningStatus;
    }

    if (status) {
      const normalizedStatus = String(status).trim().toLowerCase();
      if (normalizedStatus === 'need_attention') {
        where.learning_status = 'need_attention';
      } else if (normalizedStatus === 'active') {
        where.status = 1;
      } else if (normalizedStatus === 'suspended') {
        where.status = 2;
      } else if (/^\d+$/.test(normalizedStatus)) {
        where.status = Number(normalizedStatus);
      }
    }

    if (classId) {
      const classStudents = await models.TeachingClassStudent.findAll({
        where: {
          class_id: classId,
          del_flag: 0
        },
        attributes: ['student_id']
      });
      const studentIds = classStudents.map(item => item.student_id);
      if (studentIds.length === 0) {
        return res.json(Response.page([], 0, pageNo, pageSize));
      }
      where.id = { [Op.in]: studentIds };
    }

    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(pageNo, 10) - 1) * limit;

    const { count, rows } = await models.TeachingStudent.findAndCountAll({
      where,
      limit,
      offset,
      order: [['create_time', 'DESC']],
      attributes: { exclude: ['del_flag'] }
    });

    const studentIds = rows.map(item => item.id);
    const classLinks = studentIds.length > 0
      ? await models.TeachingClassStudent.findAll({
        where: {
          student_id: { [Op.in]: studentIds },
          del_flag: 0
        },
        attributes: ['student_id', 'class_id', 'join_date']
      })
      : [];

    const classIds = Array.from(new Set(classLinks.map(item => item.class_id).filter(Boolean)));
    const classes = classIds.length > 0
      ? await models.TeachingClass.findAll({
        where: {
          id: { [Op.in]: classIds },
          del_flag: 0
        },
        attributes: ['id', 'class_name']
      })
      : [];

    const classMap = new Map(classes.map(item => [item.id, item]));
    const classListByStudent = classLinks.reduce((result, item) => {
      const classInfo = classMap.get(item.class_id);
      if (!classInfo) {
        return result;
      }

      if (!result[item.student_id]) {
        result[item.student_id] = [];
      }

      result[item.student_id].push({
        id: classInfo.id,
        name: classInfo.class_name,
        className: classInfo.class_name,
        joinDate: item.join_date || null
      });

      return result;
    }, {});

    const records = rows.map((row) => {
      const data = row.toJSON();
      const classesForStudent = classListByStudent[data.id] || [];
      const currentClass = classesForStudent[0] || null;
      const uiStatus = normalizeTeachingStudentStatus(data.status, data.learning_status);

      return {
        id: data.id,
        name: data.realname,
        realname: data.realname,
        studentNumber: data.student_no,
        studentNo: data.student_no,
        username: data.username,
        avatar: avatarUtil.normalizeAvatarUrl(data.avatar, data.student_no || data.username || data.realname),
        sex: data.sex,
        gender: mapStudentGender(data.sex),
        phone: data.phone,
        email: data.email,
        birthday: data.birthday || null,
        idCard: data.id_card || '',
        parentPhone: data.parent_phone || '',
        parentName: data.parent_name || '',
        address: data.address || '',
        enrollmentDate: data.enrollment_date || null,
        seat: data.seat || '',
        remark: data.remark || '',
        className: currentClass ? currentClass.className : '未分班',
        classes: classesForStudent,
        currentClass,
        status: uiStatus,
        rawStatus: data.status,
        learningStatus: data.learning_status,
        completionRate: 0,
        completedCourses: 0,
        totalCourses: 0,
        lastActivityTime: data.update_time || data.create_time || null,
        lastActivity: uiStatus === 'need_attention' ? '需要关注' : '暂无学习记录',
        createTime: data.create_time,
        updateTime: data.update_time
      };
    });

    res.json(Response.page(records, count, pageNo, pageSize));
  } catch (error) {
    next(error);
  }
};

exports.getStudentClasses = async (req, res, next) => {
  try {
    const { studentId } = req.query;

    let targetClassIds = null;
    if (studentId) {
      const links = await models.TeachingClassStudent.findAll({
        where: {
          student_id: studentId,
          del_flag: 0
        },
        attributes: ['class_id', 'join_date']
      });
      targetClassIds = links.map(item => item.class_id);
      if (targetClassIds.length === 0) {
        return res.json(Response.success([]));
      }
    }

    const classWhere = { del_flag: 0 };
    if (Array.isArray(targetClassIds)) {
      classWhere.id = { [Op.in]: targetClassIds };
    }

    const rows = await models.TeachingClass.findAll({
      where: classWhere,
      order: [['create_time', 'DESC']],
      attributes: ['id', 'class_name', 'status']
    });

    const classes = rows.map((row) => ({
      id: row.id,
      name: row.class_name,
      classId: row.id,
      className: row.class_name,
      status: row.status
    }));

    res.json(Response.success(classes));
  } catch (error) {
    next(error);
  }
};

exports.getStudentDetails = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await models.TeachingStudent.findOne({
      where: {
        id: studentId,
        del_flag: 0
      }
    });

    if (!student) {
      return res.json(Response.error('Student not found', 404));
    }

    const classLink = await models.TeachingClassStudent.findOne({
      where: {
        student_id: studentId,
        del_flag: 0
      },
      order: [['create_time', 'DESC']]
    });

    const classInfo = classLink
      ? await models.TeachingClass.findOne({
        where: {
          id: classLink.class_id,
          del_flag: 0
        },
        attributes: ['id', 'class_name']
      })
      : null;

    const data = student.toJSON();
    const normalizedStatus = normalizeTeachingStudentStatus(data.status, data.learning_status);

    res.json(Response.success({
      id: data.id,
      name: data.realname,
      realname: data.realname,
      studentNumber: data.student_no,
      studentNo: data.student_no,
      className: classInfo ? classInfo.class_name : '未分班',
      email: data.email || '',
      phone: data.phone || '',
      avatar: avatarUtil.normalizeAvatarUrl(data.avatar, data.student_no || data.username || data.realname),
      status: normalizedStatus,
      learningStatus: data.learning_status,
      registerTime: data.create_time || null,
      lastLoginTime: data.update_time || data.create_time || null,
      completedCourses: 0,
      totalStudyTime: 0,
      homeworkCompletionRate: 0
    }));
  } catch (error) {
    next(error);
  }
};

exports.getStudentStatistics = async (req, res, next) => {
  try {
    const totalStudents = await models.TeachingStudent.count({
      where: { del_flag: 0 }
    });

    const activeStudents = await models.TeachingStudent.count({
      where: {
        del_flag: 0,
        status: 1
      }
    });

    const needAttentionCount = await models.TeachingStudent.count({
      where: {
        del_flag: 0,
        learning_status: 'need_attention'
      }
    });

    res.json(Response.success({
      totalStudents,
      activeStudents,
      needAttentionCount,
      newStudentsThisMonth: 0,
      averageProgress: 0,
      statusDistribution: {
        active: activeStudents,
        inactive: Math.max(totalStudents - activeStudents, 0),
        need_attention: needAttentionCount
      }
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * 分配班级给学生
 * POST /student/assignClass
 */
exports.assignClass = async (req, res, next) => {
  try {
    const { studentId, classIds } = req.body;
    
    if (!studentId || !classIds || classIds.length === 0) {
      return res.json(Response.error('学生ID和班级ID不能为空', 400));
    }
    
    // 查找学生
    const student = await models.TeachingStudent.findOne({
      where: { id: studentId, del_flag: 0 }
    });
    
    if (!student) {
      return res.json(Response.error('学生不存在', 404));
    }
    
    // 为每个班级创建学生-班级关联记录
    const uniqueClassIds = Array.from(new Set(classIds.filter(Boolean)));
    const classStudentRecords = [];
    for (const classId of uniqueClassIds) {
      // 检查班级是否存在
      const classInfo = await models.TeachingClass.findOne({
        where: { id: classId, del_flag: 0 }
      });
      
      if (!classInfo) {
        logger.warn('[Student] assignClass skipped missing class', { studentId, classId });
        continue;
      }
      
      // 检查是否已经在该班级中
      const existing = await models.TeachingClassStudent.findOne({
        where: { 
          class_id: classId, 
          student_id: studentId,
          del_flag: 0
        }
      });
      
      if (existing) {
        logger.info('[Student] assignClass skipped existing relation', {
          studentId,
          classId,
          className: classInfo.class_name
        });
        continue;
      }
      
      // 创建班级学生关联
      const record = await models.TeachingClassStudent.create({
        id: uuidUtil.generate(),
        class_id: classId,
        student_id: studentId,
        join_date: new Date(),
        status: 1,
        del_flag: 0,
        create_by: req.user ? req.user.id : null,
        create_time: new Date()
      });
      
      // 更新班级学生数量
      const studentCount = await models.TeachingClassStudent.count({
        where: { class_id: classId, del_flag: 0, status: 1 }
      });
      await classInfo.update({ student_count: studentCount });
      
      classStudentRecords.push({
        classId,
        className: classInfo.class_name,
        record
      });
    }
    
    res.json(Response.success({
      assignedClasses: classStudentRecords.length,
      classes: classStudentRecords.map(r => ({ id: r.classId, name: r.className }))
    }, `成功分配${classStudentRecords.length}个班级`));
    
  } catch (error) {
    logger.error('[Student] assignClass failed', {
      studentId: req.body?.studentId,
      error: error.message
    });
    next(error);
  }
};

exports.getStudentProgress = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.json(Response.error('Student ID is required', 400));
    }

    const progressRows = await safeFindAllCompat(models.TeachingStudentProgress, {
      where: { student_id: studentId },
      order: [['last_learn_time', 'DESC']]
    }, 'getStudentProgress.progressRows');

    if (progressRows.length === 0) {
      return res.json(Response.success({
        studentId,
        courses: [],
        totalProgress: 0,
        studyDays: 0,
        totalStudyHours: 0
      }));
    }

    const courseIds = Array.from(new Set(progressRows.map(item => item.course_id).filter(Boolean)));
    const courseRows = courseIds.length > 0
      ? await models.TeachingCourse.findAll({
        where: {
          id: { [Op.in]: courseIds },
          del_flag: 0
        },
        attributes: ['id', 'course_name']
      })
      : [];

    const courseMap = new Map(courseRows.map(item => [item.id, item.course_name]));
    const courseSummaryMap = new Map();
    const studyDays = new Set();
    let totalStudyMinutes = 0;

    progressRows.forEach((row) => {
      const ratio = normalizeProgressRatio(row.progress);
      const courseId = row.course_id || `course-${courseSummaryMap.size + 1}`;
      const existing = courseSummaryMap.get(courseId) || {
        courseId,
        courseName: courseMap.get(courseId) || 'Unnamed Course',
        progressTotal: 0,
        progressCount: 0,
        completedUnits: 0,
        totalUnits: 0,
        lastStudyTime: null
      };

      existing.progressTotal += ratio;
      existing.progressCount += 1;
      existing.totalUnits += 1;
      if (Number(row.completed) === 1 || ratio >= 1) {
        existing.completedUnits += 1;
      }

      if (row.last_learn_time) {
        const candidate = new Date(row.last_learn_time);
        if (!Number.isNaN(candidate.getTime())) {
          const current = existing.lastStudyTime ? new Date(existing.lastStudyTime) : null;
          if (!current || candidate > current) {
            existing.lastStudyTime = row.last_learn_time;
          }
          studyDays.add(candidate.toISOString().slice(0, 10));
        }
      }

      totalStudyMinutes += Number(row.total_duration) || 0;
      courseSummaryMap.set(courseId, existing);
    });

    const courses = Array.from(courseSummaryMap.values()).map((item) => ({
      courseId: item.courseId,
      courseName: item.courseName,
      progress: item.progressCount > 0 ? Number((item.progressTotal / item.progressCount).toFixed(4)) : 0,
      completedUnits: item.completedUnits,
      totalUnits: item.totalUnits,
      lastStudyTime: item.lastStudyTime
    }));

    const totalProgress = courses.length > 0
      ? Number((courses.reduce((sum, item) => sum + item.progress, 0) / courses.length).toFixed(4))
      : 0;

    res.json(Response.success({
      studentId,
      courses,
      totalProgress,
      studyDays: studyDays.size,
      totalStudyHours: Number((totalStudyMinutes / 60).toFixed(2))
    }));
  } catch (error) {
    next(error);
  }
};

exports.createLearningMark = async (req, res, next) => {
  try {
    const { studentId, markType, notes } = req.body || {};

    if (!studentId || !markType || !notes) {
      return res.json(Response.error('Student ID, mark type and notes are required', 400));
    }

    const student = await models.TeachingStudent.findOne({
      where: {
        id: studentId,
        del_flag: 0
      }
    });

    if (!student) {
      return res.json(Response.error('Student not found', 404));
    }

    const currentStatus = student.learning_status || 'normal';
    const mark = await models.TeachingStudentStatusLog.create({
      id: uuidUtil.generate(),
      student_id: studentId,
      old_status: currentStatus,
      new_status: currentStatus,
      reason: `[learning_mark:${markType}] ${notes}`,
      operator: req.user?.id || null,
      create_time: new Date()
    });

    res.json(Response.success({
      id: mark.id,
      studentId,
      markType,
      notes,
      createTime: mark.create_time
    }, 'Learning mark created'));
  } catch (error) {
    next(error);
  }
};

exports.getTeachingStudentList = async (req, res, next) => {
  try {
    const {
      pageNo = 1,
      pageSize = 10,
      keyword,
      classId,
      excludeClassId,
      status,
      learningStatus
    } = req.query;
    const studentAttributes = await getTeachingStudentSelectableAttributes();
    const studentColumnSet = await getTeachingStudentColumnSet();
    const supportsLearningStatus = !studentColumnSet || studentColumnSet.has('learning_status');

    const where = { del_flag: 0 };

    if (keyword) {
      where[Op.or] = [
        { realname: { [Op.like]: `%${keyword}%` } },
        { student_no: { [Op.like]: `%${keyword}%` } }
      ];
    }

    if (learningStatus && supportsLearningStatus) {
      where.learning_status = learningStatus;
    }

    if (status) {
      const normalizedStatus = String(status).trim().toLowerCase();
      if (normalizedStatus === 'need_attention') {
        if (supportsLearningStatus) {
          where.learning_status = 'need_attention';
        } else {
          where.status = 3;
        }
      } else if (normalizedStatus === 'active') {
        where.status = 1;
      } else if (normalizedStatus === 'inactive' || normalizedStatus === 'suspended') {
        where.status = 2;
      } else if (/^\d+$/.test(normalizedStatus)) {
        where.status = Number(normalizedStatus);
      }
    }

    if (classId) {
      const classStudents = await safeFindAllCompat(models.TeachingClassStudent, {
        where: {
          class_id: classId,
          del_flag: 0
        },
        attributes: ['student_id'],
        raw: true
      }, 'getTeachingStudentList.classStudentsFilter');
      const studentIds = classStudents.map(item => item.student_id);
      if (studentIds.length === 0) {
        return res.json(Response.page([], 0, pageNo, pageSize));
      }
      where.id = { [Op.in]: studentIds };
    } else if (excludeClassId) {
      const excludedClassStudents = await safeFindAllCompat(models.TeachingClassStudent, {
        where: {
          class_id: excludeClassId,
          del_flag: 0
        },
        attributes: ['student_id'],
        raw: true
      }, 'getTeachingStudentList.excludeClassStudents');
      const excludedStudentIds = Array.from(new Set(excludedClassStudents.map(item => item.student_id).filter(Boolean)));
      if (excludedStudentIds.length > 0) {
        where.id = { [Op.notIn]: excludedStudentIds };
      }
    }

    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(pageNo, 10) - 1) * limit;

    const { count, rows } = await models.TeachingStudent.findAndCountAll({
      where,
      limit,
      offset,
      order: [['create_time', 'DESC']],
      attributes: studentAttributes
    });

    const studentIds = rows.map(item => item.id);
    const classLinks = studentIds.length > 0
      ? await safeFindAllCompat(models.TeachingClassStudent, {
        where: {
          student_id: { [Op.in]: studentIds },
          del_flag: 0
        },
        attributes: ['student_id', 'class_id', 'join_date'],
        raw: true
      }, 'getTeachingStudentList.classLinks')
      : [];

    const classIds = Array.from(new Set(classLinks.map(item => item.class_id).filter(Boolean)));
    const classes = classIds.length > 0
      ? await safeFindAllCompat(models.TeachingClass, {
        where: {
          id: { [Op.in]: classIds },
          del_flag: 0
        },
        attributes: ['id', 'class_name'],
        raw: true
      }, 'getTeachingStudentList.classes')
      : [];

    const progressRows = studentIds.length > 0
      ? await safeFindAllCompat(models.TeachingStudentProgress, {
        where: {
          student_id: { [Op.in]: studentIds }
        },
        attributes: ['student_id', 'course_id', 'progress', 'completed', 'last_learn_time']
      }, 'getTeachingStudentList.progressRows')
      : [];

    const submissionRows = studentIds.length > 0
      ? await safeFindAllCompat(models.TeachingHomeworkSubmission, {
        where: {
          student_id: { [Op.in]: studentIds }
        },
        attributes: ['student_id', 'submit_time']
      }, 'getTeachingStudentList.submissionRows')
      : [];

    const classMap = new Map(classes.map(item => [item.id, item]));
    const classListByStudent = classLinks.reduce((result, item) => {
      const classInfo = classMap.get(item.class_id);
      if (!classInfo) {
        return result;
      }

      if (!result[item.student_id]) {
        result[item.student_id] = [];
      }

      result[item.student_id].push({
        id: classInfo.id,
        name: classInfo.class_name,
        className: classInfo.class_name,
        joinDate: item.join_date || null
      });

      return result;
    }, {});

    const progressSummaryMap = progressRows.reduce((result, row) => {
      if (!result[row.student_id]) {
        result[row.student_id] = {
          courseMap: {},
          lastActivityTime: null
        };
      }

      const summary = result[row.student_id];
      const ratio = normalizeProgressRatio(row.progress);
      const courseId = row.course_id || `course-${Object.keys(summary.courseMap).length + 1}`;
      if (!summary.courseMap[courseId]) {
        summary.courseMap[courseId] = {
          ratioTotal: 0,
          ratioCount: 0,
          completed: false
        };
      }

      summary.courseMap[courseId].ratioTotal += ratio;
      summary.courseMap[courseId].ratioCount += 1;
      if (Number(row.completed) === 1 || ratio >= 1) {
        summary.courseMap[courseId].completed = true;
      }

      if (row.last_learn_time) {
        const candidate = new Date(row.last_learn_time);
        const current = summary.lastActivityTime ? new Date(summary.lastActivityTime) : null;
        if (!current || candidate > current) {
          summary.lastActivityTime = row.last_learn_time;
        }
      }

      return result;
    }, {});

    submissionRows.forEach((row) => {
      if (!progressSummaryMap[row.student_id]) {
        progressSummaryMap[row.student_id] = {
          courseMap: {},
          lastActivityTime: null
        };
      }

      if (row.submit_time) {
        const summary = progressSummaryMap[row.student_id];
        const candidate = new Date(row.submit_time);
        const current = summary.lastActivityTime ? new Date(summary.lastActivityTime) : null;
        if (!current || candidate > current) {
          summary.lastActivityTime = row.submit_time;
        }
      }
    });

    const records = rows.map((row) => {
      const data = row.toJSON();
      const classesForStudent = classListByStudent[data.id] || [];
      const currentClass = classesForStudent[0] || null;
      const studentLifecycle = resolveStudentLifecycle(data.learning_status, data.status);
      const uiStatus = normalizeTeachingStudentStatus(data.status, studentLifecycle.learningStatus);
      const progressSummary = progressSummaryMap[data.id] || { courseMap: {}, lastActivityTime: null };
      const courseProgressList = Object.values(progressSummary.courseMap);
      const totalCourses = courseProgressList.length;
      const completedCourses = courseProgressList.filter(item => item.completed).length;
      const completionRate = totalCourses > 0
        ? Math.round((courseProgressList.reduce((sum, item) => {
          const ratio = item.ratioCount > 0 ? item.ratioTotal / item.ratioCount : 0;
          return sum + ratio;
        }, 0) / totalCourses) * 100)
        : 0;
      const lastActivityTime = progressSummary.lastActivityTime || data.update_time || data.create_time || null;
      const lastActivity = lastActivityTime
        ? '近期有学习活动'
        : (uiStatus === 'need_attention' ? '需要重点关注' : '暂无学习活动');

      return {
        id: data.id,
        name: data.realname,
        realname: data.realname,
        studentNumber: data.student_no,
        studentNo: data.student_no,
        username: data.username,
        avatar: avatarUtil.normalizeAvatarUrl(data.avatar, data.student_no || data.username || data.realname),
        sex: data.sex,
        gender: mapStudentGender(data.sex),
        phone: data.phone,
        email: data.email,
        birthday: data.birthday || null,
        idCard: data.id_card || '',
        parentPhone: data.parent_phone || '',
        parentName: data.parent_name || '',
        address: data.address || '',
        enrollmentDate: data.enrollment_date || null,
        seat: data.seat || '',
        remark: data.remark || '',
        className: currentClass ? currentClass.className : 'Unassigned',
        classes: classesForStudent,
        currentClass,
        status: uiStatus,
        rawStatus: data.status,
        learningStatus: studentLifecycle.learningStatus,
        completionRate,
        completedCourses,
        totalCourses,
        lastActivityTime,
        lastActivity,
        createTime: data.create_time,
        updateTime: data.update_time
      };
    });

    res.json(Response.page(records, count, pageNo, pageSize));
  } catch (error) {
    next(error);
  }
};

exports.getStudentDetails = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const studentAttributes = await getTeachingStudentSelectableAttributes();

    const student = await models.TeachingStudent.findOne({
      where: {
        id: studentId,
        del_flag: 0
      },
      attributes: studentAttributes
    });

    if (!student) {
      return res.json(Response.error('Student not found', 404));
    }

    const classLink = await models.TeachingClassStudent.findOne({
      where: {
        student_id: studentId,
        del_flag: 0
      },
      order: [['create_time', 'DESC']]
    });

    const classInfo = classLink
      ? await models.TeachingClass.findOne({
        where: {
          id: classLink.class_id,
          del_flag: 0
        },
        attributes: ['id', 'class_name']
      })
      : null;

    const progressRows = await safeFindAllCompat(models.TeachingStudentProgress, {
      where: {
        student_id: studentId
      },
      attributes: ['course_id', 'progress', 'completed', 'last_learn_time', 'total_duration']
    }, 'getStudentDetails.progressRows');

    const progressCourseMap = progressRows.reduce((result, item) => {
      const courseId = item.course_id || `course-${Object.keys(result).length + 1}`;
      if (!result[courseId]) {
        result[courseId] = {
          ratioTotal: 0,
          ratioCount: 0,
          completed: false
        };
      }

      const ratio = normalizeProgressRatio(item.progress);
      result[courseId].ratioTotal += ratio;
      result[courseId].ratioCount += 1;
      if (Number(item.completed) === 1 || ratio >= 1) {
        result[courseId].completed = true;
      }
      return result;
    }, {});

    const classLinks = await safeFindAllCompat(models.TeachingClassStudent, {
      where: {
        student_id: studentId,
        del_flag: 0
      },
      attributes: ['class_id']
    }, 'getStudentDetails.classLinks');
    const classIds = classLinks.map(item => item.class_id).filter(Boolean);
    const homeworkClassLinks = classIds.length > 0
      ? await safeFindAllCompat(models.TeachingHomeworkClass, {
        where: {
          class_id: { [Op.in]: classIds }
        },
        attributes: ['homework_id']
      }, 'getStudentDetails.homeworkClassLinks')
      : [];
    const homeworkIds = Array.from(new Set(homeworkClassLinks.map(item => item.homework_id).filter(Boolean)));
    const submissionCount = homeworkIds.length > 0
      ? await safeCountCompat(models.TeachingHomeworkSubmission, {
        where: {
          student_id: studentId,
          homework_id: { [Op.in]: homeworkIds }
        }
      }, 'getStudentDetails.submissionCount')
      : 0;

    const latestProgressTime = progressRows.reduce((latest, item) => {
      if (!item.last_learn_time) {
        return latest;
      }
      const candidate = new Date(item.last_learn_time);
      if (!latest) {
        return candidate;
      }
      return candidate > latest ? candidate : latest;
    }, null);

    const data = student.toJSON();
    const normalizedStatus = normalizeTeachingStudentStatus(data.status, data.learning_status);

    res.json(Response.success({
      id: data.id,
      name: data.realname,
      realname: data.realname,
      studentNumber: data.student_no,
      studentNo: data.student_no,
      className: classInfo ? classInfo.class_name : 'Unassigned',
      email: data.email || '',
      phone: data.phone || '',
      avatar: avatarUtil.normalizeAvatarUrl(data.avatar, data.student_no || data.username || data.realname),
      status: normalizedStatus,
      learningStatus: data.learning_status,
      registerTime: data.create_time || null,
      lastLoginTime: latestProgressTime || data.update_time || data.create_time || null,
      completedCourses: Object.values(progressCourseMap).filter(item => item.completed).length,
      totalStudyTime: Number((progressRows.reduce((sum, item) => sum + (Number(item.total_duration) || 0), 0) / 60).toFixed(2)),
      homeworkCompletionRate: homeworkIds.length > 0 ? Math.round((submissionCount / homeworkIds.length) * 100) : 0
    }));
  } catch (error) {
    next(error);
  }
};

exports.getStudentStatistics = async (req, res, next) => {
  try {
    const totalStudents = await models.TeachingStudent.count({
      where: { del_flag: 0 }
    });

    const activeStudents = await models.TeachingStudent.count({
      where: {
        del_flag: 0,
        status: 1
      }
    });

    const needAttentionCount = await models.TeachingStudent.count({
      where: {
        del_flag: 0,
        learning_status: 'need_attention'
      }
    });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const newStudentsThisMonth = await models.TeachingStudent.count({
      where: {
        del_flag: 0,
        create_time: {
          [Op.gte]: monthStart
        }
      }
    });

    const progressRows = await safeFindAllCompat(models.TeachingStudentProgress, {
      attributes: ['progress']
    }, 'getStudentStatistics.progressRows');
    const averageProgress = progressRows.length > 0
      ? Math.round((progressRows.reduce((sum, item) => sum + normalizeProgressRatio(item.progress), 0) / progressRows.length) * 100)
      : 0;

    res.json(Response.success({
      totalStudents,
      activeStudents,
      needAttentionCount,
      newStudentsThisMonth,
      averageProgress,
      statusDistribution: {
        active: activeStudents,
        inactive: Math.max(totalStudents - activeStudents, 0),
        need_attention: needAttentionCount
      }
    }));
  } catch (error) {
    next(error);
  }
};

exports.exportStudentData = async (req, res, next) => {
  try {
    const {
      keyword,
      classId,
      status,
      learningStatus
    } = req.body || {};

    const where = { del_flag: 0 };

    if (keyword) {
      where[Op.or] = [
        { realname: { [Op.like]: `%${keyword}%` } },
        { student_no: { [Op.like]: `%${keyword}%` } }
      ];
    }

    if (learningStatus) {
      where.learning_status = learningStatus;
    }

    if (status) {
      const normalizedStatus = String(status).trim().toLowerCase();
      if (normalizedStatus === 'need_attention') {
        where.learning_status = 'need_attention';
      } else if (normalizedStatus === 'active') {
        where.status = 1;
      } else if (normalizedStatus === 'inactive' || normalizedStatus === 'suspended') {
        where.status = 2;
      } else if (/^\d+$/.test(normalizedStatus)) {
        where.status = Number(normalizedStatus);
      }
    }

    if (classId) {
      const classStudents = await models.TeachingClassStudent.findAll({
        where: {
          class_id: classId,
          del_flag: 0
        },
        attributes: ['student_id']
      });
      const studentIds = classStudents.map(item => item.student_id);
      if (studentIds.length === 0) {
        const emptyCsv = '\uFEFF' + ['student_no', 'name', 'classes', 'status', 'phone', 'email', 'created_at'].join(',') + '\n';
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`students_${new Date().toISOString().slice(0, 10)}.csv`)}`);
        return res.send(emptyCsv);
      }
      where.id = { [Op.in]: studentIds };
    }

    const students = await models.TeachingStudent.findAll({
      where,
      order: [['create_time', 'DESC']],
      attributes: { exclude: ['del_flag'] }
    });

    const studentIds = students.map(item => item.id);
    const classLinks = studentIds.length > 0
      ? await models.TeachingClassStudent.findAll({
        where: {
          student_id: { [Op.in]: studentIds },
          del_flag: 0
        },
        attributes: ['student_id', 'class_id']
      })
      : [];
    const classIds = Array.from(new Set(classLinks.map(item => item.class_id).filter(Boolean)));
    const classes = classIds.length > 0
      ? await models.TeachingClass.findAll({
        where: {
          id: { [Op.in]: classIds },
          del_flag: 0
        },
        attributes: ['id', 'class_name']
      })
      : [];

    const classMap = new Map(classes.map(item => [item.id, item.class_name]));
    const classNamesByStudent = classLinks.reduce((result, item) => {
      if (!result[item.student_id]) {
        result[item.student_id] = [];
      }
      const className = classMap.get(item.class_id);
      if (className) {
        result[item.student_id].push(className);
      }
      return result;
    }, {});

    const header = ['student_no', 'name', 'classes', 'status', 'phone', 'email', 'created_at'];
    const rows = students.map((item) => {
      const data = item.toJSON();
      const statusText = normalizeTeachingStudentStatus(data.status, data.learning_status);
      return [
        data.student_no || '',
        data.realname || '',
        (classNamesByStudent[data.id] || []).join(' / '),
        statusText,
        data.phone || '',
        data.email || '',
        data.create_time ? new Date(data.create_time).toISOString() : ''
      ].map(csvEscape).join(',');
    });

    const csvContent = '\uFEFF' + [header.map(csvEscape).join(','), ...rows].join('\n');
    const filename = `students_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

/**
 * 批量导入学员（解析 xlsx/xls/csv 文件并写入数据库）
 * POST /student/batch-import
 * multipart/form-data: file=@学员导入模板.xlsx
 */

/**
 * 批量导入学员（解析 xlsx/xls/csv 文件并写入数据库）
 * POST /student/batch-import
 * multipart/form-data: file=@学员导入模板.xlsx
 */
exports.batchImportStudents = async (req, res, next) => {
  const fs = require('fs');
  const path = require('path');
  const encryptUtil = require('../utils/encrypt');

  if (!req.file) {
    return res.json(Response.error('请上传要导入的文件', 400));
  }

  let xlsx;
  try {
    xlsx = require('xlsx');
  } catch (moduleError) {
    logger.error('[Student] batchImport missing xlsx dependency', {
      error: moduleError.message,
      code: moduleError.code
    });
    safeUnlink(req.file.path);
    return res.status(500).json(Response.error('服务端缺少学员导入组件，请更新后端依赖后重试', 500));
  }

  const filePath = req.file.path;
  const originalName = Buffer.from(req.file.originalname || 'import.xlsx', 'latin1').toString('utf8');
  const operatorId = req.user && req.user.id;
  const defaultPassword = '123456';
  const defaultPasswordHash = await encryptUtil.hashPassword(defaultPassword);
  const now = new Date();

  let workbook;
  try {
    const extension = path.extname(originalName || filePath).toLowerCase();
    if (extension === '.csv') {
      const csvText = fs.readFileSync(filePath, 'utf8');
      workbook = xlsx.read(csvText, {
        type: 'string',
        cellDates: true,
        codepage: 65001
      });
    } else {
      workbook = xlsx.readFile(filePath, { cellDates: true });
    }
  } catch (parseError) {
    logger.error('[Student] batchImport failed to parse file', { error: parseError.message, file: originalName });
    safeUnlink(filePath);
    return res.json(Response.error('文件解析失败，请确认是有效的 Excel 或 CSV 文件', 400));
  }

  const sheetName = workbook.SheetNames && workbook.SheetNames[0];
  if (!sheetName) {
    safeUnlink(filePath);
    return res.json(Response.error('文件中没有可读取的工作表', 400));
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false });
  if (!rows.length) {
    safeUnlink(filePath);
    return res.json(Response.error('文件中没有可导入的数据行', 400));
  }

  const headerMap = {
    '学号': 'studentNo',
    'studentNo': 'studentNo',
    'student_no': 'studentNo',
    '用户名': 'username',
    'username': 'username',
    '姓名': 'realname',
    'realname': 'realname',
    'name': 'realname',
    '性别(male/female/other)': 'sex',
    '性别': 'sex',
    '性别(male/female)': 'sex',
    'sex': 'sex',
    'gender': 'sex',
    '手机号': 'phone',
    '手机': 'phone',
    'phone': 'phone',
    'mobile': 'phone',
    '邮箱': 'email',
    'email': 'email'
  };

  const normalizedRows = rows.map((rawRow, rowIndex) => {
    const obj = {};
    for (const [key, value] of Object.entries(rawRow)) {
      const trimmedKey = String(key || '').trim();
      const field = headerMap[trimmedKey] || headerMap[trimmedKey.toLowerCase()];
      if (field) {
        obj[field] = typeof value === 'string' ? value.trim() : value;
      }
    }
    obj._rowIndex = rowIndex + 2;
    return obj;
  });

  const result = {
    total: normalizedRows.length,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    created: []
  };

  for (const row of normalizedRows) {
    const studentNo = String(row.studentNo || '').trim();
    const realname = String(row.realname || '').trim();
    const username = String(row.username || studentNo).trim();
    const sexRaw = String(row.sex || '').trim();
    const phone = String(row.phone || '').trim();
    const email = String(row.email || '').trim();

    if (!studentNo || !realname) {
      result.failed += 1;
      result.errors.push({ row: row._rowIndex, message: '学号和姓名不能为空' });
      continue;
    }

    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      result.failed += 1;
      result.errors.push({ row: row._rowIndex, studentNo, message: '手机号格式不正确: ' + phone });
      continue;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      result.failed += 1;
      result.errors.push({ row: row._rowIndex, studentNo, message: '邮箱格式不正确: ' + email });
      continue;
    }

    let transaction;
    try {
      transaction = await models.sequelize.transaction();

      // 先检查是否有同名学号的已删除学生（软删除），如果有则准备恢复
      const deletedStudent = await models.TeachingStudent.findOne({
        where: { student_no: studentNo, del_flag: 1 },
        transaction
      });

      const existingStudent = await models.TeachingStudent.findOne({
        where: { student_no: studentNo, del_flag: 0 },
        transaction
      });
      if (existingStudent) {
        await transaction.rollback();
        transaction = null;
        result.skipped += 1;
        result.errors.push({ row: row._rowIndex, studentNo, message: '学号已存在，已跳过' });
        continue;
      }

      const activeSysUser = await models.SysUser.findOne({
        where: { username, del_flag: 0 },
        transaction
      });
      const deletedSysUser = await models.SysUser.findOne({
        where: { username, del_flag: 1 },
        transaction
      });

      // 学号对应的 teaching_student 已被软删除、用户名对应的 sys_user 仍激活
      // （典型的"删学生时未删账号"或反向操作）时，复用现有 sys_user 并恢复学生记录
      if (activeSysUser && !deletedStudent) {
        await transaction.rollback();
        transaction = null;
        result.skipped += 1;
        result.errors.push({ row: row._rowIndex, studentNo, message: '用户名 ' + username + ' 已存在，已跳过' });
        continue;
      }

      const studentPayload = {
        realname,
        student_no: studentNo,
        username,
        sex: normalizeSexValue(sexRaw),
        phone: phone || null,
        email: email || null,
        status: 1,
        learning_status: 'normal',
        del_flag: 0,
        update_by: operatorId,
        update_time: now
      };

      let student;
      if (deletedStudent) {
        await deletedStudent.update(studentPayload, { transaction });
        student = deletedStudent;
      } else {
        student = await models.TeachingStudent.create({
          id: uuidUtil.generate(),
          ...studentPayload,
          create_by: operatorId,
          create_time: now
        }, { transaction });
      }

      const baseUserData = {
        username,
        password: defaultPasswordHash,
        realname,
        avatar: null,
        birthday: null,
        sex: normalizeSexValue(sexRaw),
        email: email || null,
        phone: phone || null,
        user_identity: 3,
        status: 1,
        del_flag: 0,
        update_by: operatorId,
        update_time: now
      };

      if (deletedSysUser) {
        await deletedSysUser.update(baseUserData, { transaction });
      } else {
        await models.SysUser.create({
          id: uuidUtil.generate(),
          ...baseUserData,
          create_by: operatorId,
          create_time: now
        }, { transaction });
      }

      await transaction.commit();
      transaction = null;

      result.success += 1;
      result.created.push({ studentNo, realname, username, defaultPassword });
    } catch (error) {
      if (transaction) {
        try { await transaction.rollback(); } catch (e) { /* ignore */ }
      }
      const duplicateMessage = await resolveBatchImportDuplicateMessage({ studentNo, username });
      if (duplicateMessage) {
        result.skipped += 1;
        logger.warn('[Student] batchImport row skipped after duplicate race', {
          studentNo,
          username,
          error: error.message
        });
        result.errors.push({ row: row._rowIndex, studentNo, message: duplicateMessage });
        continue;
      }

      result.failed += 1;
      logger.error('[Student] batchImport row failed', { studentNo, username, error: error.message });
      result.errors.push({ row: row._rowIndex, studentNo, message: error.message || '导入失败' });
    }
  }

  safeUnlink(filePath);

  logger.info('[Student] batchImport finished', {
    operator: operatorId,
    file: originalName,
    total: result.total,
    success: result.success,
    failed: result.failed,
    skipped: result.skipped
  });

  return res.json(Response.success(result, '导入完成：成功 ' + result.success + '，失败 ' + result.failed + '，跳过 ' + result.skipped));
};

function safeUnlink(filePath) {
  try {
    const fs = require('fs');
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    // ignore
  }
}

function normalizeSexValue(value) {
  if (value === undefined || value === null || value === '') return null;
  const str = String(value).trim().toLowerCase();
  if (str === 'male' || str === '男' || str === 'm' || str === '1') return 1;
  if (str === 'female' || str === '女' || str === 'f' || str === '2') return 2;
  return null;
}

async function resolveBatchImportDuplicateMessage({ studentNo, username }) {
  if (!studentNo && !username) {
    return null;
  }

  try {
    if (studentNo) {
      const existingStudent = await models.TeachingStudent.findOne({
        where: { student_no: studentNo, del_flag: 0 }
      });
      if (existingStudent) {
        return '学号已存在，已跳过';
      }
    }

    if (username) {
      const existingUser = await models.SysUser.findOne({
        where: { username, del_flag: 0 }
      });
      if (existingUser) {
        return '用户名 ' + username + ' 已存在，已跳过';
      }
    }
  } catch (lookupError) {
    logger.warn('[Student] batchImport duplicate fallback lookup failed', {
      studentNo,
      username,
      error: lookupError.message
    });
  }

  return null;
}
