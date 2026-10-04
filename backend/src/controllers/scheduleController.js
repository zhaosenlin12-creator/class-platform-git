const { Op } = require('sequelize');
const { logger } = require('../middleware/logger');
const Response = require('../utils/response');
const models = require('../models');
const uuidUtil = require('../utils/uuid');

function formatDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeLabel(value) {
  if (!value) {
    return '';
  }

  if (/^\d{2}:\d{2}$/.test(String(value))) {
    return String(value);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function buildDateTime(date, hours, minutes) {
  const value = new Date(date);
  value.setHours(hours, minutes, 0, 0);
  return value.toISOString();
}

function buildBaseScheduleRecords() {
  const today = new Date();

  return [
    {
      id: '1',
      title: 'Python基础编程',
      courseName: 'Python基础编程',
      className: '一年级1班',
      startTime: buildDateTime(today, 9, 0),
      endTime: buildDateTime(today, 10, 30),
      duration: 90,
      status: 'scheduled',
      teacherName: '张老师',
      studentCount: 30,
      location: '机房A'
    },
    {
      id: '2',
      title: 'Scratch创意编程',
      courseName: 'Scratch创意编程',
      className: '一年级2班',
      startTime: buildDateTime(today, 14, 0),
      endTime: buildDateTime(today, 15, 30),
      duration: 90,
      status: 'active',
      teacherName: '李老师',
      studentCount: 28,
      location: '机房B'
    }
  ];
}

function buildTodayScheduleRecords() {
  const today = new Date();
  const todayKey = formatDateKey(today);

  return [
    {
      id: '1',
      title: 'Python基础编程',
      courseName: 'Python基础编程',
      className: '一年级1班',
      date: todayKey,
      startTime: '09:00',
      endTime: '10:30',
      time: '09:00 - 10:30',
      status: 'completed',
      studentCount: 30,
      students: 30
    },
    {
      id: '2',
      title: 'Scratch创意编程',
      courseName: 'Scratch创意编程',
      className: '一年级2班',
      date: todayKey,
      startTime: '14:00',
      endTime: '15:30',
      time: '14:00 - 15:30',
      status: 'active',
      studentCount: 28,
      students: 28
    },
    {
      id: '3',
      title: 'JavaScript入门',
      courseName: 'JavaScript入门',
      className: '二年级1班',
      date: todayKey,
      startTime: '16:00',
      endTime: '17:30',
      time: '16:00 - 17:30',
      status: 'scheduled',
      studentCount: 25,
      students: 25
    }
  ];
}

function buildWeekScheduleRecords() {
  const today = new Date();
  const dayIndex = today.getDay() === 0 ? 7 : today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayIndex - 1));
  monday.setHours(0, 0, 0, 0);

  const labels = ['周一', '周二', '周三', '周四', '周五'];
  const items = [
    [
      { id: '1', courseName: 'Python基础', startTime: '09:00', className: '一年级1班' },
      { id: '2', courseName: 'Scratch', startTime: '14:00', className: '一年级2班' }
    ],
    [
      { id: '3', courseName: 'JavaScript', startTime: '10:00', className: '二年级1班' }
    ],
    [],
    [
      { id: '4', courseName: 'Python进阶', startTime: '09:00', className: '三年级1班' }
    ],
    [
      { id: '5', courseName: 'HTML/CSS', startTime: '14:00', className: '二年级2班' }
    ]
  ];

  return labels.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      date: formatDateKey(date),
      dayOfWeek: label,
      schedules: items[index]
    };
  });
}

function mapScheduleStatus(baseStatus, classroomStatus) {
  const normalizedClassroomStatus = String(classroomStatus || '').toLowerCase();
  if (normalizedClassroomStatus === 'active') {
    return 'active';
  }
  if (normalizedClassroomStatus === 'ended') {
    return 'completed';
  }
  if (normalizedClassroomStatus === 'cancelled') {
    return 'cancelled';
  }

  const normalizedBaseStatus = String(baseStatus || '').toLowerCase();
  if (normalizedBaseStatus === 'in_progress') {
    return 'active';
  }

  return normalizedBaseStatus || 'scheduled';
}

async function loadClassroomMap(scheduleIds) {
  const normalizedIds = Array.from(new Set((scheduleIds || []).filter(Boolean).map(value => String(value))));
  if (normalizedIds.length === 0) {
    return new Map();
  }

  try {
    const classrooms = await models.TeachingClassroom.findAll({
      where: {
        lesson_id: { [Op.in]: normalizedIds },
        del_flag: 0
      },
      order: [['update_time', 'DESC'], ['create_time', 'DESC']]
    });

    const map = new Map();
    classrooms.forEach(item => {
      const key = String(item.lesson_id || '');
      if (!key || map.has(key)) {
        return;
      }
      map.set(key, item.get({ plain: true }));
    });

    return map;
  } catch (error) {
    logger.warn('[schedule] load classroom map failed:', error.message);
    return new Map();
  }
}

function normalizeScheduleRecord(record, classroomMap = new Map()) {
  const classroom = classroomMap.get(String(record.id));
  const startTime = record.startTime || record.start_time || '';
  const endTime = record.endTime || record.end_time || '';
  const normalizedStudentCount = Number(record.students ?? record.studentCount ?? 0) || 0;
  const classroomId = classroom && classroom.id ? classroom.id : (record.classroomId || record.classroom_id || null);
  const date = record.date || formatDateKey(startTime);
  const time = record.time || [formatTimeLabel(startTime), formatTimeLabel(endTime)].filter(Boolean).join(' - ');

  return {
    ...record,
    title: record.title || record.courseName || '未命名课程',
    courseName: record.courseName || record.title || '未命名课程',
    date,
    time,
    students: normalizedStudentCount,
    studentCount: normalizedStudentCount,
    classroomId,
    classroom_id: classroomId,
    status: mapScheduleStatus(record.status, classroom && classroom.status),
    actualStartTime: classroom && classroom.start_time ? classroom.start_time : (record.actualStartTime || null),
    actualEndTime: classroom && classroom.end_time ? classroom.end_time : (record.actualEndTime || null)
  };
}

exports.getScheduleList = async (req, res) => {
  try {
    const { pageNo = 1, pageSize = 10, courseName, status } = req.query;
    const classroomMap = await loadClassroomMap(buildBaseScheduleRecords().map(item => item.id));

    let schedules = buildBaseScheduleRecords().map(item => normalizeScheduleRecord(item, classroomMap));

    if (courseName) {
      const keyword = String(courseName).trim().toLowerCase();
      schedules = schedules.filter(item => String(item.courseName || '').toLowerCase().includes(keyword));
    }

    if (status) {
      const normalizedStatus = String(status).trim().toLowerCase();
      schedules = schedules.filter(item => String(item.status || '').toLowerCase() === normalizedStatus);
    }

    res.json(Response.success({
      records: schedules,
      total: schedules.length,
      size: Number(pageSize),
      current: Number(pageNo),
      pages: 1
    }));
  } catch (error) {
    logger.error('获取课程安排列表失败:', error);
    res.status(500).json(Response.error('获取课程安排列表失败'));
  }
};

exports.getTodaySchedule = async (req, res) => {
  try {
    const classroomMap = await loadClassroomMap(buildTodayScheduleRecords().map(item => item.id));
    const schedules = buildTodayScheduleRecords().map(item => normalizeScheduleRecord(item, classroomMap));

    res.json(Response.success(schedules));
  } catch (error) {
    logger.error('获取今日课程安排失败:', error);
    res.status(500).json(Response.error('获取今日课程安排失败'));
  }
};

exports.getWeekSchedule = async (req, res) => {
  try {
    res.json(Response.success(buildWeekScheduleRecords()));
  } catch (error) {
    logger.error('获取本周课程安排失败:', error);
    res.status(500).json(Response.error('获取本周课程安排失败'));
  }
};

exports.getScheduleCalendar = async (req, res) => {
  try {
    const { year, month } = req.query;
    const weekSchedules = buildWeekScheduleRecords();
    const calendar = {
      year: Number(year) || new Date().getFullYear(),
      month: Number(month) || new Date().getMonth() + 1,
      schedules: weekSchedules
        .filter(item => item.schedules.length > 0)
        .map(item => ({
          date: item.date,
          count: item.schedules.length,
          status: item.schedules.length >= 3 ? 'busy' : 'normal'
        }))
    };

    res.json(Response.success(calendar));
  } catch (error) {
    logger.error('获取课程日历失败:', error);
    res.status(500).json(Response.error('获取课程日历失败'));
  }
};

exports.getTeacherSchedule = async (req, res) => {
  try {
    const { teacherId } = req.params;

    res.json(Response.success({
      schedules: [],
      total: 0,
      teacherId,
      message: '获取教师课程表成功'
    }));
  } catch (error) {
    logger.error('获取教师课程表失败:', error);
    res.status(500).json(Response.error('获取教师课程表失败'));
  }
};

exports.getClassSchedule = async (req, res) => {
  try {
    const { classId } = req.params;

    res.json(Response.success({
      schedules: [],
      total: 0,
      classId,
      message: '获取班级课程表成功'
    }));
  } catch (error) {
    logger.error('获取班级课程表失败:', error);
    res.status(500).json(Response.error('获取班级课程表失败'));
  }
};

exports.getScheduleStatistics = async (req, res) => {
  try {
    const todayRecords = buildTodayScheduleRecords();
    const totalStudents = todayRecords.reduce((sum, item) => sum + Number(item.studentCount || 0), 0);
    const completedLessons = todayRecords.filter(item => item.status === 'completed').length;

    const statistics = {
      totalSchedules: 156,
      completedSchedules: 98,
      upcomingSchedules: 45,
      cancelledSchedules: 13,
      completionRate: 0.85,
      averageDuration: 85,
      totalTeachingHours: 234,
      totalLessons: todayRecords.length,
      completedLessons,
      totalStudents
    };

    res.json(Response.success(statistics));
  } catch (error) {
    logger.error('获取课程统计失败:', error);
    res.status(500).json(Response.error('获取课程统计失败'));
  }
};

exports.getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;
    const classroomMap = await loadClassroomMap([id]);

    const schedule = normalizeScheduleRecord({
      id,
      title: 'Python基础编程',
      courseName: 'Python基础编程',
      courseId: 'course_001',
      className: '一年级1班',
      classId: 'class_001',
      teacherName: '张老师',
      teacherId: 'teacher_001',
      startTime: buildDateTime(new Date(), 9, 0),
      endTime: buildDateTime(new Date(), 10, 30),
      duration: 90,
      status: 'scheduled',
      location: '机房A',
      studentCount: 30,
      description: '本节课将学习 Python 的基础语法',
      materials: ['Python教程.pdf', '示例代码.py']
    }, classroomMap);

    res.json(Response.success(schedule));
  } catch (error) {
    logger.error('获取课程安排详情失败:', error);
    res.status(500).json(Response.error('获取课程安排详情失败'));
  }
};

exports.createSchedule = async (req, res) => {
  try {
    const scheduleData = req.body || {};

    logger.info('创建课程安排:', scheduleData);

    const newSchedule = normalizeScheduleRecord({
      id: `schedule_${Date.now()}`,
      ...scheduleData,
      title: scheduleData.title || scheduleData.courseName || '未命名课程',
      courseName: scheduleData.courseName || scheduleData.title || '未命名课程',
      status: 'scheduled',
      createTime: new Date().toISOString()
    });

    res.json(Response.success(newSchedule, '课程安排创建成功'));
  } catch (error) {
    logger.error('创建课程安排失败:', error);
    res.status(500).json(Response.error('创建课程安排失败'));
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const scheduleData = req.body || {};

    logger.info('更新课程安排:', scheduleData);

    res.json(Response.success(scheduleData, '课程安排更新成功'));
  } catch (error) {
    logger.error('更新课程安排失败:', error);
    res.status(500).json(Response.error('更新课程安排失败'));
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('删除课程安排:', id);

    res.json(Response.success(null, '课程安排删除成功'));
  } catch (error) {
    logger.error('删除课程安排失败:', error);
    res.status(500).json(Response.error('删除课程安排失败'));
  }
};

exports.startSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const body = req.body || {};
    const teacherId = req.user?.id || null;
    const teacherName = req.user?.realname || req.user?.username || '教师';

    logger.info('开始课程:', { scheduleId, teacherId });

    let classroom = await models.TeachingClassroom.findOne({
      where: {
        lesson_id: String(scheduleId),
        del_flag: 0
      },
      order: [['update_time', 'DESC'], ['create_time', 'DESC']]
    });

    if (!classroom) {
      const classroomName = body.classroomName || body.title || body.courseName || `课程课堂-${scheduleId}`;
      const now = new Date();

      classroom = await models.TeachingClassroom.create({
        id: uuidUtil.generate(),
        classroom_name: classroomName,
        classroom_code: uuidUtil.generate().substring(0, 8),
        class_id: body.classId || null,
        teacher_id: teacherId,
        teacher_name: teacherName,
        course_id: body.courseId || null,
        course_name: body.courseName || body.title || classroomName,
        lesson_id: String(scheduleId),
        lesson_name: body.lessonName || body.title || null,
        start_time: body.startTime || now,
        end_time: body.endTime || null,
        duration: Number(body.duration || 90) || 90,
        status: 'active',
        max_students: Number(body.maxStudents || 50) || 50,
        current_students: 0,
        description: body.description || `schedule:${scheduleId}`,
        del_flag: 0,
        create_time: now,
        update_time: now
      });
    } else if (classroom.status !== 'active') {
      await classroom.update({
        status: 'active',
        start_time: classroom.start_time || new Date(),
        update_time: new Date()
      });
    }

    const result = {
      scheduleId,
      classroomId: classroom.id,
      classroomName: classroom.classroom_name,
      status: 'active',
      startTime: classroom.start_time || new Date().toISOString()
    };

    logger.info('课程开始成功:', result);
    res.json(Response.success(result, '课程开始成功'));
  } catch (error) {
    logger.error('开始课程失败:', error);
    res.status(500).json(Response.error(`开始课程失败: ${error.message}`));
  }
};

exports.completeSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const completionData = req.body || {};

    logger.info('完成课程:', { scheduleId, completionData });

    const classroom = await models.TeachingClassroom.findOne({
      where: {
        lesson_id: String(scheduleId),
        del_flag: 0
      },
      order: [['update_time', 'DESC'], ['create_time', 'DESC']]
    });

    if (classroom && classroom.status !== 'ended') {
      await classroom.update({
        status: 'ended',
        end_time: completionData.endTime || new Date(),
        update_time: new Date()
      });
    }

    const result = {
      scheduleId,
      classroomId: classroom ? classroom.id : null,
      status: 'completed',
      endTime: completionData.endTime || new Date().toISOString(),
      ...completionData
    };

    res.json(Response.success(result, '课程完成记录已保存'));
  } catch (error) {
    logger.error('完成课程失败:', error);
    res.status(500).json(Response.error('完成课程失败'));
  }
};

exports.cancelSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { reason } = req.body || {};

    logger.info('取消课程:', { scheduleId, reason });

    const classroom = await models.TeachingClassroom.findOne({
      where: {
        lesson_id: String(scheduleId),
        del_flag: 0
      },
      order: [['update_time', 'DESC'], ['create_time', 'DESC']]
    });

    if (classroom && classroom.status !== 'ended') {
      await classroom.update({
        status: 'cancelled',
        update_time: new Date()
      });
    }

    res.json(Response.success(null, '课程已取消'));
  } catch (error) {
    logger.error('取消课程失败:', error);
    res.status(500).json(Response.error('取消课程失败'));
  }
};
