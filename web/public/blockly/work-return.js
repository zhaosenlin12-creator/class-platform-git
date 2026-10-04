(function () {
    function getWorksReturnUrl () {
        return '/student/works?tab=my&refresh=' + Date.now()
    }

    window.__codebnGetWorksReturnUrl = getWorksReturnUrl
    window.goBackToWorks = function () {
        window.location.replace(getWorksReturnUrl())
    }
})()
