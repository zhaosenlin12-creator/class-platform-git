/**
 * 璇惧爞绠＄悊鎺у埗鍣?
 * 澶勭悊鍦ㄧ嚎鏁欏鐨勫垱寤恒€佸鐢熺鐞嗙瓑
 */

const models = require('../models');
const Response = require('../utils/response');
const uuidUtil = require('../utils/uuid');
const { Op } = require('sequelize');
const { getIO } = require('../socketServer');
const { logger } = require('../middleware/logger');
const {
  ACCESS_ROLE,
  ensureClassroomAccess,
  ensureRequestRole,
  sendClassroomAccessError
} = require('../utils/classroomAccess');
const {
  filterTeachingClassroomPayload,
  getTeachingClassroomSelectableAttributes
} = require('../utils/classroomSchema');
const { getTeachingCourseSelectableAttributes } = require('../utils/courseSchema');
const { getTeachingCourseUnitSelectableAttributes } = require('../utils/courseUnitSchema');
const { getTeachingResourceSelectableAttributes } = require('../utils/resourceSchema');
const avatarUtil = require('../utils/avatar');

const CHAT_HISTORY_BASE_COLUMNS = [
  'id',
  'classroom_id',
  'user_id',
  'user_name',
  'user_role',
  'message_type',
  'content',
  'avatar',
  'del_flag',
  'create_time'
];

const CHAT_HISTORY_OPTIONAL_COLUMNS = ['file_name', 'file_size', 'file_type', 'file_url'];
let cachedChatHistoryColumns = null;

function getCandidateStudentIds(access) {
  return Array.isArray(access && access.candidateStudentIds)
    ? access.candidateStudentIds
    : [];
}

function getResolvedStudentId(access) {
  if (access && access.user && access.user.studentId) {
    return String(access.user.studentId);
  }

  const candidateStudentIds = getCandidateStudentIds(access);
  return candidateStudentIds.length > 0 ? String(candidateStudentIds[0]) : null;
}

function getRequestClassroomId(req) {
  return (req && req.params && (req.params.classroomId || req.params.id)) || null;
}

function buildClassroomResourcePreviewPath(classroomId, resourceId) {
  if (!classroomId || !resourceId) {
    return null;
  }

  return `/api/teaching/classroom/classrooms/${encodeURIComponent(classroomId)}/resources/${encodeURIComponent(resourceId)}/preview`;
}

function buildClassroomResourceDownloadPath(classroomId, resourceId) {
  if (!classroomId || !resourceId) {
    return null;
  }

  return `/api/teaching/classroom/classrooms/${encodeURIComponent(classroomId)}/resources/${encodeURIComponent(resourceId)}/download`;
}

async function getChatHistoryColumns() {
  if (Array.isArray(cachedChatHistoryColumns) && cachedChatHistoryColumns.length > 0) {
    return cachedChatHistoryColumns;
  }

  try {
    const tableSchema = await models.sequelize.getQueryInterface().describeTable('teaching_classroom_chat');
    const existingColumns = new Set(Object.keys(tableSchema || {}));
    const columns = [
      ...CHAT_HISTORY_BASE_COLUMNS.filter(col => existingColumns.has(col)),
      ...CHAT_HISTORY_OPTIONAL_COLUMNS.filter(col => existingColumns.has(col))
    ];

    cachedChatHistoryColumns = columns.length > 0 ? columns : CHAT_HISTORY_BASE_COLUMNS;
    return cachedChatHistoryColumns;
  } catch (error) {
    logger.warn('鈿狅笍 [CHAT HISTORY] 璇诲彇琛ㄧ粨鏋勫け璐ワ紝鍥為€€鍒板熀纭€瀛楁鏌ヨ:', error.message);
    cachedChatHistoryColumns = CHAT_HISTORY_BASE_COLUMNS;
    return cachedChatHistoryColumns;
  }
}

/**
 * 鑾峰彇鏁欏鍒楄〃
 * GET /classroom/classrooms
 */
exports.getClassroomList = async (req, res, next) => {
  try {
    const classroomAttributes = await getTeachingClassroomSelectableAttributes();
    const roleCheck = ensureRequestRole(req, { teacherOnly: true });
    if (!roleCheck.ok) {
      return sendClassroomAccessError(res, roleCheck);
    }
    const { 
      pageNo = 1, 
      pageSize = 10,
      status,
      teacherId,
      classId  // 鏂板锛氭寜鐝骇ID杩囨护
    } = req.query;
    
    const where = { del_flag: 0 };
    
    if (status) {
      where.status = status;
    }
    
    const requestTeacherId = roleCheck.user.userId || req.user?.id || null;
    if (roleCheck.accessRole === ACCESS_ROLE.teacher) {
      where.teacher_id = requestTeacherId || '__no_match__';
    } else if (teacherId) {
      where.teacher_id = teacherId;
    }
    
    if (classId) {
      where.class_id = classId;
      logger.debug('Filter classroom list by class', { classId });
    }
    
    const limit = parseInt(pageSize);
    const offset = (parseInt(pageNo) - 1) * limit;
    
    const { count, rows } = await models.TeachingClassroom.findAndCountAll({
      where,
      attributes: classroomAttributes,
      limit,
      offset,
      order: [['create_time', 'DESC']]
    });
    
    // 鑾峰彇鎵€鏈夌彮绾т俊鎭敤浜庡叧鑱旀樉绀虹彮绾у悕绉?
    const classIds = [...new Set(rows.map(r => r.class_id).filter(Boolean))];
    let classMap = {};
    if (classIds.length > 0) {
      const classes = await models.TeachingClass.findAll({
        where: { id: classIds },
        attributes: ['id', 'class_name']
      });
      classMap = classes.reduce((acc, c) => {
        acc[c.id] = c.class_name;
        return acc;
      }, {});
    }
    
    const records = rows.map(row => {
      const plain = row.get({ plain: true });
      const subject = plain.subject || plain.course_name || plain.selected_language || '缁煎悎璇剧▼';
      const resourceUrl = plain.resource_url || buildClassroomResourcePreviewPath(plain.id, plain.resource_id);
      
      // 鍔ㄦ€佽绠楄鍫傜姸鎬?
      let computedStatus = plain.status;
      if (plain.start_time) {
        const startTime = new Date(plain.start_time);
        const duration = plain.duration || 120; // 榛樿120鍒嗛挓
        const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
        const now = new Date();
        
        // 銆愬叧閿慨澶嶃€戞鏌ユ墍鏈夐潪ended鐘舵€佺殑璇惧爞鏄惁搴旇鑷姩缁撴潫
        if (plain.status !== 'ended' && plain.status !== 'archived' && now > endTime) {
          computedStatus = 'ended';
          // 寮傛鏇存柊鏁版嵁搴撶姸鎬侊紙涓嶉樆濉炲搷搴旓級
          models.TeachingClassroom.update(
            { status: 'ended', end_time: endTime },
            { where: { id: plain.id } }
          ).catch(err => logger.error('Update classroom status failed', { error: err.message, stack: err.stack, classroomId: plain.id }));
        }
        // 濡傛灉宸插埌寮€濮嬫椂闂翠絾鐘舵€佽繕鏄痵cheduled锛岃嚜鍔ㄥ彉涓篴ctive
        else if (plain.status === 'scheduled' && now >= startTime && now <= endTime) {
          computedStatus = 'active';
          // 寮傛鏇存柊鏁版嵁搴撶姸鎬?
          models.TeachingClassroom.update(
            { status: 'active' },
            { where: { id: plain.id } }
          ).catch(err => logger.error('Update classroom status failed', { error: err.message, stack: err.stack, classroomId: plain.id }));
        }
      }
      
      return {
        id: plain.id,
        classroomName: plain.classroom_name,
        roomName: plain.classroom_name,
        classroomCode: plain.classroom_code,
        title: plain.classroom_name,
        subject,
        classId: plain.class_id,
        className: classMap[plain.class_id] || null,
        courseId: plain.course_id,
        courseName: plain.course_name,
        lessonId: plain.lesson_id,
        lessonName: plain.lesson_name,
        resourceId: plain.resource_id,
        resourceName: plain.resource_name,
        resourceUrl,
        contentType: plain.content_type,
        selectedLanguage: plain.selected_language,
        teacherId: plain.teacher_id,
        teacherName: plain.teacher_name,
        startTime: plain.start_time,
        endTime: plain.end_time,
        duration: plain.duration || 120,
        status: computedStatus,
        maxStudents: plain.max_students,
        currentStudents: plain.current_students,
        description: plain.description,
        createTime: plain.create_time,
        updateTime: plain.update_time
      };
    });
    
    res.json(Response.page(records, count, pageNo, pageSize));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 鑾峰彇璇惧爞璇︽儏
 * GET /classroom/classrooms/:id
 */
exports.getClassroomDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const classroomAttributes = await getTeachingClassroomSelectableAttributes();
    const courseAttributes = await getTeachingCourseSelectableAttributes();
    const lessonAttributes = await getTeachingCourseUnitSelectableAttributes();
    const resourceAttributes = await getTeachingResourceSelectableAttributes();
    if (!id) {
      return res.json(Response.error('璇惧爞ID涓嶈兘涓虹┖', 400));
    }

    const classroom = await models.TeachingClassroom.findOne({
      where: { id, del_flag: 0 },
      attributes: classroomAttributes
    });

    if (!classroom) {
      return res.json(Response.error('Classroom not found', 404));
    }

    const plain = classroom.get({ plain: true });

    const course = plain.course_id
      ? await models.TeachingCourse.findOne({
          where: { id: plain.course_id, del_flag: 0 },
          attributes: courseAttributes,
          raw: true
        })
      : null;

    const lesson = plain.lesson_id
      ? await models.TeachingCourseUnit.findOne({
          where: { id: plain.lesson_id, del_flag: 0 },
          attributes: lessonAttributes,
          raw: true
        })
      : null;

    // 浼樺厛浣跨敤璇惧爞鐩存帴鍏宠仈鐨勮祫婧愶紝鍚﹀垯浣跨敤璇捐妭鍏宠仈鐨勮祫婧?
    const resourceId = plain.resource_id || (lesson && lesson.resource_id);
    const resource = resourceId
      ? await models.TeachingResource.findOne({
          where: { id: resourceId, del_flag: 0 },
          attributes: resourceAttributes,
          raw: true
        })
      : null;

    const resourceUrl = plain.resource_url || buildClassroomResourcePreviewPath(plain.id, resourceId);
    const subject = course?.category || plain.course_name || plain.selected_language || '缁煎悎璇剧▼';
    const classroomResourcePreviewUrl = buildClassroomResourcePreviewPath(plain.id, resourceId);
    const classroomResourceDownloadUrl = buildClassroomResourceDownloadPath(plain.id, resourceId);

    const normalizedSelectedLanguage = (() => {
      const typeCandidates = [
        plain.content_type,
        lesson && lesson.content_type,
        resource && resource.resource_type
      ];

      const isAiPackageClassroom = typeCandidates.some((value) => {
        const normalizedValue = String(value || '').trim().toLowerCase();
        return ['ai_package', 'ai-resource', 'ai_resource'].includes(normalizedValue);
      });

      return isAiPackageClassroom ? 'ai_package' : plain.selected_language;
    })();

    const detail = {
      id: plain.id,
      classroomName: plain.classroom_name,
      roomName: plain.classroom_name,
      classroomCode: plain.classroom_code,
      classId: plain.class_id,
      courseId: plain.course_id,
      courseName: plain.course_name,
      lessonId: plain.lesson_id,
      lessonName: plain.lesson_name,
      resourceId,
      resourceName: plain.resource_name || (resource && resource.resource_name) || (lesson && lesson.resource_name) || null,
      resourceUrl,
      contentType: plain.content_type,
      selectedLanguage: normalizedSelectedLanguage,
      teacherId: plain.teacher_id,
      teacherName: plain.teacher_name,
      startTime: plain.start_time,
      endTime: plain.end_time,
      duration: plain.duration,
      status: plain.status,
      maxStudents: plain.max_students,
      currentStudents: plain.current_students,
      description: plain.description,
      createTime: plain.create_time,
      subject,
      updateTime: plain.update_time,
      course: course ? {
        id: course.id,
        courseName: course.course_name,
        courseCode: course.course_code,
        subject: course.category,
        level: course.level,
        cover: course.cover
      } : null,
      lesson: lesson ? {
        id: lesson.id,
        unitName: lesson.unit_name,
        unitNo: lesson.unit_no,
        duration: lesson.duration,
        contentType: lesson.content_type,
        contentUrl: lesson.content_url || classroomResourcePreviewUrl,
        resourceId: lesson.resource_id,
        resourceName: lesson.resource_name,
        resourceUrl: lesson.resource_id ? buildClassroomResourcePreviewPath(plain.id, lesson.resource_id) : null,
        description: lesson.description
      } : null,
      resource: resource ? {
        id: resource.id,
        name: resource.resource_name,
        type: resource.resource_type,
        size: resource.file_size,
        format: resource.file_extension,
        mimeType: resource.mime_type,
        fileUrl: resource.file_url,  // OSS鎴栨湰鍦版枃浠禪RL
        storageType: resource.storage_type || 'local',
        downloadUrl: classroomResourceDownloadUrl,
        previewUrl: classroomResourcePreviewUrl
      } : null
    };

    res.json(Response.success(detail));

  } catch (error) {
    next(error);
  }
};

/**
 * 鍒涘缓鏁欏
 * POST /classroom/classrooms/create
 */
exports.createClassroom = async (req, res, next) => {
  try {
    const {
      classroomName,
      roomName,
      title,
      classroomCode,
      classId,
      courseId,
      courseName,
      lessonId,
      lessonName,
      resourceId,
      resourceName,
      resourceUrl,
      contentType,
      selectedLanguage,
      startTime,
      endTime,
      duration,
      maxStudents,
      description,
      status,
      autoStart,
      type
    } = req.body;
    const roleCheck = ensureRequestRole(req, { teacherOnly: true });

    if (!roleCheck.ok) {
      return sendClassroomAccessError(res, roleCheck);
    }

    const normalizedClassroomName = classroomName || roomName || title;
    const normalizedStatus = (status === 'active' || autoStart || type === 'live') ? 'active' : 'scheduled';
    const normalizedStartTime = startTime || new Date();
    
    logger.info('Create classroom request received', {
      classroomName,
      classId,
      courseId,
      courseName,
      lessonId,
      resourceId,
      contentType
    });
    
    if (!normalizedClassroomName) {
      return res.json(Response.error('鏁欏鍚嶇О涓嶈兘涓虹┖', 400));
    }
    
    const classroomCreatePayload = await filterTeachingClassroomPayload({
      id: uuidUtil.generate(),
      classroom_name: normalizedClassroomName,
      classroom_code: classroomCode || uuidUtil.generate().substring(0, 8),
      class_id: classId || null,  // 鏂板锛氫繚瀛樼彮绾D
      teacher_id: roleCheck.user.userId || req.user?.id,
      teacher_name: roleCheck.user.realname || req.user?.realname,
      course_id: courseId || null,
      course_name: courseName || null,
      lesson_id: lessonId || null,
      lesson_name: lessonName || null,
      resource_id: resourceId || null,
      resource_name: resourceName || null,
      resource_url: resourceUrl || null,
      content_type: contentType || null,
      selected_language: selectedLanguage || null,
      start_time: normalizedStartTime,
      end_time: endTime || null,
      duration: duration || 0,
      status: normalizedStatus,
      max_students: maxStudents || 50,
      current_students: 0,
      description: description || null,
      del_flag: 0,
      create_by: roleCheck.user.userId || req.user?.id,
      create_time: new Date()
    });
    const classroom = await models.TeachingClassroom.create(classroomCreatePayload);
    
    const result = classroom.get({ plain: true });

    res.json(Response.success({
      id: result.id,
      classroomName: result.classroom_name,
      roomName: result.classroom_name,
      classroomCode: result.classroom_code,
      classId: result.class_id,
      courseId: result.course_id,
      courseName: result.course_name,
      lessonId: result.lesson_id,
      lessonName: result.lesson_name,
      resourceId: result.resource_id,
      resourceName: result.resource_name,
      resourceUrl: result.resource_url,
      contentType: result.content_type,
      selectedLanguage: result.selected_language,
      startTime: result.start_time,
      endTime: result.end_time,
      duration: result.duration,
      status: result.status,
      maxStudents: result.max_students,
      currentStudents: result.current_students,
      description: result.description,
      createTime: result.create_time
    }, '璇惧爞鍒涘缓鎴愬姛'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 鏇存柊鏁欏
 * PUT /classroom/classrooms/:id
 */
exports.updateClassroom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const access = await ensureClassroomAccess(req, id, { teacherOnly: true });
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }
    
    const classroom = access.classroom;
    
    const classroomUpdatePayload = await filterTeachingClassroomPayload({
      classroom_name: updateData.classroomName || classroom.classroom_name,
      class_id: updateData.classId !== undefined ? updateData.classId : classroom.class_id,
      course_id: updateData.courseId !== undefined ? updateData.courseId : classroom.course_id,
      course_name: updateData.courseName !== undefined ? updateData.courseName : classroom.course_name,
      lesson_id: updateData.lessonId !== undefined ? updateData.lessonId : classroom.lesson_id,
      lesson_name: updateData.lessonName !== undefined ? updateData.lessonName : classroom.lesson_name,
      resource_id: updateData.resourceId !== undefined ? updateData.resourceId : classroom.resource_id,
      resource_name: updateData.resourceName !== undefined ? updateData.resourceName : classroom.resource_name,
      resource_url: updateData.resourceUrl !== undefined ? updateData.resourceUrl : classroom.resource_url,
      content_type: updateData.contentType !== undefined ? updateData.contentType : classroom.content_type,
      selected_language: updateData.selectedLanguage !== undefined ? updateData.selectedLanguage : classroom.selected_language,
      start_time: updateData.startTime !== undefined ? updateData.startTime : classroom.start_time,
      end_time: updateData.endTime !== undefined ? updateData.endTime : classroom.end_time,
      duration: updateData.duration !== undefined ? updateData.duration : classroom.duration,
      max_students: updateData.maxStudents !== undefined ? updateData.maxStudents : classroom.max_students,
      description: updateData.description !== undefined ? updateData.description : classroom.description,
      update_by: access.user.userId || req.user?.id,
      update_time: new Date()
    });
    await classroom.update(classroomUpdatePayload);
    
    res.json(Response.success(classroom, '鏇存柊鎴愬姛'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 鍒犻櫎鏁欏
 * DELETE /classroom/classrooms/:id
 */
exports.deleteClassroom = async (req, res, next) => {
  try {
    const id = req.params.classroomId || req.params.id;
    const access = await ensureClassroomAccess(req, id, { teacherOnly: true });
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }
    
    const classroom = access.classroom;
    
    await classroom.update({
      del_flag: 1,
      update_by: access.user.userId || req.user?.id,
      update_time: new Date()
    });
    
    res.json(Response.success({}, '鍒犻櫎鎴愬姛'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 鑾峰彇鏁欏瀛︾敓鍒楄〃
 * GET /classroom/classrooms/:id/students
 */
exports.getClassroomStudents = async (req, res, next) => {
  try {
    const classroomId = getRequestClassroomId(req);
    const access = await ensureClassroomAccess(req, classroomId, { teacherOnly: true });
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }
    
    const students = await models.TeachingClassroomStudent.findAll({
      where: { classroom_id: classroomId }
    });
    
    res.json(Response.success(students));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 瀛︾敓鍔犲叆鏁欏
 * POST /classroom/classrooms/:id/join
 */
exports.joinClassroom = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await ensureClassroomAccess(req, classroomId, { studentOnly: true });
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    const classroom = access.classroom;
    
    if (!classroom) {
      return res.json(Response.error('', ));
    }
    
    // 妫€鏌ユ槸鍚﹀凡鍔犲叆
    const existing = await models.TeachingClassroomStudent.findOne({
      where: {
        classroom_id: classroomId,
        student_id: req.user?.id
      }
    });
    
    if (existing) {
      return res.json(Response.error('宸插姞鍏ヨ鏁欏', 400));
    }
    
    // 妫€鏌ヤ汉鏁伴檺鍒?
    if (classroom.current_students >= classroom.max_students) {
      return res.json(Response.error('鏁欏浜烘暟宸叉弧', 400));
    }
    
    // 鍔犲叆鏁欏
    const classroomStudent = await models.TeachingClassroomStudent.create({
      id: uuidUtil.generate(),
      classroom_id: classroomId,
      student_id: req.user?.id,
      student_name: req.user?.realname,
      join_time: new Date(),
      status: 'online',
      is_present: 1
    });
    
    // 鏇存柊鏁欏瀛︾敓鏁?
    await classroom.update({
      current_students: classroom.current_students + 1
    });
    
    // 閫氳繃Socket.io閫氱煡鍏朵粬鐢ㄦ埛瀛︾敓鍔犲叆
    const io = getIO();
    if (io) {
      io.to(`classroom:${classroomId}`).emit('student-joined', {
        studentId: req.user?.id,
        studentName: req.user?.realname || req.user?.username,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(Response.success(classroomStudent, '鍔犲叆鎴愬姛'));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 瀛︾敓绂诲紑鏁欏
 * POST /classroom/classrooms/:id/leave
 */
exports.leaveClassroom = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const classroomStudent = await models.TeachingClassroomStudent.findOne({
      where: {
        classroom_id: id,
        student_id: req.user?.id,
        status: 'online'
      }
    });
    
    if (!classroomStudent) {
      return res.json(Response.error('鏈湪璇ユ暀瀹や腑', 404));
    }
    
    // 鏇存柊鐘舵€?
    await classroomStudent.update({
      leave_time: new Date(),
      status: 'offline',
      duration: Math.floor((new Date() - new Date(classroomStudent.join_time)) / 60000)  // 鍒嗛挓
    });
    
    // 鏇存柊鏁欏瀛︾敓鏁?
    const classroom = await models.TeachingClassroom.findByPk(id);
    if (classroom) {
      await classroom.update({
        current_students: Math.max(0, classroom.current_students - 1)
      });
    }
    
    // 閫氳繃Socket.io閫氱煡鍏朵粬鐢ㄦ埛瀛︾敓绂诲紑
    const io = getIO();
    if (io) {
      io.to(`classroom:${id}`).emit('student-left', {
        studentId: req.user?.id,
        studentName: req.user?.realname || req.user?.username,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(Response.success({}, '绂诲紑鎴愬姛'));
    
  } catch (error) {
    next(error);
  }
};



exports.endClassroom = async (req, res, next) => {
  try {
    // 鍏煎涓ょ璺敱鍙傛暟锛歝lassroomId 鍜?id
    const classroomId = req.params.classroomId || req.params.id;
    const { immediate = false, demoContent, demoLanguage } = req.body || {};  // 鏄惁绔嬪嵆鍏抽棴
    
    if (!classroomId) {
      return res.json(Response.error('璇惧爞ID涓嶈兘涓虹┖', 400));
    }
    
    logger.info(`鈴癸笍 缁撴潫璇惧爞: ${classroomId}, 绔嬪嵆鍏抽棴: ${immediate}`);
    
    const now = new Date();
    
    // 鑾峰彇璇惧爞淇℃伅
    const classroom = await models.TeachingClassroom.findByPk(classroomId);
    if (!classroom) {
      return res.json(Response.error('', ));
    }
    
    const hasDemoContent = Object.prototype.hasOwnProperty.call(req.body || {}, 'demoContent');
    const normalizedDemoLanguage = typeof demoLanguage === 'string' ? demoLanguage.trim().toLowerCase() : '';
    const isCodeDemoLanguage = normalizedDemoLanguage && !['ppt', 'scratch', 'ai_package'].includes(normalizedDemoLanguage);
    const updatePayload = { 
      status: 'ended',  // 宸茬粨鏉熺姸鎬?
      end_time: classroom.end_time || now,
      actual_end_time: now,
      update_time: now
    };

    if (normalizedDemoLanguage) {
      updatePayload.selected_language = normalizedDemoLanguage;
    }

    if (isCodeDemoLanguage) {
      updatePayload.demo_language = normalizedDemoLanguage;
      if (hasDemoContent) {
        updatePayload.demo_content = typeof demoContent === 'string' ? demoContent : '';
      }
    }

    // 鏇存柊璇惧爞鐘舵€佷负宸茬粨鏉燂紙浣嗕粛鍙闂級
    await models.TeachingClassroom.update(
      updatePayload,
      { where: { id: classroomId } }
    );
    
    logger.info(`鉁?璇惧爞宸茬粨鏉? ${classroomId} -> ended`);
    
    // 閫氳繃Socket.io閫氱煡璇惧爞缁撴潫
    const io = getIO();
    if (io) {
      io.to(`classroom:${classroomId}`).emit('classroom-ended', {
        classroomId,
        timestamp: now.toISOString(),
        message: '璇惧爞宸茬粨鏉燂紝30鍒嗛挓鍚庤嚜鍔ㄥ叧闂?',
        canStillAccess: true
      });
      logger.info(`馃摙 宸查€氳繃Socket.io閫氱煡璇惧爞缁撴潫: ${classroomId}`);
    }
    
    // 濡傛灉涓嶆槸绔嬪嵆鍏抽棴锛岃缃?0鍒嗛挓鍚庤嚜鍔ㄥ綊妗?
    if (!immediate) {
      const delayMs = 30 * 60 * 1000;  // 30鍒嗛挓
      logger.info(`鈴?璁剧疆${delayMs/1000/60}鍒嗛挓鍚庤嚜鍔ㄥ綊妗ｈ鍫? ${classroomId}`);
      
      setTimeout(async () => {
        try {
          await models.TeachingClassroom.update(
            { 
              status: 'archived',  // 褰掓。鐘舵€?
              update_time: new Date()
            },
            { where: { id: classroomId } }
          );
          logger.info(`馃摝 璇惧爞宸茶嚜鍔ㄥ綊妗? ${classroomId}`);
          
          // 閫氱煡褰掓。
          if (io) {
            io.to(`classroom:${classroomId}`).emit('classroom-archived', {
              classroomId,
              timestamp: new Date().toISOString(),
              message: '璇惧爞宸插綊妗ｄ负鍘嗗彶璁板綍'
            });
          }
        } catch (error) {
          logger.error(`褰掓。璇惧爞澶辫触: ${classroomId}`, error);
        }
      }, delayMs);
    }
    
    res.json(Response.success({
      classroomId,
      status: 'ended',
      endTime: now,
      demoSnapshotSaved: Boolean(hasDemoContent && isCodeDemoLanguage),
      message: immediate ? '璇惧爞宸茬粨鏉?' : '璇惧爞宸茬粨鏉燂紝30鍒嗛挓鍚庤嚜鍔ㄥ叧闂?'
    }, '璇惧爞宸茬粨鏉?'));
  } catch (error) {
    logger.error('缁撴潫璇惧爞澶辫触:', error);
    next(error);
  }
};

// ========== 璇惧爞浜掑姩鍔熻兘锛坧laceholder瀹炵幇锛?=========
exports.updateClassroomStatus = async (req, res, next) => {
  try {
    const { classroomId } = req.params;
    const { status } = req.body;
    
    // 鏇存柊鏁版嵁搴?
    await models.TeachingClassroom.update(
      { status },
      { where: { id: classroomId } }
    );
    
    // 閫氳繃Socket.io骞挎挱鐘舵€佹洿鏂?
    const io = getIO();
    if (io) {
      io.to(`classroom:${classroomId}`).emit('classroom-status-updated', {
        classroomId,
        status,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(Response.success({ classroomId, status }, '状态更新成功'));
  } catch (error) {
    next(error);
  }
};

exports.broadcastScreen = async (req, res, next) => {
  try {
    const { classroomId } = req.params;
    const { screenData } = req.body;
    
    // 閫氳繃Socket.io骞挎挱灞忓箷
    const io = getIO();
    if (io) {
      io.to(`classroom:${classroomId}`).emit('broadcast-started', {
        screenData,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(Response.success({ classroomId, broadcasting: true }, '屏幕广播已开始'));
  } catch (error) {
    next(error);
  }
};

exports.raiseHand = async (req, res, next) => {
  try {
    const { classroomId } = req.params;
    const studentId = req.user?.id;
    
    // 閫氳繃Socket.io骞挎挱涓炬墜浜嬩欢
    const io = getIO();
    if (io) {
      io.to(`classroom:${classroomId}`).emit('hand-raised', {
        studentId,
        studentName: req.user?.realname || req.user?.username,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(Response.success({ classroomId, studentId, handRaised: true }, '涓炬墜鎴愬姛'));
  } catch (error) {
    next(error);
  }
};

exports.chat = async (req, res, next) => {
  try {
    const { classroomId } = req.params;
    const { message } = req.body;
    
    // 閫氳繃Socket.io骞挎挱鑱婂ぉ娑堟伅
    const io = getIO();
    if (io) {
      io.to(`classroom:${classroomId}`).emit('chat-message', {
        message,
        userName: req.user?.realname || req.user?.username,
        userRole: req.user?.userIdentity || 'student',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(Response.success({ classroomId, message, sender: req.user?.realname || req.user?.username, time: new Date() }, '消息发送成功'));
  } catch (error) {
    next(error);
  }
};

exports.codeSync = async (req, res, next) => {
  try {
    const { classroomId } = req.params;
    const { code, language } = req.body;
    
    // 閫氳繃Socket.io骞挎挱浠ｇ爜鍚屾
    const io = getIO();
    if (io) {
      io.to(`classroom:${classroomId}`).emit('code-updated', {
        code,
        language,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(Response.success({ classroomId, synced: true }, '浠ｇ爜鍚屾鎴愬姛'));
  } catch (error) {
    next(error);
  }
};

exports.submitHomework = async (req, res, next) => {
  try {
    return sendRetiredClassroomCompatibilityResponse(req, res, 'submitHomework');
    const { classroomId } = req.params;
    const { homeworkId, content } = req.body;
    res.json(Response.success({ classroomId, homeworkId, submitted: true }, '浣滀笟鎻愪氦鎴愬姛'));
  } catch (error) {
    next(error);
  }
};

function sendRetiredClassroomCompatibilityResponse(req, res, endpointName) {
  logger.warn('Blocked request to retired classroom placeholder endpoint', {
    endpointName,
    method: req.method,
    path: req.originalUrl,
    userId: req.user && (req.user.id || req.user.userId) ? (req.user.id || req.user.userId) : null
  });

  return res.status(410).json(
    Response.error('This classroom compatibility endpoint has been retired because it only exposed placeholder behavior.', 410)
  );
}

exports.getStatistics = async (req, res, next) => {
  try {
    return sendRetiredClassroomCompatibilityResponse(req, res, 'getStatistics');
  } catch (error) {
    next(error);
  }
};

exports.getOnlineStatus = async (req, res, next) => {
  try {
    return sendRetiredClassroomCompatibilityResponse(req, res, 'getOnlineStatus');
  } catch (error) {
    next(error);
  }
};

exports.controlBroadcast = async (req, res, next) => {
  try {
    return sendRetiredClassroomCompatibilityResponse(req, res, 'controlBroadcast');
    const { action, target } = req.body;
    res.json(Response.success({ action, target, controlled: true }, '骞挎挱鎺у埗鎴愬姛'));
  } catch (error) {
    next(error);
  }
};

exports.controlScreenLock = async (req, res, next) => {
  try {
    return sendRetiredClassroomCompatibilityResponse(req, res, 'controlScreenLock');
    const { locked, studentIds } = req.body;
    res.json(Response.success({ locked, studentIds, controlled: true }, '灞忓箷閿佸畾鎺у埗鎴愬姛'));
  } catch (error) {
    next(error);
  }
};

/**
 * 鑾峰彇瀛︾敓鐨勮鍫傚垪琛紙鏍规嵁瀛︾敓鎵€鍦ㄧ彮绾э級
 * GET /teaching/classroom/student/my-classrooms
 */
exports.getStudentClassrooms = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const username = req.user?.username;
    
    logger.debug('馃摎 [STUDENT CLASSROOMS] 鑾峰彇瀛︾敓璇惧爞鍒楄〃:', { userId, username });
    
    if (!userId) {
      return res.json(Response.error('', ));
    }
    
    // 宸茬Щ闄ゆā鎷熸暟鎹紝浣跨敤鐪熷疄鏁版嵁
    
    // 1. 鏌ユ壘瀛︾敓璁板綍锛堜紭鍏堜娇鐢?username锛屽叾娆′娇鐢?student_no锛?
    let student = await models.TeachingStudent.findOne({
      where: { username: username, del_flag: 0 }
    });
    
    // 濡傛灉閫氳繃username鎵句笉鍒帮紝灏濊瘯閫氳繃student_no鏌ユ壘
    if (!student) {
      student = await models.TeachingStudent.findOne({
        where: { student_no: username, del_flag: 0 }
      });
    }
    
    // 濡傛灉杩樻壘涓嶅埌锛屽皾璇曢€氳繃鍏宠仈鐨剆ys_user鏌ユ壘
    if (!student) {
      const sysUser = await models.SysUser.findOne({
        where: { username: username, del_flag: 0 }
      });
      if (sysUser) {
        // 閫氳繃sys_user鐨剅ealname鎴栧叾浠栧瓧娈垫煡鎵緎tudent
        student = await models.TeachingStudent.findOne({
          where: { 
            [models.Sequelize.Op.or]: [
              { username: sysUser.username },
              { student_no: sysUser.username }
            ],
            del_flag: 0 
          }
        });
      }
    }
    
    logger.debug('馃攳 [STUDENT CLASSROOMS] 瀛︾敓鏌ヨ缁撴灉:', { 
      found: !!student, 
      studentId: student?.id, 
      userId,
      username 
    });
    
    if (!student) {
      logger.warn('[STUDENT CLASSROOMS] Student profile not found, returning empty classroom list');
      return res.json(Response.success({ ongoing: [], upcoming: [], finished: [] }, '鎮ㄨ繕鏈敞鍐屼负瀛︾敓'));
    }
    
    // 2. 鑾峰彇瀛︾敓鎵€鍦ㄧ殑鐝骇锛坰tatus=1琛ㄧず鍦ㄨ锛宻tatus=2琛ㄧず宸茬寮€锛?
    const classStudents = await models.TeachingClassStudent.findAll({
      where: { student_id: student.id, del_flag: 0, status: 1 }
    });
    
    logger.debug('馃搵 [STUDENT CLASSROOMS] 瀛︾敓鐝骇鏁版嵁:', {
      studentId: student.id,
      classStudentsCount: classStudents.length,
      classStudents: classStudents.map(cs => ({ id: cs.id, class_id: cs.class_id, student_id: cs.student_id }))
    });
    
    const classIds = classStudents.map(cs => cs.class_id);
    
    if (classIds.length === 0) {
      logger.debug('[STUDENT CLASSROOMS] Student is not assigned to any class');
      return res.json(Response.success({ ongoing: [], upcoming: [], finished: [] }, '你还未加入任何班级'));
    }
    
    logger.debug('馃搵 [STUDENT CLASSROOMS] 鐝骇IDs:', classIds);
    
    // 3. 鑾峰彇杩欎簺鐝骇鐨勮鍫?
    logger.debug('馃搵 [STUDENT CLASSROOMS] 寮€濮嬫煡璇㈣鍫傦紝鐝骇IDs:', classIds);
    
    const classrooms = await models.TeachingClassroom.findAll({
      where: { 
        class_id: classIds,
        del_flag: 0
      },
      order: [['start_time', 'DESC']]
    });
    
    logger.debug('馃彨 [STUDENT CLASSROOMS] 璇惧爞鏌ヨ缁撴灉:', {
      classroomsCount: classrooms.length,
      classrooms: classrooms.map(c => ({ 
        id: c.id, 
        classroom_name: c.classroom_name,
        title: c.title, 
        class_id: c.class_id, 
        status: c.status,
        start_time: c.start_time
      }))
    });
    
    // 鑾峰彇鍏宠仈鐨勭彮绾у拰璇捐妭淇℃伅
    const classroomList = [];
    for (const classroom of classrooms) {
      const classInfo = await models.TeachingClass.findOne({
        where: { id: classroom.class_id }
      });
      
      let lessonInfo = null;
      if (classroom.lesson_id) {
        lessonInfo = await models.TeachingCourseUnit.findOne({
          where: { id: classroom.lesson_id }
        });
      }
      
      classroomList.push({
        ...classroom.toJSON(),
        className: classInfo ? classInfo.name : '',
        teacherName: classInfo ? classInfo.teacher_name : '',
        lessonName: lessonInfo ? lessonInfo.unit_name : ''
      });
    }
    
    // 4. 鍒嗙被璇惧爞锛氳繘琛屼腑銆佸嵆灏嗗紑濮嬨€佸凡缁撴潫
    const now = new Date();
    const result = {
      ongoing: [],    // 姝ｅ湪杩涜
      upcoming: [],   // 鍗冲皢寮€濮?
      finished: []    // 宸茬粨鏉?
    };
    
    classroomList.forEach(classroom => {
      const startTime = new Date(classroom.start_time);
      // 璁＄畻瀹為檯缁撴潫鏃堕棿锛氬鏋滄湁 end_time 浣跨敤瀹冿紝鍚﹀垯浣跨敤 start_time + duration
      let endTime;
      if (classroom.end_time) {
        endTime = new Date(classroom.end_time);
      } else if (classroom.duration) {
        endTime = new Date(startTime.getTime() + classroom.duration * 60 * 1000);
      } else {
        // 濡傛灉閮芥病鏈夛紝榛樿90鍒嗛挓
        endTime = new Date(startTime.getTime() + 90 * 60 * 1000);
      }
      
      // 馃敡 鍔ㄦ€佽绠楄鍫傜姸鎬侊細濡傛灉褰撳墠鏃堕棿瓒呰繃缁撴潫鏃堕棿锛岀姸鎬佸簲涓篹nded
      let computedStatus = classroom.status;
      // 銆愬叧閿慨澶嶃€戞鏌ユ墍鏈夐潪ended鐘舵€佺殑璇惧爞鏄惁搴旇鑷姩缁撴潫
      if (classroom.status !== 'ended' && classroom.status !== 'archived' && now > endTime) {
        computedStatus = 'ended';
        // 寮傛鏇存柊鏁版嵁搴撶姸鎬侊紙涓嶉樆濉炲搷搴旓級
        models.TeachingClassroom.update(
          { status: 'ended', end_time: endTime },
          { where: { id: classroom.id } }
        ).catch(err => logger.error('鏇存柊璇惧爞鐘舵€佸け璐?', err));
      }
      // 濡傛灉宸插埌寮€濮嬫椂闂翠絾鐘舵€佽繕鏄痵cheduled锛岃嚜鍔ㄥ彉涓篴ctive
      else if (classroom.status === 'scheduled' && now >= startTime && now <= endTime) {
        computedStatus = 'active';
        // 寮傛鏇存柊鏁版嵁搴撶姸鎬?
        models.TeachingClassroom.update(
          { status: 'active' },
          { where: { id: classroom.id } }
        ).catch(err => logger.error('鏇存柊璇惧爞鐘舵€佸け璐?', err));
      }
      
      const classroomData = {
        id: classroom.id,
        title: classroom.classroom_name || classroom.title || '未命名课堂',
        classroomName: classroom.classroom_name,
        classId: classroom.class_id,
        className: classroom.className,
        teacherName: classroom.teacherName || classroom.teacher_name,
        lessonName: classroom.lessonName,
        lessonId: classroom.lesson_id,
        startTime: classroom.start_time,
        endTime: endTime,
        status: computedStatus, // 浣跨敤璁＄畻鍚庣殑鐘舵€?
        canEnter: true // 瀛︾敓鍙互杩涘叆鎵€鏈夎鍫傦紙鍖呮嫭鍘嗗彶璇惧爞鏌ョ湅鍥炴斁锛?
      };
      
      // 璇惧爞鐘舵€佸垎绫伙紙鏍规嵁璁＄畻鍚庣殑鐘舵€佸垽鏂級锛?
      // 1. ended/archived -> 宸茬粨鏉?
      // 2. active/in_progress/ongoing -> 杩涜涓?
      // 3. scheduled涓旀湭鍒板紑濮嬫椂闂?-> 鍗冲皢寮€濮?
      // 4. scheduled浣嗗凡杩囧紑濮嬫椂闂?-> 杩涜涓?
      
      if (computedStatus === 'ended' || computedStatus === 'archived') {
        // 宸茬粨鏉熸垨褰掓。鐨勮绋?
        result.finished.push(classroomData);
      } else if (computedStatus === 'active' || computedStatus === 'in_progress' || computedStatus === 'ongoing') {
        // 杩涜涓殑璇剧▼
        result.ongoing.push(classroomData);
      } else if (computedStatus === 'scheduled') {
        // scheduled鐘舵€佹牴鎹椂闂村垽鏂?
        if (now < startTime) {
          result.upcoming.push(classroomData);
        } else if (now > endTime) {
          // 宸茶繃缁撴潫鏃堕棿锛屽綊涓哄凡缁撴潫
          classroomData.status = 'ended';
          result.finished.push(classroomData);
        } else {
          // 宸插埌寮€濮嬫椂闂翠絾杩樻槸scheduled鐘舵€侊紝褰掍负杩涜涓?
          result.ongoing.push(classroomData);
        }
      } else {
        // 娌℃湁鏄庣‘鐘舵€佹椂锛屾牴鎹椂闂村垽鏂?
        if (now < startTime) {
          result.upcoming.push(classroomData);
        } else if (now > endTime) {
          classroomData.status = 'ended';
          result.finished.push(classroomData);
        } else {
          result.ongoing.push(classroomData);
        }
      }
    });
    
    logger.debug('鉁?[STUDENT CLASSROOMS] 璇惧爞缁熻:', {
      ongoing: result.ongoing.length,
      upcoming: result.upcoming.length,
      finished: result.finished.length
    });
    
    res.json(Response.success(result, '鑾峰彇鎴愬姛'));
    
  } catch (error) {
    logger.error('鉂?[STUDENT CLASSROOMS] 鑾峰彇澶辫触:', error);
    next(error);
  }
};

/**
 * 鑾峰彇璇惧爞绗旇
 * GET /classroom/notes/:classroomId
 */
exports.getClassroomNotes = async (req, res, next) => {
  try {
    const { classroomId } = req.params;
    const userId = req.user?.id || req.user?.username;
    
    logger.debug('馃摑 [GET NOTES] 鑾峰彇璇惧爞绗旇:', { classroomId, userId });
    
    if (!classroomId) {
      return res.json(Response.error('璇惧爞ID涓嶈兘涓虹┖', 400));
    }
    
    // 鏌ユ壘绗旇璁板綍
    const note = await models.TeachingClassroomNote.findOne({
      where: {
        classroom_id: classroomId,
        student_id: userId,
        del_flag: 0
      }
    });
    
    if (note) {
      logger.debug('鉁?[GET NOTES] 鎵惧埌绗旇璁板綍');
      res.json(Response.success({
        id: note.id,
        classroomId: note.classroom_id,
        studentId: note.student_id,
        content: note.content,
        createTime: note.create_time,
        updateTime: note.update_time
      }, '鑾峰彇鎴愬姛'));
    } else {
      logger.debug('鈩癸笍 [GET NOTES] 鏆傛棤绗旇璁板綍');
      res.json(Response.success(null, '鏆傛棤绗旇'));
    }
    
  } catch (error) {
    logger.error('鉂?[GET NOTES] 鑾峰彇绗旇澶辫触:', error);
    next(error);
  }
};

/**
 * 淇濆瓨璇惧爞绗旇
 * POST /classroom/notes
 */
exports.saveClassroomNotes = async (req, res, next) => {
  try {
    const { classroomId, content, studentId } = req.body;
    const userId = studentId || req.user?.id || req.user?.username;
    
    logger.debug('馃捑 [SAVE NOTES] 淇濆瓨璇惧爞绗旇:', { classroomId, userId, contentLength: content?.length });
    
    if (!classroomId) {
      return res.json(Response.error('璇惧爞ID涓嶈兘涓虹┖', 400));
    }
    
    // 鏌ユ壘鏄惁宸叉湁绗旇璁板綍
    let note = await models.TeachingClassroomNote.findOne({
      where: {
        classroom_id: classroomId,
        student_id: userId,
        del_flag: 0
      }
    });
    
    if (note) {
      // 鏇存柊宸叉湁绗旇
      await note.update({
        content: content || '',
        update_time: new Date()
      });
      logger.debug('鉁?[SAVE NOTES] 绗旇鏇存柊鎴愬姛');
    } else {
      // 鍒涘缓鏂扮瑪璁?
      note = await models.TeachingClassroomNote.create({
        id: require('uuid').v4(),
        classroom_id: classroomId,
        student_id: userId,
        content: content || '',
        create_time: new Date(),
        update_time: new Date(),
        del_flag: 0
      });
      logger.debug('鉁?[SAVE NOTES] 绗旇鍒涘缓鎴愬姛');
    }
    
    res.json(Response.success({
      id: note.id,
      classroomId: note.classroom_id,
      studentId: note.student_id,
      updateTime: note.update_time
    }, '淇濆瓨鎴愬姛'));
    
  } catch (error) {
    logger.error('鉂?[SAVE NOTES] 淇濆瓨绗旇澶辫触:', error);
    next(error);
  }
};

/**
 * 寮€濮嬭鍫?
 * POST /classroom/:id/start
 */
exports.startClassroom = async (req, res, next) => {
  try {
    // 鏀寔涓ょ璺敱鍙傛暟鍚嶏細id 鍜?classroomId
    const { id, classroomId } = req.params;
    const classroomIdValue = id || classroomId;
    
    const classroom = await models.TeachingClassroom.findOne({
      where: { id: classroomIdValue, del_flag: 0 }
    });
    
    if (!classroom) {
      return res.json(Response.error('', ));
    }
    
    // 鏇存柊璇惧爞鐘舵€佷负杩涜涓?
    await classroom.update({
      status: 'active',
      start_time: new Date(),
      update_time: new Date()
    });
    
    logger.info('[START CLASSROOM] Classroom started', { id: classroomIdValue, title: classroom.classroom_name });

    const io = getIO();
    if (io) {
      io.to(`classroom:${classroom.id}`).emit('classroom-started', {
        classroomId: classroom.id,
        timestamp: new Date().toISOString(),
        message: '课堂已开始，欢迎大家'
      });
    }
    
    res.json(Response.success({
      id: classroom.id,
      status: 'active',
      startTime: classroom.start_time
    }, '课堂已开始'));
    
  } catch (error) {
    logger.error('鉂?[START CLASSROOM] 寮€濮嬭鍫傚け璐?', error);
    next(error);
  }
};

/**
 * 鑾峰彇璇惧爞鐘舵€侊紙鑷姩鍒ゆ柇鏄惁瓒呮椂锛?
 * GET /classroom/:id/status
 */
exports.getClassroomStatus = async (req, res, next) => {
  try {
    const id = getRequestClassroomId(req);
    
    const classroom = await models.TeachingClassroom.findOne({
      where: { id, del_flag: 0 }
    });
    
    if (!classroom) {
      return res.json(Response.error('', ));
    }
    
    let status = classroom.status;
    
    // 濡傛灉璇惧爞姝ｅ湪杩涜锛屾鏌ユ槸鍚﹁秴鏃讹紙120鍒嗛挓锛?
    if (status === 'active' && classroom.start_time) {
      const startTime = new Date(classroom.start_time);
      const now = new Date();
      const diffMinutes = (now - startTime) / (1000 * 60);
      
      if (diffMinutes > 120) {
        // 鑷姩缁撴潫璇惧爞
        await classroom.update({
          status: 'ended',
          end_time: new Date(),
          update_time: new Date()
        });
        status = 'ended';
        logger.info('鈴?[CLASSROOM STATUS] 璇惧爞宸茶嚜鍔ㄧ粨鏉燂紙瓒呮椂120鍒嗛挓锛?', { id });
      }
    }
    
    res.json(Response.success({
      id: classroom.id,
      status: status,
      startTime: classroom.start_time,
      endTime: classroom.end_time
    }));
    
  } catch (error) {
    logger.error('鉂?[CLASSROOM STATUS] 鑾峰彇璇惧爞鐘舵€佸け璐?', error);
    next(error);
  }
};

/**
 * 鑾峰彇璇惧爞鑱婂ぉ鍘嗗彶璁板綍
 * GET /classroom/:id/chat-history
 */
exports.getChatHistory = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const { pageNo = 1, pageSize = 50 } = req.query;
    
    logger.debug('馃挰 [CHAT HISTORY] 鑾峰彇璇惧爞鑱婂ぉ璁板綍:', { classroomId });
    
    if (!classroomId) {
      return res.json(Response.error('璇惧爞ID涓嶈兘涓虹┖', 400));
    }

    const chatHistoryColumns = await getChatHistoryColumns();
    
    // 鏌ヨ鑱婂ぉ璁板綍
    const { count, rows } = await models.TeachingClassroomChat.findAndCountAll({
      attributes: chatHistoryColumns,
      where: { 
        classroom_id: classroomId,
        del_flag: 0
      },
      order: [['create_time', 'ASC']],
      limit: parseInt(pageSize),
      offset: (parseInt(pageNo) - 1) * parseInt(pageSize)
    });
    
    const messages = rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userRole: row.user_role,
      type: row.message_type,
      content: row.content,
      message: row.content,
      fileName: row.file_name || null,
      fileSize: row.file_size || null,
      fileType: row.file_type || null,
      fileKey: row.file_url || null,
      fileUrl: row.file_url || null,
      avatar: avatarUtil.normalizeAvatarUrl(row.avatar, row.user_name || row.user_id),
      senderId: row.user_id,
      senderName: row.user_name,
      role: row.user_role,
      time: row.create_time,
      timestamp: row.create_time
    }));
    
    logger.debug('鉁?[CHAT HISTORY] 鑾峰彇鎴愬姛:', { count: messages.length, total: count });
    
    res.json(Response.success({
      records: messages,
      total: count,
      pageNo: parseInt(pageNo),
      pageSize: parseInt(pageSize)
    }, '鑾峰彇鎴愬姛'));
    
  } catch (error) {
    logger.error('鉂?[CHAT HISTORY] 鑾峰彇鑱婂ぉ璁板綍澶辫触:', error);
    next(error);
  }
};

/**
 * 淇濆瓨灞曠ず鍖哄唴瀹?
 * POST /classroom/:id/demo-content
 */
exports.saveDemoContent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, language } = req.body;
    
    logger.debug('馃捑 [DEMO CONTENT] 淇濆瓨灞曠ず鍖哄唴瀹?', { classroomId: id, language });
    
    if (!id) {
      return res.json(Response.error('璇惧爞ID涓嶈兘涓虹┖', 400));
    }
    
    const classroom = await models.TeachingClassroom.findByPk(id);
    if (!classroom) {
      return res.json(Response.error('', ));
    }
    
    const hasContent = Object.prototype.hasOwnProperty.call(req.body || {}, 'content');
    const normalizedLanguage = typeof language === 'string' ? language.trim().toLowerCase() : '';
    const isCodeLanguage = normalizedLanguage && !['ppt', 'scratch', 'ai_package'].includes(normalizedLanguage);
    const updatePayload = {
      update_time: new Date()
    };

    if (normalizedLanguage) {
      updatePayload.selected_language = normalizedLanguage;
    }

    if (isCodeLanguage) {
      updatePayload.demo_language = normalizedLanguage;
      if (hasContent) {
        updatePayload.demo_content = typeof content === 'string' ? content : '';
      }
    }

    await classroom.update(updatePayload);
    
    logger.debug('鉁?[DEMO CONTENT] 淇濆瓨鎴愬姛:', { classroomId: id });
    
    res.json(Response.success(null, '淇濆瓨鎴愬姛'));
    
  } catch (error) {
    logger.error('鉂?[DEMO CONTENT] 淇濆瓨灞曠ず鍖哄唴瀹瑰け璐?', error);
    next(error);
  }
};

/**
 * 鑾峰彇灞曠ず鍖哄唴瀹?
 * GET /classroom/:id/demo-content
 */
exports.getDemoContent = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    logger.debug('馃摉 [DEMO CONTENT] 鑾峰彇灞曠ず鍖哄唴瀹?', { classroomId: id });
    
    if (!id) {
      return res.json(Response.error('璇惧爞ID涓嶈兘涓虹┖', 400));
    }
    
    const classroom = await models.TeachingClassroom.findByPk(id, {
      attributes: ['id', 'selected_language', 'demo_content', 'demo_language']
    });
    
    if (!classroom) {
      return res.json(Response.error('', ));
    }
    
    logger.debug('鉁?[DEMO CONTENT] 鑾峰彇鎴愬姛:', { 
      classroomId: id, 
      hasContent: !!classroom.demo_content 
    });
    
    res.json(Response.success({
      content: classroom.demo_content || '',
      language: classroom.demo_language || classroom.selected_language || 'python',
      selectedLanguage: classroom.selected_language || classroom.demo_language || 'python'
    }, '鑾峰彇鎴愬姛'));
    
  } catch (error) {
    logger.error('鉂?[DEMO CONTENT] 鑾峰彇灞曠ず鍖哄唴瀹瑰け璐?', error);
    next(error);
  }
};



/**
 * 涓婁紶璇惧爞鏂囦欢锛堣亰澶╀腑鐨勬枃浠讹紝鏈湴瀛樺偍锛?
 * POST /classroom/:classroomId/upload-file
 */
exports.uploadClassroomFile = async (req, res, next) => {
  try {
    const { classroomId } = req.params;

    if (!classroomId) {
      return res.json(Response.error('璇惧爞ID涓嶈兘涓虹┖', 400));
    }

    if (!req.file) {
      return res.json(Response.error('璇烽€夋嫨瑕佷笂浼犵殑鏂囦欢', 400));
    }

    const file = req.file;
    const path = require('path');
    const fs = require('fs');
    const ossUtil = require('../utils/oss');
    // 杩樺師涓枃鍘熷鏂囦欢鍚嶏紙multer浠atin1瑙ｇ爜锛?
    let originalName = file.originalname;
    try {
      originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch (e) { /* ignore */ }

    // 杩斿洖缁忚繃璁よ瘉鐨?API 涓嬭浇 URL锛岃€岄潪鍙鏈巿鏉冭闂殑闈欐€?URL
    const ext = path.extname(file.filename).toLowerCase() || '.bin';
    const localFileUrl = `/classroom/${classroomId}/file/${encodeURIComponent(file.filename)}`;
    const ossPath = `classroom/${classroomId}/${Date.now()}_${uuidUtil.generate().substring(0, 8)}${ext}`;

    let resultPayload = {
      fileName: originalName,
      fileSize: file.size,
      fileType: file.mimetype,
      fileKey: localFileUrl,
      fileUrl: localFileUrl,
      storageType: 'local',
      uploadMode: 'server-local',
      uploadTime: new Date()
    };

    if (ossUtil.isOSSConfigured()) {
      try {
        const uploadResult = await ossUtil.uploadToOSS(file.path, ossPath);
        resultPayload = {
          fileName: originalName,
          fileSize: file.size,
          fileType: file.mimetype,
          fileKey: uploadResult.path,
          fileUrl: uploadResult.url,
          storageType: 'oss',
          uploadMode: 'server-oss',
          uploadTime: new Date()
        };
      } catch (ossError) {
        logger.warn(`閳跨媴绗?[CLASSROOM FILE] OSS upload failed, fallback to local storage: classroom=${classroomId}, file=${originalName}, error=${ossError.message}`);
        if (!fs.existsSync(file.path)) {
          throw ossError;
        }
      }
    }

    logger.info(`馃搸 [CLASSROOM FILE] 涓婁紶鎴愬姛: ${originalName}, 璇惧爞: ${classroomId}, 鏈嶅姟绔枃浠? ${file.filename}`);

    res.json(Response.success({
      fileName: originalName,
      fileSize: file.size,
      fileType: file.mimetype,
      fileKey: resultPayload.fileKey,
      fileUrl: resultPayload.fileUrl,
      storageType: resultPayload.storageType,
      uploadMode: resultPayload.uploadMode,
      uploadTime: resultPayload.uploadTime
    }, '鏂囦欢涓婁紶鎴愬姛'));

  } catch (error) {
    logger.error('涓婁紶璇惧爞鏂囦欢澶辫触:', error);
    next(error);
  }
};

/**
 * 瀹夊叏涓嬭浇璇惧爞鏂囦欢锛堜粎闄愯鍫傛垚鍛橈級
 * GET /classroom/:classroomId/file/:filename
 */
exports.downloadClassroomFile = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId;
    const rawFilename = decodeURIComponent(req.params.filename || '');
    const userId = req.user && (req.user.id || req.user.username);

    if (!classroomId || !rawFilename) {
      return res.status(400).json(Response.error('', ));
    }

    // 闃茶矾寰勯亶鍘嗭細鍙厑璁哥函鏂囦欢鍚?
    if (
      rawFilename.includes('..') ||
      rawFilename.includes('/') ||
      rawFilename.includes('\\') ||
      rawFilename.includes('\0')
    ) {
      logger.warn(`鈿狅笍 [CLASSROOM FILE] 闈炴硶鏂囦欢鍚? ${rawFilename}, userId=${userId}`);
      return res.status(403).json(Response.error('闈炴硶鏂囦欢璺緞', 403));
    }

    // 鏉冮檺楠岃瘉锛氭暀甯堟垨宸插姞鍏ヨ鍫傜殑瀛︾敓
    const classroom = await models.TeachingClassroom.findOne({
      where: { id: classroomId, del_flag: 0 }
    });
    if (!classroom) {
      return res.status(404).json(Response.error('', ));
    }

    const isTeacher = classroom.teacher_id === userId;
    if (!isTeacher) {
      const member = await models.TeachingClassroomStudent.findOne({
        where: { classroom_id: classroomId, student_id: userId }
      });
      if (!member) {
        logger.warn(`鈿狅笍 [CLASSROOM FILE] 鏈巿鏉冧笅杞? userId=${userId}, classroomId=${classroomId}`);
        return res.status(403).json(Response.error('', ));
      }
    }

    // 瀹夊叏璺緞瑙ｆ瀽
    const path = require('path');
    const fs = require('fs');
    const { resolvePathWithinDir } = require('../utils/fileSecurity');

    const classroomDir = path.join(__dirname, '../../uploads/classroom');
    let filePath;
    try {
      filePath = resolvePathWithinDir(classroomDir, rawFilename);
    } catch (e) {
      return res.status(403).json(Response.error('闈炴硶鏂囦欢璺緞', 403));
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json(Response.error('', ));
    }

    logger.info(`馃摜 [CLASSROOM FILE DOWNLOAD] userId=${userId}, classroomId=${classroomId}, file=${rawFilename}`);

    // 瀹夊叏鍝嶅簲澶?
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(rawFilename)}`);
    // 绂佹缂撳瓨锛堟枃浠跺睘浜庣鏈夎鍫傚唴瀹癸級
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (err) => {
      logger.error('璇惧爞鏂囦欢娴侀敊璇?', err);
      if (!res.headersSent) {
        res.status(500).json(Response.error('鏂囦欢璇诲彇澶辫触', 500));
      }
    });
    fileStream.pipe(res);

  } catch (error) {
    logger.error('涓嬭浇璇惧爞鏂囦欢澶辫触:', error);
    next(error);
  }
};


/**
 * 鑾峰彇璇惧爞鏂囦欢涓婁紶鍑瘉锛圤SS STS锛?
 * POST /classroom/:classroomId/upload-token
 */
exports.getUploadToken = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const { fileName, fileSize, fileType } = req.body || {};
    const parsedFileSize = Number(fileSize || 0);
    const path = require('path');
    const normalizedFileName = path.basename(String(fileName || '').trim()).replace(/[<>:\"/\\|?*\u0000-\u001f]/g, '_').slice(0, 200);
    
    if (!classroomId) {
      return res.json(Response.error('璇惧爞ID涓嶈兘涓虹┖', 400));
    }
    
    if (!normalizedFileName) {
      return res.json(Response.error('', ));
    }

    if (!Number.isFinite(parsedFileSize) || parsedFileSize <= 0) {
      return res.json(Response.error('', ));
    }
    
    // 1. 楠岃瘉鏂囦欢澶у皬锛?00MB锛?
    if (Number.isFinite(parsedFileSize) && parsedFileSize > 100 * 1024 * 1024) {
      return res.json(Response.error('', ));
    }
    
    // 2. 楠岃瘉鏂囦欢绫诲瀷
    const allowedTypes = [
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'application/json', 'text/x-python',
      'video/mp4', 'audio/mpeg', 'audio/wav',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/x-scratch-project', 'application/x-scratch2-project'
    ];
    const allowedExtensions = new Set([
      '.zip', '.rar', '.7z', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.txt', '.json', '.py', '.mp4', '.mp3', '.wav', '.jpg', '.jpeg', '.png', '.gif', '.webp',
      '.sb3', '.sb2'
    ]);
    
    const strictMimeCheck = String(process.env.CLASSROOM_UPLOAD_STRICT_MIME || 'false').toLowerCase() === 'true';
    if (fileType && !allowedTypes.includes(fileType)) {
      logger.warn(`鈿狅笍 涓嶆敮鎸佺殑鏂囦欢绫诲瀷: ${fileType}`);
      if (strictMimeCheck) {
        return res.json(Response.error('涓嶆敮鎸佺殑鏂囦欢绫诲瀷', 400));
      }
      // 鍏煎妯″紡锛氬厑璁镐笂浼犱絾璁板綍鏃ュ織
    }
    
    // 3. 鐢熸垚OSS璺緞锛堟寜璇惧爞ID鍒嗙被锛?
    const timestamp = Date.now();
    const uuid = uuidUtil.generate().substring(0, 8);
    const ext = path.extname(normalizedFileName).toLowerCase();
    if (!allowedExtensions.has(ext)) {
      return res.json(Response.error('', ));
    }
    const ossPath = `classroom/${classroomId}/${timestamp}_${uuid}${ext}`;
    
    // 4. 鑾峰彇OSS涓存椂涓婁紶鍑瘉
    const ossUtil = require('../utils/oss');
    
    // 妫€鏌SS鏄惁閰嶇疆锛堟湭閰嶇疆鏃跺吋瀹圭洿閾撅級
    if (!ossUtil.isOSSConfigured()) {
      return res.json(Response.error('OSS鏈厤缃紝鏃犳硶涓婁紶鏂囦欢', 500));
    }
    
    const uploadToken = await ossUtil.getUploadToken(ossPath, parsedFileSize, fileType);
    
    // 5. 璁板綍涓婁紶鏃ュ織锛堝璁★級
    logger.info('Classroom upload token issued', {
      classroomId,
      fileName: normalizedFileName,
      fileType: fileType || null,
      fileSize: parsedFileSize
    });
    
    res.json(Response.success({
      // 鍓嶇鐩存帴浣跨敤
      uploadUrl: uploadToken.uploadUrl,
      fileKey: ossPath,
      // 鍏煎鏃х粨鏋?
      uploadToken,
      ossPath,
      fileName: normalizedFileName,
      expiresIn: uploadToken.expiresIn || 3600 // 1灏忔椂鏈夋晥鏈?
    }, '鑾峰彇涓婁紶鍑瘉鎴愬姛'));
    
  } catch (error) {
    logger.error('Get classroom upload token failed', { error: error.message, stack: error.stack });
    next(error);
  }
};

/**
 * 鑾峰彇OSS鏂囦欢璁块棶URL锛堝甫绛惧悕锛?
 * POST /classroom/:classroomId/file-url
 */
exports.getFileUrl = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const rawPath = (req.body && (req.body.ossPath || req.body.fileKey))
      || req.query.ossPath
      || req.query.fileKey
      || req.params.fileKey;
    
    const ossPath = rawPath ? decodeURIComponent(rawPath) : '';
    
    if (!ossPath) {
      return res.json(Response.error('OSS璺緞涓嶈兘涓虹┖', 400));
    }

    // 宸茬粡鏄畬鏁碪RL鏃剁洿鎺ヨ繑鍥烇紙鍏煎鍘嗗彶鏁版嵁鎴栧凡绛惧悕閾炬帴锛?
    if (/^https?:\/\//i.test(ossPath)) {
      return res.json(Response.success({
        fileUrl: ossPath,
        url: ossPath,
        fileKey: ossPath,
        ossPath,
        expiresIn: 0
      }, '鑾峰彇鏂囦欢URL鎴愬姛'));
    }

    // 闄愬埗鍙兘璁块棶褰撳墠璇惧爞鐩綍锛岄槻姝㈣法璇惧爞瀵硅薄璇诲彇
    const normalizedPath = ossPath.replace(/^\/+/, '');
    const classroomPrefix = `classroom/${classroomId}/`;
    if (!normalizedPath.startsWith(classroomPrefix) && !normalizedPath.startsWith('uploads/')) {
      logger.warn(`鈿狅笍 [FILE URL] 闈炴硶鏂囦欢璺緞璁块棶: classroom=${classroomId}, path=${normalizedPath}`);
      return res.json(Response.error('', ));
    }
    
    // 鑾峰彇甯︾鍚嶇殑璁块棶URL
    const ossUtil = require('../utils/oss');
    
    // 妫€鏌SS鏄惁閰嶇疆
    if (!ossUtil.isOSSConfigured()) {
      if (ossPath.startsWith('/uploads/') || normalizedPath.startsWith('uploads/')) {
        return res.json(Response.success({
          fileUrl: ossPath,
          url: ossPath,
          fileKey: ossPath,
          ossPath,
          expiresIn: 0
        }, '鑾峰彇鏂囦欢URL鎴愬姛'));
      }
      return res.json(Response.error('', ));
    }
    
    const signedUrl = await ossUtil.getSignedUrl(normalizedPath, 3600); // 1灏忔椂鏈夋晥
    
    logger.info(`馃敆 [FILE URL] 璇惧爞: ${classroomId}, OSS璺緞: ${normalizedPath}`);
    
    res.json(Response.success({
      fileUrl: signedUrl,
      url: signedUrl,
      fileKey: normalizedPath,
      ossPath: normalizedPath,
      expiresIn: 3600
    }, '鑾峰彇鏂囦欢URL鎴愬姛'));
    
  } catch (error) {
    logger.error('鑾峰彇鏂囦欢URL澶辫触:', error);
    next(error);
  }
};



