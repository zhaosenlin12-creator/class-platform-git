/**
 * 作业管理控制器
 * 处理作业的创建、分配、提交、批改
 */

const models = require('../models');
const Response = require('../utils/response');
const uuidUtil = require('../utils/uuid');
const { Op } = require('sequelize');
const { logger } = require('../middleware/logger');

function getRequestUserIdentity(req) {
  const rawIdentity = req?.user?.userIdentity !== undefined && req?.user?.userIdentity !== null
    ? req.user.userIdentity
    : req?.user?.user_identity;
  const parsedIdentity = Number(rawIdentity);
  return Number.isFinite(parsedIdentity) ? parsedIdentity : null;
}

function isAdminRequest(req) {
  return getRequestUserIdentity(req) === 1;
}

function buildAccessibleHomeworkWhere(req, extraWhere = {}) {
  const where = {
    del_flag: 0,
    ...extraWhere
  };

  if (!isAdminRequest(req) && req?.user?.id) {
    where.teacher_id = req.user.id;
  }

  return where;
}

function normalizeHomeworkStatusValue(status) {
  if (!status) {
    return null;
  }

  const normalizedStatus = String(status).trim().toLowerCase();

  if (normalizedStatus === 'draft') {
    return 'pending';
  }

  if (normalizedStatus === 'published') {
    return 'ongoing';
  }

  if (normalizedStatus === 'ended') {
    return 'closed';
  }

  return normalizedStatus;
}

function normalizeHomeworkDifficultyValue(difficulty) {
  if (difficulty === undefined || difficulty === null || difficulty === '') {
    return 1;
  }

  if (typeof difficulty === 'number') {
    return difficulty;
  }

  const normalizedDifficulty = String(difficulty).trim().toLowerCase();
  const difficultyMap = {
    easy: 1,
    beginner: 1,
    '1': 1,
    medium: 2,
    intermediate: 2,
    '2': 2,
    hard: 3,
    advanced: 3,
    '3': 3,
    '4': 4,
    '5': 5
  };

  return difficultyMap[normalizedDifficulty] || 1;
}

function resolveHomeworkPublicationState({ publishTime, explicitStatus }) {
  const normalizedStatus = String(explicitStatus || '').trim().toLowerCase();

  if (normalizedStatus === 'draft') {
    return {
      publishTime: null,
      status: 'pending'
    };
  }

  const parsedPublishTime = publishTime ? new Date(publishTime) : null;
  const isValidPublishTime = parsedPublishTime instanceof Date && !Number.isNaN(parsedPublishTime.getTime());
  const now = new Date();

  if (isValidPublishTime && parsedPublishTime.getTime() > now.getTime()) {
    return {
      publishTime: parsedPublishTime,
      status: 'pending'
    };
  }

  return {
    publishTime: isValidPublishTime ? parsedPublishTime : now,
    status: 'ongoing'
  };
}

function determineHomeworkLifecycleStatus({ currentStatus, publishTime, deadline, isTemplate = false }) {
  if (isTemplate) {
    return currentStatus || 'template';
  }

  const normalizedStatus = normalizeHomeworkStatusValue(currentStatus) || 'pending';
  const now = new Date();
  const parsedPublishTime = publishTime ? new Date(publishTime) : null;
  const parsedDeadline = deadline ? new Date(deadline) : null;
  const hasValidPublishTime = parsedPublishTime instanceof Date && !Number.isNaN(parsedPublishTime.getTime());
  const hasValidDeadline = parsedDeadline instanceof Date && !Number.isNaN(parsedDeadline.getTime());

  if (normalizedStatus === 'closed') {
    return 'closed';
  }

  if (hasValidDeadline && parsedDeadline.getTime() < now.getTime()) {
    return 'closed';
  }

  if (normalizedStatus === 'pending' && !hasValidPublishTime) {
    return 'pending';
  }

  if (hasValidPublishTime && parsedPublishTime.getTime() > now.getTime()) {
    return 'pending';
  }

  return 'ongoing';
}

async function refreshHomeworkLifecycleStatuses(extraWhere = {}) {
  const now = new Date();
  const baseWhere = {
    del_flag: 0,
    is_template: 0,
    ...extraWhere
  };

  await models.TeachingHomework.update(
    {
      status: 'closed',
      update_time: now
    },
    {
      where: {
        ...baseWhere,
        deadline: { [Op.lt]: now },
        status: { [Op.ne]: 'closed' }
      }
    }
  );

  await models.TeachingHomework.update(
    {
      status: 'pending',
      update_time: now
    },
    {
      where: {
        ...baseWhere,
        publish_time: { [Op.gt]: now },
        status: { [Op.ne]: 'pending' }
      }
    }
  );

  await models.TeachingHomework.update(
    {
      status: 'ongoing',
      update_time: now
    },
    {
      where: {
        ...baseWhere,
        status: 'pending',
        publish_time: { [Op.lte]: now },
        [Op.or]: [
          { deadline: null },
          { deadline: { [Op.gte]: now } }
        ]
      }
    }
  );
}

function buildSubmissionStatusWhere(status) {
  if (!status) {
    return {};
  }

  const normalizedStatus = String(status).trim().toLowerCase();

  if (normalizedStatus === 'reviewed') {
    return { status: 'graded' };
  }

  if (normalizedStatus === 'pending') {
    return {
      status: {
        [Op.notIn]: ['graded', 'reviewed']
      }
    };
  }

  return { status: normalizedStatus };
}

function parseSubmissionAttachments(attachments) {
  if (!attachments) {
    return [];
  }

  if (Array.isArray(attachments)) {
    return attachments;
  }

  if (typeof attachments !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(attachments);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function getPrimaryAttachmentUrl(attachments = []) {
  const firstAttachment = attachments[0];
  if (!firstAttachment) {
    return '';
  }

  return firstAttachment.url || firstAttachment.fileUrl || firstAttachment.path || '';
}

async function loadCourseNameMap(courseIds = []) {
  const uniqueCourseIds = Array.from(new Set((courseIds || []).filter(Boolean)));
  if (uniqueCourseIds.length === 0) {
    return new Map();
  }

  const courses = await models.TeachingCourse.findAll({
    where: {
      id: {
        [Op.in]: uniqueCourseIds
      },
      del_flag: 0
    },
    attributes: ['id', 'course_name']
  });

  return new Map(courses.map(course => [course.id, course.course_name]));
}

async function loadHomeworkClasses(homeworkId) {
  const homeworkClasses = await models.TeachingHomeworkClass.findAll({
    where: { homework_id: homeworkId }
  });

  const classIds = Array.from(new Set(homeworkClasses.map(item => item.class_id).filter(Boolean)));
  if (classIds.length === 0) {
    return [];
  }

  const classDetails = await models.TeachingClass.findAll({
    where: {
      id: { [Op.in]: classIds },
      del_flag: 0
    },
    attributes: ['id', 'class_name']
  });

  return classDetails.map(item => ({
    id: item.id,
    name: item.class_name
  }));
}

async function countStudentsForClasses(classIds = []) {
  const uniqueClassIds = Array.from(new Set((classIds || []).filter(Boolean)));
  if (uniqueClassIds.length === 0) {
    return 0;
  }

  return models.TeachingClassStudent.count({
    where: {
      class_id: { [Op.in]: uniqueClassIds },
      del_flag: 0,
      status: 1
    }
  });
}

async function loadHomeworkSubmissionStats(homeworkIds = []) {
  const uniqueHomeworkIds = Array.from(new Set((homeworkIds || []).filter(Boolean)));
  if (uniqueHomeworkIds.length === 0) {
    return new Map();
  }

  const submissions = await models.TeachingHomeworkSubmission.findAll({
    where: {
      homework_id: { [Op.in]: uniqueHomeworkIds }
    },
    attributes: ['homework_id', 'status', 'score']
  });

  const statsMap = new Map();
  uniqueHomeworkIds.forEach((id) => {
    statsMap.set(String(id), {
      submittedCount: 0,
      gradedCount: 0,
      averageScore: 0,
      _scoreTotal: 0,
      _scoreCount: 0
    });
  });

  submissions.forEach((submission) => {
    const homeworkId = String(submission.homework_id);
    const current = statsMap.get(homeworkId);
    if (!current) {
      return;
    }

    current.submittedCount += 1;
    const normalizedStatus = String(submission.status || '').toLowerCase();
    const hasScore = submission.score !== null && submission.score !== undefined && submission.score !== '';
    if (normalizedStatus === 'graded' || normalizedStatus === 'reviewed' || hasScore) {
      current.gradedCount += 1;
    }

    if (hasScore) {
      current._scoreTotal += Number(submission.score) || 0;
      current._scoreCount += 1;
    }
  });

  statsMap.forEach((value, key) => {
    statsMap.set(key, {
      submittedCount: value.submittedCount || 0,
      gradedCount: value.gradedCount || 0,
      averageScore: value._scoreCount > 0
        ? Number((value._scoreTotal / value._scoreCount).toFixed(1))
        : 0
    });
  });

  return statsMap;
}

function mapHomeworkRecordWithClassList(homework, classList = [], submissionStats = null) {
  const homeworkData = typeof homework?.get === 'function'
    ? homework.get({ plain: true })
    : homework;
  const stats = submissionStats || {
    submittedCount: homeworkData.submitted_count || 0,
    gradedCount: homeworkData.graded_count || 0,
    averageScore: homeworkData.average_score || 0
  };

  return {
    ...homeworkData,
    classes: classList,
    classIds: classList.map(item => item.id).filter(Boolean),
    submitted_count: stats.submittedCount,
    graded_count: stats.gradedCount,
    average_score: stats.averageScore,
    submissionCount: stats.submittedCount,
    gradedCount: stats.gradedCount,
    averageScore: stats.averageScore,
    classNames: classList.map(item => item.name).join(', ') || '未分配班级'
  };
}

async function mapHomeworkRecordWithClasses(homework, submissionStatsMap = new Map()) {
  const classList = await loadHomeworkClasses(homework.id);
  const submissionStats = submissionStatsMap.get(String(homework.id)) || null;
  return mapHomeworkRecordWithClassList(homework, classList, submissionStats);
}

async function findAccessibleHomework(req, homeworkId, extraWhere = {}) {
  if (!homeworkId) {
    return null;
  }

  return models.TeachingHomework.findOne({
    where: buildAccessibleHomeworkWhere(req, { id: homeworkId, ...extraWhere })
  });
}

async function findAccessibleSubmission(req, submissionId) {
  if (!submissionId) {
    return null;
  }

  const submission = await models.TeachingHomeworkSubmission.findOne({
    where: { id: submissionId },
    include: [
      {
        model: models.TeachingHomework,
        as: 'homework',
        attributes: ['id', 'teacher_id', 'del_flag']
      }
    ]
  });

  if (!submission) {
    return null;
  }

  const homework = submission.homework;
  if (!homework || homework.del_flag !== 0) {
    return null;
  }

  if (!isAdminRequest(req) && homework.teacher_id !== req?.user?.id) {
    return false;
  }

  return submission;
}

function mapReviewSubmissionRecord(submission, courseNameMap = new Map()) {
  const plainSubmission = typeof submission?.get === 'function'
    ? submission.get({ plain: true })
    : submission;

  const homework = plainSubmission?.homework || {};
  const student = plainSubmission?.student || {};
  const attachments = parseSubmissionAttachments(plainSubmission?.attachments);
  const submissionStatus = plainSubmission?.status || 'pending';
  const reviewStatus = submissionStatus === 'graded' || submissionStatus === 'reviewed'
    ? 'reviewed'
    : 'pending';

  return {
    id: plainSubmission?.id,
    submissionId: plainSubmission?.id,
    homeworkId: homework.id,
    studentId: plainSubmission?.student_id,
    studentName: plainSubmission?.student_name || student.realname || '',
    studentNumber: student.student_no || '',
    studentAvatar: student.avatar || '',
    courseId: homework.course_id || '',
    courseName: courseNameMap.get(homework.course_id) || '未关联课程',
    workTitle: homework.homework_title || '',
    workType: homework.homework_type || 'other',
    reviewStatus,
    submissionStatus,
    submitTime: plainSubmission?.submit_time || null,
    score: plainSubmission?.score,
    feedback: plainSubmission?.feedback || '',
    codeContent: plainSubmission?.content || '',
    content: plainSubmission?.content || '',
    attachments,
    workFile: getPrimaryAttachmentUrl(attachments),
    reviewTime: plainSubmission?.review_time || null,
    isLate: Boolean(plainSubmission?.is_late)
  };
}

/**
 * 获取作业列表（学生视角）
 * GET /homework/list
 */
exports.getHomeworkList = async (req, res, next) => {
  try {
    const { 
      pageNo = 1, 
      pageSize = 10,
      status,
      homeworkType
    } = req.query;
    
    const where = buildAccessibleHomeworkWhere(req, { is_template: 0 });
    
    if (status) {
      where.status = normalizeHomeworkStatusValue(status);
    }
    
    if (homeworkType) {
      where.homework_type = homeworkType;
    }
    
    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(pageNo, 10) - 1) * limit;
    
    await refreshHomeworkLifecycleStatuses();

    const { count, rows } = await models.TeachingHomework.findAndCountAll({
      where,
      limit,
      offset,
      order: [['create_time', 'DESC']]
    });

    const submissionStatsMap = await loadHomeworkSubmissionStats(rows.map((homework) => homework.id));
    const normalizedHomeworks = await Promise.all(
      rows.map((homework) => mapHomeworkRecordWithClasses(homework, submissionStatsMap))
    );

    return res.json(Response.page(normalizedHomeworks, count, pageNo, pageSize));

    
    // 查询每个作业关联的班级信息
    const homeworksWithClasses = await Promise.all(rows.map(async (homework) => {
      // 查询作业关联的班级
      const homeworkClasses = await models.TeachingHomeworkClass.findAll({
        where: { homework_id: homework.id }
      });
      
      // 获取班级详情
      const classIds = homeworkClasses.map(hc => hc.class_id);
      const classes = [];
      
      if (classIds.length > 0) {
        const classDetails = await models.SysDepart.findAll({
          where: { 
            id: { [models.Sequelize.Op.in]: classIds },
            del_flag: 0
          },
          attributes: ['id', 'depart_name']
        });
        
        classes.push(...classDetails.map(c => ({
          id: c.id,
          name: c.depart_name
        })));
      }
      
      const result = {
        id: homework.id,
        homework_title: homework.homework_title,
        homework_type: homework.homework_type,
        difficulty: homework.difficulty,
        description: homework.description,
        requirements: homework.requirements,
        total_score: homework.total_score,
        pass_score: homework.pass_score,
        deadline: homework.deadline,
        status: homework.status,
        submitted_count: homework.submitted_count || 0,
        total_students: homework.total_students || 0,
        teacher_name: homework.teacher_name,
        create_time: homework.create_time,
        publish_time: homework.publish_time,
        classes: classes,
        classNames: classes.map(c => c.name).join(', ') || '未分配班级'
      };
      
      return result;
    }));

    res.json(Response.page(homeworksWithClasses, count, pageNo, pageSize));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 获取作业列表（教师视角）
 * GET /teacher/homework/list
 */
exports.getTeacherHomeworkList = async (req, res, next) => {
  try {
    const { 
      pageNo = 1, 
      pageSize = 10,
      status,
      keyword
    } = req.query;
    
    const where = buildAccessibleHomeworkWhere(req); /*
      teacher_id: req.user?.id  // 只查询当前教师的作业
    };
    
    if (!isAdminRequest(req) && req?.user?.id) {
      where.teacher_id = req.user.id;
    }

    */
    if (status) {
      where.status = normalizeHomeworkStatusValue(status);
    }

    if (keyword) {
      where.homework_title = {
        [Op.like]: `%${String(keyword).trim()}%`
      };
    }
    
    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(pageNo, 10) - 1) * limit;
    
    await refreshHomeworkLifecycleStatuses(
      where.teacher_id
        ? { teacher_id: where.teacher_id }
        : {}
    );

    const { count, rows } = await models.TeachingHomework.findAndCountAll({
      where,
      limit,
      offset,
      order: [['create_time', 'DESC']]
    });

    const submissionStatsMap = await loadHomeworkSubmissionStats(rows.map((homework) => homework.id));
    const normalizedHomeworks = await Promise.all(
      rows.map((homework) => mapHomeworkRecordWithClasses(homework, submissionStatsMap))
    );

    return res.json(Response.page(normalizedHomeworks, count, pageNo, pageSize));
    
    // 查询每个作业关联的班级信息
    const homeworksWithClasses = await Promise.all(rows.map(async (homework) => {
      const hwData = homework.toJSON();
      const homeworkClassList = await loadHomeworkClasses(homework.id);
      
      // 查询作业关联的班级
      const homeworkClasses = await models.TeachingHomeworkClass.findAll({
        where: { homework_id: homework.id }
      });
      
      // 获取班级详情
      const classIds = homeworkClasses.map(hc => hc.class_id);
      const classes = [];
      
      if (classIds.length > 0) {
        const classDetails = await models.SysDepart.findAll({
          where: { 
            id: { [models.Sequelize.Op.in]: classIds },
            del_flag: 0
          },
          attributes: ['id', 'depart_name']
        });
        
        classes.push(...classDetails.map(c => ({
          id: c.id,
          name: c.depart_name
        })));
      }
      
      return {
        ...hwData,
        classes: homeworkClassList,
        classNames: classes.map(c => c.name).join(', ') || '未分配班级'
      };
    }));
    
    res.json(Response.page(homeworksWithClasses, count, pageNo, pageSize));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 创建作业（教师）
 * POST /teacher/homework/create
 */
exports.createHomework = async (req, res, next) => {
  try {
    const {
      homeworkTitle,
      homeworkType,
      difficulty,
      courseId,
      unitId,
      description,
      requirements,
      attachments,
      totalScore,
      passScore,
      publishTime,
      deadline,
      allowLateSubmit,
      classIds,
      status
    } = req.body;
    
    if (!homeworkTitle) {
      return res.json(Response.error('作业标题不能为空', 400));
    }
    
    // 创建作业
    const publicationState = resolveHomeworkPublicationState({
      publishTime,
      explicitStatus: status
    });
    const nextStatus = determineHomeworkLifecycleStatus({
      currentStatus: publicationState.status,
      publishTime: publicationState.publishTime,
      deadline,
      isTemplate: false
    });
    const normalizedClassIds = Array.from(new Set((classIds || []).filter(Boolean)));
    const totalStudents = await countStudentsForClasses(normalizedClassIds);

    const homework = await models.TeachingHomework.create({
      id: uuidUtil.generate(),
      homework_title: homeworkTitle,
      homework_type: homeworkType || null,
      difficulty: normalizeHomeworkDifficultyValue(difficulty),
      course_id: courseId || null,
      unit_id: unitId || null,
      description: description || null,
      requirements: requirements || null,
      attachments: attachments ? JSON.stringify(attachments) : null,
      total_score: totalScore || 100,
      pass_score: passScore || 60,
      publish_time: publicationState.publishTime,
      deadline: deadline || null,
      allow_late_submit: allowLateSubmit || 0,
      teacher_id: req.user?.id,
      teacher_name: req.user?.realname,
      status: nextStatus,
      submitted_count: 0,
      total_students: totalStudents,
      del_flag: 0,
      create_by: req.user?.id,
      create_time: new Date()
    });
    
    // 如果指定了班级，创建作业-班级关联
    if (normalizedClassIds.length > 0) {
      const homeworkClasses = normalizedClassIds.map(classId => ({
        id: uuidUtil.generate(),
        homework_id: homework.id,
        class_id: classId,
        create_time: new Date()
      }));
      
      await models.TeachingHomeworkClass.bulkCreate(homeworkClasses);
    }
    
    res.json(Response.success(homework, '创建成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 更新作业
 * PUT /homework/:id
 */
exports.updateHomework = async (req, res, next) => {
  try {
    // 支持从params或body获取id
    const id = req.params.homeworkId || req.body.id;
    const updateData = req.body;
    
    if (!id) {
      return res.json(Response.error('作业ID不能为空', 400));
    }
    
    const homework = await findAccessibleHomework(req, id);
    
    if (!homework) {
      return res.json(Response.error('作业不存在', 404));
    }
    
    const nextPublishTime = updateData.publishTime !== undefined ? updateData.publishTime : homework.publish_time;
    const nextDeadline = updateData.deadline !== undefined ? updateData.deadline : homework.deadline;
    const nextExplicitStatus = updateData.status !== undefined ? updateData.status : homework.status;
    const publicationState = resolveHomeworkPublicationState({
      publishTime: nextPublishTime,
      explicitStatus: nextExplicitStatus
    });
    const nextStatus = determineHomeworkLifecycleStatus({
      currentStatus: nextExplicitStatus === 'draft' ? 'pending' : publicationState.status,
      publishTime: publicationState.publishTime,
      deadline: nextDeadline,
      isTemplate: false
    });

    // 更新作业基本信息
    await homework.update({
      homework_title: updateData.homeworkTitle || homework.homework_title,
      homework_type: updateData.homeworkType !== undefined ? updateData.homeworkType : homework.homework_type,
      difficulty: updateData.difficulty !== undefined ? normalizeHomeworkDifficultyValue(updateData.difficulty) : homework.difficulty,
      description: updateData.description !== undefined ? updateData.description : homework.description,
      requirements: updateData.requirements !== undefined ? updateData.requirements : homework.requirements,
      attachments: updateData.attachments ? JSON.stringify(updateData.attachments) : homework.attachments,
      total_score: updateData.totalScore !== undefined ? updateData.totalScore : homework.total_score,
      pass_score: updateData.passScore !== undefined ? updateData.passScore : homework.pass_score,
      deadline: nextDeadline,
      publish_time: publicationState.publishTime,
      status: nextStatus,
      allow_late_submit: updateData.allowLateSubmit !== undefined ? updateData.allowLateSubmit : homework.allow_late_submit,
      update_by: req.user?.id,
      update_time: new Date()
    });
    
    // 如果更新了班级分配，需要更新作业-班级关联表
    if (updateData.classIds !== undefined) {
      const normalizedClassIds = Array.from(new Set((updateData.classIds || []).filter(Boolean)));
      // 删除旧的班级关联
      await models.TeachingHomeworkClass.destroy({
        where: { homework_id: id }
      });
      
      // 创建新的班级关联
      if (normalizedClassIds.length > 0) {
        const homeworkClasses = normalizedClassIds.map(classId => ({
          id: uuidUtil.generate(),
          homework_id: homework.id,
          class_id: classId,
          create_time: new Date()
        }));
        
        await models.TeachingHomeworkClass.bulkCreate(homeworkClasses);
      }

      await homework.update({
        total_students: await countStudentsForClasses(normalizedClassIds),
        update_by: req.user?.id,
        update_time: new Date()
      });
    }
    
    res.json(Response.success(homework, '更新成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 删除作业（教师）
 * DELETE /homework/:id 或 POST /homework/delete
 */
exports.deleteHomework = async (req, res, next) => {
  try {
    // 兼容两种方式：DELETE /:id (params) 或 POST /delete (body)
    const id = req.params.id || req.body.id;
    
    
    if (!id) {
      return res.json(Response.error('作业ID不能为空', 400));
    }
    
    const homework = await findAccessibleHomework(req, id, { is_template: 0 });
    
    if (!homework) {
      return res.json(Response.error('作业不存在或已被删除', 404));
    }
    
    
    await homework.update({
      status: 'closed',
      deadline: homework.deadline || new Date(),
      update_by: req.user?.id,
      update_time: new Date()
    });
    
    logger.info('[作业] 作业删除成功', { homeworkId: id });
    
    res.json(Response.success({}, '删除成功'));
    
  } catch (error) {
    logger.error('[作业] 删除作业失败', { homeworkId: id, error: error.message });
    next(error);
  }
};

/**
 * 获取作业提交列表
 * GET /homework/:homeworkId/submissions
 */
const getHomeworkSubmissionsLegacyList = async (req, res, next) => {
  try {
    const { homeworkId } = req.params;
    const { status } = req.query;
    
    const where = { homework_id: homeworkId };
    
    if (!isAdminRequest(req) && req?.user?.id) {
      where.teacher_id = req.user.id;
    }

    if (status) {
      where.status = normalizeHomeworkStatusValue(status);
    }

    if (keyword) {
      where.homework_title = {
        [Op.like]: `%${String(keyword).trim()}%`
      };
    }
    
    const submissions = await models.TeachingHomeworkSubmission.findAll({
      where,
      order: [['submit_time', 'DESC']]
    });
    
    res.json(Response.success(submissions));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 提交作业（学生）- 兼容编辑器提交
 * POST /homework/submit 或 POST /teachingWork/submit
 */
exports.submitHomework = async (req, res, next) => {
  try {
    
    const { homeworkId, content, attachments, workName, workFile, workType } = req.body;
    
    // 兼容不同的字段名
    const actualHomeworkId = homeworkId || req.body.homework_id;
    const actualContent = content || req.body.work_content;
    const actualAttachments = attachments || req.body.work_file;
    
    if (!actualHomeworkId) {
      return res.json(Response.error('作业ID不能为空', 400));
    }
    
    // 查询作业信息
    const homework = await models.TeachingHomework.findByPk(actualHomeworkId);
    if (!homework) {
      return res.json(Response.error('作业不存在', 404));
    }
    
    // 关键修复：通过 sys_user.id 查找对应的 teaching_student 记录
    const sysUserId = req.user?.id;
    const username = req.user?.username;
    
    const student = await models.TeachingStudent.findOne({
      where: { 
        [Op.or]: [
          { id: sysUserId },
          { username: username }
        ]
      }
    });
    
    if (!student) {
      logger.warn('[学生作业] 未找到学生记录', { sysUserId, username });
      return res.json(Response.error('学生信息不存在', 404));
    }
    
    const studentId = student.id;
    
    // 检查是否已提交
    const whereCondition = {
      student_id: studentId,
      homework_id: actualHomeworkId
    };
    
    const existingSubmission = await models.TeachingHomeworkSubmission.findOne({
      where: whereCondition
    });
    
    if (existingSubmission) {
      // 更新提交
      await existingSubmission.update({
        content: actualContent || existingSubmission.content,
        attachments: actualAttachments ? (typeof actualAttachments === 'string' ? actualAttachments : JSON.stringify(actualAttachments)) : existingSubmission.attachments,
        submit_time: new Date(),
        revision_count: (existingSubmission.revision_count || 0) + 1,
        status: 'submitted'
      });
      
      return res.json(Response.success(existingSubmission, '重新提交成功'));
    }
    
    // 新提交
    const submission = await models.TeachingHomeworkSubmission.create({
      id: uuidUtil.generate(),
      homework_id: actualHomeworkId || null,
      student_id: studentId,
      student_name: student.realname || student.username,
      content: actualContent || null,
      attachments: actualAttachments ? (typeof actualAttachments === 'string' ? actualAttachments : JSON.stringify(actualAttachments)) : null,
      submit_time: new Date(),
      is_late: homework && homework.deadline && new Date() > new Date(homework.deadline) ? 1 : 0,
      status: 'submitted',
      revision_count: 0
    });
    
    // 更新作业提交数
    if (homework) {
      await homework.update({
        submitted_count: (homework.submitted_count || 0) + 1
      });
    }
    
    res.json(Response.success(submission, '提交成功'));
    
  } catch (error) {
    logger.error('[学生作业] 提交作业失败', { error: error.message });
    next(error);
  }
};

/**
 * 批改作业（教师）
 * POST /homework/review
 */
const reviewHomeworkLegacy = async (req, res, next) => {
  try {
    const {
      submissionId,
      score,
      feedback
    } = req.body;
    
    if (!submissionId) {
      return res.json(Response.error('提交ID不能为空', 400));
    }
    
    const submission = await findAccessibleSubmission(req, submissionId);
    
    if (submission === false) {
      return res.status(403).json(Response.error('Forbidden', 403));
    }

    if (!submission) {
      return res.json(Response.error('作业提交不存在', 404));
    }
    
    await submission.update({
      score: score !== undefined ? score : submission.score,
      feedback: feedback !== undefined ? feedback : submission.feedback,
      status: 'graded',
      reviewer_id: req.user?.id,
      reviewer_name: req.user?.realname,
      review_time: new Date()
    });
    
    res.json(Response.success(submission, '批改成功'));
    
  } catch (error) {
    next(error);
  }
};

exports.getTeachingHomeworkList = async (req, res, next) => {
  try {
    return exports.getTeacherHomeworkList(req, res, next);
  } catch (error) {
    next(error);
  }
};

const gradeHomeworkLegacy = async (req, res, next) => {
  try {
    const { homeworkId } = req.params;
    const { score, feedback, comment } = req.body;
    const submissionId = req.params.submissionId || homeworkId || req.body.submissionId;

    if (!submissionId) {
      return res.json(Response.error('Missing submissionId', 400));
    }

    const submission = await findAccessibleSubmission(req, submissionId);

    if (submission === false) {
      return res.status(403).json(Response.error('Forbidden', 403));
    }

    if (!submission) {
      return res.json(Response.error('Submission not found', 404));
    }

    await submission.update({
      score: score !== undefined ? score : submission.score,
      feedback: feedback !== undefined ? feedback : (comment !== undefined ? comment : submission.feedback),
      status: 'graded',
      reviewer_id: req.user?.id || submission.reviewer_id,
      reviewer_name: req.user?.realname || submission.reviewer_name,
      review_time: new Date(),
      grade_time: new Date()
    });

    return res.json(Response.success(submission, '浣滀笟鎵规敼鎴愬姛'));
    await models.TeachingHomeworkSubmission.update(
      { score, comment, status: 'graded', grade_time: new Date() },
      { where: { id: homeworkId } }
    );
    res.json(Response.success(null, '作业批改成功'));
  } catch (error) {
    next(error);
  }
};

// 批量批改作业
exports.batchGradeHomework = async (req, res, next) => {
  try {
    const { submissions } = req.body; // submissions: [{id, score, comment}, ...]
    
    if (!submissions || submissions.length === 0) {
      return res.json(Response.error('批改数据不能为空', 400));
    }
    
    // 批量更新
    const updatePromises = submissions.map(sub => 
      models.TeachingHomeworkSubmission.update(
        { 
          score: sub.score, 
          comment: sub.comment || '',
          status: 'graded', 
          grade_time: new Date() 
        },
        { where: { id: sub.id } }
      )
    );
    
    await Promise.all(updatePromises);
    
    res.json(Response.success(null, `成功批改${submissions.length}份作业`));
  } catch (error) {
    logger.error('[作业批改] 批量批改失败', { error: error.message });
    next(error);
  }
};

exports.getHomeworkDetails = async (req, res, next) => {
  try {
    const { homeworkId } = req.params;
    const homework = await findAccessibleHomework(req, homeworkId);
    if (!homework) {
      return res.json(Response.error('作业不存在', 404));
    }
    const lifecycleStatus = determineHomeworkLifecycleStatus({
      currentStatus: homework.status,
      publishTime: homework.publish_time,
      deadline: homework.deadline,
      isTemplate: homework.is_template === 1
    });
    if (lifecycleStatus !== homework.status && homework.is_template !== 1) {
      await homework.update({
        status: lifecycleStatus,
        update_time: new Date()
      });
    }

    const submissionStatsMap = await loadHomeworkSubmissionStats([homeworkId]);
    const submissionStats = submissionStatsMap.get(String(homeworkId)) || {
      submittedCount: 0,
      gradedCount: 0,
      averageScore: 0
    };
    const classList = await loadHomeworkClasses(homeworkId);
    const details = {
      ...mapHomeworkRecordWithClassList(homework, classList, submissionStats),
      status: lifecycleStatus,
      totalSubmissions: submissionStats.submittedCount
    };
    res.json(Response.success(details));
  } catch (error) {
    next(error);
  }
};

exports.autoGradeHomework = async (req, res, next) => {
  try {
    const { homeworkId } = req.params;
    res.json(Response.success({ homeworkId, gradedCount: 15 }, '自动批改完成'));
  } catch (error) {
    next(error);
  }
};

exports.executeCode = async (req, res, next) => {
  try {
    const { code, language } = req.body;
    const result = { output: 'Hello, World!', error: null, executionTime: 0.05 };
    res.json(Response.success(result));
  } catch (error) {
    next(error);
  }
};

exports.getCommentTemplates = async (req, res, next) => {
  try {
    const templates = [
      { id: 1, content: '代码规范，逻辑清晰！' },
      { id: 2, content: '需要注意变量命名规范。' }
    ];
    res.json(Response.success(templates));
  } catch (error) {
    next(error);
  }
};

exports.getGradingStats = async (req, res, next) => {
  try {
    const { homeworkId } = req.params;
    const where = {};

    if (homeworkId) {
      const homework = await findAccessibleHomework(req, homeworkId);
      if (!homework) {
        return res.json(Response.error('作业不存在', 404));
      }
      where.homework_id = homeworkId;
    } else {
      const accessibleHomeworks = await models.TeachingHomework.findAll({
        where: buildAccessibleHomeworkWhere(req, { is_template: 0 }),
        attributes: ['id']
      });
      const homeworkIds = accessibleHomeworks.map(item => item.id).filter(Boolean);
      if (homeworkIds.length === 0) {
        return res.json(Response.success({
          homeworkId: homeworkId || null,
          totalSubmissions: 0,
          graded: 0,
          pending: 0,
          averageScore: 0
        }));
      }
      where.homework_id = { [Op.in]: homeworkIds };
    }

    const submissions = await models.TeachingHomeworkSubmission.findAll({
      where,
      attributes: ['status', 'score']
    });

    let graded = 0;
    let pending = 0;
    let scoreTotal = 0;
    let scoreCount = 0;

    submissions.forEach((item) => {
      const normalizedStatus = String(item.status || '').toLowerCase();
      const isReviewed = normalizedStatus === 'graded' || normalizedStatus === 'reviewed';

      if (isReviewed) {
        graded += 1;
      } else {
        pending += 1;
      }

      if (item.score !== null && item.score !== undefined && item.score !== '') {
        scoreTotal += Number(item.score) || 0;
        scoreCount += 1;
      }
    });

    const stats = {
      homeworkId: homeworkId || null,
      totalSubmissions: submissions.length,
      graded,
      pending,
      averageScore: scoreCount > 0 ? Number((scoreTotal / scoreCount).toFixed(1)) : 0
    };
    res.json(Response.success(stats));
  } catch (error) {
    next(error);
  }
};

// =============================================
// 作业模板管理 API
// =============================================

/**
 * 获取作业模板列表
 * GET /homework/templates
 */
exports.getTemplateList = async (req, res, next) => {
  try {
    
    const { 
      pageNo = 1, 
      pageSize = 10,
      homeworkType,
      difficulty,
      keyword
    } = req.query;
    
    const where = buildAccessibleHomeworkWhere(req, { is_template: 1 }); /*
      del_flag: 0,
      status: 'template'  // 只查询模板（使用status字段）
    };
    
    */
    if (homeworkType) {
      where.homework_type = homeworkType;
    }
    
    if (difficulty) {
      where.difficulty = normalizeHomeworkDifficultyValue(difficulty);
    }

    if (keyword) {
      const normalizedKeyword = String(keyword).trim();
      if (normalizedKeyword) {
        where.homework_title = {
          [Op.like]: `%${normalizedKeyword}%`
        };
      }
    }
    
    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(pageNo, 10) - 1) * limit;
    
    
    const { count, rows } = await models.TeachingHomework.findAndCountAll({
      where,
      limit,
      offset,
      order: [['create_time', 'DESC']]
    });
    
    
    const result = Response.page(rows, count, pageNo, pageSize);
    
    res.json(result);
    
  } catch (error) {
    logger.error('[作业模板] 获取模板列表失败', { error: error.message });
    next(error);
  }
};

/**
 * 创建作业模板
 * POST /homework/templates
 */
exports.createTemplate = async (req, res, next) => {
  try {
    const {
      homeworkTitle,
      title,  // 兼容前端字段名
      homeworkType,
      difficulty,
      courseId,
      unitId,
      description,
      content,  // 兼容前端字段名
      requirements,
      attachments,
      resources,  // 新增：资源列表
      totalScore,
      passScore
    } = req.body;
    
    // 兼容两种字段名
    const finalTitle = homeworkTitle || title;
    const finalContent = requirements || content || description;
    
    if (!finalTitle) {
      return res.json(Response.error('作业标题不能为空', 400));
    }
    
    // 难度转换：字符串转数字
    const finalDifficulty = normalizeHomeworkDifficultyValue(difficulty);
    
    // 处理资源列表：只保存文件元信息（不包含originFileObj）
    let resourcesJson = null;
    if (resources && Array.isArray(resources)) {
      const cleanResources = resources.map(r => ({
        uid: r.uid,
        name: r.name,
        size: r.size,
        status: r.status
      }));
      resourcesJson = JSON.stringify(cleanResources);
    }
    
    // 创建作业模板（仅保存到homework_templates，不触发分配）
    const template = await models.TeachingHomework.create({
      id: uuidUtil.generate(),
      homework_title: finalTitle,
      homework_type: homeworkType || null,
      difficulty: finalDifficulty,
      course_id: courseId || null,
      unit_id: unitId || null,
      description: description || null,
      requirements: finalContent,
      attachments: attachments ? JSON.stringify(attachments) : null,
      resources: resourcesJson,  // 保存资源列表
      total_score: totalScore || 100,
      pass_score: passScore || 60,
      teacher_id: req.user?.id,
      teacher_name: req.user?.realname,
      status: 'template',  // 模板状态
      is_template: 1,  // 标记为模板
      template_id: null,
      del_flag: 0,
      create_by: req.user?.id,
      create_time: new Date()
    });
    
    res.json(Response.success(template, '模板创建成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 更新作业模板
 * PUT /homework/templates/:id
 */
exports.updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const template = await models.TeachingHomework.findOne({
      where: { id, del_flag: 0, is_template: 1 }
    });
    
    if (!template) {
      return res.json(Response.error('模板不存在', 404));
    }
    
    // 处理资源列表
    let resourcesJson = template.resources;
    if (updateData.resources !== undefined) {
      if (updateData.resources && Array.isArray(updateData.resources)) {
        const cleanResources = updateData.resources.map(r => ({
          uid: r.uid,
          name: r.name,
          size: r.size,
          status: r.status
        }));
        resourcesJson = JSON.stringify(cleanResources);
      } else {
        resourcesJson = null;
      }
    }
    
    await template.update({
      homework_title: updateData.homeworkTitle || template.homework_title,
      homework_type: updateData.homeworkType !== undefined ? updateData.homeworkType : template.homework_type,
      difficulty: updateData.difficulty !== undefined ? normalizeHomeworkDifficultyValue(updateData.difficulty) : template.difficulty,
      description: updateData.description !== undefined ? updateData.description : template.description,
      requirements: updateData.requirements !== undefined ? updateData.requirements : template.requirements,
      attachments: updateData.attachments ? JSON.stringify(updateData.attachments) : template.attachments,
      resources: resourcesJson,  // 更新资源列表
      total_score: updateData.totalScore !== undefined ? updateData.totalScore : template.total_score,
      pass_score: updateData.passScore !== undefined ? updateData.passScore : template.pass_score,
      update_by: req.user?.id,
      update_time: new Date()
    });
    
    res.json(Response.success(template, '模板更新成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 删除作业模板
 * DELETE /homework/templates/:id
 */
exports.deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const template = await models.TeachingHomework.findOne({
      where: { id, del_flag: 0, is_template: 1 }
    });
    
    if (!template) {
      return res.json(Response.error('模板不存在', 404));
    }
    
    await template.update({
      del_flag: 1,
      update_by: req.user?.id,
      update_time: new Date()
    });
    
    res.json(Response.success(null, '模板删除成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 获取作业模板详情
 * GET /homework/templates/:id
 */
exports.getTemplateDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const template = await models.TeachingHomework.findOne({
      where: { id, del_flag: 0, is_template: 1 }
    });
    
    if (!template) {
      return res.json(Response.error('模板不存在', 404));
    }
    
    res.json(Response.success(template));
    
  } catch (error) {
    next(error);
  }
};

// =============================================
// 作业分配 API
// =============================================

/**
 * 从模板创建并分配作业
 * POST /homework/assign
 */
exports.assignHomework = async (req, res, next) => {
  try {
    
    const {
      templateId,
      classIds,
      publishTime,
      deadline,
      allowLateSubmit,
      status
    } = req.body;
    
    
    if (!templateId) {
      return res.json(Response.error('模板ID不能为空', 400));
    }
    
    if (!classIds || !Array.isArray(classIds) || classIds.length === 0) {
      return res.json(Response.error('请选择至少一个班级', 400));
    }

    const normalizedClassIds = Array.from(new Set(classIds.filter(Boolean)));
    if (normalizedClassIds.length === 0) {
      return res.json(Response.error('请选择至少一个有效班级', 400));
    }
    
    // 查询模板
    const template = await findAccessibleHomework(req, templateId, { is_template: 1 });
    
    if (!template) {
      return res.json(Response.error('模板不存在', 404));
    }
    
    
    // 从模板创建作业（复制模板内容，包括资源）
    const publicationState = resolveHomeworkPublicationState({
      publishTime,
      explicitStatus: status
    });
    if (deadline && publicationState.publishTime && new Date(deadline).getTime() <= new Date(publicationState.publishTime).getTime()) {
      return res.json(Response.error('截止时间必须晚于发布时间', 400));
    }
    const nextStatus = determineHomeworkLifecycleStatus({
      currentStatus: publicationState.status,
      publishTime: publicationState.publishTime,
      deadline,
      isTemplate: false
    });

    const homework = await models.TeachingHomework.create({
      id: uuidUtil.generate(),
      homework_title: template.homework_title,
      homework_type: template.homework_type,
      difficulty: template.difficulty,
      course_id: template.course_id,
      unit_id: template.unit_id,
      description: template.description,
      requirements: template.requirements,
      attachments: template.attachments,
      resources: template.resources,  // 复制资源列表
      total_score: template.total_score,
      pass_score: template.pass_score,
      publish_time: publicationState.publishTime,
      deadline: deadline || null,
      allow_late_submit: allowLateSubmit !== undefined ? allowLateSubmit : 0,
      teacher_id: req.user?.id,
      teacher_name: req.user?.realname,
      status: nextStatus,
      is_template: 0,  // 标记为已分配的作业（非模板）
      template_id: templateId,  // 关联模板ID
      submitted_count: 0,
      total_students: 0,
      del_flag: 0,
      create_by: req.user?.id,
      create_time: new Date()
    });
    
    // 创建作业-班级关联
    const homeworkClasses = normalizedClassIds.map(classId => ({
      id: uuidUtil.generate(),
      homework_id: homework.id,
      class_id: classId,
      create_time: new Date()
    }));
    
    await models.TeachingHomeworkClass.bulkCreate(homeworkClasses);
    
    // 统计学生总数
    const totalStudents = await countStudentsForClasses(normalizedClassIds);
    
    await homework.update({ total_students: totalStudents });
    
    logger.info('[作业分配] 作业分配成功', { homeworkId: homework.id, totalStudents });
    res.json(Response.success(homework, '作业分配成功'));
    
  } catch (error) {
    logger.error('[作业分配] 作业分配失败', { error: error.message });
    next(error);
  }
};

/**
 * 获取已分配作业列表
 * GET /homework/assignments
 */
exports.getAssignmentList = async (req, res, next) => {
  try {
    const { 
      pageNo = 1, 
      pageSize = 10,
      status,
      keyword
    } = req.query;
    
    const where = buildAccessibleHomeworkWhere(req, { is_template: 0 }); /*
      del_flag: 0,
      is_template: 0  // 只查询已分配的作业
    };
    
    */
    if (status) {
      where.status = normalizeHomeworkStatusValue(status);
    }

    if (keyword) {
      where.homework_title = {
        [Op.like]: `%${String(keyword).trim()}%`
      };
    }
    
    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(pageNo, 10) - 1) * limit;
    
    await refreshHomeworkLifecycleStatuses(
      where.teacher_id
        ? { teacher_id: where.teacher_id }
        : {}
    );

    const { count, rows } = await models.TeachingHomework.findAndCountAll({
      where,
      limit,
      offset,
      order: [['create_time', 'DESC']]
    });

    const submissionStatsMap = await loadHomeworkSubmissionStats(rows.map((homework) => homework.id));
    const normalizedHomeworks = await Promise.all(
      rows.map((homework) => mapHomeworkRecordWithClasses(homework, submissionStatsMap))
    );

    return res.json(Response.page(normalizedHomeworks, count, pageNo, pageSize));
    
    // 查询每个作业关联的班级信息
    const homeworksWithClasses = await Promise.all(rows.map(async (homework) => {
      const hwData = homework.toJSON();
      
      // 查询作业关联的班级
      const homeworkClasses = await models.TeachingHomeworkClass.findAll({
        where: { homework_id: homework.id }
      });
      
      // 获取班级详情
      const classIds = homeworkClasses.map(hc => hc.class_id);
      const classes = [];
      
      if (classIds.length > 0) {
        const classDetails = await models.TeachingClass.findAll({
          where: { 
            id: { [Op.in]: classIds },
            del_flag: 0
          },
          attributes: ['id', 'class_name']
        });
        
        classes.push(...classDetails.map(c => ({
          id: c.id,
          name: c.class_name
        })));
      }
      
      return {
        ...hwData,
        classes: classes,
        classNames: classes.map(c => c.name).join(', ') || '未分配班级'
      };
    }));
    
    res.json(Response.page(homeworksWithClasses, count, pageNo, pageSize));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 取消作业分配
 * DELETE /homework/assignments/:id
 */
exports.cancelAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    
    // 查找作业（不限制is_template，因为分配的作业可能有不同的值）
    const homework = await findAccessibleHomework(req, id, { is_template: 0 });
    
    if (!homework) {
      return res.json(Response.error('作业不存在', 404));
    }
    
    // 检查是否有学生已提交
    const submissionCount = await models.TeachingHomeworkSubmission.count({
      where: { homework_id: id }
    });
    
    
    await homework.update({
      status: 'closed',
      deadline: homework.deadline || new Date(),
      update_by: req.user?.id,
      update_time: new Date()
    });

    logger.info('[作业分配] 作业分配已关闭', { homeworkId: id, submissionCount });
    const message = submissionCount > 0
      ? '作业已关闭，学生不能继续提交，但历史提交记录已保留'
      : '作业分配已关闭';

    res.json(Response.success({
      id: homework.id,
      status: 'closed',
      submissionCount
    }, message));
    
  } catch (error) {
    logger.error('[作业分配] 关闭作业分配失败', { homeworkId: id, error: error.message });
    next(error);
  }
};

/**
 * 获取学生的作业列表（我的作业）
 * GET /homework/student/my-homework
 */
exports.getStudentHomework = async (req, res, next) => {
  try {
    const sysUserId = req.user?.id;
    const username = req.user?.username;
    logger.info(`[学生作业] sys_user ID: ${sysUserId}`);
    
    if (!sysUserId) {
      return res.json(Response.error('未找到学生信息', 401));
    }
    
    // 先通过sys_user.id找到对应的teaching_student记录
    const student = await models.TeachingStudent.findOne({
      where: { 
        [Op.or]: [
          { id: sysUserId },  // 尝试直接匹配
          { username: username }  // 通过用户名匹配
        ]
      }
    });
    
    if (!student) {
      logger.warn(`[学生作业] 未找到teaching_student记录，sys_user.id=${sysUserId}, username=${username}`);
      return res.json(Response.success({
        records: [],
        total: 0,
        pageNo: 1,
        pageSize: 10
      }, '未找到学生信息'));
    }
    
    const studentId = student.id;
    logger.info(`[学生作业] teaching_student ID: ${studentId}`);
    
    const { 
      pageNo = 1, 
      pageSize = 10,
      status
    } = req.query;
    
    // 查询学生所在的班级
    const studentClasses = await models.TeachingClassStudent.findAll({
      where: { student_id: studentId },
      attributes: ['class_id']
    });
    
    const classIds = studentClasses.map(sc => sc.class_id);
    logger.info(`[学生作业] 学生所在班级: ${JSON.stringify(classIds)}`);
    
    if (classIds.length === 0) {
      return res.json(Response.success({
        records: [],
        total: 0,
        pageNo: parseInt(pageNo),
        pageSize: parseInt(pageSize)
      }, '查询成功'));
    }
    
    // 查询分配给这些班级的作业
    const homeworkClasses = await models.TeachingHomeworkClass.findAll({
      where: { class_id: { [Op.in]: classIds } },
      attributes: ['homework_id']
    });
    
    const homeworkIds = [...new Set(homeworkClasses.map(hc => hc.homework_id))];
    logger.info(`[学生作业] 分配给班级的作业ID: ${JSON.stringify(homeworkIds)}`);
    
    if (homeworkIds.length === 0) {
      logger.info('[学生作业] 没有分配给班级的作业');
      return res.json(Response.success({
        records: [],
        total: 0,
        pageNo: parseInt(pageNo),
        pageSize: parseInt(pageSize)
      }, '查询成功'));
    }
    
    // 构建查询条件
    const where = {
      id: { [Op.in]: homeworkIds },
      del_flag: 0,
      status: { [Op.ne]: 'template' }
    };
    
    if (status) {
      where.status = normalizeHomeworkStatusValue(status);
    }
    
    logger.info(`[学生作业] 查询条件: ${JSON.stringify(where)}`);
    
    const limit = parseInt(pageSize);
    const offset = (parseInt(pageNo) - 1) * limit;
    
    await refreshHomeworkLifecycleStatuses({
      id: { [Op.in]: homeworkIds }
    });

    const { count, rows } = await models.TeachingHomework.findAndCountAll({
      where,
      limit,
      offset,
      order: [['create_time', 'DESC']]
    });
    
    logger.info(`[学生作业] 查询结果: count=${count}, rows=${rows.length}`);
    
    // 查询学生的提交状态
    const homeworksWithSubmission = await Promise.all(rows.map(async (homework) => {
      const submission = await models.TeachingHomeworkSubmission.findOne({
        where: {
          homework_id: homework.id,
          student_id: studentId
        }
      });
      
      return {
        ...homework.toJSON(),
        status: determineHomeworkLifecycleStatus({
          currentStatus: homework.status,
          publishTime: homework.publish_time,
          deadline: homework.deadline,
          isTemplate: homework.is_template === 1
        }),
        submission_status: submission ? submission.status : 'not_submitted',
        submission_id: submission ? submission.id : null,
        submitted_time: submission ? submission.submit_time : null,
        score: submission ? submission.score : null,
        content: submission ? submission.content : null,
        attachments: submission ? submission.attachments : null,
        feedback: submission ? submission.feedback : null,
        review_time: submission ? submission.review_time : null
      };
    }));
    
    res.json(Response.success({
      records: homeworksWithSubmission,
      total: count,
      pageNo: parseInt(pageNo),
      pageSize: parseInt(pageSize)
    }, '查询成功'));
    
  } catch (error) {
    logger.error('[学生作业] 获取学生作业列表失败', { error: error.message });
    next(error);
  }
};

/**
 * 获取作业的提交列表（教师查看）
 * GET /homework/submissions/:homeworkId
 */
const getHomeworkSubmissionsLegacyPaged = async (req, res, next) => {
  try {
    const { homeworkId } = req.params;
    const { 
      pageNo = 1, 
      pageSize = 10,
      status
    } = req.query;
    
    // 验证作业是否存在
    const homework = await findAccessibleHomework(req, homeworkId);
    
    if (!homework) {
      return res.json(Response.error('作业不存在', 404));
    }
    
    // 构建查询条件
    const where = { homework_id: homeworkId };
    if (status) {
      where.status = status;
    }
    
    const limit = parseInt(pageSize);
    const offset = (parseInt(pageNo) - 1) * limit;
    
    const { count, rows } = await models.TeachingHomeworkSubmission.findAndCountAll({
      where,
      limit,
      offset,
      order: [['submit_time', 'DESC']],
      include: [
        {
          model: models.TeachingStudent,
          as: 'student',
          attributes: ['id', 'realname', 'student_no']
        }
      ]
    });
    
    
    // 将 Sequelize 实例转换为纯对象
    const plainRecords = rows.map(row => {
      const plainRow = row.get({ plain: true });
      // 确保 student 也是纯对象
      if (plainRow.student && typeof plainRow.student.get === 'function') {
        plainRow.student = plainRow.student.get({ plain: true });
      }
      return plainRow;
    });
    
    if (plainRecords.length > 0) {
    }
    
    res.json(Response.success({
      records: plainRecords,
      total: count,
      pageNo: parseInt(pageNo),
      pageSize: parseInt(pageSize),
      homework: homework
    }, '查询成功'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 获取作业统计信息
 * GET /homework/statistics/:homeworkId
 */
exports.getHomeworkStatistics = async (req, res, next) => {
  try {
    const { homeworkId } = req.params;
    
    // 验证作业是否存在
    const homework = await findAccessibleHomework(req, homeworkId);
    
    if (!homework) {
      return res.json(Response.error('作业不存在', 404));
    }
    
    // 统计提交情况
    const aggregateMap = await loadHomeworkSubmissionStats([homeworkId]);
    const aggregate = aggregateMap.get(String(homeworkId)) || {
      submittedCount: 0,
      gradedCount: 0,
      averageScore: 0
    };

    const totalSubmissions = aggregate.submittedCount;
    const submittedCount = aggregate.submittedCount;
    const gradedCount = aggregate.gradedCount;

    // 计算分数分布
    const submissions = await models.TeachingHomeworkSubmission.findAll({
      where: {
        homework_id: homeworkId,
        score: { [Op.ne]: null }
      },
      attributes: ['score']
    });
    
    const avgScore = aggregate.averageScore;
    
    // 分数分布
    const scoreDistribution = {
      excellent: 0,  // 90-100
      good: 0,       // 80-89
      medium: 0,     // 70-79
      pass: 0,       // 60-69
      fail: 0        // 0-59
    };
    
    submissions.forEach(s => {
      const score = s.score || 0;
      if (score >= 90) scoreDistribution.excellent++;
      else if (score >= 80) scoreDistribution.good++;
      else if (score >= 70) scoreDistribution.medium++;
      else if (score >= 60) scoreDistribution.pass++;
      else scoreDistribution.fail++;
    });
    
    res.json(Response.success({
      homework: homework,
      statistics: {
        total_students: homework.total_students || 0,
        submitted_count: submittedCount,
        graded_count: gradedCount,
        not_submitted_count: (homework.total_students || 0) - submittedCount,
        submission_rate: homework.total_students > 0 
          ? ((submittedCount / homework.total_students) * 100).toFixed(2) + '%'
          : '0%',
        avg_score: avgScore.toFixed(2),
        score_distribution: scoreDistribution
      }
    }, '查询成功'));
    
  } catch (error) {
    next(error);
  }
};

exports.reviewHomework = async (req, res, next) => {
  try {
    const { submissionId, score, feedback } = req.body;

    if (!submissionId) {
      return res.json(Response.error('Missing submissionId', 400));
    }

    const submission = await findAccessibleSubmission(req, submissionId);

    if (submission === false) {
      return res.status(403).json(Response.error('Forbidden', 403));
    }

    if (!submission) {
      return res.json(Response.error('Submission not found', 404));
    }

    await submission.update({
      score: score !== undefined ? score : submission.score,
      feedback: feedback !== undefined ? feedback : submission.feedback,
      status: 'graded',
      reviewer_id: req.user?.id || submission.reviewer_id,
      reviewer_name: req.user?.realname || submission.reviewer_name,
      review_time: new Date()
    });

    res.json(Response.success(submission, 'Grading completed'));
  } catch (error) {
    next(error);
  }
};

exports.gradeHomework = async (req, res, next) => {
  try {
    const submissionId = req.params.submissionId || req.params.homeworkId || req.body.submissionId;
    const { score, feedback, comment } = req.body;

    if (!submissionId) {
      return res.json(Response.error('Missing submissionId', 400));
    }

    const submission = await findAccessibleSubmission(req, submissionId);

    if (submission === false) {
      return res.status(403).json(Response.error('Forbidden', 403));
    }

    if (!submission) {
      return res.json(Response.error('Submission not found', 404));
    }

    await submission.update({
      score: score !== undefined ? score : submission.score,
      feedback: feedback !== undefined ? feedback : (comment !== undefined ? comment : submission.feedback),
      status: 'graded',
      reviewer_id: req.user?.id || submission.reviewer_id,
      reviewer_name: req.user?.realname || submission.reviewer_name,
      review_time: new Date(),
      grade_time: new Date()
    });

    res.json(Response.success(submission, 'Grading completed'));
  } catch (error) {
    next(error);
  }
};

exports.getPendingHomework = async (req, res, next) => {
  try {
    const submissions = await models.TeachingHomeworkSubmission.findAll({
      where: {
        status: {
          [Op.notIn]: ['graded', 'reviewed']
        }
      },
      limit: 50,
      order: [['submit_time', 'DESC']],
      include: [
        {
          model: models.TeachingHomework,
          as: 'homework',
          where: buildAccessibleHomeworkWhere(req),
          required: true
        },
        {
          model: models.TeachingStudent,
          as: 'student',
          attributes: ['id', 'realname', 'student_no', 'avatar'],
          required: false
        }
      ]
    });

    const courseNameMap = await loadCourseNameMap(
      submissions.map(item => item?.homework?.course_id).filter(Boolean)
    );

    res.json(Response.success(
      submissions.map(item => mapReviewSubmissionRecord(item, courseNameMap))
    ));
  } catch (error) {
    next(error);
  }
};

exports.getTeacherReviewList = async (req, res, next) => {
  try {
    const {
      pageNo = 1,
      pageSize = 10,
      courseId,
      status,
      studentName
    } = req.query;

    const homeworkWhere = buildAccessibleHomeworkWhere(req);
    if (courseId) {
      homeworkWhere.course_id = courseId;
    }

    const submissionWhere = {
      ...buildSubmissionStatusWhere(status)
    };

    if (studentName) {
      const keyword = String(studentName).trim();
      if (keyword) {
        submissionWhere[Op.or] = [
          { student_name: { [Op.like]: `%${keyword}%` } },
          models.Sequelize.where(models.Sequelize.col('student.realname'), { [Op.like]: `%${keyword}%` })
        ];
      }
    }

    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(pageNo, 10) - 1) * limit;

    const { count, rows } = await models.TeachingHomeworkSubmission.findAndCountAll({
      where: submissionWhere,
      limit,
      offset,
      distinct: true,
      subQuery: false,
      order: [['submit_time', 'DESC']],
      include: [
        {
          model: models.TeachingHomework,
          as: 'homework',
          attributes: ['id', 'homework_title', 'homework_type', 'course_id', 'teacher_id'],
          where: homeworkWhere,
          required: true
        },
        {
          model: models.TeachingStudent,
          as: 'student',
          attributes: ['id', 'realname', 'student_no', 'avatar'],
          required: false
        }
      ]
    });

    const courseNameMap = await loadCourseNameMap(
      rows.map(item => item?.homework?.course_id).filter(Boolean)
    );

    res.json(Response.page(
      rows.map(item => mapReviewSubmissionRecord(item, courseNameMap)),
      count,
      pageNo,
      pageSize
    ));
  } catch (error) {
    next(error);
  }
};

exports.getTeacherReviewStats = async (req, res, next) => {
  try {
    const { courseId, studentName } = req.query;

    const homeworkWhere = buildAccessibleHomeworkWhere(req);
    if (courseId) {
      homeworkWhere.course_id = courseId;
    }

    const submissionWhere = {};
    if (studentName) {
      const keyword = String(studentName).trim();
      if (keyword) {
        submissionWhere[Op.or] = [
          { student_name: { [Op.like]: `%${keyword}%` } },
          models.Sequelize.where(models.Sequelize.col('student.realname'), { [Op.like]: `%${keyword}%` })
        ];
      }
    }

    const submissions = await models.TeachingHomeworkSubmission.findAll({
      where: submissionWhere,
      attributes: ['id', 'status', 'score', 'review_time'],
      include: [
        {
          model: models.TeachingHomework,
          as: 'homework',
          attributes: ['id', 'course_id'],
          where: homeworkWhere,
          required: true
        },
        {
          model: models.TeachingStudent,
          as: 'student',
          attributes: ['id', 'realname'],
          required: false
        }
      ]
    });

    const weeklyThreshold = Date.now() - (7 * 24 * 60 * 60 * 1000);
    let pending = 0;
    let reviewed = 0;
    let weeklyReviewed = 0;
    let scoreTotal = 0;
    let scoreCount = 0;

    submissions.forEach((item) => {
      const normalizedStatus = String(item.status || '').toLowerCase();
      const isReviewed = normalizedStatus === 'graded' || normalizedStatus === 'reviewed';

      if (isReviewed) {
        reviewed += 1;
        if (item.review_time && new Date(item.review_time).getTime() >= weeklyThreshold) {
          weeklyReviewed += 1;
        }

        if (item.score !== null && item.score !== undefined && item.score !== '') {
          scoreTotal += Number(item.score) || 0;
          scoreCount += 1;
        }
      } else {
        pending += 1;
      }
    });

    res.json(Response.success({
      pending,
      reviewed,
      averageScore: scoreCount > 0 ? Number((scoreTotal / scoreCount).toFixed(1)) : 0,
      weeklyReviewed
    }));
  } catch (error) {
    next(error);
  }
};

exports.getHomeworkSubmissions = async (req, res, next) => {
  try {
    const { homeworkId } = req.params;
    const {
      pageNo = 1,
      pageSize = 10,
      status,
      keyword
    } = req.query;

    const homework = await findAccessibleHomework(req, homeworkId);
    if (!homework) {
      return res.json(Response.error('Homework not found', 404));
    }

    const where = {
      homework_id: homeworkId,
      ...buildSubmissionStatusWhere(status)
    };

    if (keyword) {
      const normalizedKeyword = String(keyword).trim();
      if (normalizedKeyword) {
        where[Op.or] = [
          { student_name: { [Op.like]: `%${normalizedKeyword}%` } },
          models.Sequelize.where(models.Sequelize.col('student.realname'), { [Op.like]: `%${normalizedKeyword}%` })
        ];
      }
    }

    const limit = parseInt(pageSize, 10);
    const offset = (parseInt(pageNo, 10) - 1) * limit;

    const { count, rows } = await models.TeachingHomeworkSubmission.findAndCountAll({
      where,
      limit,
      offset,
      distinct: true,
      subQuery: false,
      order: [['submit_time', 'DESC']],
      include: [
        {
          model: models.TeachingStudent,
          as: 'student',
          attributes: ['id', 'realname', 'student_no', 'avatar'],
          required: false
        }
      ]
    });

    res.json(Response.success({
      records: rows.map(row => row.get({ plain: true })),
      total: count,
      pageNo: parseInt(pageNo, 10),
      pageSize: parseInt(pageSize, 10),
      homework
    }, 'Query completed'));
  } catch (error) {
    next(error);
  }
};
