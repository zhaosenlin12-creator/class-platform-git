/**
 * Teaching domain routes.
 * Keep compatibility endpoints here, but avoid duplicate or comment-corrupted registrations.
 */

const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const statisticsController = require('../controllers/statisticsController');
const learningAnalyticsController = require('../controllers/learningAnalyticsController');
const studentController = require('../controllers/studentController');
const scheduleController = require('../controllers/scheduleController');
const resourceController = require('../controllers/resourceController');
const classroomController = require('../controllers/classroomSecureController');
const classController = require('../controllers/classController');
const homeworkController = require('../controllers/homeworkController');
const studentWorkController = require('../controllers/studentWorkController');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { logger } = require('../middleware/logger');
const getMenuDataByUserIdentity = require('../utils/menuData');
const withListAllDefaults = (handler, defaultPageSize = 1000) => (req, res, next) => {
  req.query = {
    ...(req.query || {}),
    pageNo: req.query?.pageNo || 1,
    pageSize: req.query?.pageSize || defaultPageSize
  };
  return handler(req, res, next);
};

router.get('/teachingWork/leaderboard', auth.optionalAuth, studentWorkController.getLeaderboard);
router.get('/teachingWork/studentWorkInfo', auth.optionalAuth, studentWorkController.getStudentWorkInfo);
router.get('/teachingWork/userInfo', auth.optionalAuth, studentWorkController.getLegacyUserInfo);
router.get('/teachingWork/starWork', auth.optionalAuth, studentWorkController.starWork);
router.get('/teachingWork/getWorkComments', auth.optionalAuth, studentWorkController.getWorkComments);
router.get('/teachingCourse/getHomeCourse', courseController.getHomeCourseList);
{
const teacherOrAdminOnly = auth.requireUserIdentity([1, 2], '浠呮暀甯堟垨绠＄悊鍛樺彲璁块棶鏁欏鎺ュ彛');
const studentOnly = auth.requireUserIdentity([3], '浠呭鐢熷彲璁块棶鏁欏鎺ュ彛');
const anyAuthenticatedUser = auth.requireUserIdentity([1, 2, 3], '闇€瑕佺櫥褰曞悗鎵嶈兘璁块棶');
router.get('/student/works/public', auth.optionalAuth, studentWorkController.getPublicWorks);
router.get('/student/works/my', auth.verifyToken, anyAuthenticatedUser, studentWorkController.getMyWorks);
router.get('/student/works/all', auth.verifyToken, teacherOrAdminOnly, studentWorkController.getAllWorks);
router.get('/student/works/users/:userId/profile', auth.optionalAuth, studentWorkController.getWorkAuthorProfile);
router.get('/student/works/:id/comments', auth.optionalAuth, studentWorkController.getWorkCommentsById);
router.get('/student/works/:id', auth.optionalAuth, studentWorkController.getWorkDetail);
router.get('/student/works/download/:id', auth.optionalAuth, studentWorkController.downloadWork);

}

router.use(auth.verifyToken);

const teacherOrAdminOnly = auth.requireUserIdentity([1, 2], '仅教师或管理员可访问教学接口');
const studentOnly = auth.requireUserIdentity([3], '仅学生可访问教学接口');
const anyAuthenticatedUser = auth.requireUserIdentity([1, 2, 3], '需要登录后才能访问');

// User info and menu
router.get('/user/info', authController.getUserInfo);
router.put('/user/edit', authController.updateUserInfo);

/*
router.get('/menu/getUserMenu', async (req, res) => {
  try {
    const userIdentity = auth.getRequestUserIdentity(req);
    if (!userIdentity) {
      return res.status(403).json({
        success: false,
        message: '鏃犳硶璇嗗埆褰撳墠鐢ㄦ埛韬唤',
        code: 403
      });
    }
    const menuData = await getMenuDataByUserIdentity(userIdentity);

    res.json({
      success: true,
      result: menuData,
      message: '获取菜单成功',
      code: 200
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取菜单失败',
      code: 500
    });
  }
});

*/
router.get('/menu/getUserMenu', async (req, res) => {
  try {
    const permissionPayload = await authController.resolvePermissionPayload(req);
    if (!permissionPayload) {
      return res.status(403).json({
        success: false,
        message: '无法识别当前用户身份',
        code: 403
      });
    }

    res.json({
      success: true,
      result: {
        menu: permissionPayload.menu,
        auth: permissionPayload.auth,
        allAuth: permissionPayload.allAuth
      },
      message: '获取菜单成功',
      code: 200
    });
  } catch (error) {
    logger.error('Failed to resolve teaching menu data', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      username: req.user?.username
    });
    res.status(500).json({
      success: false,
      message: '获取菜单失败',
      code: 500
    });
  }
});

// Course management
router.get('/teachingCourse/list', teacherOrAdminOnly, courseController.getCourseList);
router.get('/teachingCourse/create', teacherOrAdminOnly, courseController.getCreatePageData);
router.post('/teachingCourse/create', teacherOrAdminOnly, courseController.createCourse);
router.get('/teachingCourse/update', teacherOrAdminOnly, courseController.getUpdatePageData);
router.post('/teachingCourse/update', teacherOrAdminOnly, courseController.updateCourse);
router.delete('/teachingCourse', teacherOrAdminOnly, courseController.deleteCourse);
router.delete('/teachingCourse/delete', teacherOrAdminOnly, courseController.deleteCourse);
router.delete('/teachingCourse/deleteBatch', teacherOrAdminOnly, courseController.batchDeleteCourses);

router.get('/teachingCourseUnit/list', teacherOrAdminOnly, courseController.getCourseUnitList);
router.post('/teachingCourseUnit/add', teacherOrAdminOnly, courseController.addCourseUnit);
router.put('/teachingCourseUnit/edit', teacherOrAdminOnly, courseController.editCourseUnit);
router.post('/teachingCourseUnit/reorder', teacherOrAdminOnly, courseController.reorderCourseUnit);
router.delete('/teachingCourseUnit/delete', teacherOrAdminOnly, courseController.deleteCourseUnit);

router.get('/course/list', teacherOrAdminOnly, courseController.getCourseList);
router.get('/course/listAll', teacherOrAdminOnly, withListAllDefaults(courseController.getCourseList));
router.get('/course/:id', courseController.getCourseById);
router.delete('/teachingCourse/delete/:courseId', teacherOrAdminOnly, courseController.deleteCourse);
router.post('/teachingCourse/publish/:courseId', teacherOrAdminOnly, courseController.publishCourse);
router.get('/teachingCourse/statistics/:courseId', teacherOrAdminOnly, courseController.getCourseStatistics);
router.get('/teachingCourse/mineCourse', teacherOrAdminOnly, courseController.getMyCourseList);

// Teacher statistics
router.get('/teacher/statistics/dashboard', teacherOrAdminOnly, statisticsController.getDashboardStatistics);
router.get('/teacher/statistics/activities', teacherOrAdminOnly, statisticsController.getActivitiesStatistics);
router.get('/teacher/statistics/course-completion', teacherOrAdminOnly, statisticsController.getCourseCompletionStatistics);
router.get('/teacher/statistics/student-analysis', teacherOrAdminOnly, statisticsController.getStudentAnalysisStatistics);
router.get('/teacher/statistics/grade-analysis', teacherOrAdminOnly, statisticsController.getGradeAnalysisStatistics);
router.get('/teacher/statistics/teaching-effectiveness', teacherOrAdminOnly, statisticsController.getTeachingEffectivenessStatistics);
router.get('/teacher/statistics/learning-progress', teacherOrAdminOnly, statisticsController.getLearningProgressStatistics);
router.post('/teacher/statistics/export-report', teacherOrAdminOnly, statisticsController.exportStatisticsReport);
router.get('/teacher/schedule/today', teacherOrAdminOnly, statisticsController.getTodaySchedule);
router.get('/teacher/students/all', teacherOrAdminOnly, studentController.getAllStudents);

// Learning analytics
router.get('/learningAnalytics/dashboard', teacherOrAdminOnly, learningAnalyticsController.getDashboard);
router.get('/learningAnalytics/courseAnalytics', teacherOrAdminOnly, learningAnalyticsController.getCourseAnalytics);
router.get('/learningAnalytics/learningTrend', teacherOrAdminOnly, learningAnalyticsController.getLearningTrend);
router.get('/learningAnalytics/heatmap', teacherOrAdminOnly, learningAnalyticsController.getHeatmap);
router.get('/learningAnalytics/activityRanking', teacherOrAdminOnly, learningAnalyticsController.getActivityRanking);
router.get('/learningAnalytics/warnings', teacherOrAdminOnly, learningAnalyticsController.getWarnings);
router.get('/learningAnalytics/learningPath', teacherOrAdminOnly, learningAnalyticsController.getLearningPath);

// Student management
router.get('/student/list', teacherOrAdminOnly, studentController.getTeachingStudentList);
router.get('/student/listAll', teacherOrAdminOnly, withListAllDefaults(studentController.getTeachingStudentList));
router.get('/student/classes', teacherOrAdminOnly, studentController.getStudentClasses);
router.get('/student/details/:studentId', teacherOrAdminOnly, studentController.getStudentDetails);
router.get('/student/progress/:studentId', teacherOrAdminOnly, studentController.getStudentProgress);
router.get('/student/homework', studentOnly, studentController.getStudentHomework);
router.get('/student/homework/:studentId', teacherOrAdminOnly, studentController.getStudentHomework);
router.put('/student/update/:studentId', teacherOrAdminOnly, studentController.updateStudentInfo);
router.post('/student/batch-update-status', teacherOrAdminOnly, studentController.batchUpdateStudentStatus);
router.post('/student/create-learning-mark', teacherOrAdminOnly, studentController.createLearningMark);
router.get('/student/statistics', teacherOrAdminOnly, studentController.getStudentStatistics);
router.post('/student/export', teacherOrAdminOnly, studentController.exportStudentData);

// Course resources
router.get('/course/resources/list', teacherOrAdminOnly, resourceController.getResourceList);
router.get('/course/resources/statistics', teacherOrAdminOnly, resourceController.getResourceStatistics);
router.post('/course/resources/upload', teacherOrAdminOnly, upload.single('file'), resourceController.uploadResource);
router.get('/course/resources/details/:id', teacherOrAdminOnly, resourceController.getResourceDetails);
router.get('/course/resources/preview/:id', teacherOrAdminOnly, resourceController.previewResource);
router.get('/course/resources/download/:id', teacherOrAdminOnly, resourceController.downloadResource);
router.delete('/course/resources/delete/:id', teacherOrAdminOnly, resourceController.deleteResource);
router.get('/course/resources/download-url/:id', teacherOrAdminOnly, resourceController.getResourceDownloadUrl);
router.get('/course/resources/share-link/:id', teacherOrAdminOnly, resourceController.getResourceShareLink);
router.put('/course/resources/update/:id', teacherOrAdminOnly, resourceController.updateResource);

// Class management
router.get('/class/list', teacherOrAdminOnly, classController.getClassList);
router.get('/class/listAll', teacherOrAdminOnly, withListAllDefaults(classController.getClassList));
router.get('/class/details/:classId', teacherOrAdminOnly, classController.getClassById);
router.post('/class/create', teacherOrAdminOnly, classController.createClass);
router.post('/class', teacherOrAdminOnly, classController.createClass);
router.put('/class/update/:classId', teacherOrAdminOnly, classController.updateClass);
router.put('/class/:classId', teacherOrAdminOnly, classController.updateClass);
router.delete('/class/delete/:classId', teacherOrAdminOnly, classController.deleteClass);
router.delete('/class/:classId', teacherOrAdminOnly, classController.deleteClass);
router.post('/class/add-students/:classId', teacherOrAdminOnly, classController.addStudentsToClass);
router.delete('/class/remove-student/:classId/:studentId', teacherOrAdminOnly, classController.removeStudentFromClass);
router.get('/class/students/:classId', teacherOrAdminOnly, classController.getClassStudents);
router.get('/class/:classId/students', teacherOrAdminOnly, classController.getClassStudents);
router.get('/class/:id', teacherOrAdminOnly, classController.getClassById);
router.post('/class', teacherOrAdminOnly, classController.createClass);
router.put('/class/:id', teacherOrAdminOnly, classController.updateClass);
router.delete('/class/:id', teacherOrAdminOnly, classController.deleteClass);
router.post('/class/:id/students', teacherOrAdminOnly, classController.addStudentsToClass);
router.delete('/class/:id/students/:studentId', teacherOrAdminOnly, classController.removeStudentFromClass);
router.put('/class/:id/archive', teacherOrAdminOnly, classController.archiveClass);

// Homework management
router.get('/homework/list', teacherOrAdminOnly, homeworkController.getHomeworkList);
router.get('/homework/details/:homeworkId', teacherOrAdminOnly, homeworkController.getHomeworkDetails);
router.post('/homework/create', teacherOrAdminOnly, homeworkController.createHomework);
router.post('/homework/update', teacherOrAdminOnly, homeworkController.updateHomework);
router.put('/homework/update/:homeworkId', teacherOrAdminOnly, homeworkController.updateHomework);
router.delete('/homework/delete/:homeworkId', teacherOrAdminOnly, homeworkController.deleteHomework);
router.post('/homework/submit', studentOnly, homeworkController.submitHomework);
router.get('/homework/submissions/:homeworkId', teacherOrAdminOnly, homeworkController.getHomeworkSubmissions);
router.post('/homework/review', teacherOrAdminOnly, homeworkController.reviewHomework);
router.post('/homework/grade', teacherOrAdminOnly, homeworkController.gradeHomework);
router.post('/homework/grade/:submissionId', teacherOrAdminOnly, homeworkController.gradeHomework);
router.post('/homework/batch-grade', teacherOrAdminOnly, homeworkController.batchGradeHomework);
router.get('/homework/grading-stats', teacherOrAdminOnly, homeworkController.getGradingStats);
router.get('/homework/grading-stats/:homeworkId', teacherOrAdminOnly, homeworkController.getGradingStats);
router.get('/homework/pending', teacherOrAdminOnly, homeworkController.getPendingHomework);
router.get('/homework-review/list', teacherOrAdminOnly, homeworkController.getTeacherReviewList);
router.get('/homework-review/stats', teacherOrAdminOnly, homeworkController.getTeacherReviewStats);

// Classroom management
router.get('/classroom/list', teacherOrAdminOnly, classroomController.getClassroomList);
router.get('/classroom/:id', teacherOrAdminOnly, classroomController.getClassroomDetail);
router.post('/classroom/create', teacherOrAdminOnly, classroomController.createClassroom);
router.put('/classroom/update/:classroomId', teacherOrAdminOnly, classroomController.updateClassroom);
router.put('/classroom/:id', teacherOrAdminOnly, classroomController.updateClassroom);
router.delete('/classroom/delete/:classroomId', teacherOrAdminOnly, classroomController.deleteClassroom);
router.delete('/classroom/:id', teacherOrAdminOnly, classroomController.deleteClassroom);
router.get('/classroom/:id/status', teacherOrAdminOnly, classroomController.getClassroomStatus);
router.post('/classroom/start/:classroomId', teacherOrAdminOnly, classroomController.startClassroom);
router.post('/classroom/end/:classroomId', teacherOrAdminOnly, classroomController.endClassroom);
router.post('/classroom/:id/start', teacherOrAdminOnly, classroomController.startClassroom);
router.post('/classroom/:id/end', teacherOrAdminOnly, classroomController.endClassroom);
router.get('/classroom/students/:classroomId', teacherOrAdminOnly, classroomController.getClassroomStudents);
router.post('/classroom/join/:classroomId', studentOnly, classroomController.joinClassroom);
router.get('/classroom/student/my-classrooms', studentOnly, classroomController.getStudentClassrooms);
router.post('/classroom/:classroomId/leave', studentOnly, classroomController.leaveClassroom);
router.get('/classroom/notes/:classroomId', studentOnly, classroomController.getClassroomNotes);
router.post('/classroom/notes', studentOnly, classroomController.saveClassroomNotes);

// Schedule
router.get('/schedule/list', teacherOrAdminOnly, scheduleController.getScheduleList);
router.get('/schedule/teacher/:teacherId', teacherOrAdminOnly, scheduleController.getTeacherSchedule);
router.get('/schedule/class/:classId', teacherOrAdminOnly, scheduleController.getClassSchedule);
router.post('/schedule/create', teacherOrAdminOnly, scheduleController.createSchedule);
router.put('/schedule/update/:scheduleId', teacherOrAdminOnly, scheduleController.updateSchedule);
router.delete('/schedule/delete/:scheduleId', teacherOrAdminOnly, scheduleController.deleteSchedule);

// Student work and compatibility endpoints
router.post('/teachingWork/submit', studentOnly, homeworkController.submitHomework);

router.post('/student/works/upload', anyAuthenticatedUser, studentWorkController.uploadWork);
router.post('/student/works/:id/star', anyAuthenticatedUser, studentWorkController.starWorkById);
router.post('/student/works/:id/comments', anyAuthenticatedUser, studentWorkController.saveCommentById);
router.put('/student/works/:id', anyAuthenticatedUser, studentWorkController.updateWork);
router.delete('/student/works/:id', anyAuthenticatedUser, studentWorkController.deleteWork);

router.get('/teachingWork/mine', anyAuthenticatedUser, studentWorkController.getLegacyMyWorks);
router.get('/teachingWork/list', teacherOrAdminOnly, studentWorkController.getLegacyAllWorks);
router.delete('/teachingWork/delete', anyAuthenticatedUser, studentWorkController.deleteWork);
router.delete('/teachingWork/deleteBatch', anyAuthenticatedUser, studentWorkController.deleteBatchWorks);
router.get('/teachingWork/mineAdditionalWork', anyAuthenticatedUser, studentWorkController.getLegacyAdditionalWorks);
router.get('/teachingWork/getWorkTags', anyAuthenticatedUser, studentWorkController.getWorkTags);
router.get('/teachingWork/setWorkTag', anyAuthenticatedUser, studentWorkController.setWorkTag);
router.delete('/teachingWork/delWorkTag', anyAuthenticatedUser, studentWorkController.delWorkTag);
router.post('/teachingWork/saveComment', anyAuthenticatedUser, studentWorkController.saveComment);

module.exports = router;
