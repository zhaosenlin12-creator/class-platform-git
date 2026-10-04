const http = require('http')
const { execFileSync } = require('child_process')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')
const API_BASE_URL = process.env.AUDIT_API_BASE_URL || 'http://localhost:8081'
const LOGIN_SCRIPT = path.join(ROOT, 'scripts', 'agent', 'captcha-login.js')
const ADMIN_USERNAME = process.argv[2] || 'admin'
const ADMIN_PASSWORD = process.argv[3] || 'zsl13177068887'

function login(username, password) {
  const payload = JSON.parse(execFileSync('node', [LOGIN_SCRIPT, username, password], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      AUDIT_API_BASE_URL: API_BASE_URL
    }
  }))

  if (!payload.login || !payload.login.success) {
    throw new Error(`Login failed for ${username}: ${JSON.stringify(payload.login || payload)}`)
  }

  return payload.login.result
}

function request(method, requestPath, token, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(requestPath, API_BASE_URL)
    const body = data ? Buffer.from(JSON.stringify(data), 'utf8') : null
    const headers = {
      Accept: 'application/json'
    }

    if (token) {
      headers['X-Access-Token'] = token
    }

    if (body) {
      headers['Content-Type'] = 'application/json; charset=utf-8'
      headers['Content-Length'] = body.length
    }

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers
    }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        try {
          resolve({ status: res.statusCode, body: JSON.parse(text) })
        } catch (error) {
          resolve({ status: res.statusCode, body: text })
        }
      })
    })

    req.on('error', reject)
    if (body) {
      req.write(body)
    }
    req.end()
  })
}

async function main() {
  const admin = login(ADMIN_USERNAME, ADMIN_PASSWORD)
  const adminToken = admin.token
  const timestamp = Date.now()
  const studentNo = `SMOKE${String(timestamp).slice(-8)}`
  const studentName = `SmokeStudent${String(timestamp).slice(-4)}`
  let createdStudentId = null

  try {
    const createResponse = await request('POST', '/student', adminToken, {
      studentNo,
      username: studentNo,
      realname: studentName,
      phone: null,
      status: 1,
      learningStatus: 'normal'
    })

    if (createResponse.status >= 400 || !createResponse.body || !createResponse.body.success) {
      throw new Error(`Create student failed: ${JSON.stringify(createResponse.body)}`)
    }

    createdStudentId = createResponse.body.result && createResponse.body.result.id
    if (!createdStudentId) {
      throw new Error(`Create student returned no id: ${JSON.stringify(createResponse.body)}`)
    }

    const studentLogin = login(studentNo, '123456')
    const studentToken = studentLogin.token

    const detailResponse = await request('GET', `/student/${createdStudentId}`, adminToken)
    if (detailResponse.status >= 400 || !detailResponse.body || !detailResponse.body.success) {
      throw new Error(`Fetch student detail failed: ${JSON.stringify(detailResponse.body)}`)
    }

    const deleteResponse = await request('DELETE', `/student/${createdStudentId}`, adminToken)
    if (deleteResponse.status >= 400 || !deleteResponse.body || !deleteResponse.body.success) {
      throw new Error(`Delete student failed: ${JSON.stringify(deleteResponse.body)}`)
    }

    createdStudentId = null

    process.stdout.write(JSON.stringify({
      success: true,
      apiBaseUrl: API_BASE_URL,
      studentNo,
      studentName,
      createStatus: createResponse.status,
      studentIdentity: studentLogin.userIdentity,
      studentTokenIssued: Boolean(studentToken),
      detailStatus: detailResponse.status,
      deleteStatus: deleteResponse.status
    }, null, 2))
  } finally {
    if (createdStudentId) {
      try {
        await request('DELETE', `/student/${createdStudentId}`, adminToken)
      } catch (error) {
        // Best-effort cleanup only.
      }
    }
  }
}

main().catch((error) => {
  process.stderr.write(JSON.stringify({
    success: false,
    apiBaseUrl: API_BASE_URL,
    message: error.message
  }, null, 2))
  process.exit(1)
})
