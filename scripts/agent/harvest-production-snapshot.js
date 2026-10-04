const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..')
const LOGIN_SCRIPT = path.join(ROOT, 'scripts', 'agent', 'captcha-login.js')
const DEFAULT_API_BASE_URL = 'https://class.codebn.cn'
const DEFAULT_OUTPUT_DIR = path.join(ROOT, 'recovery')

const apiBaseUrl = String(process.env.AUDIT_API_BASE_URL || process.argv[2] || DEFAULT_API_BASE_URL).trim()
const adminUsername = String(process.env.PRODUCTION_ADMIN_USERNAME || process.argv[3] || '').trim()
const adminPassword = String(process.env.PRODUCTION_ADMIN_PASSWORD || process.argv[4] || '')
const studentUsername = String(process.env.PRODUCTION_STUDENT_USERNAME || process.argv[5] || '').trim()
const studentPassword = String(process.env.PRODUCTION_STUDENT_PASSWORD || process.argv[6] || '')
const outputFile = String(process.env.PRODUCTION_SNAPSHOT_FILE || process.argv[7] || '').trim()

if (!adminUsername || !adminPassword || !studentUsername || !studentPassword) {
  console.error(JSON.stringify({
    success: false,
    message: 'Usage: node scripts/agent/harvest-production-snapshot.js <apiBaseUrl> <adminUsername> <adminPassword> <studentUsername> <studentPassword> [outputFile]'
  }, null, 2))
  process.exit(1)
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function buildDefaultOutputFile() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return path.join(DEFAULT_OUTPUT_DIR, `production-snapshot-${timestamp}.json`)
}

function login(username, password) {
  const raw = execFileSync('node', [LOGIN_SCRIPT, username, password], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      AUDIT_API_BASE_URL: apiBaseUrl
    }
  })

  const payload = JSON.parse(raw)
  if (!payload.login || !payload.login.success || !payload.login.result || !payload.login.result.token) {
    throw new Error(`Login failed for ${username}: ${JSON.stringify(payload.login || payload)}`)
  }

  return {
    captcha: payload.captcha,
    token: payload.login.result.token,
    userIdentity: payload.login.result.userIdentity,
    userInfo: payload.login.result.userInfo || null,
    role: payload.login.result.role || []
  }
}

function requestJson(method, requestPath, token, body = null, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const url = new URL(requestPath, apiBaseUrl)
    const payload = body ? Buffer.from(JSON.stringify(body), 'utf8') : null
    const client = url.protocol === 'https:' ? https : http
    const headers = {
      Accept: 'application/json'
    }

    if (token) {
      headers['X-Access-Token'] = token
    }

    if (payload) {
      headers['Content-Type'] = 'application/json; charset=utf-8'
      headers['Content-Length'] = payload.length
    }

    const req = client.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirectCount >= 5) {
          reject(new Error(`Too many redirects for ${url.toString()}`))
          return
        }

        const nextUrl = new URL(res.headers.location, url)
        requestJson(method, nextUrl.toString(), token, body, redirectCount + 1)
          .then(resolve)
          .catch(reject)
        return
      }

      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        let data = null
        try {
          data = JSON.parse(text)
        } catch (error) {
          reject(new Error(`Expected JSON from ${requestPath} but received: ${text.slice(0, 500)}`))
          return
        }

        resolve({
          status: res.statusCode,
          data
        })
      })
    })

    req.on('error', reject)
    if (payload) {
      req.write(payload)
    }
    req.end()
  })
}

function appendQuery(requestPath, params) {
  const url = new URL(requestPath, apiBaseUrl)
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  return `${url.pathname}${url.search}`
}

function getRecordsPayload(response) {
  const result = response && response.data && response.data.result
  if (result && Array.isArray(result.records)) {
    return result
  }
  return null
}

async function fetchPaged(requestPath, token, options = {}) {
  const pageSize = options.pageSize || 1000
  const firstResponse = await requestJson(
    'GET',
    appendQuery(requestPath, { pageNo: 1, pageSize }),
    token
  )

  const firstResult = getRecordsPayload(firstResponse)
  if (!firstResult) {
    return firstResponse
  }

  const pageCount = Number(firstResult.pages || 1)
  const mergedRecords = Array.isArray(firstResult.records) ? [...firstResult.records] : []

  for (let pageNo = 2; pageNo <= pageCount; pageNo += 1) {
    const pageResponse = await requestJson(
      'GET',
      appendQuery(requestPath, { pageNo, pageSize }),
      token
    )
    const pageResult = getRecordsPayload(pageResponse)
    if (pageResult && Array.isArray(pageResult.records)) {
      mergedRecords.push(...pageResult.records)
    }
  }

  return {
    status: firstResponse.status,
    data: {
      ...firstResponse.data,
      result: {
        ...firstResult,
        records: mergedRecords,
        pageNo: 1,
        current: 1,
        pageSize,
        size: pageSize,
        pages: pageCount
      }
    }
  }
}

async function fetchMapByIds(token, ids, buildRequestPath) {
  const result = {}
  for (const id of ids) {
    const key = String(id || '').trim()
    if (!key) {
      continue
    }

    result[key] = await requestJson('GET', buildRequestPath(key), token)
  }
  return result
}

function unwrapRecords(response) {
  return response && response.data && response.data.result && Array.isArray(response.data.result.records)
    ? response.data.result.records
    : []
}

async function harvestAdmin(token) {
  const menu = await requestJson('GET', '/teaching/menu/getUserMenu', token)
  const perm = await requestJson('GET', '/sys/permission/getUserPermissionByToken', token)
  const userInfo = await requestJson('GET', '/teaching/user/info', token)
  const courses = await fetchPaged('/teaching/course/listAll', token)
  const classes = await fetchPaged('/teaching/class/listAll', token)
  const resources = await fetchPaged('/teaching/course/resources/list', token)
  const classrooms = await fetchPaged('/teaching/classroom/list', token)
  const students = await fetchPaged('/teaching/student/listAll', token)
  const studentWorks = await fetchPaged('/teaching/student/works/all', token)
  const homework = await fetchPaged('/teaching/homework/list', token)

  const courseIds = unwrapRecords(courses).map((item) => item.id)
  const classIds = unwrapRecords(classes).map((item) => item.id)
  const classroomIds = unwrapRecords(classrooms).map((item) => item.id)
  const homeworkIds = unwrapRecords(homework).map((item) => item.id || item.homeworkId).filter(Boolean)

  const courseUnitsByCourse = await fetchMapByIds(token, courseIds, (courseId) => `/teaching/teachingCourseUnit/list?courseId=${encodeURIComponent(courseId)}`)
  const classStudentsByClass = await fetchMapByIds(token, classIds, (classId) => `/teaching/class/students/${encodeURIComponent(classId)}`)
  const classroomDetailsById = await fetchMapByIds(token, classroomIds, (classroomId) => `/teaching/classroom/${encodeURIComponent(classroomId)}`)
  const classroomStudentsById = await fetchMapByIds(token, classroomIds, (classroomId) => `/teaching/classroom/students/${encodeURIComponent(classroomId)}`)
  const homeworkDetailsById = await fetchMapByIds(token, homeworkIds, (homeworkId) => `/teaching/homework/details/${encodeURIComponent(homeworkId)}`)
  const homeworkSubmissionsById = await fetchMapByIds(token, homeworkIds, (homeworkId) => `/teaching/homework/submissions/${encodeURIComponent(homeworkId)}`)

  return {
    menu,
    perm,
    userInfo,
    courses,
    classes,
    resources,
    classrooms,
    students,
    studentWorks,
    homework,
    courseUnitsByCourse,
    classStudentsByClass,
    classroomDetailsById,
    classroomStudentsById,
    homeworkDetailsById,
    homeworkSubmissionsById,
    summary: {
      courses: unwrapRecords(courses).length,
      classes: unwrapRecords(classes).length,
      resources: unwrapRecords(resources).length,
      classrooms: unwrapRecords(classrooms).length,
      students: unwrapRecords(students).length,
      studentWorks: unwrapRecords(studentWorks).length,
      homework: unwrapRecords(homework).length
    }
  }
}

async function harvestStudent(token) {
  const menu = await requestJson('GET', '/teaching/menu/getUserMenu', token)
  const perm = await requestJson('GET', '/sys/permission/getUserPermissionByToken', token)
  const userInfo = await requestJson('GET', '/teaching/user/info', token)
  const myClassrooms = await requestJson('GET', '/teaching/classroom/student/my-classrooms', token)
  const myWorks = await fetchPaged('/teaching/student/works/my', token)
  const homework = await requestJson('GET', '/teaching/student/homework', token)

  return {
    menu,
    perm,
    userInfo,
    myClassrooms,
    myWorks,
    homework,
    summary: {
      myWorks: unwrapRecords(myWorks).length,
      finishedClassrooms: Array.isArray(myClassrooms?.data?.result?.finished) ? myClassrooms.data.result.finished.length : 0
    }
  }
}

function buildSnapshotMetadata() {
  return {
    capturedAt: new Date().toISOString(),
    apiBaseUrl,
    accounts: {
      adminUsername,
      studentUsername
    }
  }
}

async function main() {
  const targetFile = outputFile || buildDefaultOutputFile()
  ensureDir(path.dirname(targetFile))

  const adminSession = login(adminUsername, adminPassword)
  const studentSession = login(studentUsername, studentPassword)

  const snapshot = {
    meta: {
      ...buildSnapshotMetadata(),
      adminLogin: {
        captcha: adminSession.captcha,
        userIdentity: adminSession.userIdentity,
        userInfo: adminSession.userInfo,
        role: adminSession.role
      },
      studentLogin: {
        captcha: studentSession.captcha,
        userIdentity: studentSession.userIdentity,
        userInfo: studentSession.userInfo,
        role: studentSession.role
      }
    },
    admin: await harvestAdmin(adminSession.token),
    student: await harvestStudent(studentSession.token)
  }

  fs.writeFileSync(targetFile, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')

  process.stdout.write(JSON.stringify({
    success: true,
    apiBaseUrl,
    outputFile: targetFile,
    summary: {
      admin: snapshot.admin.summary,
      student: snapshot.student.summary
    }
  }, null, 2))
}

main().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    apiBaseUrl,
    message: error.message
  }, null, 2))
  process.exit(1)
})
