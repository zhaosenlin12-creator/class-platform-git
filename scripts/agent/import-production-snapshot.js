const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT = path.resolve(__dirname, '..', '..')
const DOTENV = require(path.join(ROOT, 'backend', 'node_modules', 'dotenv'))
const mysql = require(path.join(ROOT, 'backend', 'node_modules', 'mysql2/promise'))
const bcrypt = require(path.join(ROOT, 'backend', 'node_modules', 'bcryptjs'))

DOTENV.config({ path: path.join(ROOT, 'backend', '.env') })
DOTENV.config({ path: path.join(ROOT, 'backend', '.env.local'), override: true })

const snapshotPath = String(process.argv[2] || '').trim()
const liveAdminPassword = String(process.argv[3] || '').trim()
const defaultStudentPassword = String(process.argv[4] || '123456')

if (!snapshotPath || !liveAdminPassword) {
  console.error(JSON.stringify({
    success: false,
    message: 'Usage: node scripts/agent/import-production-snapshot.js <snapshotPath> <liveAdminPassword> [defaultStudentPassword]'
  }, null, 2))
  process.exit(1)
}

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
const now = new Date()

function uuid32() {
  return crypto.randomUUID().replace(/-/g, '')
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function toDate(value) {
  return value ? new Date(value) : null
}

function normalizeDecimal(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeTinyInt(value, fallback = 0) {
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return 1
  }
  if (value === false || value === 'false' || value === 0 || value === '0') {
    return 0
  }
  return fallback
}

function normalizeCourseStatus(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'published' || normalized === 'active' || normalized === '1') {
    return 1
  }
  if (normalized === 'archived' || normalized === 'offline' || normalized === '3') {
    return 3
  }
  if (normalized === '2') {
    return 2
  }
  return 2
}

function normalizeStudentLifecycle(rawStatus, learningStatus) {
  const normalizedLearningStatus = String(learningStatus || '').trim().toLowerCase()
  const normalizedStatus = String(rawStatus || '').trim().toLowerCase()

  if (normalizedLearningStatus === 'paused' || normalizedStatus === 'paused') {
    return {
      status: 2,
      learningStatus: 'paused'
    }
  }

  if (normalizedLearningStatus === 'need_attention' || normalizedStatus === 'need_attention') {
    return {
      status: 3,
      learningStatus: 'need_attention'
    }
  }

  const parsedStatus = normalizeInteger(rawStatus, 1)
  if (parsedStatus === 2) {
    return {
      status: 2,
      learningStatus: 'paused'
    }
  }
  if (parsedStatus === 3) {
    return {
      status: 3,
      learningStatus: 'need_attention'
    }
  }

  return {
    status: 1,
    learningStatus: normalizedLearningStatus || 'normal'
  }
}

function normalizeJsonArray(value) {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    const filtered = value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
    return filtered.length > 0 ? JSON.stringify(filtered) : null
  }

  return JSON.stringify(value)
}

function deriveFileExtension(fileName = '', fileUrl = '') {
  const candidate = String(fileName || '').trim() || String(fileUrl || '').trim()
  if (!candidate) {
    return ''
  }

  const sanitizedCandidate = candidate.split('?')[0].split('#')[0]
  const lastDotIndex = sanitizedCandidate.lastIndexOf('.')
  return lastDotIndex >= 0 ? sanitizedCandidate.slice(lastDotIndex + 1).toLowerCase() : ''
}

function decodeFileName(fileUrl) {
  try {
    const url = new URL(String(fileUrl || '').trim())
    const fileName = path.posix.basename(url.pathname)
    return decodeURIComponent(fileName)
  } catch (error) {
    return ''
  }
}

function inferMimeType(extension) {
  const normalized = String(extension || '').trim().toLowerCase()
  const mimeTypes = {
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pdf: 'application/pdf',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    py: 'text/x-python',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    mp4: 'video/mp4'
  }

  return mimeTypes[normalized] || 'application/octet-stream'
}

function isRemoteUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim())
}

function getSnapshotRecords(response) {
  return asArray(response && response.data && response.data.result && response.data.result.records)
}

function getSnapshotResultArray(response) {
  return asArray(response && response.data && response.data.result)
}

function chunk(values, size = 200) {
  const result = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

function uniqueBy(rows, keyFn) {
  const map = new Map()
  for (const row of rows) {
    const key = keyFn(row)
    if (!key) {
      continue
    }
    map.set(key, row)
  }
  return [...map.values()]
}

function buildUserLookupMaps(sysUsers) {
  const byUsername = new Map()
  const byRealname = new Map()
  const byId = new Map()

  for (const user of sysUsers) {
    if (user.username) {
      byUsername.set(String(user.username), user)
    }
    if (user.realname) {
      byRealname.set(String(user.realname), user)
    }
    if (user.id) {
      byId.set(String(user.id), user)
    }
  }

  return { byUsername, byRealname, byId }
}

function resolveUserIdByDisplayName(name, userLookup) {
  const normalized = String(name || '').trim()
  if (!normalized) {
    return null
  }

  return userLookup.byUsername.get(normalized)?.id
    || userLookup.byRealname.get(normalized)?.id
    || null
}

function buildLiveCourses() {
  return getSnapshotRecords(snapshot.admin.courses).map((course) => ({
    id: course.id,
    course_name: course.courseName || course.name || null,
    course_code: course.courseCode || null,
    teacher_id: course.teacherId || null,
    teacher_name: course.teacherName || null,
    description: course.description || null,
    status: normalizeCourseStatus(course.status),
    create_time: toDate(course.createTime),
    update_time: toDate(course.updateTime),
    del_flag: 0,
    cover: course.cover || course.coverImage || null,
    category: course.category || course.subject || null,
    level: course.level || null,
    duration: normalizeInteger(course.duration, 0),
    price: normalizeDecimal(course.price, 0),
    student_count: normalizeInteger(course.studentCount, 0),
    avg_rating: normalizeDecimal(course.avgRating, 0)
  }))
}

function buildLiveClasses() {
  return getSnapshotRecords(snapshot.admin.classes).map((item) => ({
    id: item.id,
    class_name: item.name || item.className || null,
    class_no: item.code || null,
    teacher_id: item.teacherId || null,
    teacher_name: item.teacherName || null,
    student_count: normalizeInteger(item.enrolledCount, 0),
    description: item.description || null,
    status: normalizeInteger(item.status, item.statusKey === 'active' ? 1 : 2),
    create_time: toDate(item.createTime),
    update_time: toDate(item.updateTime),
    del_flag: 0,
    start_date: item.startDate || null,
    end_date: item.endDate || null,
    max_students: normalizeInteger(item.capacity, 30),
    classroom: item.location || null,
    schedule_weekdays: null,
    schedule_time_slots: null
  }))
}

function buildLiveStudents() {
  return getSnapshotRecords(snapshot.admin.students).map((student) => {
    const lifecycle = normalizeStudentLifecycle(student.rawStatus, student.learningStatus)
    return {
      id: student.id,
      username: student.username || null,
      student_no: student.studentNo || student.studentNumber || null,
      birthday: student.birthday || null,
      phone: student.phone || null,
      email: student.email || null,
      avatar: null,
      parent_phone: student.parentPhone || null,
      address: student.address || null,
      remark: student.remark || null,
      create_time: toDate(student.createTime),
      update_time: toDate(student.updateTime),
      del_flag: 0,
      realname: student.realname || student.name || null,
      sex: student.sex === undefined ? null : student.sex,
      id_card: student.idCard || null,
      parent_name: student.parentName || null,
      enrollment_date: student.enrollmentDate || null,
      status: lifecycle.status,
      learning_status: lifecycle.learningStatus,
      seat: student.seat || null
    }
  })
}

function buildLiveStudentUsers(existingStudentUsers, adminPasswordHash, studentPasswordHash) {
  const liveStudents = getSnapshotRecords(snapshot.admin.students)
  const liveWorks = getSnapshotRecords(snapshot.admin.studentWorks)
  const liveStudentUserIdByUsername = new Map()
  const existingStudentUserByUsername = new Map(existingStudentUsers.map((user) => [user.username, user]))

  for (const work of liveWorks) {
    if (work.username && work.studentId) {
      liveStudentUserIdByUsername.set(String(work.username), String(work.studentId))
    }
  }

  const loginStudentUserInfo = snapshot.meta?.studentLogin?.userInfo
  if (loginStudentUserInfo?.username && loginStudentUserInfo?.id) {
    liveStudentUserIdByUsername.set(
      String(loginStudentUserInfo.username),
      String(loginStudentUserInfo.id)
    )
  }

  const rows = []
  for (const student of liveStudents) {
    const existing = existingStudentUserByUsername.get(student.username)
    const resolvedId = liveStudentUserIdByUsername.get(student.username)
      || existing?.id
      || student.id
    rows.push({
      id: resolvedId,
      username: student.username,
      realname: student.realname || student.name || student.username,
      password: existing?.password || studentPasswordHash,
      salt: existing?.salt || null,
      avatar: null,
      birthday: student.birthday || null,
      sex: student.sex === undefined ? null : student.sex,
      email: student.email || null,
      phone: student.phone || null,
      status: 1,
      del_flag: 0,
      create_time: existing?.create_time || toDate(student.createTime) || now,
      update_time: toDate(student.updateTime) || now,
      user_identity: 3
    })
  }

  const adminExisting = existingStudentUserByUsername.get('admin')
  const adminUserInfo = snapshot.meta?.adminLogin?.userInfo || {}
  rows.push({
    id: String(adminUserInfo.id || adminExisting?.id || '1'),
    username: String(adminUserInfo.username || 'admin'),
    realname: String(adminUserInfo.realname || 'senlin'),
    password: adminPasswordHash,
    salt: adminExisting?.salt || null,
    avatar: null,
    birthday: adminExisting?.birthday || null,
    sex: adminExisting?.sex === undefined ? null : adminExisting?.sex,
    email: adminExisting?.email || null,
    phone: adminExisting?.phone || null,
    status: 1,
    del_flag: 0,
    create_time: adminExisting?.create_time || now,
    update_time: now,
    user_identity: 1
  })

  return uniqueBy(rows, (row) => row.username)
}

function buildLiveCourseUnits() {
  const map = new Map()

  for (const [courseId, response] of Object.entries(snapshot.admin.courseUnitsByCourse || {})) {
    for (const unit of getSnapshotResultArray(response)) {
      map.set(unit.id, {
        id: unit.id,
        course_id: unit.course_id || courseId,
        unit_name: unit.unit_name || unit.unitName || null,
        unit_no: unit.unit_no === undefined ? unit.unitNo : unit.unit_no,
        description: unit.description || null,
        objectives: unit.objectives || null,
        duration: normalizeInteger(unit.duration, 0),
        content_type: unit.content_type || unit.contentType || null,
        content_url: unit.content_url || unit.contentUrl || null,
        resource_id: unit.resource_id || unit.resourceId || null,
        resource_name: unit.resource_name || unit.resourceName || null,
        sort_no: normalizeInteger(unit.sort_no === undefined ? unit.sortNo : unit.sort_no, 0),
        create_by: unit.create_by || null,
        create_time: toDate(unit.create_time || unit.createTime),
        update_by: unit.update_by || null,
        update_time: toDate(unit.update_time || unit.updateTime),
        del_flag: 0
      })
    }
  }

  return [...map.values()]
}

function buildLiveResources(userLookup) {
  const map = new Map()

  for (const resource of getSnapshotRecords(snapshot.admin.resources)) {
    const fileUrl = resource.fileUrl || ''
    const fileExtension = String(resource.file_extension || resource.format || deriveFileExtension('', fileUrl)).toLowerCase()
    const uploaderName = resource.uploadBy || null

    map.set(resource.id, {
      id: resource.id,
      resource_name: resource.resource_name || resource.name || resource.title || null,
      resource_type: resource.resource_type || resource.type || null,
      course_id: resource.courseId || null,
      course_name: resource.courseName || null,
      course_system: resource.courseSystem || null,
      course_stage: resource.courseStage || null,
      file_name: decodeFileName(fileUrl) || `${resource.resource_name || resource.name || resource.title || 'resource'}${fileExtension ? `.${fileExtension}` : ''}`,
      file_path: null,
      file_size: normalizeInteger(resource.file_size || resource.size, 0),
      file_extension: fileExtension || null,
      mime_type: inferMimeType(fileExtension),
      file_url: fileUrl || null,
      storage_type: isRemoteUrl(fileUrl) ? 'oss' : 'local',
      folder_id: resource.folder || null,
      category: null,
      tags: null,
      description: resource.description || null,
      download_count: normalizeInteger(resource.download_count || resource.downloads, 0),
      view_count: normalizeInteger(resource.view_count || resource.views, 0),
      uploader_id: resolveUserIdByDisplayName(uploaderName, userLookup),
      uploader_name: uploaderName,
      create_time: toDate(resource.create_time || resource.uploadTime),
      update_time: toDate(resource.update_time || resource.create_time || resource.uploadTime),
      del_flag: 0
    })
  }

  for (const response of Object.values(snapshot.admin.classroomDetailsById || {})) {
    const detail = response?.data?.result
    if (!detail?.resourceId) {
      continue
    }

    const classroomResource = detail.resource || {}
    const fileUrl = classroomResource.fileUrl || ''
    const fileExtension = String(
      classroomResource.format
      || deriveFileExtension(classroomResource.name, fileUrl)
    ).toLowerCase()
    const existing = map.get(detail.resourceId)

    if (existing) {
      map.set(detail.resourceId, {
        ...existing,
        file_name: existing.file_name || decodeFileName(fileUrl) || `${detail.resourceName || classroomResource.name || 'resource'}${fileExtension ? `.${fileExtension}` : ''}`,
        file_size: existing.file_size || normalizeInteger(classroomResource.size, 0),
        file_extension: existing.file_extension || fileExtension || null,
        mime_type: existing.mime_type || classroomResource.mimeType || inferMimeType(fileExtension),
        file_url: existing.file_url || fileUrl || null,
        storage_type: existing.storage_type || classroomResource.storageType || (isRemoteUrl(fileUrl) ? 'oss' : 'local'),
        update_time: existing.update_time || toDate(detail.updateTime || detail.createTime)
      })
      continue
    }

    map.set(detail.resourceId, {
      id: detail.resourceId,
      resource_name: detail.resourceName || classroomResource.name || null,
      resource_type: detail.contentType || classroomResource.type || null,
      course_id: detail.courseId || null,
      course_name: detail.courseName || null,
      course_system: map.get(detail.resourceId)?.course_system || null,
      course_stage: map.get(detail.resourceId)?.course_stage || null,
      file_name: decodeFileName(fileUrl) || `${detail.resourceName || classroomResource.name || 'resource'}${fileExtension ? `.${fileExtension}` : ''}`,
      file_path: null,
      file_size: normalizeInteger(classroomResource.size, 0),
      file_extension: fileExtension || null,
      mime_type: classroomResource.mimeType || inferMimeType(fileExtension),
      file_url: fileUrl || null,
      storage_type: classroomResource.storageType || (isRemoteUrl(fileUrl) ? 'oss' : 'local'),
      folder_id: null,
      category: null,
      tags: null,
      description: detail.resourceName || null,
      download_count: map.get(detail.resourceId)?.download_count || 0,
      view_count: map.get(detail.resourceId)?.view_count || 0,
      uploader_id: map.get(detail.resourceId)?.uploader_id || null,
      uploader_name: map.get(detail.resourceId)?.uploader_name || null,
      create_time: toDate(detail.createTime),
      update_time: toDate(detail.updateTime || detail.createTime),
      del_flag: 0
    })
  }

  return [...map.values()]
}

function buildLiveClassrooms() {
  const classroomListById = new Map(
    getSnapshotRecords(snapshot.admin.classrooms).map((item) => [item.id, item])
  )

  return Object.values(snapshot.admin.classroomDetailsById || {})
    .map((response) => response?.data?.result)
    .filter(Boolean)
    .map((detail) => {
      const listRecord = classroomListById.get(detail.id) || {}
      const selectedLanguage =
        listRecord.selectedLanguage ||
        listRecord.selected_language ||
        detail.selectedLanguage ||
        detail.selected_language ||
        detail.contentType ||
        null

      return {
        id: detail.id,
        class_id: detail.classId || null,
        course_id: detail.courseId || null,
        course_name: detail.courseName || null,
        teacher_id: detail.teacherId || null,
        teacher_name: detail.teacherName || null,
        start_time: toDate(detail.startTime),
        end_time: toDate(detail.endTime),
        duration: normalizeInteger(detail.duration, 0),
        max_students: normalizeInteger(detail.maxStudents, 50),
        current_students: normalizeInteger(detail.currentStudents, 0),
        description: detail.description || null,
        status: detail.status || 'scheduled',
        create_time: toDate(detail.createTime),
        update_time: toDate(detail.updateTime),
        del_flag: 0,
        classroom_name: detail.classroomName || detail.roomName || detail.title || null,
        classroom_code: detail.classroomCode || null,
        lesson_id: detail.lessonId || null,
        lesson_name: detail.lessonName || null,
        resource_id: detail.resourceId || null,
        resource_name: detail.resourceName || null,
        resource_url: detail.resourceUrl || null,
        content_type: detail.contentType || null,
        selected_language: selectedLanguage,
        demo_content: null,
        demo_language: null
      }
    })
}

function buildLiveClassStudents() {
  const rows = []
  for (const [classId, response] of Object.entries(snapshot.admin.classStudentsByClass || {})) {
    for (const item of getSnapshotResultArray(response)) {
      rows.push({
        key: `${classId}:${item.id}`,
        class_id: classId,
        student_id: item.id,
        join_date: item.joinDate || null,
        status: 1,
        del_flag: 0,
        create_by: null,
        create_time: item.joinDate ? new Date(item.joinDate) : now,
        update_time: now
      })
    }
  }
  return rows
}

function buildLiveClassroomStudents() {
  const rows = []
  for (const response of Object.values(snapshot.admin.classroomStudentsById || {})) {
    for (const item of getSnapshotResultArray(response)) {
      rows.push({
        id: item.id,
        classroom_id: item.classroom_id,
        student_id: item.student_id,
        student_name: item.student_name || null,
        join_time: toDate(item.join_time),
        leave_time: toDate(item.leave_time),
        duration: normalizeInteger(item.duration, 0),
        is_present: normalizeTinyInt(item.is_present, 0),
        status: item.status || 'offline'
      })
    }
  }
  return uniqueBy(rows, (row) => row.id)
}

function buildLiveStudentWorks() {
  return getSnapshotRecords(snapshot.admin.studentWorks).map((work) => ({
    id: work.id,
    work_name: work.workName || null,
    work_description: work.workDescription || null,
    work_type: work.workType || null,
    work_file_url: work.workFileUrl || null,
    work_file_name: work.workFileName || null,
    work_file_size: normalizeInteger(work.workFileSize, 0),
    work_file_extension: work.workFileExtension || deriveFileExtension(work.workFileName, work.workFileUrl) || null,
    work_cover_url: work.workCoverUrl || null,
    work_tags: normalizeJsonArray(work.workTags),
    is_public: normalizeTinyInt(work.isPublic, 0),
    view_count: normalizeInteger(work.viewCount, 0),
    like_count: normalizeInteger(work.likeCount, 0),
    comment_count: normalizeInteger(work.commentCount, 0),
    rating: normalizeDecimal(work.rating, 0),
    student_id: work.studentId,
    student_name: work.studentName || null,
    classroom_id: work.classroomId || null,
    course_id: work.courseId || null,
    work_status: normalizeInteger(work.workStatus, 1),
    del_flag: 0,
    create_by: work.studentId || null,
    create_time: toDate(work.createTime),
    update_by: work.studentId || null,
    update_time: toDate(work.updateTime || work.createTime)
  }))
}

function buildLiveHomeworks() {
  return Object.values(snapshot.admin.homeworkDetailsById || {})
    .map((response) => response?.data?.result)
    .filter(Boolean)
    .map((homework) => ({
      id: homework.id,
      course_id: homework.course_id || homework.courseId || null,
      teacher_id: homework.teacher_id || homework.teacherId || null,
      teacher_name: homework.teacher_name || homework.teacherName || null,
      deadline: toDate(homework.deadline),
      total_score: normalizeInteger(homework.total_score || homework.totalScore, 100),
      status: homework.status || 'pending',
      create_by: homework.create_by || null,
      create_time: toDate(homework.create_time || homework.createTime),
      update_by: homework.update_by || null,
      update_time: toDate(homework.update_time || homework.updateTime),
      del_flag: 0,
      homework_title: homework.homework_title || homework.homeworkTitle || null,
      homework_type: homework.homework_type || homework.homeworkType || null,
      difficulty: normalizeInteger(homework.difficulty, 1),
      unit_id: homework.unit_id || homework.unitId || null,
      description: homework.description || null,
      requirements: homework.requirements || null,
      attachments: homework.attachments || null,
      resources: homework.resources || null,
      pass_score: normalizeInteger(homework.pass_score || homework.passScore, 60),
      publish_time: toDate(homework.publish_time || homework.publishTime),
      allow_late_submit: normalizeTinyInt(homework.allow_late_submit, 0),
      submitted_count: normalizeInteger(homework.submitted_count || homework.submissionCount, 0),
      total_students: normalizeInteger(homework.total_students || homework.totalStudents, 0),
      is_template: normalizeTinyInt(homework.is_template, 0),
      template_id: homework.template_id || homework.templateId || null
    }))
}

function buildLiveHomeworkSubmissions() {
  const rows = []
  for (const response of Object.values(snapshot.admin.homeworkSubmissionsById || {})) {
    const records = asArray(response?.data?.result?.records)
    for (const item of records) {
      rows.push({
        id: item.id,
        homework_id: item.homework_id || item.homeworkId,
        student_id: item.student_id || item.studentId,
        student_name: item.student_name || item.studentName || null,
        content: item.content || null,
        attachments: item.attachments || null,
        submit_time: toDate(item.submit_time || item.submitTime),
        is_late: normalizeTinyInt(item.is_late, 0),
        status: item.status || 'pending',
        score: item.score === undefined || item.score === null ? null : normalizeInteger(item.score, 0),
        feedback: item.feedback || null,
        reviewer_id: item.reviewer_id || item.reviewerId || null,
        reviewer_name: item.reviewer_name || item.reviewerName || null,
        review_time: toDate(item.review_time || item.reviewTime),
        revision_count: normalizeInteger(item.revision_count || item.revisionCount, 0)
      })
    }
  }
  return uniqueBy(rows, (row) => row.id)
}

function buildLiveHomeworkClasses() {
  const rows = []
  for (const response of Object.values(snapshot.admin.homeworkDetailsById || {})) {
    const homework = response?.data?.result
    if (!homework?.id) {
      continue
    }
    for (const classItem of asArray(homework.classes)) {
      rows.push({
        key: `${homework.id}:${classItem.id}`,
        homework_id: homework.id,
        class_id: classItem.id,
        class_name: classItem.name || classItem.className || null,
        create_time: toDate(homework.create_time || homework.createTime) || now
      })
    }
  }
  return rows
}

async function upsertById(connection, table, columns, rows) {
  if (!rows.length) {
    return
  }

  const sql = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${columns.map(() => '?').join(', ')})
    ON DUPLICATE KEY UPDATE ${columns.filter((column) => column !== 'id').map((column) => `${column} = VALUES(${column})`).join(', ')}
  `

  for (const row of rows) {
    const values = columns.map((column) => (Object.prototype.hasOwnProperty.call(row, column) ? row[column] : null))
    await connection.query(sql, values)
  }
}

async function upsertNaturalKeyRows(connection, table, naturalKeyColumns, existingRows, liveRows, buildRow) {
  const existingMap = new Map(existingRows.map((row) => [naturalKeyColumns.map((column) => row[column]).join(':'), row]))
  const rowsToUpsert = liveRows.map((row) => buildRow(row, existingMap.get(row.key || naturalKeyColumns.map((column) => row[column]).join(':'))))
  return rowsToUpsert
}

async function softDeleteMissingById(connection, table, liveIds, options = {}) {
  const idColumn = options.idColumn || 'id'
  const whereClause = options.whereClause || 'del_flag = 0'
  const [rows] = await connection.query(`SELECT ${idColumn} AS id FROM ${table} WHERE ${whereClause}`)
  const liveIdSet = new Set(liveIds.map((id) => String(id)))
  const extraIds = rows
    .map((row) => String(row.id))
    .filter((id) => !liveIdSet.has(id))

  for (const ids of chunk(extraIds)) {
    const sql = `UPDATE ${table} SET ${options.updateClause || 'del_flag = 1, update_time = ?'} WHERE ${idColumn} IN (${ids.map(() => '?').join(', ')})`
    const params = []
    if (!options.skipTimestamp) {
      params.push(now)
    }
    params.push(...ids)
    await connection.query(sql, params)
  }
}

async function deleteMissingById(connection, table, liveIds) {
  const [rows] = await connection.query(`SELECT id FROM ${table}`)
  const liveIdSet = new Set(liveIds.map((id) => String(id)))
  const extraIds = rows
    .map((row) => String(row.id))
    .filter((id) => !liveIdSet.has(id))

  for (const ids of chunk(extraIds)) {
    await connection.query(`DELETE FROM ${table} WHERE id IN (${ids.map(() => '?').join(', ')})`, ids)
  }
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: normalizeInteger(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'teaching_platform'
  })

  const adminPasswordHash = await bcrypt.hash(liveAdminPassword, 12)
  const studentPasswordHash = await bcrypt.hash(defaultStudentPassword, 12)

  const [allSysUsers] = await connection.query('SELECT id, username, realname, password, salt, birthday, sex, email, phone, status, del_flag, create_time, update_time, user_identity FROM sys_user')
  const [existingClassStudents] = await connection.query('SELECT id, class_id, student_id, status, del_flag, create_time FROM teaching_class_student')
  const [existingHomeworkClasses] = await connection.query('SELECT id, homework_id, class_id, class_name, create_time FROM teaching_homework_class')

  const userLookup = buildUserLookupMaps(allSysUsers)
  const adminSnapshotUser = snapshot.meta?.adminLogin?.userInfo
  if (adminSnapshotUser?.realname && adminSnapshotUser?.id) {
    userLookup.byRealname.set(String(adminSnapshotUser.realname), { id: String(adminSnapshotUser.id) })
  }
  const existingStudentUsers = allSysUsers.filter((user) => Number(user.user_identity) === 3 || String(user.username) === 'admin')

  const liveCourses = buildLiveCourses()
  const liveClasses = buildLiveClasses()
  const liveStudents = buildLiveStudents()
  const liveStudentUsers = buildLiveStudentUsers(existingStudentUsers, adminPasswordHash, studentPasswordHash)
  const liveCourseUnits = buildLiveCourseUnits()
  const liveResources = buildLiveResources(userLookup)
  const liveClassrooms = buildLiveClassrooms()
  const liveClassStudents = buildLiveClassStudents()
  const liveClassroomStudents = buildLiveClassroomStudents()
  const liveStudentWorks = buildLiveStudentWorks()
  const liveHomeworks = buildLiveHomeworks()
  const liveHomeworkSubmissions = buildLiveHomeworkSubmissions()
  const liveHomeworkClasses = buildLiveHomeworkClasses()

  const classStudentRowsToUpsert = await upsertNaturalKeyRows(
    connection,
    'teaching_class_student',
    ['class_id', 'student_id'],
    existingClassStudents,
    liveClassStudents,
    (row, existing) => ({
      id: existing?.id || uuid32(),
      class_id: row.class_id,
      student_id: row.student_id,
      create_by: existing?.create_by || null,
      create_time: existing?.create_time || row.create_time || now,
      update_time: now,
      del_flag: 0,
      join_date: row.join_date || null,
      status: 1
    })
  )

  const homeworkClassRowsToUpsert = await upsertNaturalKeyRows(
    connection,
    'teaching_homework_class',
    ['homework_id', 'class_id'],
    existingHomeworkClasses,
    liveHomeworkClasses,
    (row, existing) => ({
      id: existing?.id || uuid32(),
      homework_id: row.homework_id,
      class_id: row.class_id,
      class_name: row.class_name,
      create_time: existing?.create_time || row.create_time || now
    })
  )

  try {
    await connection.beginTransaction()

    await upsertById(connection, 'sys_user', [
      'id',
      'username',
      'realname',
      'password',
      'salt',
      'avatar',
      'birthday',
      'sex',
      'email',
      'phone',
      'status',
      'del_flag',
      'create_time',
      'update_time',
      'user_identity'
    ], liveStudentUsers)

    const liveStudentUsernames = liveStudentUsers
      .filter((row) => Number(row.user_identity) === 3)
      .map((row) => row.username)
    for (const usernames of chunk(
      allSysUsers
        .filter((row) => Number(row.user_identity) === 3 && Number(row.del_flag) === 0)
        .map((row) => row.username)
        .filter((username) => !new Set(liveStudentUsernames).has(username))
    )) {
      await connection.query(
        `UPDATE sys_user SET del_flag = 1, status = 0, update_time = ? WHERE username IN (${usernames.map(() => '?').join(', ')})`,
        [now, ...usernames]
      )
    }

    await upsertById(connection, 'teaching_student', [
      'id',
      'username',
      'student_no',
      'birthday',
      'phone',
      'email',
      'avatar',
      'parent_phone',
      'address',
      'remark',
      'create_time',
      'update_time',
      'del_flag',
      'realname',
      'sex',
      'id_card',
      'parent_name',
      'enrollment_date',
      'status',
      'learning_status',
      'seat'
    ], liveStudents)

    await upsertById(connection, 'teaching_course', [
      'id',
      'course_name',
      'course_code',
      'teacher_id',
      'teacher_name',
      'description',
      'status',
      'create_time',
      'update_time',
      'del_flag',
      'cover',
      'category',
      'level',
      'duration',
      'price',
      'student_count',
      'avg_rating'
    ], liveCourses)

    await upsertById(connection, 'teaching_class', [
      'id',
      'class_name',
      'class_no',
      'teacher_id',
      'teacher_name',
      'student_count',
      'description',
      'status',
      'create_time',
      'update_time',
      'del_flag',
      'start_date',
      'end_date',
      'max_students',
      'classroom',
      'schedule_weekdays',
      'schedule_time_slots'
    ], liveClasses)

    await upsertById(connection, 'teaching_course_unit', [
      'id',
      'course_id',
      'unit_name',
      'unit_no',
      'description',
      'objectives',
      'duration',
      'content_type',
      'content_url',
      'resource_id',
      'resource_name',
      'sort_no',
      'create_by',
      'create_time',
      'update_by',
      'update_time',
      'del_flag'
    ], liveCourseUnits)

    await upsertById(connection, 'teaching_resource', [
      'id',
      'resource_name',
      'resource_type',
      'course_id',
      'course_name',
      'course_system',
      'course_stage',
      'file_name',
      'file_path',
      'file_size',
      'file_extension',
      'mime_type',
      'file_url',
      'storage_type',
      'folder_id',
      'category',
      'tags',
      'description',
      'download_count',
      'view_count',
      'uploader_id',
      'uploader_name',
      'create_time',
      'update_time',
      'del_flag'
    ], liveResources)

    await upsertById(connection, 'teaching_classroom', [
      'id',
      'class_id',
      'course_id',
      'course_name',
      'teacher_id',
      'teacher_name',
      'start_time',
      'end_time',
      'duration',
      'max_students',
      'current_students',
      'description',
      'status',
      'create_time',
      'update_time',
      'del_flag',
      'classroom_name',
      'classroom_code',
      'lesson_id',
      'lesson_name',
      'resource_id',
      'resource_name',
      'resource_url',
      'content_type',
      'selected_language',
      'demo_content',
      'demo_language'
    ], liveClassrooms)

    await upsertById(connection, 'teaching_class_student', [
      'id',
      'class_id',
      'student_id',
      'create_by',
      'create_time',
      'update_time',
      'del_flag',
      'join_date',
      'status'
    ], classStudentRowsToUpsert)

    await upsertById(connection, 'teaching_classroom_student', [
      'id',
      'classroom_id',
      'student_id',
      'student_name',
      'join_time',
      'leave_time',
      'duration',
      'is_present',
      'status'
    ], liveClassroomStudents)

    await upsertById(connection, 'teaching_student_work', [
      'id',
      'work_name',
      'work_description',
      'work_type',
      'work_file_url',
      'work_file_name',
      'work_file_size',
      'work_file_extension',
      'work_cover_url',
      'work_tags',
      'is_public',
      'view_count',
      'like_count',
      'comment_count',
      'rating',
      'student_id',
      'student_name',
      'classroom_id',
      'course_id',
      'work_status',
      'del_flag',
      'create_by',
      'create_time',
      'update_by',
      'update_time'
    ], liveStudentWorks)

    await upsertById(connection, 'teaching_homework', [
      'id',
      'course_id',
      'teacher_id',
      'teacher_name',
      'deadline',
      'total_score',
      'status',
      'create_by',
      'create_time',
      'update_by',
      'update_time',
      'del_flag',
      'homework_title',
      'homework_type',
      'difficulty',
      'unit_id',
      'description',
      'requirements',
      'attachments',
      'resources',
      'pass_score',
      'publish_time',
      'allow_late_submit',
      'submitted_count',
      'total_students',
      'is_template',
      'template_id'
    ], liveHomeworks)

    await upsertById(connection, 'teaching_homework_submission', [
      'id',
      'homework_id',
      'student_id',
      'student_name',
      'content',
      'attachments',
      'submit_time',
      'is_late',
      'status',
      'score',
      'feedback',
      'reviewer_id',
      'reviewer_name',
      'review_time',
      'revision_count'
    ], liveHomeworkSubmissions)

    await upsertById(connection, 'teaching_homework_class', [
      'id',
      'homework_id',
      'class_id',
      'class_name',
      'create_time'
    ], homeworkClassRowsToUpsert)

    await softDeleteMissingById(connection, 'teaching_student', liveStudents.map((row) => row.id))
    await softDeleteMissingById(connection, 'teaching_course', liveCourses.map((row) => row.id))
    await softDeleteMissingById(connection, 'teaching_class', liveClasses.map((row) => row.id))
    await softDeleteMissingById(connection, 'teaching_course_unit', liveCourseUnits.map((row) => row.id))
    await softDeleteMissingById(connection, 'teaching_resource', liveResources.map((row) => row.id))
    await softDeleteMissingById(connection, 'teaching_classroom', liveClassrooms.map((row) => row.id))
    await softDeleteMissingById(connection, 'teaching_student_work', liveStudentWorks.map((row) => row.id))
    await softDeleteMissingById(connection, 'teaching_homework', liveHomeworks.map((row) => row.id))

    const liveClassStudentKeySet = new Set(liveClassStudents.map((row) => row.key))
    const extraActiveClassStudentIds = existingClassStudents
      .filter((row) => Number(row.del_flag) === 0 && Number(row.status) === 1)
      .filter((row) => !liveClassStudentKeySet.has(`${row.class_id}:${row.student_id}`))
      .map((row) => row.id)
    for (const ids of chunk(extraActiveClassStudentIds)) {
      await connection.query(
        `UPDATE teaching_class_student SET del_flag = 1, status = 2, update_time = ? WHERE id IN (${ids.map(() => '?').join(', ')})`,
        [now, ...ids]
      )
    }

    await deleteMissingById(connection, 'teaching_classroom_student', liveClassroomStudents.map((row) => row.id))
    await deleteMissingById(connection, 'teaching_homework_submission', liveHomeworkSubmissions.map((row) => row.id))

    const liveHomeworkClassKeySet = new Set(liveHomeworkClasses.map((row) => row.key))
    const extraHomeworkClassIds = existingHomeworkClasses
      .filter((row) => !liveHomeworkClassKeySet.has(`${row.homework_id}:${row.class_id}`))
      .map((row) => row.id)
    for (const ids of chunk(extraHomeworkClassIds)) {
      await connection.query(
        `DELETE FROM teaching_homework_class WHERE id IN (${ids.map(() => '?').join(', ')})`,
        ids
      )
    }

    await connection.commit()

    process.stdout.write(JSON.stringify({
      success: true,
      snapshotPath,
      summary: {
        sys_user_synced: liveStudentUsers.length,
        teaching_student_synced: liveStudents.length,
        teaching_course_synced: liveCourses.length,
        teaching_class_synced: liveClasses.length,
        teaching_course_unit_synced: liveCourseUnits.length,
        teaching_resource_synced: liveResources.length,
        teaching_classroom_synced: liveClassrooms.length,
        teaching_class_student_active_synced: classStudentRowsToUpsert.length,
        teaching_classroom_student_synced: liveClassroomStudents.length,
        teaching_student_work_synced: liveStudentWorks.length,
        teaching_homework_synced: liveHomeworks.length,
        teaching_homework_submission_synced: liveHomeworkSubmissions.length,
        teaching_homework_class_synced: homeworkClassRowsToUpsert.length
      }
    }, null, 2))
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    await connection.end()
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    snapshotPath,
    message: error.message
  }, null, 2))
  process.exit(1)
})
