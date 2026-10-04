/**
 * Classroom routes.
 * Keep compatibility aliases, but avoid duplicate registrations and comment-corrupted lines.
 */

const express = require('express');
const router = express.Router();
const classroomController = require('../controllers/classroomSecureController');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uuidUtil = require('../utils/uuid');
const { createClassroomAccessMiddleware } = require('../utils/classroomAccess');

const classroomUploadDir = path.join(__dirname, '../../uploads/classroom');

function ensureClassroomUploadDir() {
  if (!fs.existsSync(classroomUploadDir)) {
    fs.mkdirSync(classroomUploadDir, { recursive: true });
  }
  return classroomUploadDir;
}

const classroomStorage = multer.diskStorage({
  destination(req, file, cb) {
    try {
      cb(null, ensureClassroomUploadDir());
    } catch (error) {
      cb(error);
    }
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const timestamp = Date.now();
    const shortId = uuidUtil.generate().substring(0, 8);
    cb(null, `cls_${timestamp}_${shortId}${ext}`);
  }
});

const CLASSROOM_ALLOWED_EXT = new Set([
  '.zip', '.rar', '.7z', '.tar', '.gz',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
  '.sb3', '.sb2', '.py', '.js', '.ts', '.cpp', '.c', '.html', '.css', '.json',
  '.mp4', '.webm', '.mp3', '.wav', '.ogg',
  '.jpg', '.jpeg', '.png', '.gif', '.webp'
]);

const classroomUpload = multer({
  storage: classroomStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (CLASSROOM_ALLOWED_EXT.has(ext)) {
      cb(null, true);
      return;
    }
    cb(new Error('不支持的文件类型'));
  }
});

const classroomUploadMiddleware = (req, res, next) => {
  classroomUpload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? '文件大小超过限制（最大 100MB）'
        : `上传错误: ${err.message}`;
      return res.status(400).json({ success: false, code: 400, message });
    }

    if (err) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: err.message || '文件上传失败'
      });
    }

    next();
  });
};

router.use(auth.verifyToken);

const teacherOrAdminOnly = auth.requireUserIdentity([1, 2], '仅教师或管理员可访问课堂管理接口');
const studentOnly = auth.requireUserIdentity([3], '仅学生可访问课堂接口');

// Classroom CRUD
router.get('/classrooms', teacherOrAdminOnly, classroomController.getClassroomList);
router.get('/list', teacherOrAdminOnly, classroomController.getClassroomList);
router.get('/student/my-classrooms', studentOnly, classroomController.getStudentClassrooms);

router.post('/classrooms/create', teacherOrAdminOnly, classroomController.createClassroom);
router.post('/create', teacherOrAdminOnly, classroomController.createClassroom);

router.get('/classrooms/:id', createClassroomAccessMiddleware(), classroomController.getClassroomDetail);

router.put('/classrooms/:id', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.updateClassroom);
router.put('/update/:id', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.updateClassroom);
router.put('/:id', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.updateClassroom);

router.delete('/classrooms/:id', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.deleteClassroom);
router.delete('/delete/:id', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.deleteClassroom);
router.delete('/:id', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.deleteClassroom);

// Student roster and membership
router.get('/classrooms/:id/students', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.getClassroomStudents);
router.get('/students/:classroomId', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.getClassroomStudents);
router.post('/classrooms/:id/join', studentOnly, createClassroomAccessMiddleware({ studentOnly: true }), classroomController.joinClassroom);
router.post('/classrooms/:id/leave', studentOnly, createClassroomAccessMiddleware({ studentOnly: true }), classroomController.leaveClassroom);
router.post('/join/:classroomId', studentOnly, createClassroomAccessMiddleware({ studentOnly: true }), classroomController.joinClassroom);

// Classroom lifecycle
router.post('/start/:classroomId', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.startClassroom);
router.post('/classrooms/:id/start', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.startClassroom);
router.post('/:classroomId/start', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.startClassroom);

router.post('/end/:classroomId', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.endClassroom);
router.post('/classrooms/:id/end', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.endClassroom);
router.post('/:classroomId/end', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.endClassroom);

router.get('/status/:classroomId', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.getClassroomStatus);
router.post('/update-status/:classroomId', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.updateClassroomStatus);

// Classroom interaction
router.post('/broadcast-screen/:classroomId', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.broadcastScreen);
router.post('/raise-hand/:classroomId', studentOnly, createClassroomAccessMiddleware({ studentOnly: true }), classroomController.raiseHand);
router.post('/chat/:classroomId', createClassroomAccessMiddleware(), classroomController.chat);

// Classroom files
router.post('/:classroomId/upload-file', createClassroomAccessMiddleware(), classroomUploadMiddleware, classroomController.uploadClassroomFile);
router.get('/:classroomId/file/:filename', createClassroomAccessMiddleware(), classroomController.downloadClassroomFile);
router.get('/classrooms/:classroomId/resources/:resourceId/preview', createClassroomAccessMiddleware(), classroomController.previewClassroomResource);
router.get('/classrooms/:classroomId/resources/:resourceId/download', createClassroomAccessMiddleware(), classroomController.downloadClassroomResource);
router.get('/classrooms/:classroomId/resources/:resourceId/share-link', createClassroomAccessMiddleware(), classroomController.getClassroomResourceShareLink);
router.post('/classrooms/:classroomId/upload-token', createClassroomAccessMiddleware(), classroomController.getUploadToken);
router.post('/:classroomId/upload-token', createClassroomAccessMiddleware(), classroomController.getUploadToken);
router.get('/classrooms/:classroomId/file/:fileKey/url', createClassroomAccessMiddleware(), classroomController.getFileUrl);
router.post('/classrooms/:classroomId/file-url', createClassroomAccessMiddleware(), classroomController.getFileUrl);
router.post('/:classroomId/file-url', createClassroomAccessMiddleware(), classroomController.getFileUrl);

// Chat history and demo content
router.get('/:id/chat-history', createClassroomAccessMiddleware(), classroomController.getChatHistory);
router.get('/chat-history/:id', createClassroomAccessMiddleware(), classroomController.getChatHistory);
router.post('/:id/demo-content', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.saveDemoContent);
router.get('/:id/demo-content', createClassroomAccessMiddleware(), classroomController.getDemoContent);

// Code sync and classroom homework
router.post('/code-sync/:classroomId', createClassroomAccessMiddleware({ teacherOnly: true }), classroomController.codeSync);
router.post('/homework-submit/:classroomId', studentOnly, createClassroomAccessMiddleware({ studentOnly: true }), classroomController.submitHomework);

// Stats and control
router.get('/statistics', teacherOrAdminOnly, classroomController.getStatistics);
router.get('/online-status', teacherOrAdminOnly, classroomController.getOnlineStatus);
router.post('/control/broadcast', teacherOrAdminOnly, classroomController.controlBroadcast);
router.post('/control/screen-lock', teacherOrAdminOnly, classroomController.controlScreenLock);

// Compatibility detail route must stay last to avoid swallowing static GET paths.
router.get('/:id', createClassroomAccessMiddleware(), classroomController.getClassroomDetail);

module.exports = router;
