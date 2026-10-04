const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const auth = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const Response = require('../utils/response');
router.get('/external/:id', resourceController.accessExternalResource);

const teacherOrAdminOnly = auth.requireUserIdentity([1, 2], '仅管理员或教师可执行资源管理操作');

router.use(auth.verifyToken);

router.get('/list', teacherOrAdminOnly, resourceController.getResourceList);
router.get('/folders', (req, res) => {
  res.json(Response.success([]));
});
router.get('/statistics', teacherOrAdminOnly, resourceController.getResourceStatistics);
router.get('/download/:id', teacherOrAdminOnly, resourceController.downloadResource);
router.get('/preview/:id', teacherOrAdminOnly, resourceController.previewResource);
router.get('/:id/download-url', teacherOrAdminOnly, resourceController.getResourceDownloadUrl);
router.get('/share-link/:id', teacherOrAdminOnly, resourceController.getResourceShareLink);
router.get('/:id', teacherOrAdminOnly, resourceController.getResourceById);

router.post('/upload', teacherOrAdminOnly, upload.single('file'), resourceController.uploadResource);
router.post('/upload-token', teacherOrAdminOnly, resourceController.getResourceUploadToken);
router.post('/metadata', teacherOrAdminOnly, resourceController.saveResourceMetadata);
router.put('/:id', teacherOrAdminOnly, resourceController.updateResource);
router.delete('/:id', teacherOrAdminOnly, resourceController.deleteResource);

module.exports = router;
