const express = require('express');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const models = require('../models');
const Response = require('../utils/response');
const initTeachingStudentProgress = require('../models/TeachingStudentProgress');
const initTeachingCourseStudent = require('../models/TeachingCourseStudent');
const avatarUtil = require('../utils/avatar');

const router = express.Router();
const teacherOrAdminOnly = auth.requireUserIdentity([1, 2], '浠呮暀甯堟垨绠＄悊鍛樺彲璁块棶瀛︿範鍒嗘瀽鏁版嵁');

const TeachingStudentProgress = models.sequelize.models.TeachingStudentProgress ||
  initTeachingStudentProgress(models.sequelize);
const TeachingCourseStudent = models.sequelize.models.TeachingCourseStudent ||
  initTeachingCourseStudent(models.sequelize);

function normalizeKeyword(keyword) {
  return String(keyword || '').trim();
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function uniqueValues(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function formatRelativeTime(input) {
  if (!input) return '暂无记录';

  const value = new Date(input);
  if (Number.isNaN(value.getTime())) {
    return '暂无记录';
  }

  const diffMs = Date.now() - value.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));

  if (diffMinutes < 60) {
    return `${Math.max(diffMinutes, 1)}分钟前`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}小时前`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays}天前`;
  }

  return value.toISOString().slice(0, 10);
}

function getLatestDate(...candidates) {
  const valid = candidates
    .filter(Boolean)
    .map((item) => new Date(item))
    .filter((item) => !Number.isNaN(item.getTime()));

  if (!valid.length) {
    return null;
  }

  return valid.reduce((latest, current) => (current > latest ? current : latest));
}

function buildStudentSuggestions({ attendance, homeworkRate, averageScore, completedLessons, totalLessons }) {
  const suggestions = [];

  if (attendance < 0.7) {
    suggestions.push({
      type: 'warning',
      title: '课堂参与偏低',
      description: '建议优先跟进课堂到课与互动情况，避免后续课程持续掉队。'
    });
  }

  if (homeworkRate < 0.7) {
    suggestions.push({
      type: 'warning',
      title: '作业跟进不足',
      description: '建议安排一次针对性提醒，优先完成近期待提交或未提交作业。'
    });
  }

  if (averageScore >= 90) {
    suggestions.push({
      type: 'success',
      title: '成绩表现稳定',
      description: '当前成绩处于较高水平，可逐步加入更高难度或开放式任务。'
    });
  } else if (averageScore > 0 && averageScore < 70) {
    suggestions.push({
      type: 'warning',
      title: '成绩仍需提升',
      description: '建议结合错题与反馈做一次针对性补练，优先补齐基础知识点。'
    });
  }

  if (totalLessons > 0 && completedLessons / totalLessons >= 0.85) {
    suggestions.push({
      type: 'success',
      title: '课程推进良好',
      description: '课程完成度较高，可以提前准备下一阶段的学习内容。'
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      type: 'success',
      title: '学习状态正常',
      description: '当前学习节奏平稳，建议继续保持并持续跟踪关键指标。'
    });
  }

  return suggestions.slice(0, 3);
}

async function resolveStudentScope({ classId, keyword }) {
  const where = { del_flag: 0 };
  const normalizedKeyword = normalizeKeyword(keyword);

  if (normalizedKeyword) {
    where[Op.or] = [
      { realname: { [Op.like]: `%${normalizedKeyword}%` } },
      { student_no: { [Op.like]: `%${normalizedKeyword}%` } }
    ];
  }

  if (!classId) {
    return { where };
  }

  const classStudentRows = await models.TeachingClassStudent.findAll({
    where: {
      class_id: classId,
      del_flag: 0
    },
    attributes: ['student_id'],
    raw: true
  });

  const studentIds = uniqueValues(classStudentRows.map((item) => item.student_id));
  if (!studentIds.length) {
    where.id = '__empty_student_scope__';
    return { where };
  }

  where.id = { [Op.in]: studentIds };
  return { where };
}

async function buildLearningRecords(students, { classId, courseId }) {
  if (!students.length) {
    return [];
  }

  const studentIds = students.map((student) => student.id);

  const classRelationWhere = {
    student_id: { [Op.in]: studentIds },
    del_flag: 0
  };
  if (classId) {
    classRelationWhere.class_id = classId;
  }

  const classRelations = await models.TeachingClassStudent.findAll({
    where: classRelationWhere,
    attributes: ['student_id', 'class_id', 'join_date'],
    raw: true
  });

  const classIds = uniqueValues(classRelations.map((item) => item.class_id));
  const classes = classIds.length
    ? await models.TeachingClass.findAll({
      where: {
        id: { [Op.in]: classIds },
        del_flag: 0
      },
      attributes: ['id', 'class_name'],
      raw: true
    })
    : [];
  const classNameMap = new Map(classes.map((item) => [item.id, item.class_name]));

  const progressWhere = {
    student_id: { [Op.in]: studentIds }
  };
  if (courseId) {
    progressWhere.course_id = courseId;
  }

  const progressRows = await TeachingStudentProgress.findAll({
    where: progressWhere,
    attributes: ['student_id', 'course_id', 'unit_id', 'progress', 'completed', 'last_learn_time', 'total_duration'],
    raw: true
  });

  const enrollmentWhere = {
    student_id: { [Op.in]: studentIds }
  };
  if (courseId) {
    enrollmentWhere.course_id = courseId;
  }

  const courseEnrollments = await TeachingCourseStudent.findAll({
    where: enrollmentWhere,
    attributes: ['student_id', 'course_id'],
    raw: true
  });

  const relevantCourseIds = uniqueValues([
    courseId,
    ...progressRows.map((item) => item.course_id),
    ...courseEnrollments.map((item) => item.course_id)
  ]);

  const unitCountRows = relevantCourseIds.length
    ? await models.TeachingCourseUnit.findAll({
      where: {
        course_id: { [Op.in]: relevantCourseIds },
        del_flag: 0
      },
      attributes: [
        'course_id',
        [models.Sequelize.fn('COUNT', models.Sequelize.col('id')), 'unitCount']
      ],
      group: ['course_id'],
      raw: true
    })
    : [];
  const unitCountMap = new Map(
    unitCountRows.map((item) => [item.course_id, normalizeNumber(item.unitCount)])
  );

  const homeworkClassRows = classIds.length
    ? await models.TeachingHomeworkClass.findAll({
      where: {
        class_id: { [Op.in]: classIds }
      },
      attributes: ['class_id', 'homework_id'],
      raw: true
    })
    : [];
  const rawHomeworkIds = uniqueValues(homeworkClassRows.map((item) => item.homework_id));

  const homeworkWhere = {
    del_flag: 0,
    is_template: 0
  };
  if (rawHomeworkIds.length) {
    homeworkWhere.id = { [Op.in]: rawHomeworkIds };
  } else {
    homeworkWhere.id = '__empty_homework_scope__';
  }
  if (courseId) {
    homeworkWhere.course_id = courseId;
  }

  const homeworks = await models.TeachingHomework.findAll({
    where: homeworkWhere,
    attributes: ['id', 'homework_title', 'course_id', 'deadline', 'create_time'],
    raw: true
  });

  const validHomeworkIds = new Set(homeworks.map((item) => item.id));
  const homeworkMap = new Map(homeworks.map((item) => [item.id, item]));
  const classHomeworkMap = new Map();
  homeworkClassRows.forEach((item) => {
    if (!validHomeworkIds.has(item.homework_id)) {
      return;
    }
    if (!classHomeworkMap.has(item.class_id)) {
      classHomeworkMap.set(item.class_id, new Set());
    }
    classHomeworkMap.get(item.class_id).add(item.homework_id);
  });

  const submissionRows = validHomeworkIds.size
    ? await models.TeachingHomeworkSubmission.findAll({
      where: {
        student_id: { [Op.in]: studentIds },
        homework_id: { [Op.in]: Array.from(validHomeworkIds) }
      },
      attributes: ['id', 'student_id', 'homework_id', 'submit_time', 'status', 'score', 'feedback', 'is_late'],
      order: [['submit_time', 'DESC']],
      raw: true
    })
    : [];

  const classroomStudentRows = await models.TeachingClassroomStudent.findAll({
    where: {
      student_id: { [Op.in]: studentIds }
    },
    attributes: ['student_id', 'classroom_id', 'is_present', 'duration', 'join_time'],
    raw: true
  });

  const classroomIds = uniqueValues(classroomStudentRows.map((item) => item.classroom_id));
  const classrooms = classroomIds.length
    ? await models.TeachingClassroom.findAll({
      where: {
        id: { [Op.in]: classroomIds },
        del_flag: 0
      },
      attributes: ['id', 'class_id', 'course_id'],
      raw: true
    })
    : [];
  const classroomMap = new Map(classrooms.map((item) => [item.id, item]));

  const relationsByStudent = new Map();
  classRelations.forEach((item) => {
    if (!relationsByStudent.has(item.student_id)) {
      relationsByStudent.set(item.student_id, []);
    }
    relationsByStudent.get(item.student_id).push(item);
  });

  const progressByStudent = new Map();
  progressRows.forEach((item) => {
    if (!progressByStudent.has(item.student_id)) {
      progressByStudent.set(item.student_id, []);
    }
    progressByStudent.get(item.student_id).push(item);
  });

  const courseEnrollmentsByStudent = new Map();
  courseEnrollments.forEach((item) => {
    if (!courseEnrollmentsByStudent.has(item.student_id)) {
      courseEnrollmentsByStudent.set(item.student_id, []);
    }
    courseEnrollmentsByStudent.get(item.student_id).push(item);
  });

  const submissionsByStudent = new Map();
  submissionRows.forEach((item) => {
    if (!submissionsByStudent.has(item.student_id)) {
      submissionsByStudent.set(item.student_id, []);
    }
    submissionsByStudent.get(item.student_id).push(item);
  });

  const classroomRowsByStudent = new Map();
  classroomStudentRows.forEach((item) => {
    const classroom = classroomMap.get(item.classroom_id);
    if (!classroom) {
      return;
    }
    if (classId && classroom.class_id !== classId) {
      return;
    }
    if (courseId && classroom.course_id !== courseId) {
      return;
    }
    if (!classroomRowsByStudent.has(item.student_id)) {
      classroomRowsByStudent.set(item.student_id, []);
    }
    classroomRowsByStudent.get(item.student_id).push(item);
  });

  return students.map((student) => {
    const studentRelations = relationsByStudent.get(student.id) || [];
    const studentClasses = uniqueValues(studentRelations.map((item) => item.class_id));
    const className = studentClasses.length
      ? studentClasses.map((item) => classNameMap.get(item)).filter(Boolean).join(' / ')
      : '未分班';

    const progressItems = progressByStudent.get(student.id) || [];
    const enrollmentItems = courseEnrollmentsByStudent.get(student.id) || [];
    const studentCourseIds = courseId
      ? [courseId]
      : uniqueValues([
        ...progressItems.map((item) => item.course_id),
        ...enrollmentItems.map((item) => item.course_id)
      ]);

    const completedUnitIds = new Set();
    let latestLearnTime = null;
    let progressDuration = 0;
    progressItems.forEach((item) => {
      const progressValue = normalizeNumber(item.progress);
      if (item.completed === 1 || progressValue >= 100) {
        completedUnitIds.add(item.unit_id || `${item.course_id}_${progressItems.length}`);
      }
      latestLearnTime = getLatestDate(latestLearnTime, item.last_learn_time);
      progressDuration += normalizeNumber(item.total_duration);
    });

    const totalLessons = studentCourseIds.reduce((sum, item) => sum + normalizeNumber(unitCountMap.get(item)), 0);
    const completedLessons = completedUnitIds.size;

    const studentHomeworkIds = new Set();
    studentClasses.forEach((item) => {
      const homeworkIds = classHomeworkMap.get(item);
      if (!homeworkIds) {
        return;
      }
      homeworkIds.forEach((homeworkId) => studentHomeworkIds.add(homeworkId));
    });

    const studentSubmissions = submissionsByStudent.get(student.id) || [];
    let scoreTotal = 0;
    let scoredCount = 0;
    const recentHomework = [];

    studentSubmissions.forEach((item) => {
      if (item.score !== null && item.score !== undefined && item.score !== '') {
        scoreTotal += normalizeNumber(item.score);
        scoredCount += 1;
      }
      const homework = homeworkMap.get(item.homework_id);
      if (!homework || recentHomework.length >= 5) {
        return;
      }
      recentHomework.push({
        title: homework.homework_title,
        deadline: homework.deadline,
        status: item.is_late ? 'late' : (item.status || 'submitted'),
        score: item.score
      });
    });

    const classroomItems = classroomRowsByStudent.get(student.id) || [];
    const totalAttendanceEvents = classroomItems.length;
    const presentCount = classroomItems.filter((item) => normalizeNumber(item.is_present, 0) === 1).length;
    const attendance = totalAttendanceEvents > 0 ? presentCount / totalAttendanceEvents : 0;
    const classroomDuration = classroomItems.reduce((sum, item) => sum + normalizeNumber(item.duration), 0);
    const latestClassroomActivity = classroomItems.reduce(
      (latest, item) => getLatestDate(latest, item.join_time),
      null
    );

    const latestSubmissionTime = studentSubmissions.reduce(
      (latest, item) => getLatestDate(latest, item.submit_time),
      null
    );
    const lastActiveDate = getLatestDate(latestLearnTime, latestClassroomActivity, latestSubmissionTime, student.update_time);

    const totalHomework = studentHomeworkIds.size;
    const submittedHomework = studentSubmissions.length;
    const averageScore = scoredCount > 0 ? Number((scoreTotal / scoredCount).toFixed(1)) : 0;
    const homeworkRate = totalHomework > 0 ? submittedHomework / totalHomework : 0;
    const studyHoursMinutes = progressDuration > 0 ? progressDuration : classroomDuration;
    const studyHours = Number((studyHoursMinutes / 60).toFixed(1));

    return {
      studentId: student.id,
      realname: student.realname,
      studentNo: student.student_no,
      avatar: avatarUtil.normalizeAvatarUrl(student.avatar, student.student_no || student.realname || student.id),
      className,
      attendance: Number(attendance.toFixed(4)),
      averageScore,
      completedLessons,
      totalLessons,
      submittedHomework,
      totalHomework,
      lastActive: formatRelativeTime(lastActiveDate),
      currentStep: totalLessons > 0 ? Math.min(Math.floor((completedLessons / totalLessons) * 4), 3) : 0,
      studyHours,
      enrollDate: student.enrollment_date || (studentRelations[0] && studentRelations[0].join_date) || null,
      status: student.status === 1 ? 'active' : 'inactive',
      recentHomework,
      suggestions: buildStudentSuggestions({
        attendance,
        homeworkRate,
        averageScore,
        completedLessons,
        totalLessons
      })
    };
  });
}

function buildStatistics(records) {
  if (!records.length) {
    return {
      totalStudents: 0,
      avgAttendance: 0,
      avgScore: 0,
      homeworkRate: 0
    };
  }

  const totalStudents = records.length;
  const attendanceTotal = records.reduce((sum, item) => sum + normalizeNumber(item.attendance), 0);
  const scoreTotal = records.reduce((sum, item) => sum + normalizeNumber(item.averageScore), 0);
  const homeworkRateTotal = records.reduce((sum, item) => {
    if (!item.totalHomework) {
      return sum;
    }
    return sum + (item.submittedHomework / item.totalHomework);
  }, 0);

  return {
    totalStudents,
    avgAttendance: Number(((attendanceTotal / totalStudents) * 100).toFixed(1)),
    avgScore: Number((scoreTotal / totalStudents).toFixed(1)),
    homeworkRate: Number(((homeworkRateTotal / totalStudents) * 100).toFixed(1))
  };
}

router.get('/progress', auth.verifyToken, teacherOrAdminOnly, async (req, res, next) => {
  try {
    const pageNo = Math.max(parseInt(req.query.pageNo, 10) || 1, 1);
    const pageSize = Math.max(parseInt(req.query.pageSize, 10) || 10, 1);
    const classId = String(req.query.classId || '').trim();
    const courseId = String(req.query.courseId || '').trim();
    const keyword = normalizeKeyword(req.query.keyword);

    const { where } = await resolveStudentScope({ classId, keyword });
    const { count, rows } = await models.TeachingStudent.findAndCountAll({
      where,
      attributes: ['id', 'student_no', 'realname', 'avatar', 'status', 'enrollment_date', 'update_time'],
      order: [['create_time', 'DESC']],
      limit: pageSize,
      offset: (pageNo - 1) * pageSize
    });

    const records = await buildLearningRecords(
      rows.map((item) => item.get({ plain: true })),
      { classId, courseId }
    );

    res.json(Response.page(records, count, pageNo, pageSize));
  } catch (error) {
    next(error);
  }
});

router.get('/statistics', auth.verifyToken, teacherOrAdminOnly, async (req, res, next) => {
  try {
    const classId = String(req.query.classId || '').trim();
    const courseId = String(req.query.courseId || '').trim();
    const keyword = normalizeKeyword(req.query.keyword);

    const { where } = await resolveStudentScope({ classId, keyword });
    const students = await models.TeachingStudent.findAll({
      where,
      attributes: ['id', 'student_no', 'realname', 'avatar', 'status', 'enrollment_date', 'update_time'],
      raw: true
    });

    const records = await buildLearningRecords(students, { classId, courseId });
    res.json(Response.success(buildStatistics(records)));
  } catch (error) {
    next(error);
  }
});

router.post('/reminder', auth.verifyToken, teacherOrAdminOnly, async (req, res) => {
  const studentIds = uniqueValues([
    ...(Array.isArray(req.body.studentIds) ? req.body.studentIds : []),
    req.body.studentId
  ]);
  const methods = uniqueValues(Array.isArray(req.body.methods) ? req.body.methods : ['system']);
  const message = String(req.body.message || '').trim();
  const type = String(req.body.type || '').trim() || 'progress';

  if (!studentIds.length) {
    return res.json(Response.error('缺少提醒对象', 400));
  }

  if (!message) {
    return res.json(Response.error('提醒内容不能为空', 400));
  }

  return res.json(Response.success({
    studentIds,
    methods,
    type,
    sentCount: studentIds.length
  }, '提醒请求已记录'));
});

module.exports = router;
