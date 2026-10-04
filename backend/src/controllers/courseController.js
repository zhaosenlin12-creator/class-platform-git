/**
 * 课程管理控制器
 * 处理课程的CRUD操作、单元管理、资源管理
 */

const models = require('../models');
const Response = require('../utils/response');
const uuidUtil = require('../utils/uuid');
const { Op } = require('sequelize');
const { logger } = require('../middleware/logger');

function normalizeCourseStatusInput(status, fallback = 2) {
  if (status === undefined || status === null || status === '') {
    const parsedFallback = Number(fallback);
    return Number.isFinite(parsedFallback) && parsedFallback > 0 ? parsedFallback : 2;
  }

  const normalizedStatus = String(status).trim().toLowerCase();
  if (normalizedStatus === 'published' || normalizedStatus === '1') {
    return 1;
  }
  if (normalizedStatus === 'draft' || normalizedStatus === '0' || normalizedStatus === '2') {
    return 2;
  }
  if (normalizedStatus === 'archived' || normalizedStatus === 'offline' || normalizedStatus === '3') {
    return 3;
  }

  const parsedStatus = Number(normalizedStatus);
  if (Number.isFinite(parsedStatus) && parsedStatus > 0) {
    return parsedStatus;
  }

  return normalizeCourseStatusInput(fallback, 2);
}

function serializeCourseStatus(status) {
  const normalizedStatus = normalizeCourseStatusInput(status, 2);
  if (normalizedStatus === 1) {
    return 'published';
  }
  if (normalizedStatus === 3) {
    return 'archived';
  }
  return 'draft';
}

/**
 * 获取课程列表（支持分页、搜索）
 * GET /course/list
 */
exports.getCourseList = async (req, res, next) => {
  try {
    const { 
      pageNo = 1, 
      pageSize = 10, 
      courseName, 
      category,
      level,
      status
    } = req.query;
    
    // 构建查询条件
    const where = { del_flag: 0 };
    
    if (courseName) {
      where.course_name = { [Op.like]: `%${courseName}%` };
    }
    
    if (category) {
      where.category = category;
    }
    
    if (level) {
      where.level = level;
    }
    
    if (status !== undefined) {
      where.status = status;
    }
    
    // 分页查询
    const limit = parseInt(pageSize);
    const offset = (parseInt(pageNo) - 1) * limit;
    
    const { count, rows } = await models.TeachingCourse.findAndCountAll({
      where,
      limit,
      offset,
      order: [['create_time', 'DESC']],
      attributes: { exclude: ['del_flag'] }
    });
    
    // 🔥 为每个课程加载课节，并转换为驼峰命名
    const coursesWithUnits = await Promise.all(
      rows.map(async (course) => {
        // 获取课节列表
        const units = await models.TeachingCourseUnit.findAll({
          where: { course_id: course.id, del_flag: 0 },
          order: [['sort_no', 'ASC'], ['unit_no', 'ASC']]
        });
        
        return {
          id: course.id,
          courseName: course.course_name,
          name: course.course_name,  // 兼容字段
          courseCode: course.course_code,
          cover: course.cover,
          category: course.category,
          level: course.level,
          description: course.description,
          duration: course.duration || 0,
          price: course.price || 0,
          teacherId: course.teacher_id,
          teacherName: course.teacher_name,
          studentCount: course.student_count || 0,
          status: course.status,
          avgRating: course.avg_rating || 0,
          createTime: course.create_time,
          updateTime: course.update_time,
          // 🔥 添加课节列表（课堂创建时需要）
          lessons: units.map(unit => ({
            id: unit.id,
            title: unit.unit_name,
            unitName: unit.unit_name,
            unitNo: unit.unit_no,
            duration: unit.duration || 0,
            contentType: unit.content_type,
            contentUrl: unit.content_url,
            resourceId: unit.resource_id,
            resourceName: unit.resource_name,
            description: unit.description,
            sortNo: unit.sort_no
          })),
          totalLessons: units.length,
          subject: course.category  // 兼容课堂管理的subject字段
        };
      })
    );
    
    res.json(Response.page(coursesWithUnits, count, pageNo, pageSize));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 获取课程详情
 * GET /course/:id
 */
exports.getCourseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.json(Response.error('课程ID不能为空', 400));
    }
    
    const course = await models.TeachingCourse.findOne({
      where: { id, del_flag: 0 }
    });
    
    if (!course) {
      return res.json(Response.error('课程不存在', 404));
    }
    
    // 转换为驼峰命名以便前端使用
    const result = {
      id: course.id,
      courseName: course.course_name,
      courseCode: course.course_code,
      cover: course.cover,
      category: course.category,
      level: course.level,
      description: course.description,
      duration: course.duration,
      price: course.price,
      teacherId: course.teacher_id,
      teacherName: course.teacher_name,
      studentCount: course.student_count,
      status: serializeCourseStatus(course.status),
      avgRating: course.avg_rating,
      createTime: course.create_time,
      updateTime: course.update_time
    };
    
    res.json(Response.success(result));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 获取课程创建页面数据
 * GET /teaching/teachingCourse/create
 */
exports.getCreatePageData = async (req, res, next) => {
  try {
    // 返回创建课程所需的基础数据
    res.json(Response.success({
      categories: ['scratch', 'python', 'javascript', 'scratchjr', 'blockly'],
      levels: ['elementary', 'intermediate', 'advanced']
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * 创建课程
 * POST /teaching/teachingCourse/create
 */
exports.createCourse = async (req, res, next) => {
  try {
    const { 
      courseName,
      courseCode,
      cover,
      category,
      level,
      description,
      objectives,
      prerequisites,
      duration,
      price,
      teacherId,
      teacherName,
      tags
    } = req.body;
    
    // 验证必填字段
    if (!courseName) {
      return res.json(Response.error('课程名称不能为空', 400));
    }
    
    // 创建课程
    const course = await models.TeachingCourse.create({
      id: uuidUtil.generate(),
      course_name: courseName,
      course_code: courseCode || null,
      cover: cover || null,
      category: category || null,
      level: level || null,
      description: description || null,
      objectives: objectives ? JSON.stringify(objectives) : null,
      prerequisites: prerequisites || null,
      duration: duration || 0,
      price: price || 0,
      teacher_id: teacherId || req.user?.id,
      teacher_name: teacherName || req.user?.realname,
      student_count: 0,
      status: 1,
      avg_rating: 0,
      tags: tags ? JSON.stringify(tags) : null,
      del_flag: 0,
      create_by: req.user?.id,
      create_time: new Date()
    });
    
    res.json(Response.success(course, '创建成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 获取课程编辑页面数据
 * GET /teaching/teachingCourse/update
 */
exports.getUpdatePageData = async (req, res, next) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.json(Response.error('课程ID不能为空', 400));
    }
    
    const course = await models.TeachingCourse.findOne({
      where: { id, del_flag: 0 }
    });
    
    if (!course) {
      return res.json(Response.error('课程不存在', 404));
    }
    
    res.json(Response.success(course));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 更新课程
 * POST /teaching/teachingCourse/update
 */
exports.updateCourse = async (req, res, next) => {
  try {
    const routeId = req.params?.id;
    const { id: bodyId, ...updateData } = req.body;
    const id = routeId || bodyId;
    
    if (!id) {
      return res.json(Response.error('课程ID不能为空', 400));
    }
    
    const course = await models.TeachingCourse.findOne({
      where: { id, del_flag: 0 }
    });
    
    if (!course) {
      return res.json(Response.error('课程不存在', 404));
    }
    
    // 更新课程信息
    await course.update({
      course_name: updateData.courseName || course.course_name,
      course_code: updateData.courseCode !== undefined ? updateData.courseCode : course.course_code,
      cover: updateData.cover !== undefined ? updateData.cover : course.cover,
      category: updateData.category !== undefined ? updateData.category : course.category,
      level: updateData.level !== undefined ? updateData.level : course.level,
      description: updateData.description !== undefined ? updateData.description : course.description,
      objectives: updateData.objectives ? JSON.stringify(updateData.objectives) : course.objectives,
      prerequisites: updateData.prerequisites !== undefined ? updateData.prerequisites : course.prerequisites,
      duration: updateData.duration !== undefined ? updateData.duration : course.duration,
      price: updateData.price !== undefined ? updateData.price : course.price,
      status: updateData.status !== undefined ? normalizeCourseStatusInput(updateData.status, course.status) : course.status,
      tags: updateData.tags ? JSON.stringify(updateData.tags) : course.tags,
      update_by: req.user?.id,
      update_time: new Date()
    });

    const updatedCourse = await models.TeachingCourse.findOne({
      where: { id, del_flag: 0 }
    });

    res.json(Response.success({
      id: updatedCourse.id,
      courseName: updatedCourse.course_name,
      courseCode: updatedCourse.course_code,
      cover: updatedCourse.cover,
      category: updatedCourse.category,
      level: updatedCourse.level,
      description: updatedCourse.description,
      duration: updatedCourse.duration,
      price: updatedCourse.price,
      teacherId: updatedCourse.teacher_id,
      teacherName: updatedCourse.teacher_name,
      studentCount: updatedCourse.student_count,
      status: serializeCourseStatus(updatedCourse.status),
      avgRating: updatedCourse.avg_rating,
      createTime: updatedCourse.create_time,
      updateTime: updatedCourse.update_time
    }, '更新成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 删除课程
 * DELETE /course/:id 或 POST /course/delete
 */
exports.deleteCourse = async (req, res, next) => {
  try {
    // 兼容两种方式：DELETE /:id (params) 或 POST /delete (body)
    const id = req.params.id || req.query.id || req.body.id;
    
    if (!id) {
      return res.json(Response.error('课程ID不能为空', 400));
    }
    
    const course = await models.TeachingCourse.findOne({
      where: { id, del_flag: 0 }
    });
    
    if (!course) {
      return res.json(Response.error('课程不存在', 404));
    }
    
    // 软删除
    await course.update({
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
 * 批量删除课程
 * DELETE /teachingCourse/deleteBatch
 */
exports.batchDeleteCourses = async (req, res, next) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.json(Response.error('请选择要删除的课程', 400));
    }
    
    // 批量软删除
    await models.TeachingCourse.update(
      {
        del_flag: 1,
        update_by: req.user?.id,
        update_time: new Date()
      },
      {
        where: { 
          id: { [Op.in]: ids },
          del_flag: 0 
        }
      }
    );
    
    res.json(Response.success({}, `成功删除${ids.length}个课程`));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 获取课程单元列表
 * GET /teaching/teachingCourseUnit/list
 */
exports.getCourseUnitList = async (req, res, next) => {
  try {
    const { courseId } = req.query;
    
    if (!courseId) {
      return res.json(Response.error('课程ID不能为空', 400));
    }
    
    const units = await models.TeachingCourseUnit.findAll({
      where: { course_id: courseId, del_flag: 0 },
      order: [['sort_no', 'ASC'], ['unit_no', 'ASC']]
    });
    
    res.json(Response.success(units));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 添加课程单元
 * POST /teaching/teachingCourseUnit/add
 */
exports.addCourseUnit = async (req, res, next) => {
  try {
    const {
      courseId,
      unitName,
      unitNo,
      description,
      objectives,
      duration,
      contentType,
      contentUrl,
      resourceId,
      resourceName,
      sortNo
    } = req.body;
    
    if (!courseId || !unitName) {
      return res.json(Response.error('课程ID和单元名称不能为空', 400));
    }
    
    const unit = await models.TeachingCourseUnit.create({
      id: uuidUtil.generate(),
      course_id: courseId,
      unit_name: unitName,
      unit_no: unitNo || null,
      description: description || null,
      objectives: objectives || null,
      duration: duration || 0,
      content_type: contentType || null,
      content_url: contentUrl || null,
      resource_id: resourceId || null,
      resource_name: resourceName || null,
      sort_no: sortNo || 0,
      del_flag: 0,
      create_by: req.user?.id,
      create_time: new Date()
    });
    
    res.json(Response.success(unit, '添加成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 编辑课程单元
 * PUT /teaching/teachingCourseUnit/edit
 */
exports.editCourseUnit = async (req, res, next) => {
  try {
    const { id, ...updateData } = req.body;
    
    if (!id) {
      return res.json(Response.error('单元ID不能为空', 400));
    }
    
    const unit = await models.TeachingCourseUnit.findOne({
      where: { id, del_flag: 0 }
    });
    
    if (!unit) {
      return res.json(Response.error('单元不存在', 404));
    }
    
    await unit.update({
      unit_name: updateData.unitName || unit.unit_name,
      unit_no: updateData.unitNo !== undefined ? updateData.unitNo : unit.unit_no,
      description: updateData.description !== undefined ? updateData.description : unit.description,
      objectives: updateData.objectives !== undefined ? updateData.objectives : unit.objectives,
      duration: updateData.duration !== undefined ? updateData.duration : unit.duration,
      content_type: updateData.contentType !== undefined ? updateData.contentType : unit.content_type,
      content_url: updateData.contentUrl !== undefined ? updateData.contentUrl : unit.content_url,
      resource_id: updateData.resourceId !== undefined ? updateData.resourceId : unit.resource_id,
      resource_name: updateData.resourceName !== undefined ? updateData.resourceName : unit.resource_name,
      sort_no: updateData.sortNo !== undefined ? updateData.sortNo : unit.sort_no,
      update_by: req.user?.id,
      update_time: new Date()
    });
    
    res.json(Response.success(unit, '更新成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 删除课程单元
 * DELETE /teaching/teachingCourseUnit/delete
 */
exports.deleteCourseUnit = async (req, res, next) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.json(Response.error('单元ID不能为空', 400));
    }
    
    const unit = await models.TeachingCourseUnit.findOne({
      where: { id, del_flag: 0 }
    });
    
    if (!unit) {
      return res.json(Response.error('单元不存在', 404));
    }
    
    await unit.update({
      del_flag: 1,
      update_time: new Date()
    });
    
    res.json(Response.success({}, '删除成功'));
    
  } catch (error) {
    next(error);
  }
};

exports.getMyCourseList = async (req, res, next) => {
  try {
    const teacherId = req.user?.id;
    if (!teacherId) {
      return res.json(Response.success([]));
    }

    const rows = await models.TeachingCourse.findAll({
      where: {
        del_flag: 0,
        teacher_id: teacherId
      },
      order: [['create_time', 'DESC']],
      attributes: ['id', 'course_name', 'course_code', 'cover', 'category', 'level', 'status', 'student_count', 'teacher_id', 'teacher_name']
    });

    const courses = rows.map((course) => ({
      id: course.id,
      courseName: course.course_name,
      name: course.course_name,
      courseCode: course.course_code,
      cover: course.cover,
      category: course.category,
      level: course.level,
      status: serializeCourseStatus(course.status),
      studentCount: course.student_count || 0,
      teacherId: course.teacher_id,
      teacherName: course.teacher_name
    }));

    res.json(Response.success(courses));
  } catch (error) {
    next(error);
  }
};

/**
 * 获取课程关联学生
 * GET /relation/getStudentsByCourse
 */
exports.getStudentsByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.query;
    
    if (!courseId) {
      return res.json(Response.error('课程ID不能为空', 400));
    }
    
    // TODO: 实现课程学生关联功能
    // 暂时返回空列表，待TeachingCourseStudent模型创建后完善
    return res.json(Response.success([]));
    
    /* 待实现：
    const courseStudents = await models.TeachingCourseStudent.findAll({
      where: { course_id: courseId, status: 1 }
    });
    
    if (courseStudents.length === 0) {
      return res.json(Response.success([]));
    }
    
    const studentIds = courseStudents.map(cs => cs.student_id);
    
    const students = await models.TeachingStudent.findAll({
      where: { 
        id: { [Op.in]: studentIds },
        del_flag: 0
      },
      attributes: ['id', 'student_no', 'realname', 'phone', 'status']
    });
    
    res.json(Response.success(students));
    */
    
  } catch (error) {
    next(error);
  }
};

/**
 * 获取学生学习进度
 * GET /relation/getStudentProgress
 */
exports.getStudentProgress = async (req, res, next) => {
  try {
    const { courseId, studentId } = req.query;
    
    const where = {};
    if (courseId) where.course_id = courseId;
    if (studentId) where.student_id = studentId;
    
    const progressList = await models.TeachingStudentProgress.findAll({
      where
    });
    
    res.json(Response.success(progressList));
    
  } catch (error) {
    next(error);
  }
};

// ========== 课程管理扩展API ==========

/**
 * 获取首页课程列表
 * GET /teaching/teachingCourse/getHomeCourse
 */
exports.getHomeCourseList = async (req, res, next) => {
  try {
    const {
      pageNo = 1,
      pageSize = 24,
      courseName,
      courseType,
      courseCategory
    } = req.query || {};

    const where = {
      del_flag: 0
    };

    const normalizedCourseName = String(courseName || '').trim();
    if (normalizedCourseName) {
      where.course_name = {
        [Op.like]: `%${normalizedCourseName}%`
      };
    }

    const normalizedCategory = String(courseCategory || '').trim();
    if (normalizedCategory) {
      where.category = normalizedCategory;
    }

    const normalizedType = String(courseType || '').trim();
    if (normalizedType) {
      where.level = normalizedType;
    }

    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 24, 1), 100);
    const currentPage = Math.max(parseInt(pageNo, 10) || 1, 1);
    const offset = (currentPage - 1) * limit;

    const { count, rows } = await models.TeachingCourse.findAndCountAll({
      where,
      limit,
      offset,
      order: [['create_time', 'DESC']]
    });

    const records = rows.map((course) => ({
      id: course.id,
      courseName: course.course_name,
      courseDesc: course.description || '',
      courseCover: course.cover || '',
      courseCover_url: course.cover || '',
      courseCode: course.course_code || '',
      courseCategory: course.category || '',
      courseType: course.level || '',
      teacherId: course.teacher_id || '',
      teacherName: course.teacher_name || '',
      studentCount: Number(course.student_count) || 0,
      status: normalizeCourseStatusInput(course.status, 2),
      createTime: course.create_time,
      updateTime: course.update_time
    }));

    res.json(Response.page(records, count, currentPage, limit));
  } catch (error) {
    next(error);
  }
};

/**
 * 发布课程
 * POST /teaching/teachingCourse/publish/:courseId
 */
exports.publishCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
    await models.TeachingCourse.update(
      { status: 1, publish_time: new Date(), update_time: new Date() },
      { where: { id: courseId } }
    );
    
    res.json(Response.success(null, '课程发布成功'));
  } catch (error) {
    next(error);
  }
};

/**
 * 获取课程统计
 * GET /teaching/teachingCourse/statistics/:courseId
 */
exports.getCourseStatistics = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
    const stats = {
      courseId,
      enrolledStudents: 45,
      completedStudents: 12,
      averageProgress: 0.65,
      averageScore: 82,
      totalLearningHours: 2340
    };
    
    res.json(Response.success(stats));
  } catch (error) {
    next(error);
  }
};

/**
 * 获取章节列表
 * GET /teaching/course/chapters/:courseId
 */
exports.getChapterList = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
    const chapters = [
      { id: 'ch_001', title: '第一章：Python简介', orderNum: 1, unitCount: 5 },
      { id: 'ch_002', title: '第二章：变量与数据类型', orderNum: 2, unitCount: 8 }
    ];
    
    res.json(Response.success(chapters));
  } catch (error) {
    next(error);
  }
};

/**
 * 创建章节
 * POST /teaching/course/chapters/:courseId/create
 */
exports.createChapter = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const chapterData = req.body;
    
    const chapter = {
      id: uuidUtil.generate(),
      courseId,
      ...chapterData,
      createTime: new Date().toISOString()
    };
    
    res.json(Response.success(chapter, '章节创建成功'));
  } catch (error) {
    next(error);
  }
};

/**
 * 更新章节
 * PUT /teaching/course/chapters/update/:chapterId
 */
exports.updateChapter = async (req, res, next) => {
  try {
    const { chapterId } = req.params;
    const updateData = req.body;
    
    res.json(Response.success(updateData, '章节更新成功'));
  } catch (error) {
    next(error);
  }
};

/**
 * 删除章节
 * DELETE /teaching/course/chapters/delete/:chapterId
 */
exports.deleteChapter = async (req, res, next) => {
  try {
    const { chapterId } = req.params;
    
    res.json(Response.success(null, '章节删除成功'));
  } catch (error) {
    next(error);
  }
};

/**
 * 获取班级可选课程
 * GET /teaching/class-courses/:classId
 */
exports.getClassCourses = async (req, res, next) => {
  try {
    const { classId } = req.params;
    
    const courses = await models.TeachingCourse.findAll({
      where: { del_flag: 0 },
      limit: 50
    });
    
    res.json(Response.success(courses));
  } catch (error) {
    next(error);
  }
};

/**
 * 获取课程单元列表
 * GET /teaching/teachingCourseUnit/list
 */
exports.getCourseUnitList = async (req, res, next) => {
  try {
    const { courseId } = req.query;
    
    if (!courseId) {
      return res.json(Response.error('缺少课程ID参数', 400));
    }
    
    const units = await models.TeachingCourseUnit.findAll({
      where: { 
        course_id: courseId,
        del_flag: 0 
      },
      order: [
        ['sort_no', 'ASC'],
        ['unit_no', 'ASC']
      ]
    });
    
    // 转换为驼峰命名
    const result = units.map(unit => ({
      id: unit.id,
      courseId: unit.course_id,
      unitName: unit.unit_name,
      unitNo: unit.unit_no,
      contentType: unit.content_type,
      contentUrl: unit.content_url,
      resourceId: unit.resource_id,
      resourceName: unit.resource_name,
      objectives: unit.objectives,
      description: unit.description,
      duration: unit.duration,
      sortNo: unit.sort_no,
      createTime: unit.create_time,
      updateTime: unit.update_time
    }));
    
    res.json(Response.success(result));
  } catch (error) {
    logger.error('Get course unit list failed', { error: error.message, stack: error.stack });
    next(error);
  }
};

/**
 * 添加课程单元
 * POST /teaching/teachingCourseUnit/add
 */
exports.addCourseUnit = async (req, res, next) => {
  try {
    const { 
      courseId, 
      unitName, 
      unitNo, 
      contentType, 
      contentUrl,
      resourceId,
      resourceName,
      objectives,
      description, 
      duration 
    } = req.body;
    
    if (!courseId || !unitName || !unitNo) {
      return res.json(Response.error('缺少必填参数', 400));
    }
    
    // 获取当前最大排序号
    const maxSortUnit = await models.TeachingCourseUnit.findOne({
      where: { course_id: courseId, del_flag: 0 },
      order: [['sort_no', 'DESC']]
    });
    
    const sortNo = maxSortUnit ? (maxSortUnit.sort_no || 0) + 1 : 1;
    
    const unit = await models.TeachingCourseUnit.create({
      id: uuidUtil.generate(),
      course_id: courseId,
      unit_name: unitName,
      unit_no: unitNo,
      content_type: contentType || 'programming',
      content_url: contentUrl || '',
      resource_id: resourceId || null,
      resource_name: resourceName || null,
      objectives: objectives || '',
      description: description || '',
      duration: duration || 45,
      sort_no: sortNo,
      del_flag: 0,
      create_by: req.user?.id,
      create_time: new Date()
    });
    
    res.json(Response.success(unit, '课节添加成功'));
  } catch (error) {
    logger.error('Add course unit failed', { error: error.message, stack: error.stack });
    next(error);
  }
};

/**
 * 编辑课程单元
 * PUT /teaching/teachingCourseUnit/edit
 */
exports.editCourseUnit = async (req, res, next) => {
  try {
    const { 
      id,
      unitName, 
      unitNo, 
      contentType, 
      contentUrl,
      resourceId,
      resourceName,
      sortNo,
      objectives,
      description, 
      duration 
    } = req.body;
    
    if (!id) {
      return res.json(Response.error('缺少课节ID', 400));
    }
    
    const unit = await models.TeachingCourseUnit.findOne({
      where: { id, del_flag: 0 }
    });
    
    if (!unit) {
      return res.json(Response.error('课节不存在', 404));
    }
    
    await unit.update({
      unit_name: unitName || unit.unit_name,
      unit_no: unitNo || unit.unit_no,
      content_type: contentType || unit.content_type,
      content_url: contentUrl !== undefined ? contentUrl : unit.content_url,
      resource_id: resourceId !== undefined ? resourceId : unit.resource_id,
      resource_name: resourceName !== undefined ? resourceName : unit.resource_name,
      sort_no: sortNo !== undefined ? sortNo : unit.sort_no,
      objectives: objectives !== undefined ? objectives : unit.objectives,
      description: description !== undefined ? description : unit.description,
      duration: duration !== undefined ? duration : unit.duration,
      update_by: req.user?.id,
      update_time: new Date()
    });
    
    res.json(Response.success(unit, '课节更新成功'));
  } catch (error) {
    logger.error('Edit course unit failed', { error: error.message, stack: error.stack });
    next(error);
  }
};

/**
 * 调整课程单元顺序
 * POST /teaching/teachingCourseUnit/reorder
 */
exports.reorderCourseUnit = async (req, res, next) => {
  let transaction;
  try {
    const { id, targetId } = req.body;

    if (!id || !targetId || id === targetId) {
      return res.json(Response.error('缺少有效的排序参数', 400));
    }

    transaction = await models.sequelize.transaction();

    const units = await models.TeachingCourseUnit.findAll({
      where: {
        id: { [Op.in]: [id, targetId] },
        del_flag: 0
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (units.length !== 2) {
      await transaction.rollback();
      return res.json(Response.error('课程单元不存在', 404));
    }

    const currentUnit = units.find((item) => item.id === id);
    const targetUnit = units.find((item) => item.id === targetId);

    if (!currentUnit || !targetUnit) {
      await transaction.rollback();
      return res.json(Response.error('课程单元不存在', 404));
    }

    if (String(currentUnit.course_id) !== String(targetUnit.course_id)) {
      await transaction.rollback();
      return res.json(Response.error('不能跨课程调整单元顺序', 400));
    }

    const orderedUnits = await models.TeachingCourseUnit.findAll({
      where: {
        course_id: currentUnit.course_id,
        del_flag: 0
      },
      order: [
        ['sort_no', 'ASC'],
        ['unit_no', 'ASC'],
        ['create_time', 'ASC']
      ],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    const currentIndex = orderedUnits.findIndex((item) => item.id === id);
    const targetIndex = orderedUnits.findIndex((item) => item.id === targetId);

    if (currentIndex === -1 || targetIndex === -1) {
      await transaction.rollback();
      return res.json(Response.error('课程单元不存在', 404));
    }

    const updateTime = new Date();
    await Promise.all([
      currentUnit.update({
        sort_no: targetIndex + 1,
        update_by: req.user?.id,
        update_time: updateTime
      }, { transaction }),
      targetUnit.update({
        sort_no: currentIndex + 1,
        update_by: req.user?.id,
        update_time: updateTime
      }, { transaction })
    ]);

    await transaction.commit();
    res.json(Response.success({}, '课程单元顺序更新成功'));
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    logger.error('Reorder course unit failed', { error: error.message, stack: error.stack });
    next(error);
  }
};

/**
 * 删除课程单元
 * DELETE /teaching/teachingCourseUnit/delete
 */
exports.deleteCourseUnit = async (req, res, next) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.json(Response.error('缺少课节ID', 400));
    }
    
    const unit = await models.TeachingCourseUnit.findOne({
      where: { id, del_flag: 0 }
    });
    
    if (!unit) {
      return res.json(Response.error('课节不存在', 404));
    }
    
    // 软删除
    await unit.update({
      del_flag: 1,
      update_by: req.user?.id,
      update_time: new Date()
    });
    
    res.json(Response.success(null, '课节删除成功'));
  } catch (error) {
    logger.error('Delete course unit failed', { error: error.message, stack: error.stack });
    next(error);
  }
};

exports.getCourseList = async (req, res, next) => {
  try {
    const {
      pageNo = 1,
      pageSize = 10,
      courseName,
      keyword,
      category,
      level,
      status,
      statsOnly
    } = req.query;

    const where = { del_flag: 0 };
    const resolvedKeyword = String(keyword || courseName || '').trim();
    if (resolvedKeyword) {
      where.course_name = { [Op.like]: `%${resolvedKeyword}%` };
    }
    if (category) {
      where.category = category;
    }
    if (level) {
      where.level = level;
    }
    if (status !== undefined && status !== null && status !== '') {
      where.status = normalizeCourseStatusInput(status, status);
    }

    if (String(statsOnly).toLowerCase() === 'true' || statsOnly === true) {
      const rows = await models.TeachingCourse.findAll({
        where,
        attributes: ['id', 'status', 'student_count']
      });

      return res.json(Response.success({
        stats: {
          total: rows.length,
          published: rows.filter(item => serializeCourseStatus(item.status) === 'published').length,
          draft: rows.filter(item => serializeCourseStatus(item.status) === 'draft').length,
          totalStudents: rows.reduce((sum, item) => sum + (Number(item.student_count) || 0), 0)
        }
      }));
    }

    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(pageNo, 10) - 1) * limit;
    const { count, rows } = await models.TeachingCourse.findAndCountAll({
      where,
      limit,
      offset,
      order: [['create_time', 'DESC']],
      attributes: { exclude: ['del_flag'] }
    });

    const courseIds = rows.map(item => item.id);
    const units = courseIds.length > 0
      ? await models.TeachingCourseUnit.findAll({
        where: {
          course_id: { [Op.in]: courseIds },
          del_flag: 0
        },
        order: [['sort_no', 'ASC'], ['unit_no', 'ASC']]
      })
      : [];
    const unitMap = units.reduce((result, item) => {
      if (!result[item.course_id]) {
        result[item.course_id] = [];
      }
      result[item.course_id].push(item);
      return result;
    }, {});

    const records = rows.map((course) => {
      const lessonRows = unitMap[course.id] || [];
      return {
        id: course.id,
        courseName: course.course_name,
        name: course.course_name,
        courseCode: course.course_code,
        cover: course.cover,
        coverImage: course.cover,
        category: course.category,
        level: course.level,
        description: course.description,
        duration: course.duration || 0,
        price: course.price || 0,
        teacherId: course.teacher_id,
        teacherName: course.teacher_name,
        studentCount: course.student_count || 0,
        students: [],
        status: serializeCourseStatus(course.status),
        avgRating: course.avg_rating || 0,
        createTime: course.create_time,
        updateTime: course.update_time,
        lessons: lessonRows.map(unit => ({
          id: unit.id,
          title: unit.unit_name,
          unitName: unit.unit_name,
          unitNo: unit.unit_no,
          duration: unit.duration || 0,
          contentType: unit.content_type,
          contentUrl: unit.content_url,
          resourceId: unit.resource_id,
          resourceName: unit.resource_name,
          description: unit.description,
          sortNo: unit.sort_no
        })),
        totalLessons: lessonRows.length,
        subject: course.category
      };
    });

    res.json(Response.page(records, count, pageNo, pageSize));
  } catch (error) {
    next(error);
  }
};

exports.getCourseStatistics = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.params.id;

    if (!courseId) {
      return res.json(Response.error('Course ID is required', 400));
    }

    const course = await models.TeachingCourse.findOne({
      where: {
        id: courseId,
        del_flag: 0
      },
      attributes: ['id', 'student_count', 'avg_rating']
    });

    if (!course) {
      return res.json(Response.error('Course not found', 404));
    }

    const progressRows = await models.TeachingStudentProgress.findAll({
      where: {
        course_id: courseId
      },
      attributes: ['student_id', 'progress', 'completed', 'last_learn_time']
    });

    const studentIds = Array.from(new Set(progressRows.map(item => item.student_id).filter(Boolean)));
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const activeStudentIds = new Set(
      progressRows
        .filter(item => item.last_learn_time && new Date(item.last_learn_time) >= last30Days)
        .map(item => item.student_id)
        .filter(Boolean)
    );
    const completedStudentIds = new Set(
      progressRows
        .filter(item => item.student_id && (Number(item.completed) === 1 || Number(item.progress) >= 100 || Number(item.progress) >= 1))
        .map(item => item.student_id)
    );
    const averageCompletion = progressRows.length > 0
      ? Math.round((progressRows.reduce((sum, item) => {
        const parsed = Number(item.progress);
        const normalized = Number.isFinite(parsed) ? (parsed > 1 ? Math.min(parsed / 100, 1) : Math.min(parsed, 1)) : 0;
        return sum + normalized;
      }, 0) / progressRows.length) * 100)
      : 0;

    const homeworks = await models.TeachingHomework.findAll({
      where: {
        course_id: courseId,
        del_flag: 0
      },
      attributes: ['id']
    });
    const homeworkIds = homeworks.map(item => item.id);
    const scoreRows = homeworkIds.length > 0
      ? await models.TeachingHomeworkSubmission.findAll({
        where: {
          homework_id: { [Op.in]: homeworkIds },
          score: { [Op.ne]: null }
        },
        attributes: ['score']
      })
      : [];
    const averageScore = scoreRows.length > 0
      ? Number((scoreRows.reduce((sum, item) => sum + Number(item.score || 0), 0) / scoreRows.length).toFixed(1))
      : 0;

    res.json(Response.success({
      courseId,
      totalStudents: studentIds.length || Number(course.student_count) || 0,
      activeStudents: activeStudentIds.size,
      averageCompletion,
      averageScore,
      averageRating: Number(course.avg_rating) || 0
    }));
  } catch (error) {
    next(error);
  }
};

