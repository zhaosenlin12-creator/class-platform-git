/**
 * Student work controller.
 */

const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const models = require('../models');
const Response = require('../utils/response');
const uuidUtil = require('../utils/uuid');
const auth = require('../middleware/auth');
const avatarUtil = require('../utils/avatar');
const { logger } = require('../middleware/logger');
const { getTeachingStudentSelectableAttributes } = require('../utils/studentSchema');
const {
  isRemoteUrl,
  getSafeUploadFileName,
  resolvePathWithinDir
} = require('../utils/fileSecurity');

const WORK_TYPE_LABEL_MAP = new Map([
  ['1', 'Scratch'],
  ['2', 'Scratch'],
  ['3', 'ScratchJr'],
  ['4', 'Python'],
  ['10', 'Blockly'],
  ['resource', '资源包'],
  ['resource_pack', '资源包'],
  ['ai_resource', 'AI资源包'],
  ['ai-resource', 'AI资源包'],
  ['document', '文档课件'],
  ['media', '音视频素材'],
  ['image', '图片素材'],
  ['code_file', '代码文件'],
  ['other', '其他文件'],
  ['scratch', 'Scratch'],
  ['scratch3', 'Scratch'],
  ['scratchjr', 'ScratchJr'],
  ['python', 'Python'],
  ['turtle', 'Python'],
  ['blockly', 'Blockly'],
  ['web', 'Web']
]);

const WORK_STATUS_LABEL_MAP = new Map([
  [1, '正常'],
  [2, '草稿'],
  [3, '已删除'],
  [4, '精选']
]);

const LEGACY_WORK_TYPE_MAP = {
  scratch: '1',
  scratch3: '1',
  scratchjr: '3',
  python: '4',
  turtle: '4',
  blockly: '10'
};

const RESOURCE_PACKAGE_EXTENSIONS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']);
const DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx']);
const MEDIA_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'aac', 'flac', 'mp4', 'mov', 'avi', 'mkv', 'webm']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);
const CODE_FILE_EXTENSIONS = new Set(['py', 'sb3', 'sb2', 'json', 'xml', 'html', 'htm', 'js', 'css', 'ts', 'tsx', 'jsx', 'txt', 'md']);

const WORK_COMMENT_STORE = new Map();

function resolveCurrentUserId(req) {
  return req.user?.id || req.user?.username || null;
}

function resolveCurrentUserIdentity(req) {
  return auth.getRequestUserIdentity(req);
}

async function resolveCurrentUserWorkOwnerIds(req) {
  const ownerIds = new Set();
  const currentUserId = resolveCurrentUserId(req);
  const username = String(req.user?.username || '').trim();
  const userIdentity = resolveCurrentUserIdentity(req);
  const studentAttributes = await getTeachingStudentSelectableAttributes();
  const studentAttributeSet = new Set(studentAttributes);
  const orConditions = [];

  if (currentUserId) {
    ownerIds.add(currentUserId);
    orConditions.push({ id: currentUserId });
  }

  if (username && studentAttributeSet.has('username')) {
    ownerIds.add(username);
    orConditions.push({ username });
  }

  if (username && studentAttributeSet.has('student_no')) {
    orConditions.push({ student_no: username });
  }

  if (orConditions.length === 0 || userIdentity !== 3) {
    return Array.from(ownerIds);
  }

  const studentRecords = await models.TeachingStudent.findAll({
    where: {
      del_flag: 0,
      [Op.or]: orConditions
    },
    attributes: studentAttributes.filter(attributeName => ['id', 'student_no', 'username'].includes(attributeName)),
    raw: true
  });

  studentRecords.forEach((record) => {
    if (record.id) {
      ownerIds.add(record.id);
    }
    if (record.student_no) {
      ownerIds.add(String(record.student_no).trim());
    }
    if (record.username) {
      ownerIds.add(String(record.username).trim());
    }
  });
  return Array.from(ownerIds).filter(Boolean);
}

function isPrivilegedUser(req) {
  const userIdentity = resolveCurrentUserIdentity(req);
  return userIdentity === 1 || userIdentity === 2;
}

async function getCachedCurrentUserWorkOwnerIds(req) {
  if (!req) {
    return [];
  }

  if (!Object.prototype.hasOwnProperty.call(req, '_cachedWorkOwnerIds')) {
    req._cachedWorkOwnerIds = await resolveCurrentUserWorkOwnerIds(req);
  }

  return Array.isArray(req._cachedWorkOwnerIds) ? req._cachedWorkOwnerIds : [];
}

function buildOwnerMatchValue(ownerIds = []) {
  const normalizedOwnerIds = Array.from(
    new Set(
      (Array.isArray(ownerIds) ? ownerIds : [])
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  );

  if (normalizedOwnerIds.length > 1) {
    return {
      [Op.in]: normalizedOwnerIds
    };
  }

  if (normalizedOwnerIds.length === 1) {
    return normalizedOwnerIds[0];
  }

  return '__no_match__';
}

function normalizeOwnerCandidateList(ownerIds = [], fallbackOwnerId = null) {
  return Array.from(
    new Set(
      [...(Array.isArray(ownerIds) ? ownerIds : []), fallbackOwnerId]
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  );
}

function buildOwnerScopeClause(ownerIds = [], fallbackOwnerId = null) {
  const normalizedOwnerIds = normalizeOwnerCandidateList(ownerIds, fallbackOwnerId);

  if (normalizedOwnerIds.length === 0) {
    return {
      student_id: '__no_match__'
    };
  }

  return {
    [Op.or]: [
      {
        student_id: {
          [Op.in]: normalizedOwnerIds
        }
      },
      {
        create_by: {
          [Op.in]: normalizedOwnerIds
        }
      }
    ]
  };
}

async function isWorkOwner(req, work) {
  if (!req?.user || !work) {
    return false;
  }

  const ownerIds = await getCachedCurrentUserWorkOwnerIds(req);
  const normalizedOwnerIds = normalizeOwnerCandidateList(ownerIds, resolveCurrentUserId(req));
  const workOwnerCandidates = [work.student_id, work.create_by]
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return workOwnerCandidates.some((candidate) => normalizedOwnerIds.includes(candidate));
}

function parseJsonArray(rawValue) {
  if (!rawValue) {
    return [];
  }

  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof rawValue === 'string') {
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '').trim()).filter(Boolean);
      }
    } catch (error) {
      return rawValue
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function stringifyTagArray(tags) {
  const normalizedTags = Array.from(
    new Set(
      parseJsonArray(tags)
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  );

  return normalizedTags.length > 0 ? JSON.stringify(normalizedTags) : null;
}

function normalizeBooleanFlag(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null;
  }

  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  const normalized = String(rawValue).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function normalizeLegacyWorkType(rawType) {
  const normalized = String(rawType || '').trim().toLowerCase();

  if (!normalized) {
    return '';
  }

  if (/^\d+$/.test(normalized)) {
    return normalized;
  }

  return LEGACY_WORK_TYPE_MAP[normalized] || normalized;
}

function deriveFileExtension(fileName = '', fileUrl = '') {
  const candidate = String(fileName || '').trim() || String(fileUrl || '').trim();
  if (!candidate) {
    return '';
  }

  const sanitizedCandidate = candidate.split('?')[0].split('#')[0];
  const lastDotIndex = sanitizedCandidate.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return '';
  }

  return sanitizedCandidate.slice(lastDotIndex + 1).trim().toLowerCase();
}

function normalizeFileExtension(rawExtension, fileName = '', fileUrl = '') {
  const normalizedExtension = String(rawExtension || '').trim().toLowerCase();
  if (normalizedExtension) {
    return normalizedExtension;
  }

  return deriveFileExtension(fileName, fileUrl);
}

function inferWorkTypeFromFile({ rawWorkType, fileName, fileUrl, fileExtension }) {
  const normalizedType = String(rawWorkType || '').trim().toLowerCase();
  if (normalizedType) {
    return normalizedType;
  }

  const normalizedExtension = normalizeFileExtension(fileExtension, fileName, fileUrl);
  if (!normalizedExtension) {
    return 'other';
  }

  if (RESOURCE_PACKAGE_EXTENSIONS.has(normalizedExtension)) {
    return 'resource_pack';
  }

  if (DOCUMENT_EXTENSIONS.has(normalizedExtension)) {
    return 'document';
  }

  if (MEDIA_EXTENSIONS.has(normalizedExtension)) {
    return 'media';
  }

  if (IMAGE_EXTENSIONS.has(normalizedExtension)) {
    return 'image';
  }

  if (normalizedExtension === 'py') {
    return 'python';
  }

  if (['sb3', 'sb2'].includes(normalizedExtension)) {
    return 'scratch';
  }

  if (['xml', 'blockly'].includes(normalizedExtension)) {
    return 'blockly';
  }

  if (CODE_FILE_EXTENSIONS.has(normalizedExtension)) {
    return 'code_file';
  }

  return 'other';
}

function buildWorkTypeVariants(rawType) {
  const normalized = String(rawType || '').trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const variants = new Set([normalized]);
  const legacyType = normalizeLegacyWorkType(normalized);
  variants.add(legacyType);

  if (normalized === '1' || normalized === '2' || legacyType === '1' || legacyType === '2') {
    variants.add('scratch');
    variants.add('scratch3');
    variants.add('1');
    variants.add('2');
  }

  if (normalized === '3' || legacyType === '3') {
    variants.add('scratchjr');
    variants.add('3');
  }

  if (normalized === '4' || legacyType === '4') {
    variants.add('python');
    variants.add('turtle');
    variants.add('4');
  }

  if (normalized === '10' || legacyType === '10') {
    variants.add('blockly');
    variants.add('10');
  }

  return Array.from(variants);
}

function getWorkTypeLabel(rawType) {
  const normalized = String(rawType || '').trim().toLowerCase();
  const legacyType = normalizeLegacyWorkType(normalized);

  return WORK_TYPE_LABEL_MAP.get(normalized) ||
    WORK_TYPE_LABEL_MAP.get(legacyType) ||
    (normalized ? String(rawType) : '未分类');
}

function getWorkStatusLabel(rawStatus) {
  const parsedStatus = Number(rawStatus);
  if (Number.isFinite(parsedStatus) && WORK_STATUS_LABEL_MAP.has(parsedStatus)) {
    return WORK_STATUS_LABEL_MAP.get(parsedStatus);
  }

  return '正常';
}

function inferWorkScene(workData) {
  if (workData.course_id) {
    return 'course';
  }
  if (workData.classroom_id) {
    return 'additional';
  }
  return 'create';
}

function normalizePagination(query = {}) {
  const pageNo = Math.max(parseInt(query.pageNo || query.current || 1, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(query.pageSize || query.size || 10, 10) || 10, 1), 100);

  return {
    pageNo,
    pageSize,
    offset: (pageNo - 1) * pageSize
  };
}

function normalizeSortOrder(query = {}) {
  const normalizedOrderBy = String(query.orderBy || query.column || '').trim().toLowerCase();
  const normalizedOrder = String(query.order || query.sorter || '').trim().toLowerCase();
  const isAsc = normalizedOrder.includes('asc');

  switch (normalizedOrderBy) {
    case 'view':
    case 'viewnum':
    case 'view_count':
      return [['view_count', isAsc ? 'ASC' : 'DESC'], ['create_time', 'DESC']];
    case 'star':
    case 'like':
    case 'starnum':
    case 'like_count':
      return [['like_count', isAsc ? 'ASC' : 'DESC'], ['create_time', 'DESC']];
    case 'create_time':
    case 'time':
    default:
      return [['create_time', isAsc ? 'ASC' : 'DESC']];
  }
}

async function resolveAuthorFilterIds(query = {}) {
  const userId = String(query.userId || '').trim();
  const username = String(query.username || '').trim();
  const realname = String(query.realname || query.studentName || '').trim();

  if (!userId && !username && !realname) {
    return null;
  }

  if (userId && !username && !realname) {
    return [userId];
  }

  const where = {
    del_flag: 0
  };

  if (userId) {
    where.id = userId;
  }

  const andFilters = [];
  if (username) {
    andFilters.push({
      username: {
        [Op.like]: `%${username}%`
      }
    });
  }
  if (realname) {
    andFilters.push({
      realname: {
        [Op.like]: `%${realname}%`
      }
    });
  }

  if (andFilters.length > 0) {
    where[Op.and] = andFilters;
  }

  const students = await models.TeachingStudent.findAll({
    where,
    attributes: ['id'],
    raw: true
  });

  return students.map((item) => item.id);
}

async function buildWorkWhereConditions(query = {}, options = {}) {
  const {
    mode = 'public',
    currentUserId = null,
    currentUserIds = []
  } = options;

  const where = {
    del_flag: 0
  };
  const andFilters = [];

  if (mode === 'my') {
    andFilters.push(buildOwnerScopeClause(currentUserIds, currentUserId));
  }

  if (mode === 'public') {
    where.is_public = 1;
    where.work_status = 1;
  }

  const searchKeyword = String(query.searchText || query.workName || query.keyword || '').trim();
  if (searchKeyword) {
    andFilters.push({
      [Op.or]: [
        {
          work_name: {
            [Op.like]: `%${searchKeyword}%`
          }
        },
        {
          work_description: {
            [Op.like]: `%${searchKeyword}%`
          }
        },
        {
          work_file_name: {
            [Op.like]: `%${searchKeyword}%`
          }
        }
      ]
    });
  }

  const workTag = String(query.workTag || query.tag || '').trim();
  if (workTag) {
    andFilters.push({
      work_tags: {
        [Op.like]: `%${workTag}%`
      }
    });
  }

  const workTypeVariants = buildWorkTypeVariants(query.workType);
  if (workTypeVariants.length > 0) {
    andFilters.push({
      work_type: {
        [Op.in]: workTypeVariants
      }
    });
  }

  const normalizedIsPublic = normalizeBooleanFlag(query.isPublic);
  if (normalizedIsPublic !== null && mode !== 'public') {
    andFilters.push({
      is_public: normalizedIsPublic ? 1 : 0
    });
  }

  const rawWorkStatus = String(query.workStatus || '').trim();
  if (rawWorkStatus) {
    const parsedWorkStatus = Number(rawWorkStatus);
    andFilters.push({
      work_status: Number.isFinite(parsedWorkStatus) ? parsedWorkStatus : rawWorkStatus
    });
  }

  const workScene = String(query.workScene || '').trim().toLowerCase();
  if (workScene === 'course') {
    andFilters.push({
      course_id: {
        [Op.not]: null
      }
    });
  } else if (workScene === 'additional') {
    andFilters.push({
      classroom_id: {
        [Op.not]: null
      }
    });
    andFilters.push({
      [Op.or]: [
        { course_id: null },
        { course_id: '' }
      ]
    });
  } else if (workScene === 'create') {
    andFilters.push({
      [Op.or]: [
        { classroom_id: null },
        { classroom_id: '' }
      ]
    });
    andFilters.push({
      [Op.or]: [
        { course_id: null },
        { course_id: '' }
      ]
    });
  }

  if (mode !== 'my') {
    const authorIds = await resolveAuthorFilterIds(query);
    if (authorIds && authorIds.length === 0) {
      andFilters.push({
        student_id: '__no_match__'
      });
    } else if (authorIds && authorIds.length > 0) {
      andFilters.push({
        student_id: {
          [Op.in]: authorIds
        }
      });
    }
  }

  if (andFilters.length > 0) {
    where[Op.and] = andFilters;
  }

  return where;
}

async function loadAuthorProfileMap(studentIds = []) {
  const uniqueStudentIds = Array.from(
    new Set(
      studentIds
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  );

  if (uniqueStudentIds.length === 0) {
    return new Map();
  }

  const students = await models.TeachingStudent.findAll({
    where: {
      [Op.or]: [
        {
          id: {
            [Op.in]: uniqueStudentIds
          }
        },
        {
          username: {
            [Op.in]: uniqueStudentIds
          }
        },
        {
          student_no: {
            [Op.in]: uniqueStudentIds
          }
        }
      ],
      del_flag: 0
    },
    attributes: ['id', 'student_no', 'username', 'realname', 'avatar', 'remark'],
    raw: true
  });

  const profileMap = new Map();
  students.forEach((student) => {
    const profile = {
      id: student.id,
      username: student.username || student.student_no || '',
      realname: student.realname || '',
      sign: student.remark || '',
      avatarUrl: avatarUtil.normalizeAvatarUrl(
        student.avatar,
        student.student_no || student.username || student.realname || student.id
      )
    };

    [student.id, student.username, student.student_no]
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .forEach((key) => {
        profileMap.set(key, profile);
      });
  });

  const unresolvedIds = uniqueStudentIds.filter((studentId) => !profileMap.has(studentId));
  if (unresolvedIds.length > 0) {
    const sysUsers = await models.SysUser.findAll({
      where: {
        [Op.or]: [
          {
            id: {
              [Op.in]: unresolvedIds
            }
          },
          {
            username: {
              [Op.in]: unresolvedIds
            }
          }
        ],
        del_flag: 0
      },
      attributes: ['id', 'username', 'realname', 'avatar'],
      raw: true
    });

    sysUsers.forEach((user) => {
      const profile = {
        id: user.id,
        username: user.username || '',
        realname: user.realname || user.username || '',
        sign: '',
        avatarUrl: avatarUtil.normalizeAvatarUrl(
          user.avatar,
          user.username || user.realname || user.id
        )
      };

      [user.id, user.username]
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .forEach((key) => {
          profileMap.set(key, profile);
        });
    });
  }

  return profileMap;
}

function serializeModernWorkRecord(work, authorProfile = {}) {
  const workData = typeof work.toJSON === 'function' ? work.toJSON() : work;
  const workTags = parseJsonArray(workData.work_tags);

  return {
    id: workData.id,
    workName: workData.work_name,
    workDescription: workData.work_description || '',
    workType: String(workData.work_type || ''),
    workTypeCode: normalizeLegacyWorkType(workData.work_type),
    workTypeLabel: getWorkTypeLabel(workData.work_type),
    workFileUrl: workData.work_file_url || '',
    workFileName: workData.work_file_name || '',
    workFileSize: Number(workData.work_file_size) || 0,
    workFileExtension: workData.work_file_extension || '',
    workCoverUrl: workData.work_cover_url || '',
    workTags,
    isPublic: Number(workData.is_public) === 1,
    viewCount: Number(workData.view_count) || 0,
    likeCount: Number(workData.like_count) || 0,
    commentCount: Number(workData.comment_count) || 0,
    rating: Number(workData.rating) || 0,
    studentId: workData.student_id,
    studentName: authorProfile.realname || workData.student_name || '',
    username: authorProfile.username || '',
    avatarUrl: authorProfile.avatarUrl || '',
    workStatus: Number(workData.work_status) || 1,
    workStatusText: getWorkStatusLabel(workData.work_status),
    workScene: inferWorkScene(workData),
    classroomId: workData.classroom_id || '',
    courseId: workData.course_id || '',
    createTime: workData.create_time,
    updateTime: workData.update_time
  };
}

function serializeLegacyWorkRecord(work, authorProfile = {}) {
  const modernRecord = serializeModernWorkRecord(work, authorProfile);

  return {
    id: modernRecord.id,
    userId: modernRecord.studentId,
    studentId: modernRecord.studentId,
    username: modernRecord.username,
    realname: modernRecord.studentName,
    avatar_url: modernRecord.avatarUrl,
    workName: modernRecord.workName,
    workDescription: modernRecord.workDescription,
    workType: modernRecord.workTypeCode || modernRecord.workType,
    rawWorkType: modernRecord.workType,
    workType_dictText: modernRecord.workTypeLabel,
    workFileKey_url: modernRecord.workFileUrl,
    workFileUrl: modernRecord.workFileUrl,
    workFileName: modernRecord.workFileName,
    workFileSize: modernRecord.workFileSize,
    workFileExtension: modernRecord.workFileExtension,
    coverFileKey_url: modernRecord.workCoverUrl,
    workCoverUrl: modernRecord.workCoverUrl,
    workTag: modernRecord.workTags.join(','),
    workTags: modernRecord.workTags,
    isPublic: modernRecord.isPublic,
    is_public: modernRecord.isPublic ? 1 : 0,
    workStatus: modernRecord.workStatus,
    workStatus_dictText: modernRecord.workStatusText,
    viewNum: modernRecord.viewCount,
    starNum: modernRecord.likeCount,
    commentNum: modernRecord.commentCount,
    score: modernRecord.rating,
    teacherComment: '',
    workScene: modernRecord.workScene,
    departId: modernRecord.classroomId,
    departId_dictText: '',
    courseId: modernRecord.courseId,
    courseId_dictText: '',
    additionalId: modernRecord.classroomId,
    additionalId_dictText: '',
    createTime: modernRecord.createTime,
    updateTime: modernRecord.updateTime,
    downloadUrl: `/api/teaching/student/works/download/${modernRecord.id}`
  };
}

async function canAccessWork(req, work) {
  const workStatus = Number(work.work_status) || 1;

  if (Number(work.is_public) === 1 && workStatus === 1) {
    return true;
  }

  if (!req.user) {
    return false;
  }

  if (isPrivilegedUser(req)) {
    return true;
  }

  return isWorkOwner(req, work);
}

async function canEditWork(req, work) {
  if (!req.user) {
    return false;
  }

  if (isPrivilegedUser(req)) {
    return true;
  }

  return isWorkOwner(req, work);
}

async function incrementWorkViewCount(work) {
  await work.update({
    view_count: (Number(work.view_count) || 0) + 1,
    update_time: new Date()
  });
}

async function findWorkById(id) {
  if (!id) {
    return null;
  }

  return models.TeachingStudentWork.findOne({
    where: {
      id,
      del_flag: 0
    }
  });
}

async function listWorks(req, res, next, options = {}) {
  try {
    const {
      legacy = false,
      mode = 'public'
    } = options;

    const currentUserId = resolveCurrentUserId(req);
    const currentUserIds = mode === 'my'
      ? await resolveCurrentUserWorkOwnerIds(req)
      : [];
    const { pageNo, pageSize, offset } = normalizePagination(req.query || {});
    const where = await buildWorkWhereConditions(req.query || {}, {
      mode,
      currentUserId,
      currentUserIds
    });

    const { count, rows } = await models.TeachingStudentWork.findAndCountAll({
      where,
      order: normalizeSortOrder(req.query || {}),
      limit: pageSize,
      offset
    });

    const authorProfileMap = await loadAuthorProfileMap(rows.map((row) => row.student_id));
    const records = rows.map((row) => {
      const authorProfile = authorProfileMap.get(row.student_id) || {};
      return legacy
        ? serializeLegacyWorkRecord(row, authorProfile)
        : serializeModernWorkRecord(row, authorProfile);
    });

    return res.json(Response.page(records, count, pageNo, pageSize));
  } catch (error) {
    logger.error('[StudentWork] listWorks failed', {
      mode: options.mode,
      legacy: options.legacy,
      error: error.message
    });
    return next(error);
  }
}

async function getCompatibleWorkDetail(req, res, next, options = {}) {
  try {
    const {
      legacy = false
    } = options;

    const id = req.params?.id || req.query?.workId || req.query?.id;
    const work = await findWorkById(id);

    if (!work) {
      return res.json(Response.error('作品不存在', 404));
    }

    if (!await canAccessWork(req, work)) {
      return res.json(Response.error('无权查看该作品', 403));
    }

    await incrementWorkViewCount(work);
    const refreshedWork = await findWorkById(id);
    const authorProfileMap = await loadAuthorProfileMap([refreshedWork.student_id]);
    const authorProfile = authorProfileMap.get(refreshedWork.student_id) || {};

    return res.json(Response.success(
      legacy
        ? serializeLegacyWorkRecord(refreshedWork, authorProfile)
        : serializeModernWorkRecord(refreshedWork, authorProfile)
    ));
  } catch (error) {
    logger.error('[StudentWork] getCompatibleWorkDetail failed', {
      legacy: options.legacy,
      error: error.message
    });
    return next(error);
  }
}

function getWorkCommentsFromStore(workId) {
  return WORK_COMMENT_STORE.get(workId) || [];
}

function saveWorkCommentToStore(workId, commentRecord) {
  const comments = getWorkCommentsFromStore(workId);
  comments.unshift(commentRecord);
  WORK_COMMENT_STORE.set(workId, comments);
}

exports.uploadWork = async (req, res, next) => {
  try {
    const {
      workName,
      workDescription,
      workType,
      workFileUrl,
      workFileName,
      workFileSize,
      workFileExtension,
      workCoverUrl,
      workTags,
      isPublic,
      classroomId,
      courseId
    } = req.body || {};

    const userId = resolveCurrentUserId(req);
    const userName = req.user?.realname || req.user?.username || '';

    if (!workName) {
      return res.json(Response.error('作品名称不能为空', 400));
    }

    if (!workFileUrl) {
      return res.json(Response.error('作品文件不能为空', 400));
    }

    const normalizedWorkType = inferWorkTypeFromFile({
      rawWorkType: workType,
      fileName: workFileName,
      fileUrl: workFileUrl,
      fileExtension: workFileExtension
    });
    const normalizedWorkFileExtension = normalizeFileExtension(workFileExtension, workFileName, workFileUrl);

    if (!isRemoteUrl(workFileUrl)) {
      try {
        getSafeUploadFileName(workFileUrl);
      } catch (error) {
        return res.json(Response.error('作品文件路径不合法', 400));
      }
    }

    const work = await models.TeachingStudentWork.create({
      id: uuidUtil.generate(),
      work_name: workName,
      work_description: workDescription || null,
      work_type: normalizedWorkType,
      work_file_url: workFileUrl,
      work_file_name: workFileName || null,
      work_file_size: Number(workFileSize) || 0,
      work_file_extension: normalizedWorkFileExtension || null,
      work_cover_url: workCoverUrl || null,
      work_tags: stringifyTagArray(workTags),
      is_public: normalizeBooleanFlag(isPublic) ? 1 : 0,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      rating: 0,
      student_id: userId,
      student_name: userName,
      classroom_id: classroomId || null,
      course_id: courseId || null,
      work_status: 1,
      del_flag: 0,
      create_by: userId,
      create_time: new Date(),
      update_time: new Date()
    });

    return res.json(Response.success({
      id: work.id,
      workName: work.work_name,
      createTime: work.create_time
    }, '作品上传成功'));
  } catch (error) {
    logger.error('[StudentWork] uploadWork failed', {
      userId: resolveCurrentUserId(req),
      error: error.message
    });
    return next(error);
  }
};

exports.getMyWorks = async (req, res, next) => {
  return listWorks(req, res, next, {
    legacy: false,
    mode: 'my'
  });
};

exports.getPublicWorks = async (req, res, next) => {
  return listWorks(req, res, next, {
    legacy: false,
    mode: 'public'
  });
};

exports.getAllWorks = async (req, res, next) => {
  return listWorks(req, res, next, {
    legacy: false,
    mode: 'all'
  });
};

exports.getWorkDetail = async (req, res, next) => {
  return getCompatibleWorkDetail(req, res, next, {
    legacy: false
  });
};

exports.getLegacyMyWorks = async (req, res, next) => {
  return listWorks(req, res, next, {
    legacy: true,
    mode: 'my'
  });
};

exports.getLegacyAdditionalWorks = async (req, res, next) => {
  req.query = {
    ...(req.query || {}),
    workScene: 'additional'
  };

  return listWorks(req, res, next, {
    legacy: true,
    mode: 'my'
  });
};

exports.getLegacyAllWorks = async (req, res, next) => {
  return listWorks(req, res, next, {
    legacy: true,
    mode: 'all'
  });
};

exports.getLeaderboard = async (req, res, next) => {
  return listWorks(req, res, next, {
    legacy: true,
    mode: 'public'
  });
};

exports.getStudentWorkInfo = async (req, res, next) => {
  return getCompatibleWorkDetail(req, res, next, {
    legacy: true
  });
};

exports.getLegacyUserInfo = async (req, res, next) => {
  try {
    const userId = String(req.query?.userId || '').trim();

    if (!userId) {
      return res.json(Response.error('用户ID不能为空', 400));
    }

    const student = await models.TeachingStudent.findOne({
      where: {
        id: userId,
        del_flag: 0
      },
      attributes: ['id', 'student_no', 'username', 'realname', 'avatar', 'remark'],
      raw: true
    });

    if (student) {
      return res.json(Response.success({
        id: student.id,
        userId: student.id,
        username: student.username || student.student_no || '',
        realname: student.realname || '',
        sign: student.remark || '',
        avatar_url: avatarUtil.normalizeAvatarUrl(
          student.avatar,
          student.student_no || student.username || student.realname || student.id
        )
      }));
    }

    const user = await models.SysUser.findOne({
      where: {
        id: userId,
        del_flag: 0
      },
      attributes: ['id', 'username', 'realname', 'avatar'],
      raw: true
    });

    if (!user) {
      return res.json(Response.error('用户不存在', 404));
    }

    return res.json(Response.success({
      id: user.id,
      userId: user.id,
      username: user.username || '',
      realname: user.realname || user.username || '',
      sign: '',
      avatar_url: avatarUtil.normalizeAvatarUrl(
        user.avatar,
        user.username || user.realname || user.id
      )
    }));
  } catch (error) {
    logger.error('[StudentWork] getLegacyUserInfo failed', {
      error: error.message
    });
    return next(error);
  }
};

exports.getWorkAuthorProfile = async (req, res, next) => {
  try {
    const userId = String(req.params?.userId || req.query?.userId || '').trim();

    if (!userId) {
      return res.json(Response.error('用户ID不能为空', 400));
    }

    const student = await models.TeachingStudent.findOne({
      where: {
        id: userId,
        del_flag: 0
      },
      attributes: ['id', 'student_no', 'username', 'realname', 'avatar', 'remark'],
      raw: true
    });

    if (student) {
      return res.json(Response.success({
        id: student.id,
        userId: student.id,
        studentId: student.id,
        username: student.username || student.student_no || '',
        realname: student.realname || '',
        sign: student.remark || '',
        avatarUrl: avatarUtil.normalizeAvatarUrl(
          student.avatar,
          student.student_no || student.username || student.realname || student.id
        ),
        avatar_url: avatarUtil.normalizeAvatarUrl(
          student.avatar,
          student.student_no || student.username || student.realname || student.id
        )
      }));
    }

    const user = await models.SysUser.findOne({
      where: {
        id: userId,
        del_flag: 0
      },
      attributes: ['id', 'username', 'realname', 'avatar'],
      raw: true
    });

    if (!user) {
      return res.json(Response.error('用户不存在', 404));
    }

    const avatarUrl = avatarUtil.normalizeAvatarUrl(
      user.avatar,
      user.username || user.realname || user.id
    );

    return res.json(Response.success({
      id: user.id,
      userId: user.id,
      studentId: user.id,
      username: user.username || '',
      realname: user.realname || user.username || '',
      sign: '',
      avatarUrl,
      avatar_url: avatarUrl
    }));
  } catch (error) {
    logger.error('[StudentWork] getWorkAuthorProfile failed', {
      error: error.message
    });
    return next(error);
  }
};

exports.getWorkTags = async (req, res, next) => {
  try {
    const works = await models.TeachingStudentWork.findAll({
      where: {
        del_flag: 0
      },
      attributes: ['work_tags'],
      raw: true
    });

    const tagSet = new Set();
    works.forEach((work) => {
      parseJsonArray(work.work_tags).forEach((tag) => tagSet.add(tag));
    });

    return res.json(Response.success(Array.from(tagSet).sort()));
  } catch (error) {
    logger.error('[StudentWork] getWorkTags failed', {
      error: error.message
    });
    return next(error);
  }
};

exports.setWorkTag = async (req, res, next) => {
  try {
    const workId = req.query?.workId || req.body?.workId;
    const workTag = String(req.query?.workTag || req.body?.workTag || '').trim();

    if (!workId || !workTag) {
      return res.json(Response.error('作品ID和标签不能为空', 400));
    }

    const work = await findWorkById(workId);
    if (!work) {
      return res.json(Response.error('作品不存在', 404));
    }

    if (!await canEditWork(req, work)) {
      return res.json(Response.error('无权修改该作品标签', 403));
    }

    const tags = parseJsonArray(work.work_tags);
    if (!tags.includes(workTag)) {
      tags.push(workTag);
    }

    await work.update({
      work_tags: stringifyTagArray(tags),
      update_time: new Date()
    });

    return res.json(Response.success(tags, '标签更新成功'));
  } catch (error) {
    logger.error('[StudentWork] setWorkTag failed', {
      error: error.message
    });
    return next(error);
  }
};

exports.delWorkTag = async (req, res, next) => {
  try {
    const tag = String(req.query?.tag || req.body?.tag || '').trim();
    const force = normalizeBooleanFlag(req.query?.force || req.body?.force);

    if (!tag) {
      return res.json(Response.error('标签不能为空', 400));
    }

    const workScope = {
      del_flag: 0,
      work_tags: {
        [Op.like]: `%${tag}%`
      }
    };

    if (!isPrivilegedUser(req)) {
      const ownerIds = await getCachedCurrentUserWorkOwnerIds(req);
      workScope.student_id = buildOwnerMatchValue(ownerIds);
    }

    const works = await models.TeachingStudentWork.findAll({
      where: workScope
    });

    if (works.length === 0) {
      return res.json(Response.success([], '标签不存在或无需删除'));
    }

    if (!force && works.length > 1) {
      return res.json(Response.error(`标签仍被 ${works.length} 个作品使用，确认删除请重试`, 400));
    }

    for (const work of works) {
      const remainingTags = parseJsonArray(work.work_tags).filter((item) => item !== tag);
      await work.update({
        work_tags: stringifyTagArray(remainingTags),
        update_time: new Date()
      });
    }

    return res.json(Response.success([], '标签删除成功'));
  } catch (error) {
    logger.error('[StudentWork] delWorkTag failed', {
      error: error.message
    });
    return next(error);
  }
};

exports.starWork = async (req, res, next) => {
  try {
    const workId = req.query?.workId || req.body?.workId;
    const work = await findWorkById(workId);

    if (!work) {
      return res.json(Response.error('作品不存在', 404));
    }

    if (!await canAccessWork(req, work)) {
      return res.json(Response.error('无权操作该作品', 403));
    }

    await work.update({
      like_count: (Number(work.like_count) || 0) + 1,
      update_time: new Date()
    });

    return res.json(Response.success({
      workId: work.id,
      starNum: Number(work.like_count) + 1
    }, '点赞成功'));
  } catch (error) {
    logger.error('[StudentWork] starWork failed', {
      error: error.message
    });
    return next(error);
  }
};

exports.starWorkById = async (req, res, next) => {
  req.body = {
    ...(req.body || {}),
    workId: req.params?.id || req.body?.workId
  };
  req.query = {
    ...(req.query || {}),
    workId: req.params?.id || req.query?.workId
  };

  return exports.starWork(req, res, next);
};

exports.getWorkComments = async (req, res, next) => {
  try {
    const workId = String(req.query?.workId || '').trim();
    const page = Math.max(parseInt(req.query?.page || 1, 10) || 1, 1);
    const pageSize = 10;

    if (!workId) {
      return res.json(Response.success([]));
    }

    const work = await findWorkById(workId);
    if (!work) {
      return res.json(Response.error('作品不存在', 404));
    }

    if (!await canAccessWork(req, work)) {
      return res.json(Response.error('无权查看该作品评论', 403));
    }

    const comments = getWorkCommentsFromStore(workId);
    const startIndex = (page - 1) * pageSize;
    const pagedComments = comments.slice(startIndex, startIndex + pageSize);

    return res.json(Response.success(pagedComments));
  } catch (error) {
    logger.error('[StudentWork] getWorkComments failed', {
      error: error.message
    });
    return next(error);
  }
};

exports.getWorkCommentsById = async (req, res, next) => {
  req.query = {
    ...(req.query || {}),
    workId: req.params?.id || req.query?.workId
  };

  return exports.getWorkComments(req, res, next);
};

exports.saveComment = async (req, res, next) => {
  try {
    const workId = String(req.body?.workId || '').trim();
    const comment = String(req.body?.comment || '').trim();

    if (!workId || !comment) {
      return res.json(Response.error('作品ID和评论内容不能为空', 400));
    }

    const work = await findWorkById(workId);
    if (!work) {
      return res.json(Response.error('作品不存在', 404));
    }

    if (!await canAccessWork(req, work)) {
      return res.json(Response.error('无权评论该作品', 403));
    }

    const commentRecord = {
      id: uuidUtil.generate(),
      workId,
      comment,
      userId: resolveCurrentUserId(req),
      username: req.user?.username || '',
      realname: req.user?.realname || req.user?.username || '用户',
      avatar_url: avatarUtil.normalizeAvatarUrl(
        req.user?.avatar,
        req.user?.username || req.user?.realname || req.user?.id || 'U'
      ),
      createTime: new Date()
    };

    saveWorkCommentToStore(workId, commentRecord);

    return res.json(Response.success(commentRecord, '评论成功'));
  } catch (error) {
    logger.error('[StudentWork] saveComment failed', {
      error: error.message
    });
    return next(error);
  }
};

exports.saveCommentById = async (req, res, next) => {
  req.body = {
    ...(req.body || {}),
    workId: req.params?.id || req.body?.workId
  };

  return exports.saveComment(req, res, next);
};

exports.deleteWork = async (req, res, next) => {
  try {
    const id = req.params?.id || req.query?.id || req.body?.id;

    if (!id) {
      return res.json(Response.error('作品ID不能为空', 400));
    }

    const work = await findWorkById(id);

    if (!work) {
      return res.json(Response.error('作品不存在或无权删除', 404));
    }

    if (!await canEditWork(req, work)) {
      return res.json(Response.error('作品不存在或无权删除', 404));
    }

    await work.update({
      del_flag: 1,
      update_time: new Date()
    });

    return res.json(Response.success({}, '删除成功'));
  } catch (error) {
    logger.error('[StudentWork] deleteWork failed', {
      error: error.message
    });
    return next(error);
  }
};

exports.deleteBatchWorks = async (req, res, next) => {
  try {
    const rawIds = req.query?.ids || req.body?.ids || req.body?.idList || '';
    const ids = Array.isArray(rawIds)
      ? rawIds
      : String(rawIds)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    if (ids.length === 0) {
      return res.json(Response.error('请选择要删除的作品', 400));
    }

    const where = {
      id: {
        [Op.in]: ids
      },
      del_flag: 0
    };

    if (!isPrivilegedUser(req)) {
      const ownerIds = await getCachedCurrentUserWorkOwnerIds(req);
      Object.assign(where, buildOwnerScopeClause(ownerIds, resolveCurrentUserId(req)));
    }

    const works = await models.TeachingStudentWork.findAll({
      where
    });

    if (works.length === 0) {
      return res.json(Response.error('未找到可删除的作品', 404));
    }

    for (const work of works) {
      await work.update({
        del_flag: 1,
        update_time: new Date()
      });
    }

    return res.json(Response.success({
      deletedCount: works.length
    }, '批量删除成功'));
  } catch (error) {
    logger.error('[StudentWork] deleteBatchWorks failed', {
      error: error.message
    });
    return next(error);
  }
};

exports.updateWork = async (req, res, next) => {
  try {
    const { id } = req.params;
    const work = await findWorkById(id);

    if (!work) {
      return res.json(Response.error('作品不存在或无权修改', 404));
    }

    if (!await canEditWork(req, work)) {
      return res.json(Response.error('作品不存在或无权修改', 404));
    }

    const {
      workName,
      workDescription,
      workTags,
      isPublic,
      workCoverUrl,
      workFileUrl,
      workFileName,
      workFileSize,
      workFileExtension
    } = req.body || {};

    let nextWorkFileExtension = work.work_file_extension;
    if (workFileUrl !== undefined || workFileName !== undefined || workFileExtension !== undefined) {
      nextWorkFileExtension = normalizeFileExtension(
        workFileExtension !== undefined ? workFileExtension : work.work_file_extension,
        workFileName !== undefined ? workFileName : work.work_file_name,
        workFileUrl !== undefined ? workFileUrl : work.work_file_url
      ) || work.work_file_extension;
    }

    await work.update({
      work_name: workName || work.work_name,
      work_description: workDescription !== undefined ? workDescription : work.work_description,
      work_tags: workTags !== undefined ? stringifyTagArray(workTags) : work.work_tags,
      is_public: isPublic !== undefined ? (normalizeBooleanFlag(isPublic) ? 1 : 0) : work.is_public,
      work_file_url: workFileUrl !== undefined ? workFileUrl : work.work_file_url,
      work_file_name: workFileName !== undefined ? workFileName : work.work_file_name,
      work_file_size: workFileSize !== undefined ? (Number(workFileSize) || 0) : work.work_file_size,
      work_file_extension: nextWorkFileExtension,
      work_cover_url: workCoverUrl !== undefined ? workCoverUrl : work.work_cover_url,
      update_time: new Date()
    });

    return res.json(Response.success({}, '更新成功'));
  } catch (error) {
    logger.error('[StudentWork] updateWork failed', {
      error: error.message
    });
    return next(error);
  }
};

exports.downloadWork = async (req, res, next) => {
  try {
    const { id } = req.params;
    const redirectDownload = String(req.query?.redirect || '').trim() === '1';
    const work = await findWorkById(id);

    if (!work) {
      return res.json(Response.error('作品不存在', 404));
    }

    if (!await canAccessWork(req, work)) {
      return res.json(Response.error('无权下载该作品', 403));
    }

    const fileUrl = work.work_file_url;
    if (!fileUrl) {
      return res.json(Response.error('作品文件不存在', 404));
    }

    if (isRemoteUrl(fileUrl)) {
      if (redirectDownload) {
        return res.redirect(fileUrl);
      }

      return res.json(Response.success({
        downloadUrl: fileUrl,
        fileName: work.work_file_name || work.work_name,
        isRemote: true
      }, '获取下载链接成功'));
    }

    const uploadDir = path.join(__dirname, '../../uploads');

    let safeFileName;
    try {
      safeFileName = getSafeUploadFileName(fileUrl);
    } catch (error) {
      return res.json(Response.error('文件路径不合法', 400));
    }

    const filePath = resolvePathWithinDir(uploadDir, safeFileName);
    if (!fs.existsSync(filePath)) {
      return res.json(Response.error('文件不存在', 404));
    }

    const downloadName = work.work_file_name || `${work.work_name}.${work.work_file_extension || 'file'}`;
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
    res.setHeader('Content-Type', 'application/octet-stream');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error('[StudentWork] downloadWork failed', {
      error: error.message
    });
    return next(error);
  }
};
