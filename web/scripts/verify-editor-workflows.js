const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const commonPath = path.join(projectRoot, 'public', 'js', 'common.js')
const scratchPath = path.join(projectRoot, 'public', 'scratch3', 'index.html')
const pythonPath = path.join(projectRoot, 'public', 'python', 'index.html')
const scratchJrPath = path.join(projectRoot, 'public', 'scratchjr', 'editor.html')
const blocklyPath = path.join(projectRoot, 'public', 'blockly', 'index.html')
const worksViewPath = path.join(projectRoot, 'src', 'views', 'student', 'Works.vue')

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
    const commonSource = fs.readFileSync(commonPath, 'utf8')
    const scratchSource = fs.readFileSync(scratchPath, 'utf8')
    const pythonSource = fs.readFileSync(pythonPath, 'utf8')
    const scratchJrSource = fs.readFileSync(scratchJrPath, 'utf8')
    const blocklySource = fs.readFileSync(blocklyPath, 'utf8')
    const worksViewSource = fs.readFileSync(worksViewPath, 'utf8')

    assertIncludes(commonSource, 'window.upsertStudentWork = function (options)', 'Shared student-work upsert helper is missing from common.js.')
    assertIncludes(commonSource, 'window.resolveUploadedFileInfo = function', 'Shared uploaded-file metadata resolver is missing from common.js.')

    assertNotIncludes(scratchSource, '/api/teaching/teachingWork/submit', 'Scratch still submits to the legacy homework endpoint.')
    assertIncludes(scratchSource, 'upsertStudentWork({', 'Scratch is missing the current student-work save/submit flow.')
    assertNotIncludes(scratchSource, "$('#projectTitle').html(projectTitle)", 'Scratch still references the undefined projectTitle variable after submit.')

    assertNotIncludes(pythonSource, '/api/teaching/teachingWork/submit', 'Python editor still submits to the legacy homework endpoint.')
    assertIncludes(pythonSource, 'upsertStudentWork({', 'Python editor is missing the current student-work upload flow.')

    assertNotIncludes(scratchJrSource, '/api/teaching/teachingWork/submit', 'ScratchJr still submits to the legacy homework endpoint.')
    assertIncludes(scratchJrSource, 'upsertStudentWork({', 'ScratchJr is missing the current student-work upload flow.')
    assertIncludes(worksViewSource, "case '3':", 'Works preview routing is missing the ScratchJr branch.')
    assertIncludes(worksViewSource, 'workId=${record.id}&workFile=', 'Works preview routing is not passing ScratchJr workId for online save updates.')

    assertNotIncludes(blocklySource, '/api/teaching/teachingWork/submit', 'Blockly still submits to the legacy homework endpoint.')
    assertIncludes(blocklySource, 'upsertStudentWork({', 'Blockly is missing the current student-work upload flow.')

    console.log('Editor workflow verification passed.')
}

main()
