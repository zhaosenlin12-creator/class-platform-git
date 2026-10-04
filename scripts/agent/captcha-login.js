const http = require('http')
const https = require('https')
const path = require('path')
const opentype = require(path.join(__dirname, '../../backend/node_modules/opentype.js'))

const API_BASE_URL = process.env.AUDIT_API_BASE_URL || 'http://localhost:8081'
const FONT_SIZE = 38
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

const username = String(process.argv[2] || '').trim()
const password = String(process.argv[3] || '')

if (!username || !password) {
  console.error(JSON.stringify({
    success: false,
    message: 'Usage: node scripts/agent/captcha-login.js <username> <password>'
  }))
  process.exit(1)
}

const fontPath = path.join(__dirname, '../../backend/node_modules/svg-captcha/fonts/Comismsh.ttf')
const font = opentype.loadSync(fontPath)
const ascender = font.ascender
const descender = font.descender

function glyphPath (ch, x = 50, y = 20) {
  const fontScale = FONT_SIZE / font.unitsPerEm
  const glyph = font.charToGlyph(ch)
  const width = glyph.advanceWidth ? glyph.advanceWidth * fontScale : 0
  const left = x - (width / 2)
  const height = (ascender + descender) * fontScale
  const top = y + (height / 2)

  return glyph.getPath(left, top, FONT_SIZE).toPathData()
}

function parseFirstXY (d) {
  const match = String(d || '').match(/^M(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/)
  return match ? [parseFloat(match[1]), parseFloat(match[2])] : [0, 0]
}

function normalizeTokens (d) {
  const [x0, y0] = parseFirstXY(d)
  let index = 0

  return String(d || '').match(/[A-Za-z]|-?\d+(?:\.\d+)?/g).map((token) => {
    if (/^[A-Za-z]$/.test(token)) {
      return token
    }

    const n = parseFloat(token)
    const axis = index % 2
    index += 1
    return n - (axis === 0 ? x0 : y0)
  })
}

const templates = CHARSET.split('').map((ch) => {
  const tokens = normalizeTokens(glyphPath(ch))
  return {
    ch,
    len: tokens.length,
    commands: tokens.filter((token) => typeof token === 'string').join(''),
    nums: tokens.filter((token) => typeof token === 'number')
  }
})

function classifyPath (d) {
  const tokens = normalizeTokens(d)
  const len = tokens.length
  const commands = tokens.filter((token) => typeof token === 'string').join('')
  const nums = tokens.filter((token) => typeof token === 'number')
  let best = null

  for (const template of templates) {
    if (template.len !== len || template.commands !== commands) {
      continue
    }

    let totalSquaredError = 0
    for (let i = 0; i < nums.length; i += 1) {
      const diff = nums[i] - template.nums[i]
      totalSquaredError += diff * diff
    }

    const mse = totalSquaredError / nums.length
    if (!best || mse < best.mse) {
      best = { ch: template.ch, mse }
    }
  }

  return best
}

function decodeCaptchaSvg (svg) {
  const fills = [...String(svg || '').matchAll(/<path([^>]*?)fill=\"([^\"]+)\"([^>]*?)d=\"([^\"]+)\"\/>/g)].map((match) => match[4])
  const ordered = fills
    .map((d) => ({ d, x: parseFirstXY(d)[0] }))
    .sort((left, right) => left.x - right.x)
    .map((item) => item.d)

  return ordered.map((d) => {
    const match = classifyPath(d)
    return match ? match.ch : '?'
  }).join('')
}

function requestJson (method, targetPath, body, extraHeaders = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetPath, API_BASE_URL)
    const payload = body ? Buffer.from(JSON.stringify(body), 'utf8') : null
    const headers = {
      Accept: 'application/json',
      ...extraHeaders
    }
    const client = url.protocol === 'https:' ? https : http

    if (payload) {
      headers['Content-Type'] = 'application/json'
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
          reject(new Error(`Too many redirects while requesting ${url.toString()}`))
          return
        }

        const nextUrl = new URL(res.headers.location, url)
        requestJson(method, nextUrl.toString(), body, extraHeaders, redirectCount + 1)
          .then(resolve)
          .catch(reject)
        return
      }

      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        try {
          resolve({ status: res.statusCode, body: JSON.parse(text) })
        } catch (error) {
          reject(new Error(`Expected JSON but received: ${text.slice(0, 500)}`))
        }
      })
    })

    req.on('error', reject)
    if (payload) {
      req.write(payload)
    }
    req.end()
  })
}

async function main () {
  const captchaResponse = await requestJson('GET', `/sys/randomImage/${Date.now()}`)
  const captchaSvg = captchaResponse.body.result || captchaResponse.body.data || captchaResponse.body.img
  const checkKey = captchaResponse.body.checkKey || captchaResponse.body.code
  const captchaCode = decodeCaptchaSvg(captchaSvg)

  const loginResponse = await requestJson('POST', '/sys/login', {
    username,
    password,
    captcha: captchaCode,
    checkKey
  })

  process.stdout.write(JSON.stringify({
    captcha: captchaCode,
    login: loginResponse.body
  }))
}

main().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    message: error.message
  }))
  process.exit(1)
})
