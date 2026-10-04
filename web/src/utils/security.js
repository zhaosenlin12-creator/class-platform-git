/**
 * 安全工具函数
 * 提供XSS过滤、输入验证、URL验证等安全功能
 */

/**
 * 清理用户输入,防止XSS攻击
 * @param {string} input - 用户输入的字符串
 * @param {Object} options - 配置选项
 * @param {number} options.maxLength - 最大长度限制,默认500
 * @param {boolean} options.allowSpaces - 是否允许空格,默认true
 * @returns {string} 清理后的安全字符串
 */
export function sanitizeInput (input, options = {}) {
    if (!input) return ''

    const {
        maxLength = 500,
        allowSpaces = true
    } = options

    let cleaned = String(input)

    // 1. 先移除script、style、iframe标签及其内容
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')

    // 2. 移除HTML标签
    cleaned = cleaned.replace(/<[^>]*>/g, '')

    // 3. 移除危险字符
    cleaned = cleaned.replace(/[<>'"]/g, '')

    // 4. 移除控制字符和特殊Unicode
    // eslint-disable-next-line no-control-regex
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '')

    // 5. 移除可能的脚本注入
    cleaned = cleaned.replace(/javascript:/gi, '')
    cleaned = cleaned.replace(/on\w+\s*=/gi, '')

    // 6. 处理空格
    if (!allowSpaces) {
        cleaned = cleaned.replace(/\s+/g, '')
    } else {
    // 规范化空格
        cleaned = cleaned.replace(/\s+/g, ' ').trim()
    }

    // 7. 限制长度
    if (maxLength > 0) {
        cleaned = cleaned.substring(0, maxLength)
    }

    return cleaned
}

/**
 * 清理HTML内容,保留安全的标签
 * 用于v-html等需要渲染HTML的场景
 * @param {string} html - HTML字符串
 * @param {Object} options - 配置选项
 * @returns {string} 清理后的安全HTML
 */
export function sanitizeHTML (html, _options = {}) {
    if (!html) return ''

    // 允许的安全标签
    const allowedTags = [
        'p', 'br', 'b', 'i', 'u', 'strong', 'em',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'a', 'span', 'div', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'pre', 'code', 'blockquote'
    ]

    // 允许的属性
    const _allowedAttrs = {
        'a': ['href', 'title', 'target'],
        'img': ['src', 'alt', 'width', 'height'],
        '*': ['class', 'id']
    }

    let cleaned = String(html)

    // 0. Unicode转义字符解码并清理
    cleaned = cleaned.replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => {
        const char = String.fromCharCode(parseInt(code, 16))
        // 如果解码后是危险字符,替换为空
        const dangerousChars = '<>"\''
        if (dangerousChars.includes(char)) return ''
        return char
    })
    cleaned = cleaned.replace(/\\x([0-9a-fA-F]{2})/g, (match, code) => {
        const char = String.fromCharCode(parseInt(code, 16))
        const dangerousChars = '<>"\''
        if (dangerousChars.includes(char)) return ''
        return char
    })

    // 清理全角字符中的潜在XSS
    cleaned = cleaned.replace(/[＜＞]/g, '')

    // 1. 移除script标签
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

    // 2. 移除style标签及其内容(包含内联样式中的javascript:)
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

    // 3. 移除iframe
    cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')

    // 4. 移除事件处理器
    cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    cleaned = cleaned.replace(/on\w+\s*=\s*[^\s>]*/gi, '')

    // 5. 清理javascript:协议 (在各种属性中)
    cleaned = cleaned.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
    cleaned = cleaned.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""')
    cleaned = cleaned.replace(/action\s*=\s*["']javascript:[^"']*["']/gi, 'action=""')

    // 清理style属性中的javascript:
    cleaned = cleaned.replace(/style\s*=\s*["'][^"']*javascript:[^"']*["']/gi, 'style=""')

    // 6. 清理data:协议 (防止base64编码的脚本)
    cleaned = cleaned.replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""')
    cleaned = cleaned.replace(/href\s*=\s*["']data:[^"']*["']/gi, 'href="#"')

    // 7. 清理Markdown风格的链接中的危险协议
    // [text](javascript:...) 或 ![text](javascript:...)
    cleaned = cleaned.replace(/\[([^\]]+)\]\(javascript:[^)]*\)/gi, '[$1](#)')
    cleaned = cleaned.replace(/!\[([^\]]+)\]\(javascript:[^)]*\)/gi, '![$1](#)')
    cleaned = cleaned.replace(/\[([^\]]+)\]\(data:[^)]*\)/gi, '[$1](#)')

    // 8. 移除不允许的标签 (保留内容)
    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g
    cleaned = cleaned.replace(tagPattern, (match, tagName) => {
        const tag = tagName.toLowerCase()
        if (allowedTags.includes(tag)) {
            return match
        }
        return '' // 移除不允许的标签
    })

    return cleaned
}

/**
 * 验证URL是否安全
 * @param {string} url - 要验证的URL
 * @param {Object} options - 配置选项
 * @param {string[]} options.allowedProtocols - 允许的协议,默认['http', 'https']
 * @param {string[]} options.blockedDomains - 黑名单域名
 * @returns {Object} { valid: boolean, error: string, sanitized: string }
 */
export function validateURL (url, options = {}) {
    const {
        allowedProtocols = ['http', 'https'],
        blockedDomains = []
    } = options

    if (!url || typeof url !== 'string') {
        return { valid: false, error: 'URL不能为空', sanitized: '' }
    }

    // 移除首尾空格
    const trimmedUrl = url.trim()

    // 1. 基本格式验证
    const urlPattern = /^(https?):\/\/([\w.-]+)(:\d+)?(\/[^\s]*)?$/i
    if (!urlPattern.test(trimmedUrl)) {
        return { valid: false, error: 'URL格式不正确', sanitized: '' }
    }

    try {
        const urlObj = new URL(trimmedUrl)

        // 2. 协议验证
        const protocol = urlObj.protocol.replace(':', '').toLowerCase()
        if (!allowedProtocols.includes(protocol)) {
            return {
                valid: false,
                error: `不允许的协议: ${protocol}`,
                sanitized: ''
            }
        }

        // 3. 黑名单域名检查
        const hostname = urlObj.hostname.toLowerCase()
        if (blockedDomains.some(domain => hostname.includes(domain))) {
            return {
                valid: false,
                error: '该域名不被允许',
                sanitized: ''
            }
        }

        // 4. 防止SSRF攻击 - 禁止内网IP
        const privateIPPattern = /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/
        if (privateIPPattern.test(hostname)) {
            return {
                valid: false,
                error: '不允许访问内网地址',
                sanitized: ''
            }
        }

        // 5. 清理URL中的危险字符
        const sanitized = trimmedUrl
            .replace(/javascript:/gi, '')
            .replace(/data:/gi, '')
            .replace(/<[^>]*>/g, '')

        return {
            valid: true,
            error: '',
            sanitized: sanitized
        }
    } catch (e) {
        return {
            valid: false,
            error: 'URL解析失败: ' + e.message,
            sanitized: ''
        }
    }
}

/**
 * 验证文件名是否安全
 * @param {string} filename - 文件名
 * @returns {Object} { valid: boolean, error: string, sanitized: string }
 */
export function validateFilename (filename) {
    if (!filename || typeof filename !== 'string') {
        return { valid: false, error: '文件名不能为空', sanitized: '' }
    }

    // 1. 检查路径遍历攻击
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return {
            valid: false,
            error: '文件名包含非法字符 (.. / \\)',
            sanitized: ''
        }
    }

    // 2. 检查特殊字符
    // eslint-disable-next-line no-control-regex
    const dangerousChars = /[<>:"|?*\x00-\x1F]/
    if (dangerousChars.test(filename)) {
        return {
            valid: false,
            error: '文件名包含非法字符',
            sanitized: ''
        }
    }

    // 3. 检查文件名长度
    if (filename.length > 255) {
        return {
            valid: false,
            error: '文件名过长 (最多255字符)',
            sanitized: ''
        }
    }

    // 4. 检查是否为空或只有空格
    if (filename.trim().length === 0) {
        return {
            valid: false,
            error: '文件名不能为空',
            sanitized: ''
        }
    }

    // 5. 清理文件名
    const sanitized = filename
        .replace(/[<>:"|?*]/g, '')
        .replace(/\s+/g, '_')
        .trim()

    return {
        valid: true,
        error: '',
        sanitized: sanitized
    }
}

/**
 * 验证文件MIME类型
 * @param {File} file - File对象
 * @param {string[]} allowedTypes - 允许的MIME类型列表
 * @returns {Object} { valid: boolean, error: string, mimeType: string }
 */
export function validateFileMimeType (file, allowedTypes = []) {
    if (!file || !file.type) {
        return {
            valid: false,
            error: '无法获取文件类型',
            mimeType: ''
        }
    }

    const mimeType = file.type.toLowerCase()

    // 如果没有指定允许类型,则通过
    if (allowedTypes.length === 0) {
        return {
            valid: true,
            error: '',
            mimeType: mimeType
        }
    }

    // 检查是否在允许列表中
    const isAllowed = allowedTypes.some(allowedType => {
    // 支持通配符,如 image/*
        if (allowedType.endsWith('/*')) {
            const prefix = allowedType.split('/')[0]
            return mimeType.startsWith(prefix + '/')
        }
        return mimeType === allowedType.toLowerCase()
    })

    if (!isAllowed) {
        return {
            valid: false,
            error: `不支持的文件类型: ${mimeType}`,
            mimeType: mimeType
        }
    }

    return {
        valid: true,
        error: '',
        mimeType: mimeType
    }
}

/**
 * 验证文件大小
 * @param {File} file - File对象
 * @param {number} maxSize - 最大大小(字节)
 * @returns {Object} { valid: boolean, error: string, size: number }
 */
export function validateFileSize (file, maxSize) {
    if (!file || !file.size) {
        return {
            valid: false,
            error: '无法获取文件大小',
            size: 0
        }
    }

    const size = file.size

    if (size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2)
        const actualSizeMB = (size / (1024 * 1024)).toFixed(2)
        return {
            valid: false,
            error: `文件大小${actualSizeMB}MB超过限制${maxSizeMB}MB`,
            size: size
        }
    }

    return {
        valid: true,
        error: '',
        size: size
    }
}

/**
 * 清理SQL查询关键词 (防止SQL注入)
 * @param {string} input - 用户输入
 * @returns {string} 清理后的字符串
 */
export function sanitizeSQLInput (input) {
    if (!input) return ''

    let cleaned = String(input)

    // 1. 移除SQL关键字和特殊字符
    const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|OR|AND|WHERE|FROM|JOIN|DECLARE|SCRIPT)\b|--|;|\/\*|\*\/|xp_|sp_)/gi
    cleaned = cleaned.replace(sqlPattern, '')

    // 2. 移除危险字符
    cleaned = cleaned.replace(/['";\\]/g, '')

    // 3. 限制长度
    cleaned = cleaned.substring(0, 200)

    // 4. 移除控制字符
    // eslint-disable-next-line no-control-regex
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '')

    return cleaned.trim()
}

/**
 * 生成CSP (Content Security Policy) nonce
 * 用于内联脚本的CSP白名单
 * @returns {string} nonce值
 */
export function generateCSPNonce () {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * 格式化文件大小显示
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小字符串
 */
export function formatFileSize (bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export default {
    sanitizeInput,
    sanitizeHTML,
    validateURL,
    validateFilename,
    validateFileMimeType,
    validateFileSize,
    sanitizeSQLInput,
    generateCSPNonce,
    formatFileSize
}
