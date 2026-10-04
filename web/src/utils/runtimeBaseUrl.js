function trimTrailingSlash (value) {
    return String(value || '').replace(/\/+$/, '')
}

function getOriginFallback () {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
        return trimTrailingSlash(window.location.origin)
    }
    return ''
}

export function getConfiguredBaseUrl (...candidates) {
    for (const candidate of candidates) {
        const normalized = trimTrailingSlash(candidate)
        if (normalized) {
            return normalized
        }
    }

    if (typeof window !== 'undefined' && window._CONFIG) {
        const config = window._CONFIG
        const configCandidates = [
            config.domianURL,
            config.staticDomainURL,
            config.uploadDomain,
            config.apiBaseUrl
        ]

        for (const candidate of configCandidates) {
            const normalized = trimTrailingSlash(candidate)
            if (normalized) {
                return normalized
            }
        }
    }

    return getOriginFallback()
}
