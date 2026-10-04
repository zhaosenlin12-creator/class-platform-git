function toRoleList (userRole) {
    if (Array.isArray(userRole)) {
        return userRole
    }
    if (userRole === undefined || userRole === null || userRole === '') {
        return []
    }
    return [userRole]
}

function inferRoleFromIdentity (userInfo = {}, userType = '') {
    const identity = userInfo.userIdentity !== undefined && userInfo.userIdentity !== null
        ? userInfo.userIdentity
        : userInfo.user_identity
    const numericIdentity = Number(identity)
    const normalizedType = String(userType || '').trim().toLowerCase()

    if (numericIdentity === 3 || normalizedType === 'student') {
        return 'student'
    }
    if (numericIdentity === 1 || normalizedType === 'admin') {
        return 'admin'
    }
    if (numericIdentity === 2 || normalizedType === 'teacher') {
        return 'teacher'
    }
    return ''
}

function resolveUserRoles ({ userRole = [], userType = '', userInfo = {} } = {}) {
    const roles = new Set()

    toRoleList(userRole).forEach(item => {
        const normalizedRole = String(item || '').trim().toLowerCase()
        if (!normalizedRole) {
            return
        }

        if (['admin', 'school_admin', 'super_admin'].includes(normalizedRole)) {
            roles.add('admin')
            return
        }

        if (normalizedRole === 'teacher') {
            roles.add('teacher')
            return
        }

        if (normalizedRole === 'student') {
            roles.add('student')
        }
    })

    if (roles.size === 0) {
        const inferredRole = inferRoleFromIdentity(userInfo, String(userType || userInfo.userType || '').trim().toLowerCase())
        if (inferredRole) {
            roles.add(inferredRole)
        }
    }

    const roleList = Array.from(roles)
    const isStudent = roleList.includes('student')
    const isAdmin = roleList.includes('admin')
    const isTeacher = !isStudent && (isAdmin || roleList.includes('teacher'))

    return {
        roleList,
        hasRole: roleList.length > 0,
        isStudent,
        isTeacher,
        isAdmin
    }
}

export function resolveTeachingAccess (context = {}) {
    const roleState = resolveUserRoles(context)

    if (!roleState.hasRole) {
        return {
            ...roleState,
            homePath: '/portal/home',
            workPath: '/portal/workList',
            classroomPath: '/portal/courseList',
            homeworkPath: '/portal/home'
        }
    }

    if (roleState.isStudent) {
        return {
            ...roleState,
            homePath: '/student/home',
            workPath: '/student/works',
            classroomPath: '/student/classrooms',
            homeworkPath: '/student/homework'
        }
    }

    if (roleState.isAdmin) {
        return {
            ...roleState,
            homePath: '/admin/dashboard',
            workPath: '/student/works',
            classroomPath: '/admin/classroom-manager',
            homeworkPath: '/admin/homework-assignment'
        }
    }

    return {
        ...roleState,
        // Teachers intentionally use the administrator's stable teaching
        // pages. The backend removes only the teacher-management menu item.
        homePath: '/admin/dashboard',
        workPath: '/student/works',
        classroomPath: '/admin/classroom-manager',
        homeworkPath: '/admin/homework-assignment'
    }
}
