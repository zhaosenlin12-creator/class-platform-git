const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const models = require('../models');
const Response = require('../utils/response');
const { logger } = require('../middleware/logger');
const initTeachingStudentProgress = require('../models/TeachingStudentProgress');
const initTeachingCourseStudent = require('../models/TeachingCourseStudent');

const TeachingStudentProgress = models.sequelize.models.TeachingStudentProgress ||
  initTeachingStudentProgress(models.sequelize);
const TeachingCourseStudent = models.sequelize.models.TeachingCourseStudent ||
  initTeachingCourseStudent(models.sequelize);

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeProgressRatio(value) {
  const numeric = normalizeNumber(value, 0);
  if (numeric <= 0) {
    return 0;
  }
  if (numeric > 1) {
    return Math.min(numeric / 100, 1);
  }
  return Math.min(numeric, 1);
}

function uniqueValues(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function parseDateInput(value, options = {}) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const raw = String(value).trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      options.endOfDay ? 23 : 0,
      options.endOfDay ? 59 : 0,
      options.endOfDay ? 59 : 0,
      options.endOfDay ? 999 : 0
    );
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function normalizeDateRange(startDate, endDate, fallbackDays = 30) {
  const end = parseDateInput(endDate, { endOfDay: true }) || new Date();
  end.setHours(23, 59, 59, 999);

  const start = parseDateInput(startDate) || new Date(end.getTime() - fallbackDays * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function enumerateDateKeys(start, end) {
  const result = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    result.push(formatDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function buildBetweenWhere(field, start, end) {
  return {
    [field]: {
      [Op.gte]: start,
      [Op.lte]: end
    }
  };
}

function getMaxDate(...values) {
  const validDates = values
    .filter(Boolean)
    .map((item) => (item instanceof Date ? item : new Date(item)))
    .filter((item) => !Number.isNaN(item.getTime()));

  if (!validDates.length) {
    return null;
  }

  return validDates.reduce((latest, current) => (current > latest ? current : latest));
}

function buildZeroCourseAnalytics() {
  return {
    overallStats: {
      totalStudyTime: 0,
      activeStudentCount: 0,
      completionRate: 0,
      avgScore: 0
    },
    behaviorDistribution: []
  };
}

function buildEmptyLearningPath() {
  return {
    completionRate: 0,
    completedUnits: 0,
    totalUnits: 0,
    estimatedFinishTime: null,
    learningStyle: 'visual',
    difficultyLevel: 3,
    path: []
  };
}

function buildZeroDashboardPayload() {
  return {
    ...buildZeroCourseAnalytics(),
    trend: [],
    warningsCount: 0,
    rankingCount: 0
  };
}

function getUserIdentity(req) {
  if (typeof auth.getRequestUserIdentity === 'function') {
    return auth.getRequestUserIdentity(req);
  }

  return normalizeNumber(req.user?.userIdentity || req.user?.user_identity, 0);
}

function isAdminRequest(req) {
  return getUserIdentity(req) === 1;
}

async function loadScopedCourses(req, courseId) {
  const where = { del_flag: 0 };
  if (courseId) {
    where.id = courseId;
  }
  if (!isAdminRequest(req)) {
    where.teacher_id = req.user?.id;
  }

  const courses = await models.TeachingCourse.findAll({
    where,
    attributes: ['id', 'course_name', 'teacher_id'],
    raw: true
  });

  return courses;
}

async function loadCourseClassroomRows(courseIds) {
  if (!courseIds.length) {
    return [];
  }

  return models.TeachingClassroom.findAll({
    where: {
      course_id: { [Op.in]: courseIds },
      del_flag: 0
    },
    attributes: ['id', 'course_id', 'course_name'],
    raw: true
  });
}

async function loadCourseHomeworkRows(courseIds) {
  if (!courseIds.length) {
    return [];
  }

  return models.TeachingHomework.findAll({
    where: {
      course_id: { [Op.in]: courseIds },
      del_flag: 0
    },
    attributes: ['id', 'course_id', 'unit_id', 'homework_title', 'difficulty', 'deadline'],
    raw: true
  });
}

async function buildCourseAnalytics(courseIds, start, end) {
  if (!courseIds.length) {
    return buildZeroCourseAnalytics();
  }

  const [classrooms, homeworks, allProgressRows, rangeProgressRows] = await Promise.all([
    loadCourseClassroomRows(courseIds),
    loadCourseHomeworkRows(courseIds),
    TeachingStudentProgress.findAll({
      where: {
        course_id: { [Op.in]: courseIds }
      },
      attributes: ['student_id', 'progress', 'total_duration'],
      raw: true
    }),
    TeachingStudentProgress.findAll({
      where: {
        course_id: { [Op.in]: courseIds },
        ...buildBetweenWhere('last_learn_time', start, end)
      },
      attributes: ['student_id', 'progress', 'last_learn_time', 'total_duration'],
      raw: true
    })
  ]);

  const classroomIds = uniqueValues(classrooms.map((item) => item.id));
  const homeworkIds = uniqueValues(homeworks.map((item) => item.id));

  const [classroomStudentRows, submissionRows] = await Promise.all([
    classroomIds.length
      ? models.TeachingClassroomStudent.findAll({
        where: {
          classroom_id: { [Op.in]: classroomIds },
          ...buildBetweenWhere('join_time', start, end)
        },
        attributes: ['student_id', 'join_time', 'duration'],
        raw: true
      })
      : [],
    homeworkIds.length
      ? models.TeachingHomeworkSubmission.findAll({
        where: {
          homework_id: { [Op.in]: homeworkIds },
          ...buildBetweenWhere('submit_time', start, end)
        },
        attributes: ['student_id', 'score', 'submit_time'],
        raw: true
      })
      : []
  ]);

  const activeStudentIds = uniqueValues([
    ...rangeProgressRows.map((item) => item.student_id),
    ...classroomStudentRows.map((item) => item.student_id),
    ...submissionRows.map((item) => item.student_id)
  ]);

  const totalStudyTime = rangeProgressRows.reduce((sum, item) => sum + normalizeNumber(item.total_duration), 0) +
    classroomStudentRows.reduce((sum, item) => sum + normalizeNumber(item.duration), 0);
  const completionRate = allProgressRows.length
    ? Number((
      allProgressRows.reduce((sum, item) => sum + normalizeProgressRatio(item.progress), 0) /
      allProgressRows.length
    ).toFixed(4))
    : 0;

  const scoredRows = submissionRows
    .map((item) => normalizeNumber(item.score, Number.NaN))
    .filter((item) => Number.isFinite(item));
  const avgScore = scoredRows.length
    ? Number((scoredRows.reduce((sum, item) => sum + item, 0) / scoredRows.length).toFixed(2))
    : 0;

  const behaviorDistribution = [
    { behaviorType: 'study', count: rangeProgressRows.length },
    { behaviorType: 'work', count: submissionRows.length },
    { behaviorType: 'classroom', count: classroomStudentRows.length }
  ].filter((item) => item.count > 0);

  return {
    overallStats: {
      totalStudyTime,
      activeStudentCount: activeStudentIds.length,
      completionRate,
      avgScore
    },
    behaviorDistribution
  };
}

async function loadCourseStudentMap(courseIds) {
  if (!courseIds.length) {
    return new Map();
  }

  const courseStudentRows = await TeachingCourseStudent.findAll({
    where: {
      course_id: { [Op.in]: courseIds }
    },
    attributes: ['course_id', 'student_id'],
    raw: true
  });

  const studentIds = uniqueValues(courseStudentRows.map((item) => item.student_id));
  const students = studentIds.length
    ? await models.TeachingStudent.findAll({
      where: {
        id: { [Op.in]: studentIds },
        del_flag: 0
      },
      attributes: ['id', 'realname'],
      raw: true
    })
    : [];

  return new Map(students.map((item) => [item.id, item.realname]));
}

function inferLearningStyle(unitRows) {
  const counters = {
    visual: 0,
    reading: 0,
    kinesthetic: 0
  };

  (unitRows || []).forEach((unit) => {
    const type = String(unit.content_type || '').toLowerCase();
    if (type.includes('document') || type.includes('pdf') || type.includes('text')) {
      counters.reading += 1;
      return;
    }
    if (type.includes('program') || type.includes('code') || type.includes('practice')) {
      counters.kinesthetic += 1;
      return;
    }
    counters.visual += 1;
  });

  return Object.entries(counters).sort((left, right) => right[1] - left[1])[0][0];
}

function inferDifficultyLevel(avgProgressRatio, avgScore) {
  if (avgScore > 0 && avgScore < 60) {
    return 5;
  }
  if (avgProgressRatio < 0.25) {
    return 5;
  }
  if ((avgScore > 0 && avgScore < 75) || avgProgressRatio < 0.5) {
    return 4;
  }
  if (avgScore >= 90 && avgProgressRatio >= 0.85) {
    return 2;
  }
  return 3;
}

function buildUnitDifficulties(progressRatio, score) {
  const difficulties = [];

  if (progressRatio > 0 && progressRatio < 0.5) {
    difficulties.push('进度推进偏慢');
  }
  if (Number.isFinite(score) && score < 60) {
    difficulties.push('作业得分偏低');
  }

  return difficulties;
}

function sendSafeAnalyticsResponse(res, action, fallbackPayload, error) {
  logger.warn(`[LearningAnalytics] ${action} fallback applied`, {
    error: error && error.message ? error.message : String(error)
  });
  return res.json(Response.success(fallbackPayload));
}

exports.getDashboard = async (req, res) => {
  try {
    const { courseId, startDate, endDate } = req.query;
    const courses = await loadScopedCourses(req, courseId);
    const courseIds = courses.map((item) => item.id);
    const { start, end } = normalizeDateRange(startDate, endDate, 30);

    if (!courseIds.length) {
      return res.json(Response.success(buildZeroDashboardPayload()));
    }

    const [courseAnalytics, warnings, ranking] = await Promise.all([
      buildCourseAnalytics(courseIds, start, end),
      exports.getWarningsData(req, courseIds),
      exports.getActivityRankingData(req, courseIds, normalizeNumber(req.query.limit, 10))
    ]);

    return res.json(Response.success({
      ...courseAnalytics,
      trend: [],
      warningsCount: warnings.length,
      rankingCount: ranking.length
    }));
  } catch (error) {
    return sendSafeAnalyticsResponse(res, 'dashboard', buildZeroDashboardPayload(), error);
  }
};

exports.getCourseAnalytics = async (req, res) => {
  try {
    const { courseId, startDate, endDate } = req.query;
    const courses = await loadScopedCourses(req, courseId);
    const courseIds = courses.map((item) => item.id);
    const { start, end } = normalizeDateRange(startDate, endDate, 30);

    if (!courseIds.length) {
      return res.json(Response.success(buildZeroCourseAnalytics()));
    }

    const payload = await buildCourseAnalytics(courseIds, start, end);
    return res.json(Response.success(payload));
  } catch (error) {
    return sendSafeAnalyticsResponse(res, 'courseAnalytics', buildZeroCourseAnalytics(), error);
  }
};

exports.getLearningTrend = async (req, res) => {
  try {
    const { courseId, days = 30, startDate, endDate } = req.query;
    const courses = await loadScopedCourses(req, courseId);
    const courseIds = courses.map((item) => item.id);
    const { start, end } = normalizeDateRange(startDate, endDate, normalizeNumber(days, 30));

    if (!courseIds.length) {
      return res.json(Response.success({ trend: [] }));
    }

    const dateMap = new Map(enumerateDateKeys(start, end).map((item) => [item, 0]));
    const classrooms = await loadCourseClassroomRows(courseIds);
    const classroomIds = uniqueValues(classrooms.map((item) => item.id));

    const [progressRows, classroomStudentRows] = await Promise.all([
      TeachingStudentProgress.findAll({
        where: {
          course_id: { [Op.in]: courseIds },
          ...buildBetweenWhere('last_learn_time', start, end)
        },
        attributes: ['last_learn_time', 'total_duration'],
        raw: true
      }),
      classroomIds.length
        ? models.TeachingClassroomStudent.findAll({
          where: {
            classroom_id: { [Op.in]: classroomIds },
            ...buildBetweenWhere('join_time', start, end)
          },
          attributes: ['join_time', 'duration'],
          raw: true
        })
        : []
    ]);

    progressRows.forEach((item) => {
      const date = parseDateInput(item.last_learn_time);
      if (!date) {
        return;
      }
      const key = formatDateKey(date);
      dateMap.set(key, normalizeNumber(dateMap.get(key)) + normalizeNumber(item.total_duration));
    });

    classroomStudentRows.forEach((item) => {
      const date = parseDateInput(item.join_time);
      if (!date) {
        return;
      }
      const key = formatDateKey(date);
      dateMap.set(key, normalizeNumber(dateMap.get(key)) + normalizeNumber(item.duration));
    });

    const trend = Array.from(dateMap.entries()).map(([statDate, studyTime]) => ({
      statDate,
      studyTime
    }));

    return res.json(Response.success({ trend }));
  } catch (error) {
    return sendSafeAnalyticsResponse(res, 'learningTrend', { trend: [] }, error);
  }
};

exports.getHeatmap = async (req, res) => {
  try {
    const { courseId, startDate, endDate } = req.query;
    const courses = await loadScopedCourses(req, courseId);
    const courseIds = courses.map((item) => item.id);
    const { start, end } = normalizeDateRange(startDate, endDate, 30);

    if (!courseIds.length) {
      return res.json(Response.success([]));
    }

    const classrooms = await loadCourseClassroomRows(courseIds);
    const classroomIds = uniqueValues(classrooms.map((item) => item.id));

    const [progressRows, classroomStudentRows] = await Promise.all([
      TeachingStudentProgress.findAll({
        where: {
          course_id: { [Op.in]: courseIds },
          ...buildBetweenWhere('last_learn_time', start, end)
        },
        attributes: ['last_learn_time'],
        raw: true
      }),
      classroomIds.length
        ? models.TeachingClassroomStudent.findAll({
          where: {
            classroom_id: { [Op.in]: classroomIds },
            ...buildBetweenWhere('join_time', start, end)
          },
          attributes: ['join_time'],
          raw: true
        })
        : []
    ]);

    const bucketMap = new Map();
    const appendBucket = (input) => {
      const date = parseDateInput(input);
      if (!date) {
        return;
      }
      const hour = `${date.getHours()}`;
      const day = `${date.getDay()}`;
      const key = `${hour}:${day}`;
      bucketMap.set(key, normalizeNumber(bucketMap.get(key)) + 1);
    };

    progressRows.forEach((item) => appendBucket(item.last_learn_time));
    classroomStudentRows.forEach((item) => appendBucket(item.join_time));

    const heatmap = Array.from(bucketMap.entries())
      .map(([key, count]) => {
        const [hour, day] = key.split(':');
        return [hour, normalizeNumber(day), count];
      })
      .sort((left, right) => {
        if (left[1] !== right[1]) {
          return left[1] - right[1];
        }
        return normalizeNumber(left[0]) - normalizeNumber(right[0]);
      });

    return res.json(Response.success(heatmap));
  } catch (error) {
    return sendSafeAnalyticsResponse(res, 'heatmap', [], error);
  }
};

exports.getActivityRankingData = async (req, courseIds, limit = 10) => {
  if (!courseIds.length) {
    return [];
  }

  const classrooms = await loadCourseClassroomRows(courseIds);
  const classroomIds = uniqueValues(classrooms.map((item) => item.id));
  const studentNameMap = await loadCourseStudentMap(courseIds);

  const [progressRows, classroomStudentRows] = await Promise.all([
    TeachingStudentProgress.findAll({
      where: {
        course_id: { [Op.in]: courseIds }
      },
      attributes: ['student_id', 'total_duration'],
      raw: true
    }),
    classroomIds.length
      ? models.TeachingClassroomStudent.findAll({
        where: {
          classroom_id: { [Op.in]: classroomIds }
        },
        attributes: ['student_id', 'duration'],
        raw: true
      })
      : []
  ]);

  const rankingMap = new Map();
  const appendDuration = (studentId, value) => {
    if (!studentId) {
      return;
    }
    rankingMap.set(studentId, normalizeNumber(rankingMap.get(studentId)) + normalizeNumber(value));
  };

  progressRows.forEach((item) => appendDuration(item.student_id, item.total_duration));
  classroomStudentRows.forEach((item) => appendDuration(item.student_id, item.duration));

  if (!rankingMap.size) {
    return [];
  }

  const unknownStudentIds = Array.from(rankingMap.keys()).filter((item) => !studentNameMap.has(item));
  if (unknownStudentIds.length) {
    const extraStudents = await models.TeachingStudent.findAll({
      where: {
        id: { [Op.in]: unknownStudentIds },
        del_flag: 0
      },
      attributes: ['id', 'realname'],
      raw: true
    });

    extraStudents.forEach((item) => {
      studentNameMap.set(item.id, item.realname);
    });
  }

  return Array.from(rankingMap.entries())
    .map(([studentId, studyTime]) => ({
      studentId,
      studentName: studentNameMap.get(studentId) || '未命名学员',
      studyTime: Math.round(studyTime)
    }))
    .sort((left, right) => right.studyTime - left.studyTime)
    .slice(0, limit);
};

exports.getActivityRanking = async (req, res) => {
  try {
    const { courseId, limit = 10 } = req.query;
    const courses = await loadScopedCourses(req, courseId);
    const courseIds = courses.map((item) => item.id);
    const ranking = await exports.getActivityRankingData(req, courseIds, normalizeNumber(limit, 10));
    return res.json(Response.success(ranking));
  } catch (error) {
    return sendSafeAnalyticsResponse(res, 'activityRanking', [], error);
  }
};

exports.getWarningsData = async (req, courseIds) => {
  if (!courseIds.length) {
    return [];
  }

  const [homeworks, unitRows, classrooms, courseStudentRows, progressRows] = await Promise.all([
    loadCourseHomeworkRows(courseIds),
    models.TeachingCourseUnit.findAll({
      where: {
        course_id: { [Op.in]: courseIds },
        del_flag: 0
      },
      attributes: ['course_id', 'id'],
      raw: true
    }),
    loadCourseClassroomRows(courseIds),
    TeachingCourseStudent.findAll({
      where: {
        course_id: { [Op.in]: courseIds }
      },
      attributes: ['student_id'],
      raw: true
    }),
    TeachingStudentProgress.findAll({
      where: {
        course_id: { [Op.in]: courseIds }
      },
      attributes: ['student_id', 'course_id', 'progress', 'last_learn_time', 'unit_id', 'completed'],
      raw: true
    })
  ]);

  const homeworkIds = uniqueValues(homeworks.map((item) => item.id));
  const classroomIds = uniqueValues(classrooms.map((item) => item.id));

  const [submissionRows, classroomStudentRows] = await Promise.all([
    homeworkIds.length
      ? models.TeachingHomeworkSubmission.findAll({
        where: {
          homework_id: { [Op.in]: homeworkIds }
        },
        attributes: ['student_id', 'homework_id', 'submit_time'],
        raw: true
      })
      : [],
    classroomIds.length
      ? models.TeachingClassroomStudent.findAll({
        where: {
          classroom_id: { [Op.in]: classroomIds }
        },
        attributes: ['student_id', 'join_time'],
        raw: true
      })
      : []
  ]);

  const studentIds = uniqueValues([
    ...courseStudentRows.map((item) => item.student_id),
    ...progressRows.map((item) => item.student_id),
    ...submissionRows.map((item) => item.student_id),
    ...classroomStudentRows.map((item) => item.student_id)
  ]);

  if (!studentIds.length) {
    return [];
  }

  const students = await models.TeachingStudent.findAll({
    where: {
      id: { [Op.in]: studentIds },
      del_flag: 0
    },
    attributes: ['id', 'realname'],
    raw: true
  });
  const studentNameMap = new Map(students.map((item) => [item.id, item.realname]));

  const totalUnits = unitRows.length;
  const totalHomework = homeworks.length;
  const inactiveThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const progressByStudent = new Map();
  progressRows.forEach((item) => {
    if (!progressByStudent.has(item.student_id)) {
      progressByStudent.set(item.student_id, []);
    }
    progressByStudent.get(item.student_id).push(item);
  });

  const submissionByStudent = new Map();
  submissionRows.forEach((item) => {
    if (!submissionByStudent.has(item.student_id)) {
      submissionByStudent.set(item.student_id, []);
    }
    submissionByStudent.get(item.student_id).push(item);
  });

  const classroomByStudent = new Map();
  classroomStudentRows.forEach((item) => {
    if (!classroomByStudent.has(item.student_id)) {
      classroomByStudent.set(item.student_id, []);
    }
    classroomByStudent.get(item.student_id).push(item);
  });

  return studentIds
    .map((studentId) => {
      const studentProgress = progressByStudent.get(studentId) || [];
      const studentSubmissions = submissionByStudent.get(studentId) || [];
      const studentClassroom = classroomByStudent.get(studentId) || [];

      const avgProgressRatio = studentProgress.length
        ? studentProgress.reduce((sum, item) => sum + normalizeProgressRatio(item.progress), 0) / studentProgress.length
        : 0;
      const submittedHomeworkCount = new Set(studentSubmissions.map((item) => item.homework_id)).size;
      const latestActivity = getMaxDate(
        ...studentProgress.map((item) => item.last_learn_time),
        ...studentSubmissions.map((item) => item.submit_time),
        ...studentClassroom.map((item) => item.join_time)
      );

      const reasons = [];
      if (!latestActivity || latestActivity < inactiveThreshold) {
        reasons.push('近 7 天未检测到学习活动');
      }
      if (totalUnits > 0 && avgProgressRatio < 0.3) {
        reasons.push('课程进度明显偏低');
      }
      if (totalHomework > 0 && submittedHomeworkCount / totalHomework < 0.5) {
        reasons.push('作业完成率偏低');
      }

      if (!reasons.length) {
        return null;
      }

      return {
        id: `${studentId}-warning`,
        title: `${studentNameMap.get(studentId) || '学员'} 需要关注`,
        message: reasons.join('；'),
        level: reasons.length >= 2 ? 3 : 2,
        latestActivity: latestActivity ? latestActivity.toISOString() : null
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.level !== right.level) {
        return right.level - left.level;
      }
      const leftTime = left.latestActivity ? new Date(left.latestActivity).getTime() : 0;
      const rightTime = right.latestActivity ? new Date(right.latestActivity).getTime() : 0;
      return leftTime - rightTime;
    })
    .slice(0, 10);
};

exports.getWarnings = async (req, res) => {
  try {
    const { courseId } = req.query;
    const courses = await loadScopedCourses(req, courseId);
    const courseIds = courses.map((item) => item.id);
    const warnings = await exports.getWarningsData(req, courseIds);
    return res.json(Response.success(warnings));
  } catch (error) {
    return sendSafeAnalyticsResponse(res, 'warnings', [], error);
  }
};

exports.getLearningPath = async (req, res) => {
  try {
    const studentId = req.query.userId || req.query.studentId;
    const courseId = req.query.courseId;

    if (!studentId || !courseId) {
      return res.json(Response.success(buildEmptyLearningPath()));
    }

    const courses = await loadScopedCourses(req, courseId);
    if (!courses.length) {
      return res.json(Response.success(buildEmptyLearningPath()));
    }

    const [unitRows, progressRows, homeworks] = await Promise.all([
      models.TeachingCourseUnit.findAll({
        where: {
          course_id: courseId,
          del_flag: 0
        },
        order: [['sort_no', 'ASC'], ['unit_no', 'ASC'], ['create_time', 'ASC']],
        attributes: ['id', 'unit_name', 'content_type', 'duration'],
        raw: true
      }),
      TeachingStudentProgress.findAll({
        where: {
          student_id: studentId,
          course_id: courseId
        },
        order: [['update_time', 'DESC']],
        attributes: ['unit_id', 'progress', 'completed', 'last_learn_time', 'total_duration'],
        raw: true
      }),
      models.TeachingHomework.findAll({
        where: {
          course_id: courseId,
          del_flag: 0
        },
        attributes: ['id', 'unit_id', 'difficulty'],
        raw: true
      })
    ]);

    const homeworkIds = uniqueValues(homeworks.map((item) => item.id));
    const homeworkScoreRows = homeworkIds.length
      ? await models.TeachingHomeworkSubmission.findAll({
        where: {
          student_id: studentId,
          homework_id: { [Op.in]: homeworkIds }
        },
        attributes: ['homework_id', 'score'],
        raw: true
      })
      : [];

    const homeworkMap = new Map(homeworks.map((item) => [item.id, item]));
    const scoresByUnit = new Map();
    homeworkScoreRows.forEach((item) => {
      const homework = homeworkMap.get(item.homework_id);
      if (!homework || !homework.unit_id) {
        return;
      }
      if (!scoresByUnit.has(homework.unit_id)) {
        scoresByUnit.set(homework.unit_id, []);
      }
      const score = normalizeNumber(item.score, Number.NaN);
      if (Number.isFinite(score)) {
        scoresByUnit.get(homework.unit_id).push(score);
      }
    });

    const progressByUnit = new Map();
    progressRows.forEach((item) => {
      if (!item.unit_id) {
        return;
      }

      const existing = progressByUnit.get(item.unit_id);
      if (!existing) {
        progressByUnit.set(item.unit_id, item);
        return;
      }

      const existingTime = parseDateInput(existing.last_learn_time);
      const currentTime = parseDateInput(item.last_learn_time);
      if (!existingTime || (currentTime && currentTime > existingTime)) {
        progressByUnit.set(item.unit_id, item);
      }
    });

    const totalUnits = unitRows.length;
    const completedUnits = unitRows.filter((unit) => {
      const progress = progressByUnit.get(unit.id);
      return progress && (normalizeNumber(progress.completed) === 1 || normalizeProgressRatio(progress.progress) >= 1);
    }).length;

    let currentNodeAssigned = false;
    const path = unitRows.map((unit, index) => {
      const progress = progressByUnit.get(unit.id);
      const progressRatio = progress ? normalizeProgressRatio(progress.progress) : 0;
      const scoreList = scoresByUnit.get(unit.id) || [];
      const score = scoreList.length
        ? Number((scoreList.reduce((sum, item) => sum + item, 0) / scoreList.length).toFixed(1))
        : null;

      let status = 'pending';
      if (progress && (normalizeNumber(progress.completed) === 1 || progressRatio >= 1)) {
        status = 'completed';
      } else if (progressRatio > 0 && !currentNodeAssigned) {
        status = 'current';
        currentNodeAssigned = true;
      } else {
        const hasCompletedBefore = unitRows.slice(0, index).some((previousUnit) => {
          const previousProgress = progressByUnit.get(previousUnit.id);
          return previousProgress && (normalizeNumber(previousProgress.completed) === 1 || normalizeProgressRatio(previousProgress.progress) >= 1);
        });
        if (hasCompletedBefore && status === 'pending' && !currentNodeAssigned) {
          status = 'current';
          currentNodeAssigned = true;
        }
      }

      return {
        unitId: unit.id,
        unitName: unit.unit_name,
        title: unit.unit_name,
        status,
        startTime: progress ? progress.last_learn_time : null,
        duration: progress ? normalizeNumber(progress.total_duration) : normalizeNumber(unit.duration),
        score,
        difficulties: buildUnitDifficulties(progressRatio, score)
      };
    });

    const progressRatios = unitRows.map((unit) => {
      const progress = progressByUnit.get(unit.id);
      return progress ? normalizeProgressRatio(progress.progress) : 0;
    });
    const avgProgressRatio = progressRatios.length
      ? progressRatios.reduce((sum, item) => sum + item, 0) / progressRatios.length
      : 0;

    const allScores = Array.from(scoresByUnit.values()).flat();
    const avgScore = allScores.length
      ? allScores.reduce((sum, item) => sum + item, 0) / allScores.length
      : 0;

    const totalDuration = progressRows.reduce((sum, item) => sum + normalizeNumber(item.total_duration), 0);
    const remainingUnits = Math.max(totalUnits - completedUnits, 0);
    const averageMinutesPerCompletedUnit = completedUnits > 0
      ? totalDuration / completedUnits
      : 120;
    const estimatedRemainingDays = remainingUnits > 0
      ? Math.max(1, Math.ceil((remainingUnits * Math.max(averageMinutesPerCompletedUnit, 60)) / 180))
      : 0;
    const estimatedFinishTime = estimatedRemainingDays > 0
      ? new Date(Date.now() + estimatedRemainingDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    return res.json(Response.success({
      completionRate: totalUnits > 0 ? Number((completedUnits / totalUnits).toFixed(4)) : 0,
      completedUnits,
      totalUnits,
      estimatedFinishTime,
      learningStyle: inferLearningStyle(unitRows),
      difficultyLevel: inferDifficultyLevel(avgProgressRatio, avgScore),
      path
    }));
  } catch (error) {
    return sendSafeAnalyticsResponse(res, 'learningPath', buildEmptyLearningPath(), error);
  }
};
