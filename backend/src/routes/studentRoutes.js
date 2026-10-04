/**
 * 学生管理路由
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const studentController = require('../controllers/studentController');
const auth = require('../middleware/auth');
const teacherOnlyAccess = auth.requireUserIdentity([1, 2], '仅教师或管理员可访问学生管理');

// 学员批量导入文件上传配置
const importUploadDir = path.join(__dirname, '../../uploads/imports');
if (!fs.existsSync(importUploadDir)) {
  fs.mkdirSync(importUploadDir, { recursive: true });
}

const importStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, importUploadDir);
  },
  filename: function (req, file, cb) {
    const originalname = Buffer.from(file.originalname || 'import.xlsx', 'latin1').toString('utf8');
    const ext = path.extname(originalname) || '.xlsx';
    const uniqueSuffix = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const tmpl = 'student_import_' + uniqueSuffix + ext;
    cb(null, tmpl);
  }
});

const importFileFilter = (req, file, cb) => {
  const originalName = (() => {
    try { return Buffer.from(file.originalname || '', 'latin1').toString('utf8'); }
    catch (e) { return file.originalname || ''; }
  })();
  const ext = path.extname(originalName).toLowerCase();
  const allowed = ['.xlsx', '.xls', '.csv'];
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('仅支持 .xlsx、.xls、.csv 格式的文件'), false);
  }
};

const importUpload = multer({
  storage: importStorage,
  fileFilter: importFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// 所有学生路由都需要认证
router.use(auth.verifyToken);
router.use(teacherOnlyAccess);

// 学生CRUD
router.get('/list', studentController.getStudentList);
router.get('/:id', studentController.getStudentById);
router.post('/', studentController.createStudent);
router.put('/:id', studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);

// 学生状态管理
router.put('/:id/status', studentController.updateStudentStatus);

// 重置密码
router.put('/:id/reset-password', studentController.resetPassword);

// 学生班级分配
router.post('/assignClass', studentController.assignClass);

// 批量导入学员（Excel/CSV）
router.post('/batch-import', importUpload.single('file'), studentController.batchImportStudents);

module.exports = router;