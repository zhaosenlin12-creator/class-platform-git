const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const homePath = path.join(projectRoot, 'src', 'views', 'home', 'Home.vue')
const headerPath = path.join(projectRoot, 'src', 'views', 'home', 'modules', 'Header.vue')
const bannerPath = path.join(projectRoot, 'src', 'views', 'home', 'modules', 'Banner.vue')

function assertIncludes (source, snippet, message) {
    if (!source.includes(snippet)) {
        throw new Error(message)
    }
}

function assertNotIncludes (source, snippet, message) {
    if (source.includes(snippet)) {
        throw new Error(message)
    }
}

function main () {
    const homeSource = fs.readFileSync(homePath, 'utf8')
    const headerSource = fs.readFileSync(headerPath, 'utf8')
    const bannerSource = fs.readFileSync(bannerPath, 'utf8')

    assertIncludes(headerSource, '穿越', 'Header is missing the 穿越 menu label.')
    assertIncludes(headerSource, 'https://htwins.net/scale2/', 'Header is missing the 穿越 target URL.')
    assertNotIncludes(homeSource, 'editor-crossing', 'Homepage still renders the lower 穿越 card.')
    assertNotIncludes(homeSource, 'https://htwins.net/scale2/', 'Homepage still references the lower 穿越 target URL.')

    assertIncludes(bannerSource, 'activeSlideIndex', 'Banner is missing the active slide state needed for smooth transitions.')
    assertIncludes(bannerSource, 'currentSlideLoaded', 'Banner is missing the loaded-state guard for smooth transitions.')
    assertIncludes(bannerSource, 'requestSlide', 'Banner is missing the explicit slide request flow.')
    assertNotIncludes(bannerSource, 'mode="out-in"', 'Banner still uses out-in transition, which can cause white flashes.')

    console.log('Homepage feature verification passed.')
}

main()
