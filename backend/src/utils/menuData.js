/**
 * Role-aware menu data aligned with the real frontend router.
 *
 * Teaching operations are shared by administrators and teachers. Keep one
 * canonical menu definition for those operations so a teacher can never be
 * sent to an older, teacher-only page by accident. The only administrator
 * menu item that must remain private is teacher management itself.
 */

const { logger } = require('../middleware/logger');

function createMenuItem({
  id,
  title,
  path,
  component,
  icon,
  sortNo
}) {
  return {
    id,
    parentId: null,
    name: title,
    title,
    url: path,
    path,
    component,
    icon,
    menuType: 0,
    sortNo,
    hidden: false,
    route: '1',
    meta: {
      title,
      icon,
      url: path,
      keepAlive: false,
      internalOrExternal: false
    }
  };
}

const adminMenuData = [
  createMenuItem({
    id: 'admin-dashboard',
    title: '首页',
    path: '/admin/dashboard',
    component: 'dashboard/Analysis',
    icon: 'home',
    sortNo: 1
  }),
  createMenuItem({
    id: 'admin-course-content',
    title: '课程内容管理',
    path: '/admin/course-content-admin',
    component: 'course/CourseContentManagement',
    icon: 'folder-open',
    sortNo: 2
  }),
  createMenuItem({
    id: 'admin-course',
    title: '课程管理',
    path: '/admin/course',
    component: 'teaching/CourseList',
    icon: 'book',
    sortNo: 3
  }),
  createMenuItem({
    id: 'admin-class-management',
    title: '班级管理',
    path: '/admin/class-management',
    component: 'management/ClassManagement',
    icon: 'team',
    sortNo: 4
  }),
  createMenuItem({
    id: 'admin-student-management',
    title: '学员管理',
    path: '/admin/student-management',
    component: 'management/StudentManagement',
    icon: 'user',
    sortNo: 5
  }),
  createMenuItem({
    id: 'admin-teacher',
    title: '教师管理',
    path: '/admin/teacher',
    component: 'management/TeacherManagement',
    icon: 'solution',
    sortNo: 6
  }),
  createMenuItem({
    id: 'admin-homework-template',
    title: '作业模板管理',
    path: '/admin/homework-template',
    component: 'management/HomeworkTemplateManager',
    icon: 'file-text',
    sortNo: 7
  }),
  createMenuItem({
    id: 'admin-homework-assignment',
    title: '作业分配',
    path: '/admin/homework-assignment',
    component: 'management/HomeworkAssignment',
    icon: 'deployment-unit',
    sortNo: 8
  }),
  createMenuItem({
    id: 'admin-classroom-manager',
    title: '课堂管理',
    path: '/admin/classroom-manager',
    component: 'classroom/ClassroomManager',
    icon: 'video-camera',
    sortNo: 9
  })
];

// Teachers use the same stable pages and URLs as administrators. Clone the
// items so later changes to one role's menu cannot mutate the other role.
const teacherMenuData = adminMenuData
  .filter(item => item.id !== 'admin-teacher')
  .map(item => ({
    ...item,
    meta: { ...item.meta }
  }));

const studentMenu = [
  createMenuItem({
    id: 'student-home',
    title: '学习首页',
    path: '/student/home',
    component: 'student/Home',
    icon: 'home',
    sortNo: 1
  }),
  createMenuItem({
    id: 'student-classrooms',
    title: '我的课堂',
    path: '/student/classrooms',
    component: 'student/ClassroomList',
    icon: 'video-camera',
    sortNo: 2
  }),
  createMenuItem({
    id: 'student-homework',
    title: '我的作业',
    path: '/student/homework',
    component: 'student/Homework',
    icon: 'file-text',
    sortNo: 3
  }),
  createMenuItem({
    id: 'student-programming',
    title: '编程环境',
    path: '/student/programming',
    component: 'student/Programming',
    icon: 'code',
    sortNo: 4
  }),
  createMenuItem({
    id: 'student-works',
    title: '作品资源库',
    path: '/student/works',
    component: 'student/Works',
    icon: 'star',
    sortNo: 5
  }),
  createMenuItem({
    id: 'student-profile',
    title: '个人中心',
    path: '/student/profile',
    component: 'student/Profile',
    icon: 'user',
    sortNo: 6
  })
];

const adminAuth = [
  'admin:read', 'admin:write', 'admin:delete',
  'teacher:read', 'teacher:write', 'teacher:delete',
  'course:manage', 'homework:manage', 'class:manage',
  'student:manage', 'grade:manage', 'system:manage'
];

const teacherAuth = adminAuth.filter(permission => !permission.startsWith('teacher:'));

const studentAuth = [
  'student:read', 'homework:submit', 'course:view'
];

function getMenuDataByUserIdentity(userIdentity) {
  logger.debug('Resolve menu data by user identity', { userIdentity });

  if (userIdentity === 3) {
    return Promise.resolve({
      menu: studentMenu,
      auth: studentAuth,
      allAuth: studentAuth
    });
  }

  if (userIdentity === 2) {
    return Promise.resolve({
      menu: teacherMenuData,
      auth: teacherAuth,
      allAuth: teacherAuth
    });
  }

  return Promise.resolve({
    menu: adminMenuData,
    auth: adminAuth,
    allAuth: adminAuth
  });
}

module.exports = getMenuDataByUserIdentity;
