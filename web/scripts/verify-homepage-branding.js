const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const brandingUtilPath = path.join(projectRoot, 'src', 'utils', 'brandAssets.js')
const headerPath = path.join(projectRoot, 'src', 'views', 'home', 'modules', 'Header.vue')
const homeLayoutPath = path.join(projectRoot, 'src', 'views', 'home', 'layouts', 'HomeLayout.vue')
const userEnterPath = path.join(projectRoot, 'src', 'views', 'home', 'modules', 'UserEnter.vue')

function assertIncludes (source, snippet, message) {
    if (!source.includes(snippet)) {
        throw new Error(message)
    }
}

function main () {
    if (!fs.existsSync(brandingUtilPath)) {
        throw new Error('Brand asset resolver utility is missing.')
    }

    const brandingUtilSource = fs.readFileSync(brandingUtilPath, 'utf8')
    const headerSource = fs.readFileSync(headerPath, 'utf8')
    const homeLayoutSource = fs.readFileSync(homeLayoutPath, 'utf8')
    const userEnterSource = fs.readFileSync(userEnterPath, 'utf8')

    assertIncludes(brandingUtilSource, 'export function resolveBrandAssetUrl', 'Brand asset resolver is missing the shared resolve function.')
    assertIncludes(headerSource, 'resolveBrandAssetUrl', 'Header is not using the shared brand asset resolver.')
    assertIncludes(homeLayoutSource, 'resolveBrandAssetUrl', 'Home layout is not using the shared brand asset resolver.')
    assertIncludes(userEnterSource, 'resolveBrandAssetUrl', 'User entry card is not using the shared brand asset resolver.')

    assertIncludes(headerSource, '@error="handleBrandImageError(\'logo\')"', 'Header logo is missing the fallback error handler.')
    assertIncludes(homeLayoutSource, '@error="handleBrandImageError(\'logo2\')"', 'Home layout logo is missing the fallback error handler.')
    assertIncludes(userEnterSource, '@error="handleBrandImageError(\'logo2\')"', 'User entry logo is missing the fallback error handler.')

    console.log('Homepage branding verification passed.')
}

main()
