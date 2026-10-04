const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const distDir = path.join(projectRoot, 'dist')
const distIndexPath = path.join(distDir, 'index.html')
const bannerPath = path.join(projectRoot, 'src', 'views', 'home', 'modules', 'Banner.vue')

const budgets = {
    initialJsGzipKb: 2500,
    bannerImagesKb: 1000,
    prefetchCount: 0
}

function fail (message) {
    console.error(message)
    process.exitCode = 1
}

function readFile (filePath) {
    return fs.readFileSync(filePath, 'utf8')
}

function getInitialScripts (html) {
    const scriptRegex = /<script\b[^>]*src=(?:["']?)([^"'\s>]+\.js)(?:["']?)[^>]*><\/script>/g
    const scripts = []
    let match

    while ((match = scriptRegex.exec(html)) !== null) {
        scripts.push(match[1])
    }

    return scripts
}

function normalizeAssetPath (assetPath) {
    return assetPath.replace(/^\//, '').replace(/\?.*$/, '')
}

function statOptional (filePath) {
    return fs.existsSync(filePath) ? fs.statSync(filePath) : null
}

function sumInitialScriptGzipKb (scriptPaths) {
    return scriptPaths.reduce((totalKb, assetPath) => {
        const normalized = normalizeAssetPath(assetPath)
        const gzStat = statOptional(path.join(distDir, `${normalized}.gz`))
        const plainStat = statOptional(path.join(distDir, normalized))
        const sizeBytes = gzStat ? gzStat.size : (plainStat ? plainStat.size : 0)
        return totalKb + (sizeBytes / 1024)
    }, 0)
}

function getPrefetchCount (html) {
    const prefetchMatches = html.match(/rel=prefetch|rel="prefetch"|rel='prefetch'/g)
    return prefetchMatches ? prefetchMatches.length : 0
}

function getBannerImagePaths (bannerSource) {
    const imageRegex = /['"]\/images\/([^'"]+)['"]/g
    const images = new Set()
    let match

    while ((match = imageRegex.exec(bannerSource)) !== null) {
        images.add(match[1])
    }

    return Array.from(images)
}

function sumBannerImageKb (imagePaths) {
    return imagePaths.reduce((totalKb, imageName) => {
        const stat = fs.statSync(path.join(projectRoot, 'public', 'images', imageName))
        return totalKb + (stat.size / 1024)
    }, 0)
}

function main () {
    if (!fs.existsSync(distIndexPath)) {
        throw new Error(`Build output not found: ${distIndexPath}`)
    }

    const html = readFile(distIndexPath)
    const bannerSource = readFile(bannerPath)

    const initialScripts = getInitialScripts(html)
    const initialJsGzipKb = sumInitialScriptGzipKb(initialScripts)
    const prefetchCount = getPrefetchCount(html)
    const bannerImages = getBannerImagePaths(bannerSource)
    const bannerImagesKb = sumBannerImageKb(bannerImages)

    console.log(`Initial scripts: ${initialScripts.join(', ')}`)
    console.log(`Initial JS total (gzip if available): ${initialJsGzipKb.toFixed(1)} KB`)
    console.log(`Prefetch links: ${prefetchCount}`)
    console.log(`Banner images: ${bannerImages.join(', ')}`)
    console.log(`Banner image total: ${bannerImagesKb.toFixed(1)} KB`)

    if (initialJsGzipKb > budgets.initialJsGzipKb) {
        fail(`Initial JS budget failed: ${initialJsGzipKb.toFixed(1)} KB > ${budgets.initialJsGzipKb} KB`)
    }

    if (prefetchCount > budgets.prefetchCount) {
        fail(`Prefetch budget failed: ${prefetchCount} > ${budgets.prefetchCount}`)
    }

    if (bannerImagesKb > budgets.bannerImagesKb) {
        fail(`Banner image budget failed: ${bannerImagesKb.toFixed(1)} KB > ${budgets.bannerImagesKb} KB`)
    }

    if (process.exitCode && process.exitCode !== 0) {
        return
    }

    console.log('Homepage budget verification passed.')
}

main()
