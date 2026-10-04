export function resolveBrandAssetUrl (sysConfig, assetPath, fallbackPath = '/logo11.png') {
    const rawPath = String(assetPath || '').trim()
    if (!rawPath) {
        return fallbackPath
    }

    if (/^(data:|blob:|https?:\/\/|\/\/)/i.test(rawPath)) {
        return rawPath
    }

    const normalizedPath = rawPath.replace(/^\/+/, '')
    const uploadType = String((sysConfig && sysConfig.uploadType) || '').trim().toLowerCase()
    const staticDomain = String((sysConfig && sysConfig.staticDomain) || '').trim()
    const qiniuDomain = String((sysConfig && sysConfig.qiniuDomain) || '').trim()
    const baseUrl = uploadType === 'qiniu' && qiniuDomain ? qiniuDomain : (staticDomain || '')

    if (!baseUrl) {
        return rawPath.startsWith('/') ? rawPath : `/${normalizedPath}`
    }

    return `${baseUrl.replace(/\/+$/, '')}/${normalizedPath}`
}
