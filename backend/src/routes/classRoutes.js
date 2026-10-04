/**
 * Class management routes.
 */

const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const auth = require('../middleware/auth');

const teacherOnlyAccess = auth.requireUserIdentity([1, 2], 'Only teachers and administrators can access class management.');

router.use(auth.verifyToken);
router.use(teacherOnlyAccess);

// Legacy frontend aliases
router.get('/students/:classId', classController.getClassStudents);
router.post('/add-students/:classId', classController.addStudentsToClass);
router.delete('/remove-student/:classId/:studentId', classController.removeStudentFromClass);

// Class CRUD
router.get('/list', classController.getClassList);
router.get('/:id', classController.getClassById);
router.post('/', classController.createClass);
router.put('/:id', classController.updateClass);
router.delete('/:id', classController.deleteClass);

// Class student management
router.get('/:id/students', classController.getClassStudents);
router.post('/:id/students', classController.addStudentsToClass);
router.delete('/:id/students/:studentId', classController.removeStudentFromClass);
router.post('/:id/students/remove-batch', classController.removeBatchStudents);

// Archive
router.put('/:id/archive', classController.archiveClass);

module.exports = router;
