const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const scratchPath = path.join(projectRoot, 'public', 'scratch3', 'index.html')
const pythonIndexPath = path.join(projectRoot, 'public', 'python', 'index.html')
const pythonBundlePath = path.join(projectRoot, 'public', 'python', 'static', 'js', 'app.js')
const blocklyPath = path.join(projectRoot, 'public', 'blockly', 'index.html')
const blocklyBridgePath = path.join(projectRoot, 'public', 'blockly', 'work-return.js')
const scratchJrHomePath = path.join(projectRoot, 'public', 'scratchjr', 'home.html')
const scratchJrEditorPath = path.join(projectRoot, 'public', 'scratchjr', 'editor.html')
const scratchJrBridgePath = path.join(projectRoot, 'public', 'scratchjr', 'work-return.js')

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
    const scratchSource = fs.readFileSync(scratchPath, 'utf8')
    const pythonIndexSource = fs.readFileSync(pythonIndexPath, 'utf8')
    const pythonBundleSource = fs.readFileSync(pythonBundlePath, 'utf8')
    const blocklySource = fs.readFileSync(blocklyPath, 'utf8')
    const blocklyBridgeSource = fs.readFileSync(blocklyBridgePath, 'utf8')
    const scratchJrHomeSource = fs.readFileSync(scratchJrHomePath, 'utf8')
    const scratchJrEditorSource = fs.readFileSync(scratchJrEditorPath, 'utf8')
    const scratchJrBridgeSource = fs.readFileSync(scratchJrBridgePath, 'utf8')

    assertIncludes(scratchSource, '/student/works?tab=my', 'Scratch return path is not targeting the current works page.')
    assertNotIncludes(scratchSource, '/account/center', 'Scratch still points return navigation to /account/center.')

    assertIncludes(pythonIndexSource, '__codebnGetWorksReturnUrl', 'Python index is missing the shared works return helper.')
    assertIncludes(pythonBundleSource, '/student/works?tab=my', 'Python bundle is not targeting the current works page on return.')
    assertNotIncludes(pythonBundleSource, '/account/center', 'Python bundle still points return navigation to /account/center.')

    assertIncludes(blocklySource, 'work-return.js', 'Blockly index is missing the shared return bridge.')
    assertIncludes(blocklySource, 'goBackToWorks()', 'Blockly return button is not wired to the shared return bridge.')
    assertNotIncludes(blocklySource, '/account/center', 'Blockly still points return navigation to /account/center.')
    assertIncludes(blocklyBridgeSource, '__codebnGetWorksReturnUrl', 'Blockly shared bridge is missing the works return helper.')
    assertIncludes(blocklyBridgeSource, '/student/works?tab=my', 'Blockly shared bridge is not targeting the current works page on return.')
    assertIncludes(blocklyBridgeSource, 'window.goBackToWorks = function ()', 'Blockly shared bridge is missing the return hook.')

    assertIncludes(scratchJrHomeSource, 'work-return.js', 'ScratchJr home entry is missing the shared return bridge.')
    assertIncludes(scratchJrEditorSource, 'work-return.js', 'ScratchJr editor entry is missing the shared return bridge.')
    assertIncludes(scratchJrBridgeSource, '__codebnGetWorksReturnUrl', 'ScratchJr shared bridge is missing the works return helper.')
    assertIncludes(scratchJrBridgeSource, 'window.ScratchJr.getGotoLink = function ()', 'ScratchJr shared bridge is missing the getGotoLink override hook.')
    assertIncludes(scratchJrBridgeSource, 'window.ScratchJr.switchPage = function ()', 'ScratchJr shared bridge is missing the switchPage override hook.')
    assertIncludes(scratchJrBridgeSource, '/student/works?tab=my', 'ScratchJr shared bridge is not targeting the current works page on return.')

    console.log('Editor return verification passed.')
}

main()
