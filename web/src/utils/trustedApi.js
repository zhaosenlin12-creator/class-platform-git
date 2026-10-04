const DEFAULT_PRODUCTION_API_BASE_URL = 'https://class.codebn.cn'

const runtimeConsole = typeof window !== 'undefined' && window.console
    ? window.console
    : global.console

const console = typeof window !== 'undefined' && window.__APP_DEBUG__ === true
    ? runtimeConsole
    : {
        log () {},
        warn () {},
        error (...args) {
            return runtimeConsole && runtimeConsole.error
                ? runtimeConsole.error(...args)
                : undefined
        }
    }

function hasWindow () {
    return typeof window !== 'undefined'
}

function getWindowConfigDomainUrl () {
    if (!hasWindow() || !window._CONFIG) {
        return ''
    }

    return typeof window._CONFIG.domianURL === 'string'
        ? window._CONFIG.domianURL.trim()
        : ''
}

function getBrowserOrigin () {
    if (!hasWindow() || !window.location || !window.location.origin) {
        return ''
    }

    return window.location.origin
}

function safeParseUrl (rawUrl, allowedProtocols = ['http:', 'https:']) {
    const normalized = String(rawUrl || '').trim()
    if (!normalized) {
        return null
    }

    try {
        const parsed = new URL(normalized)
        if (!allowedProtocols.includes(parsed.protocol)) {
            return null
        }

        if (parsed.username || parsed.password) {
            return null
        }

        return parsed
    } catch (_error) {
        return null
    }
}

function normalizeBaseUrl (parsedUrl) {
    if (!parsedUrl) {
        return ''
    }

    return parsedUrl.toString().replace(/\/+$/, '')
}

function normalizeTrustOrigin (parsedUrl) {
    if (!parsedUrl) {
        return ''
    }

    if (parsedUrl.protocol === 'ws:') {
        return `http://${parsedUrl.host}`
    }

    if (parsedUrl.protocol === 'wss:') {
        return `https://${parsedUrl.host}`
    }

    return parsedUrl.origin
}

function getStorageValue (storageName, key) {
    if (!hasWindow() || !window[storageName]) {
        return ''
    }

    try {
        return window[storageName].getItem(key) || ''
    } catch (_error) {
        return ''
    }
}

function parseVueLsValue (rawValue) {
    if (!rawValue) {
        return ''
    }

    try {
        const parsed = JSON.parse(rawValue)
        if (parsed && typeof parsed === 'object' && Object.prototype.hasOwnProperty.call(parsed, 'value')) {
            if (parsed.expire && parsed.expire < Date.now()) {
                return ''
            }
            return parsed.value || ''
        }
        return parsed || ''
    } catch (_error) {
        return rawValue
    }
}

function getConfiguredAllowedOrigins () {
    const rawValue = String(process.env.VUE_APP_API_ALLOWED_ORIGINS || '')
    if (!rawValue.trim()) {
        return []
    }

    return rawValue
        .split(/[,\s]+/)
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => safeParseUrl(item, ['http:', 'https:', 'ws:', 'wss:']))
        .filter(Boolean)
        .map(item => normalizeTrustOrigin(item))
}

export function getStoredAccessToken () {
    const directToken = getStorageValue('localStorage', 'Access-Token')
    if (directToken) {
        return directToken
    }

    const prefixedToken = getStorageValue('localStorage', 'pro__Access-Token')
    if (prefixedToken) {
        return parseVueLsValue(prefixedToken)
    }

    return ''
}

export function getTrustedApiOrigins () {
    const trustedOrigins = new Set()
    const addOrigin = (parsedUrl) => {
        const normalizedOrigin = normalizeTrustOrigin(parsedUrl)
        if (normalizedOrigin) {
            trustedOrigins.add(normalizedOrigin)
        }
    }

    const browserOrigin = getBrowserOrigin()
    if (browserOrigin) {
        trustedOrigins.add(browserOrigin)
    }

    addOrigin(safeParseUrl(DEFAULT_PRODUCTION_API_BASE_URL))
    addOrigin(safeParseUrl(process.env.VUE_APP_API_BASE_URL))
    addOrigin(safeParseUrl(process.env.VUE_APP_SOCKET_URL, ['http:', 'https:', 'ws:', 'wss:']))
    addOrigin(safeParseUrl(getWindowConfigDomainUrl()))

    getConfiguredAllowedOrigins().forEach(origin => {
        trustedOrigins.add(origin)
    })

    return trustedOrigins
}

function getTrustedStorageBaseUrl () {
    const trustedOrigins = getTrustedApiOrigins()
    const candidates = [
        { source: 'localStorage', value: getStorageValue('localStorage', 'domianURL') },
        { source: 'sessionStorage', value: getStorageValue('sessionStorage', 'domianURL') }
    ]

    for (const candidate of candidates) {
        const parsed = safeParseUrl(candidate.value)
        if (!parsed) {
            continue
        }

        if (trustedOrigins.has(normalizeTrustOrigin(parsed))) {
            return normalizeBaseUrl(parsed)
        }

        console.warn(`[Trusted API] Ignore untrusted ${candidate.source} domianURL: ${candidate.value}`)
    }

    return ''
}

export function resolveApiBaseUrl () {
    if (process.env.NODE_ENV === 'development') {
        return ''
    }

    const envBaseUrl = safeParseUrl(process.env.VUE_APP_API_BASE_URL)
    if (envBaseUrl) {
        return normalizeBaseUrl(envBaseUrl)
    }

    const configBaseUrl = safeParseUrl(getWindowConfigDomainUrl())
    if (configBaseUrl) {
        return normalizeBaseUrl(configBaseUrl)
    }

    const storageBaseUrl = getTrustedStorageBaseUrl()
    if (storageBaseUrl) {
        return storageBaseUrl
    }

    return DEFAULT_PRODUCTION_API_BASE_URL
}

function buildAbsoluteHttpUrl (requestUrl, baseURL) {
    const absoluteRequestUrl = safeParseUrl(requestUrl)
    if (absoluteRequestUrl) {
        return absoluteRequestUrl
    }

    const fallbackBaseUrl = baseURL || getBrowserOrigin()
    const parsedBaseUrl = safeParseUrl(fallbackBaseUrl)
    if (!parsedBaseUrl) {
        return null
    }

    const normalizedBaseUrl = normalizeBaseUrl(parsedBaseUrl)
    const normalizedRequestPath = String(requestUrl || '').replace(/^\/+/, '')
    return safeParseUrl(`${normalizedBaseUrl}/${normalizedRequestPath}`)
}

export function shouldAttachTokenToRequest (config = {}) {
    const targetUrl = buildAbsoluteHttpUrl(config.url, config.baseURL || resolveApiBaseUrl())
    if (!targetUrl) {
        return true
    }

    return getTrustedApiOrigins().has(normalizeTrustOrigin(targetUrl))
}

export function shouldAttachTokenToUrl (rawUrl) {
    const targetUrl = safeParseUrl(rawUrl, ['http:', 'https:', 'ws:', 'wss:'])
    if (!targetUrl) {
        return true
    }

    return getTrustedApiOrigins().has(normalizeTrustOrigin(targetUrl))
}

export function resolveSocketUrl () {
    const socketPort = process.env.VUE_APP_SOCKET_PORT || '8081'
    const browserHost = hasWindow() && window.location && window.location.hostname
        ? window.location.hostname
        : '127.0.0.1'
    const developmentSocketUrl = `http://${browserHost}:${socketPort}`

    if (process.env.NODE_ENV === 'development') {
        const devSocketUrl = safeParseUrl(process.env.VUE_APP_SOCKET_URL, ['http:', 'https:', 'ws:', 'wss:'])
        return devSocketUrl ? normalizeBaseUrl(devSocketUrl) : developmentSocketUrl
    }

    const configuredSocketUrl = safeParseUrl(process.env.VUE_APP_SOCKET_URL, ['http:', 'https:', 'ws:', 'wss:'])
    if (configuredSocketUrl) {
        return normalizeBaseUrl(configuredSocketUrl)
    }

    const configBaseUrl = safeParseUrl(getWindowConfigDomainUrl(), ['http:', 'https:'])
    if (configBaseUrl) {
        return normalizeBaseUrl(configBaseUrl)
    }

    const apiBaseUrl = resolveApiBaseUrl()
    const parsedApiBaseUrl = safeParseUrl(apiBaseUrl, ['http:', 'https:'])
    if (parsedApiBaseUrl) {
        return normalizeBaseUrl(parsedApiBaseUrl)
    }

    return developmentSocketUrl
}

export {
    DEFAULT_PRODUCTION_API_BASE_URL
}
