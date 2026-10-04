(function () {
    function getWorksReturnUrl () {
        return '/student/works?tab=my&refresh=' + Date.now()
    }

    window.__codebnGetWorksReturnUrl = getWorksReturnUrl
    window.JrConfig = window.JrConfig || {}
    window.JrConfig.getReturnUrl = getWorksReturnUrl

    var previousOnInit = window.JrConfig.onInit
    window.JrConfig.onInit = function () {
        if (typeof previousOnInit === 'function') {
            previousOnInit()
        }

        if (!window.ScratchJr) {
            return
        }

        window.ScratchJr.getGotoLink = function () {
            return getWorksReturnUrl()
        }

        window.ScratchJr.switchPage = function () {
            window.location.replace(getWorksReturnUrl())
        }
    }
})()
