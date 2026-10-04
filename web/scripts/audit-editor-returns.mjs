import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const baseUrl = 'http://127.0.0.1:8087'
const outputDir = path.resolve('output', 'audit-editor-returns')

fs.mkdirSync(outputDir, { recursive: true })

function assert (condition, message) {
    if (!condition) {
        throw new Error(message)
    }
}

async function screenshot (page, name) {
    await page.screenshot({ path: path.join(outputDir, name), fullPage: true })
}

async function verifyHomeCrossing (browser) {
    const page = await browser.newPage()
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await screenshot(page, 'home.png')

    const crossingLink = page.locator('a[href="https://htwins.net/scale2/"]')
    await crossingLink.first().waitFor({ state: 'visible', timeout: 10000 })
    const navText = await page.locator('.ant-menu').innerText()
    assert(navText.includes('穿越'), '首页顶部菜单中没有穿越入口')

    const bodyText = await page.locator('body').innerText()
    assert(!bodyText.includes('海龟编辑器\n开始创作\n穿越'), '穿越仍然出现在下方编辑器卡片区')

    await page.close()
}

async function verifyScratchReturn (browser) {
    const page = await browser.newPage()
    await page.goto(`${baseUrl}/scratch3/index.html`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    await screenshot(page, 'scratch3.png')

    const returnButton = page.locator('text=返回').first()
    await returnButton.waitFor({ state: 'visible', timeout: 10000 })
    await returnButton.click()
    await page.waitForURL(url => url.toString().includes('/student/works?tab=my'), { timeout: 10000 })
    assert(page.url().includes('/student/works?tab=my'), 'Scratch 返回后没有进入我的作品页')

    await screenshot(page, 'scratch3-return.png')
    await page.close()
}

async function verifyPythonReturn (browser) {
    const page = await browser.newPage()
    await page.goto(`${baseUrl}/python/index.html`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    await screenshot(page, 'python.png')

    const returnMenu = page.locator('text=返回').first()
    await returnMenu.waitFor({ state: 'visible', timeout: 10000 })
    await returnMenu.click()
    await page.waitForURL(url => url.toString().includes('/student/works?tab=my'), { timeout: 10000 })
    assert(page.url().includes('/student/works?tab=my'), 'Python 返回后没有进入我的作品页')

    await screenshot(page, 'python-return.png')
    await page.close()
}

async function verifyScratchJrHook (browser) {
    const page = await browser.newPage()
    await page.goto(`${baseUrl}/scratchjr/editor.html`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)

    const result = await page.evaluate(() => {
        return {
            hasScratchJr: Boolean(window.ScratchJr),
            getGotoLink: window.ScratchJr && window.ScratchJr.getGotoLink ? window.ScratchJr.getGotoLink() : null
        }
    })

    assert(result.hasScratchJr, 'ScratchJr 编辑器没有初始化 ScratchJr 对象')
    assert(
        result.getGotoLink && result.getGotoLink.includes('/student/works?tab=my'),
        `ScratchJr 返回钩子未生效，当前 getGotoLink=${result.getGotoLink}`
    )

    await screenshot(page, 'scratchjr-editor.png')
    await page.close()
}

async function main () {
    const browser = await chromium.launch({ headless: true })
    try {
        await verifyHomeCrossing(browser)
        await verifyScratchReturn(browser)
        await verifyPythonReturn(browser)
        await verifyScratchJrHook(browser)
        console.log('Browser audit passed.')
    } finally {
        await browser.close()
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
