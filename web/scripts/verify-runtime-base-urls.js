const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const runtimeHelperPath = path.join(projectRoot, 'src', 'utils', 'runtimeBaseUrl.js')
const managePath = path.join(projectRoot, 'src', 'api', 'manage.js')
const homeLayoutPath = path.join(projectRoot, 'src', 'views', 'home', 'layouts', 'HomeLayout.vue')
const teacherHomeworkPath = path.join(projectRoot, 'src', 'views', 'management', 'HomeworkSubmissions.vue')
const studentHomeworkPath = path.join(projectRoot, 'src', 'views', 'student', 'Homework.vue')
const resourceViewerPath = path.join(projectRoot, 'src', 'views', 'classroom', 'components', 'ResourceViewer.vue')
const onlineClassroomPath = path.join(projectRoot, 'src', 'views', 'classroom', 'OnlineClassroom.vue')

function readFile (filePath) {
    return fs.readFileSync(filePath, 'utf8')
}

function assertExists (filePath, message) {
    if (!fs.existsSync(filePath)) {
        throw new Error(message)
    }
}

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
    assertExists(runtimeHelperPath, 'Runtime base-url helper is missing.')

    const runtimeHelperSource = readFile(runtimeHelperPath)
    const manageSource = readFile(managePath)
    const homeLayoutSource = readFile(homeLayoutPath)
    const teacherHomeworkSource = readFile(teacherHomeworkPath)
    const studentHomeworkSource = readFile(studentHomeworkPath)
    const resourceViewerSource = readFile(resourceViewerPath)
    const onlineClassroomSource = readFile(onlineClassroomPath)

    assertIncludes(runtimeHelperSource, 'export function getConfiguredBaseUrl', 'Runtime base-url helper is missing getConfiguredBaseUrl.')
    assertIncludes(runtimeHelperSource, 'window._CONFIG', 'Runtime base-url helper is not reading window._CONFIG.')

    assertIncludes(manageSource, "from '@/utils/runtimeBaseUrl'", 'manage.js is not using the shared runtime base-url helper.')
    assertNotIncludes(manageSource, "staticDomain || 'http://127.0.0.1:8081'", 'manage.js still falls back to 127.0.0.1 for asset URLs.')

    assertIncludes(homeLayoutSource, 'getConfiguredBaseUrl(', 'HomeLayout captcha loading is not using the shared runtime base-url helper.')
    assertNotIncludes(homeLayoutSource, "|| 'http://127.0.0.1:8081'", 'HomeLayout still falls back to 127.0.0.1 for captcha requests.')

    assertIncludes(teacherHomeworkSource, 'getConfiguredBaseUrl(', 'HomeworkSubmissions downloads are not using the shared runtime base-url helper.')
    assertNotIncludes(teacherHomeworkSource, "|| 'http://127.0.0.1:8081'", 'HomeworkSubmissions still falls back to 127.0.0.1 for downloads.')

    assertIncludes(studentHomeworkSource, 'getConfiguredBaseUrl(', 'Student homework downloads are not using the shared runtime base-url helper.')
    assertNotIncludes(studentHomeworkSource, "|| 'http://127.0.0.1:8081'", 'Student homework still falls back to 127.0.0.1 for downloads.')

    assertIncludes(resourceViewerSource, 'getConfiguredBaseUrl(', 'ResourceViewer is not using the shared runtime base-url helper.')
    assertNotIncludes(resourceViewerSource, "|| 'http://127.0.0.1:8081'", 'ResourceViewer still falls back to 127.0.0.1 for resource URLs.')

    assertIncludes(onlineClassroomSource, 'getConfiguredBaseUrl(', 'OnlineClassroom is not using the shared runtime base-url helper.')
    assertNotIncludes(onlineClassroomSource, "|| 'http://127.0.0.1:8081'", 'OnlineClassroom still falls back to 127.0.0.1 for classroom URLs.')

    console.log('Runtime base-url verification passed.')
}

main()
