/**
 * 班级管理控制器
 * 处理班级的CRUD操作和学生管理
 */

const models = require('../models');
const Response = require('../utils/response');
const uuidUtil = require('../utils/uuid');
const { Op } = require('sequelize');
const { logger } = require('../middleware/logger');
const {
  filterTeachingClassPayload,
  getTeachingClassSelectableAttributes
} = require('../utils/classSchema');

function resolveClassId(req) {
  return req.params?.id || req.params?.classId || null;
}

function normalizeClassStatusValue(status) {
  const normalizedStatus = String(status === undefined || status === null ? '' : status).trim().toLowerCase();

  if (normalizedStatus === 'active' || normalizedStatus === '1') {
    return 1;
  }

  if (normalizedStatus === 'suspended' || normalizedStatus === '2') {
    return 2;
  }

  if (normalizedStatus === 'finished' || normalizedStatus === '3' || normalizedStatus === 'archived') {
    return 3;
  }

  return null;
}

function getClassStatusKey(status) {
  const normalizedStatus = normalizeClassStatusValue(status);
  if (normalizedStatus === 2) {
    return 'suspended';
  }
  if (normalizedStatus === 3) {
    return 'finished';
  }
  return 'active';
}

function parseJsonArray(rawValue) {
  if (!rawValue) {
    return [];
  }

  if (Array.isArray(rawValue)) {
    return rawValue;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function normalizeScheduleWeekdays(rawWeekdays) {
  if (!Array.isArray(rawWeekdays)) {
    return [];
  }

  return Array.from(
    new Set(
      rawWeekdays
        .map(day => Number(day))
        .filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
    )
  ).sort((left, right) => left - right);
}

function normalizeScheduleTimeSlots(rawTimeSlots) {
  if (!Array.isArray(rawTimeSlots)) {
    return [];
  }

  return rawTimeSlots
    .map((slot) => {
      if (!slot || typeof slot !== 'object') {
        return null;
      }

      const start = typeof slot.start === 'string' ? slot.start.trim() : '';
      const end = typeof slot.end === 'string' ? slot.end.trim() : '';
      const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

      if (!timePattern.test(start) || !timePattern.test(end) || start >= end) {
        return null;
      }

      return { start, end };
    })
    .filter(Boolean);
}

function normalizeSchedulePayload(schedule) {
  if (!schedule || typeof schedule !== 'object') {
    return null;
  }

  const weekdays = normalizeScheduleWeekdays(schedule.weekdays);
  const timeSlots = normalizeScheduleTimeSlots(schedule.timeSlots);

  if (weekdays.length === 0 && timeSlots.length === 0) {
    return null;
  }

  return {
    weekdays,
    timeSlots
  };
}

function getScheduleFromRecord(data) {
  const weekdays = normalizeScheduleWeekdays(parseJsonArray(data.schedule_weekdays));
  const timeSlots = normalizeScheduleTimeSlots(parseJsonArray(data.schedule_time_slots));

  if (weekdays.length === 0 && timeSlots.length === 0) {
    return null;
  }

  return {
    weekdays,
    timeSlots
  };
}

function formatClassRecord(data, enrolledCount) {
  return {
    id: data.id,
    name: data.class_name,
    code: data.class_no,
    description: data.description,
    teacherId: data.teacher_id,
    teacherName: data.teacher_name,
    status: data.status,
    statusKey: getClassStatusKey(data.status),
    capacity: data.max_students,
    enrolledCount,
    startDate: data.start_date,
    endDate: data.end_date,
    location: data.classroom,
    schedule: getScheduleFromRecord(data),
    createTime: data.create_time,
    updateTime: data.update_time
  };
}

/**
 * 获取班级列表（支持分页、搜索）
 * GET /class/list
 */
exports.getClassList = async (req, res, next) => {
  try {
    const classAttributes = await getTeachingClassSelectableAttributes();
    const { 
      pageNo = 1, 
      pageSize = 10, 
      className,
      keyword,  // 支持前端传keyword参数
      status,
      teacherId
    } = req.query;
    
    // 构建查询条件
    const where = { del_flag: 0 };
    
    // 支持className或keyword参数
    const searchKeyword = className || keyword;
    if (searchKeyword) {
      where.class_name = { [Op.like]: `%${searchKeyword}%` };
    }
    
    if (status) {
      const normalizedStatus = normalizeClassStatusValue(status);
      where.status = normalizedStatus === null ? status : normalizedStatus;
    }
    
    if (teacherId) {
      where.teacher_id = teacherId;
    }
    
    // 分页查询
    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(pageNo, 10) - 1) * limit;
    
    const { count, rows } = await models.TeachingClass.findAndCountAll({
      where,
      limit,
      offset,
      order: [['create_time', 'DESC']],
      attributes: classAttributes
    });

    const classIds = rows.map(row => row.id);
    const classStudentCounts = classIds.length > 0
      ? await models.TeachingClassStudent.findAll({
          where: {
            class_id: { [Op.in]: classIds },
            del_flag: 0,
            status: 1
          },
          attributes: [
            'class_id',
            [models.Sequelize.fn('COUNT', models.Sequelize.col('student_id')), 'studentCount']
          ],
          group: ['class_id'],
          raw: true
        })
      : [];

    const classStudentCountMap = new Map(
      classStudentCounts.map(item => [item.class_id, Number(item.studentCount) || 0])
    );

    const normalizedRows = rows.map((row) => {
      const data = row.toJSON();
      const enrolledCount = classStudentCountMap.get(data.id) || 0;
      return formatClassRecord(data, enrolledCount);
    });

    return res.json(Response.page(normalizedRows, count, pageNo, pageSize));
  } catch (error) {
    next(error);
  }
};

/**
 * 获取班级详情
 * GET /class/:id
 */
exports.getClassById = async (req, res, next) => {
  try {
    const id = resolveClassId(req);
    const classAttributes = await getTeachingClassSelectableAttributes();
    
    const classInfo = await models.TeachingClass.findOne({
      where: { id, del_flag: 0 },
      attributes: classAttributes
    });
    
    if (!classInfo) {
      return res.json(Response.error('班级不存在', 404));
    }
    
    // 字段映射
    const enrolledCount = await models.TeachingClassStudent.count({
      where: {
        class_id: id,
        del_flag: 0,
        status: 1
      }
    });

    const data = classInfo.toJSON();
    const formattedClass = formatClassRecord(data, enrolledCount);
    
    res.json(Response.success(formattedClass));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 创建班级
 * POST /class
 */
exports.createClass = async (req, res, next) => {
  try {
    const { 
      className, 
      name,        // 兼容前端传name
      classNo,
      code,        // 兼容前端传code
      teacherId,
      teacherName,
      startDate,
      endDate,
      maxStudents,
      capacity,    // 兼容前端传capacity
      classroom,
      description,
      schedule
    } = req.body;
    
    // 兼容name和className
    const finalClassName = className || name;
    const finalClassNo = classNo || code;
    const finalMaxStudents = maxStudents || capacity || 30;
    
    // 验证必填字段
    if (!finalClassName) {
      return res.json(Response.error('班级名称不能为空', 400));
    }
    
    const normalizedSchedule = normalizeSchedulePayload(schedule);

    const classData = await filterTeachingClassPayload({
      id: uuidUtil.generate(),
      class_name: finalClassName,
      class_no: finalClassNo || null,
      teacher_id: teacherId || req.user?.id || null,
      teacher_name: teacherName || req.user?.realname || null,
      start_date: startDate || null,
      end_date: endDate || null,
      status: 1,
      student_count: 0,
      max_students: finalMaxStudents,
      classroom: classroom || null,
      schedule_weekdays: normalizedSchedule ? JSON.stringify(normalizedSchedule.weekdays) : null,
      schedule_time_slots: normalizedSchedule ? JSON.stringify(normalizedSchedule.timeSlots) : null,
      description: description || null,
      del_flag: 0,
      create_by: req.user?.id,
      create_time: new Date()
    });

    // 创建班级
    const newClass = await models.TeachingClass.create(classData);
    const createdClass = formatClassRecord(newClass.toJSON(), 0);
    return res.json(Response.success(createdClass, 'created successfully'));
    return res.json(Response.success(createdClass, '鍒涘缓鎴愬姛'));

    res.json(Response.success(newClass, '创建成功'));
    
  } catch (error) {
    logger.error('[Class] createClass failed', {
      userId: req.user?.id,
      error: error.message
    });
    next(error);
  }
};

/**
 * 更新班级信息
 * PUT /class/:id
 */
exports.updateClass = async (req, res, next) => {
  try {
    const id = resolveClassId(req);
    const updateData = req.body;
    
    const classInfo = await models.TeachingClass.findOne({
      where: { id, del_flag: 0 }
    });
    
    if (!classInfo) {
      return res.json(Response.error('班级不存在', 404));
    }
    
    // 更新班级信息
    const filteredUpdatePayload = await filterTeachingClassPayload({
      class_name: updateData.className || classInfo.class_name,
      class_no: updateData.classNo !== undefined ? updateData.classNo : classInfo.class_no,
      teacher_id: updateData.teacherId !== undefined ? updateData.teacherId : classInfo.teacher_id,
      teacher_name: updateData.teacherName !== undefined ? updateData.teacherName : classInfo.teacher_name,
      start_date: updateData.startDate !== undefined ? updateData.startDate : classInfo.start_date,
      end_date: updateData.endDate !== undefined ? updateData.endDate : classInfo.end_date,
      max_students: updateData.maxStudents !== undefined ? updateData.maxStudents : classInfo.max_students,
      classroom: updateData.classroom !== undefined ? updateData.classroom : classInfo.classroom,
      description: updateData.description !== undefined ? updateData.description : classInfo.description,
      update_by: req.user?.id,
      update_time: new Date()
    });
    await classInfo.update(filteredUpdatePayload);

    if (Object.prototype.hasOwnProperty.call(updateData, 'schedule')) {
      const normalizedSchedule = normalizeSchedulePayload(updateData.schedule);
      const filteredSchedulePayload = await filterTeachingClassPayload({
        schedule_weekdays: normalizedSchedule ? JSON.stringify(normalizedSchedule.weekdays) : null,
        schedule_time_slots: normalizedSchedule ? JSON.stringify(normalizedSchedule.timeSlots) : null
      });
      if (Object.keys(filteredSchedulePayload).length > 0) {
        await classInfo.update(filteredSchedulePayload);
      }
    }

    const enrolledCount = await models.TeachingClassStudent.count({
      where: {
        class_id: id,
        del_flag: 0,
        status: 1
      }
    });

    return res.json(Response.success(formatClassRecord(classInfo.toJSON(), enrolledCount), 'updated successfully'));

    return res.json(Response.success(formatClassRecord(classInfo.toJSON(), enrolledCount), '鏇存柊鎴愬姛'));
    
    res.json(Response.success(classInfo, '更新成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 删除班级（软删除）
 * DELETE /class/:id
 */
exports.deleteClass = async (req, res, next) => {
  try {
    const id = resolveClassId(req);
    
    const classInfo = await models.TeachingClass.findOne({
      where: { id, del_flag: 0 }
    });
    
    if (!classInfo) {
      return res.json(Response.error('班级不存在', 404));
    }
    
    // 软删除
    const activeStudentCount = await models.TeachingClassStudent.count({
      where: {
        class_id: id,
        status: 1,
        del_flag: 0
      }
    });

    if (activeStudentCount > 0) {
      return res.json(Response.error('当前班级仍有学员，请先移除或转班后再删除', 400));
    }

    await classInfo.update({
      del_flag: 1,
      update_by: req.user?.id,
      update_time: new Date()
    });
    
    res.json(Response.success({}, '删除成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 获取班级学生列表
 * GET /class/:id/students
 */
exports.getClassStudents = async (req, res, next) => {
  try {
    const id = resolveClassId(req);
    
    // 查询班级学生关联
    const classStudents = await models.TeachingClassStudent.findAll({
      where: { class_id: id, status: 1, del_flag: 0 }
    });
    
    if (classStudents.length === 0) {
      return res.json(Response.success([]));
    }
    
    const studentIds = classStudents.map(cs => cs.student_id);
    
    // 查询学生详细信息
    const students = await models.TeachingStudent.findAll({
      where: { 
        id: { [Op.in]: studentIds },
        del_flag: 0
      },
      attributes: ['id', 'student_no', 'realname', 'sex', 'phone', 'status']
    });
    
    // 合并加入日期等信息
    const result = students.map(student => {
      const classStudent = classStudents.find(cs => cs.student_id === student.id);
      return {
        ...student.toJSON(),
        joinDate: classStudent?.join_date
      };
    });
    
    res.json(Response.success(result));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 添加学生到班级
 * POST /class/:id/students
 */
exports.addStudentsToClass = async (req, res, next) => {
  try {
    const id = resolveClassId(req);
    const { studentIds } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.json(Response.error('学生ID列表不能为空', 400));
    }
    
    // 检查班级是否存在
    const classInfo = await models.TeachingClass.findOne({
      where: { id, del_flag: 0 }
    });
    
    if (!classInfo) {
      return res.json(Response.error('班级不存在', 404));
    }
    
    // 检查是否超出最大人数
    const currentCount = await models.TeachingClassStudent.count({
      where: { class_id: id, status: 1, del_flag: 0 }
    });

    const uniqueStudentIds = Array.from(new Set(studentIds.filter(Boolean)));
    const existingLinks = uniqueStudentIds.length > 0
      ? await models.TeachingClassStudent.findAll({
          where: {
            class_id: id,
            student_id: { [Op.in]: uniqueStudentIds },
            status: 1,
            del_flag: 0
          },
          attributes: ['student_id'],
          raw: true
        })
      : [];

    const existingStudentIdSet = new Set(existingLinks.map(item => item.student_id));
    const newStudentIds = uniqueStudentIds.filter(studentId => !existingStudentIdSet.has(studentId));
    const maxStudents = Number(classInfo.max_students);

    if (Number.isFinite(maxStudents) && maxStudents > 0 && currentCount + newStudentIds.length > maxStudents) {
      return res.json(Response.error('超出班级最大人数限制', 400));
    }

    if (newStudentIds.length === 0) {
      return res.json(Response.success({
        addedCount: 0,
        skippedCount: uniqueStudentIds.length
      }, '没有新增学员'));
    }

    const classStudents = newStudentIds.map(studentId => ({
      id: uuidUtil.generate(),
      class_id: id,
      student_id: studentId,
      join_date: new Date(),
      status: 1,
      del_flag: 0,
      create_time: new Date()
    }));

    await models.TeachingClassStudent.bulkCreate(classStudents, {
      ignoreDuplicates: true
    });

    const updatedCount = await models.TeachingClassStudent.count({
      where: {
        class_id: id,
        status: 1,
        del_flag: 0
      }
    });

    await classInfo.update({
      student_count: updatedCount,
      update_time: new Date()
    });

    res.json(Response.success({
      addedCount: newStudentIds.length,
      skippedCount: uniqueStudentIds.length - newStudentIds.length
    }, '添加成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 从班级移除学生
 * DELETE /class/:id/students/:studentId
 */
exports.removeStudentFromClass = async (req, res, next) => {
  try {
    const id = resolveClassId(req);
    const { studentId } = req.params;
    
    const classStudent = await models.TeachingClassStudent.findOne({
      where: { class_id: id, student_id: studentId, status: 1, del_flag: 0 }
    });
    
    if (!classStudent) {
      return res.json(Response.error('学生不在该班级', 404));
    }
    
    // 更新状态为已离开
    await classStudent.update({
      status: 2,
      leave_date: new Date()
    });
    
    // 更新班级学生数量
    const currentCount = await models.TeachingClassStudent.count({
      where: {
        class_id: id,
        status: 1,
        del_flag: 0
      }
    });

    const classInfo = await models.TeachingClass.findByPk(id);
    if (classInfo) {
      await classInfo.update({
        student_count: currentCount,
        update_time: new Date()
      });
    }
    
    res.json(Response.success({}, '移除成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 批量移除学生
 * POST /class/:id/students/remove-batch
 */
exports.removeBatchStudents = async (req, res, next) => {
  try {
    const id = resolveClassId(req);
    const { studentIds } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.json(Response.error('学生ID列表不能为空', 400));
    }
    
    // 批量更新状态
    await models.TeachingClassStudent.update(
      {
        status: 2,
        leave_date: new Date()
      },
      {
        where: {
          class_id: id,
          student_id: { [Op.in]: studentIds },
          status: 1,
          del_flag: 0
        }
      }
    );
    
    // 更新班级学生数量
    const currentCount = await models.TeachingClassStudent.count({
      where: { class_id: id, status: 1, del_flag: 0 }
    });
    
    const classInfo = await models.TeachingClass.findByPk(id);
    if (classInfo) {
      await classInfo.update({
        student_count: currentCount,
        update_time: new Date()
      });
    }
    
    res.json(Response.success({}, '批量移除成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 归档班级
 * PUT /class/:id/archive
 */
exports.archiveClass = async (req, res, next) => {
  try {
    const id = resolveClassId(req);
    
    const classInfo = await models.TeachingClass.findOne({
      where: { id, del_flag: 0 }
    });
    
    if (!classInfo) {
      return res.json(Response.error('班级不存在', 404));
    }
    
    // 更新状态为已归档
    await classInfo.update({
      status: 3,
      update_by: req.user?.id,
      update_time: new Date()
    });
    
    res.json(Response.success({}, '归档成功'));
    
  } catch (error) {
    next(error);
  }
};

exports.getTeacherClasses = async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    const classes = await models.TeachingClass.findAll({
      where: { teacher_id: teacherId, del_flag: 0 }
    });
    res.json(Response.success(classes));
  } catch (error) {
    next(error);
  }
};

exports.getStudentClassList = async (req, res, next) => {
  try {
    const { studentId } = req.query;
    const relations = await models.TeachingClassStudent.findAll({
      where: { student_id: studentId }
    });
    res.json(Response.success(relations));
  } catch (error) {
    next(error);
  }
};

exports.addStudentToClass = async (req, res, next) => {
  try {
    const { classId, studentIds } = req.body;
    const uuidUtil = require('../utils/uuid');
    const records = studentIds.map(studentId => ({
      id: uuidUtil.generate(),
      class_id: classId,
      student_id: studentId,
      join_time: new Date(),
      create_time: new Date()
    }));
    await models.TeachingClassStudent.bulkCreate(records);
    res.json(Response.success(null, '学生添加成功'));
  } catch (error) {
    next(error);
  }
};



