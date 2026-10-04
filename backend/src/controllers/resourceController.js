/**
 * 课程资源控制器
 */

const { logger } = require('../middleware/logger');
const Response = require('../utils/response');
const models = require('../models');
const uuidUtil = require('../utils/uuid');
const path = require('path');
const fs = require('fs');
const { uploadDir } = require('../middleware/upload');
const { getSafeUploadFileName, resolvePathWithinDir, isRemoteUrl } = require('../utils/fileSecurity');
const { Op } = require('sequelize');
const ossUtil = require('../utils/oss');
const { getRequestUserContext } = require('../utils/classroomAccess');
const {
  generateExternalResourceToken,
  verifyExternalResourceToken
} = require('../utils/externalResourceToken');
const {
  filterTeachingResourcePayload,
  getTeachingResourceSchemaSupport,
  getTeachingResourceSelectableAttributes
} = require('../utils/resourceSchema');
const { getTeachingCourseUnitSelectableAttributes } = require('../utils/courseUnitSchema');

const RESOURCE_UPLOAD_ALLOWED_EXTENSIONS = new Set([
  '.zip', '.rar', '.7z', '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.ppt', '.pptx', '.txt', '.sb3', '.sb2', '.py', '.js', '.ts',
  '.cpp', '.c', '.html', '.css', '.json',
  '.mp4', '.mp3', '.wav', '.jpg', '.jpeg', '.png', '.gif', '.webp'
]);
const AI_PACKAGE_ALLOWED_EXTENSION = '.zip';
const OPENMAIC_DIRECT_IMPORT_TOKEN_TTL_SECONDS = (() => {
  const configuredValue = parseInt(process.env.OPENMAIC_DIRECT_IMPORT_TOKEN_TTL_SECONDS, 10);
  return Number.isFinite(configuredValue) && configuredValue > 0 ? configuredValue : 10 * 60;
})();

function normalizeUploadFileName(fileName) {
  const normalized = path.basename(String(fileName || '').trim());
  return normalized.replace(/[<>:\"/\\|?*\u0000-\u001f]/g, '_').slice(0, 200);
}

function getNormalizedFileExtension(fileName) {
  return path.extname(normalizeUploadFileName(fileName)).toLowerCase();
}

function normalizeResourceField(value, maxLength = 200) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = String(value).trim();
  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.slice(0, maxLength);
}

function normalizeResourceName(resourceName, fallbackName) {
  return normalizeResourceField(resourceName, 200) || fallbackName;
}

function getResourceDownloadName(resource) {
  const fallbackName = normalizeUploadFileName(resource.file_name || 'resource');
  const normalizedName = normalizeResourceName(resource.resource_name, fallbackName) || 'resource';
  const fileExtension = String(resource.file_extension || '').replace(/^\./, '').trim();

  if (!fileExtension) {
    return normalizedName;
  }

  const normalizedSuffix = `.${fileExtension.toLowerCase()}`;
  if (normalizedName.toLowerCase().endsWith(normalizedSuffix)) {
    return normalizedName;
  }

  return `${normalizedName}.${fileExtension}`;
}

function getResourceRequestPath(req) {
  const baseUrl = req && req.baseUrl ? String(req.baseUrl) : '';
  const pathName = req && req.path ? String(req.path) : '';
  const combinedPath = `${baseUrl}${pathName}`;
  return combinedPath || (req && req.originalUrl) || null;
}

function classifyResourceAccess(req, resource) {
  const classroomAccess = req && req.classroomAccess && req.classroomAccess.ok
    ? req.classroomAccess
    : null;

  if (classroomAccess) {
    return {
      scope: 'classroom-bound',
      userId: classroomAccess.user && classroomAccess.user.userId
        ? String(classroomAccess.user.userId)
        : null,
      userRole: classroomAccess.accessRole || null,
      classroomId: classroomAccess.classroomId ? String(classroomAccess.classroomId) : null
    };
  }

  const user = getRequestUserContext(req);
  const userId = user && user.userId ? String(user.userId) : null;
  const uploaderId = resource && resource.uploader_id ? String(resource.uploader_id) : null;

  if (user && (user.userRole === 'admin' || user.userRole === 'teacher')) {
    return {
      scope: 'teacher-or-admin',
      userId,
      userRole: user.userRole,
      classroomId: null
    };
  }

  if (uploaderId && userId && uploaderId === userId) {
    return {
      scope: 'uploader-self',
      userId,
      userRole: (user && user.userRole) || 'authenticated',
      classroomId: null
    };
  }

  return {
    scope: 'generic-authenticated',
    userId,
    userRole: (user && user.userRole) || 'authenticated',
    classroomId: null
  };
}

function auditResourceAccess(req, resource, action) {
  const access = classifyResourceAccess(req, resource);
  const payload = {
    action,
    resourceId: resource && resource.id ? String(resource.id) : null,
    resourceType: resource && resource.resource_type ? resource.resource_type : null,
    userId: access.userId,
    userRole: access.userRole,
    scope: access.scope,
    classroomId: access.classroomId,
    requestPath: getResourceRequestPath(req)
  };

  if (access.scope === 'generic-authenticated') {
    logger.warn('Resource access is using generic authenticated fallback', payload);
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    logger.debug('Resource access classification resolved', payload);
  }
}

function ensureResourceAccess(req, res, resource, action) {
  const access = classifyResourceAccess(req, resource);

  if (access.scope === 'generic-authenticated') {
    logger.warn('Blocked resource access without explicit ownership or classroom grant', {
      action,
      resourceId: resource && resource.id ? String(resource.id) : null,
      requestPath: getResourceRequestPath(req),
      userId: access.userId,
      userRole: access.userRole
    });
    res.status(403).json(Response.error('无权访问该资源', 403));
    return null;
  }

  auditResourceAccess(req, resource, action);
  return access;
}

async function incrementResourceCounter(resource, counterField) {
  if (!resource || !resource.id || !counterField) {
    return;
  }

  try {
    await models.TeachingResource.update(
      { [counterField]: (resource[counterField] || 0) + 1 },
      { where: { id: resource.id } }
    );
  } catch (error) {
    logger.warn('Failed to increment resource counter', {
      resourceId: resource.id,
      counterField,
      error: error.message
    });
  }
}

function applyResourceTransferHeaders(res, resource, options = {}) {
  const disposition = String(options.disposition || 'attachment').trim().toLowerCase() === 'inline'
    ? 'inline'
    : 'attachment';
  const fileName = getResourceDownloadName(resource);

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Cache-Control',
    disposition === 'inline'
      ? 'private, max-age=0, must-revalidate'
      : 'no-store, no-cache, must-revalidate'
  );
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Content-Type', resource.mime_type || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename*=UTF-8''${encodeURIComponent(fileName)}`
  );

  if (options.includeLength) {
    res.setHeader('Content-Length', resource.file_size || 0);
  }

  return fileName;
}

function validateAiPackageFileExtension(resourceType, fileName) {
  if (String(resourceType || '').trim() !== 'ai_package') {
    return null;
  }

  return getNormalizedFileExtension(fileName) === AI_PACKAGE_ALLOWED_EXTENSION
    ? null
    : 'AI资源包仅支持上传 .zip 格式文件';
}

function isAiPackageZipResource(resource) {
  return Boolean(
    resource &&
    resource.resource_type === 'ai_package' &&
    getNormalizedFileExtension(getResourceDownloadName(resource)) === AI_PACKAGE_ALLOWED_EXTENSION
  );
}

function getRequestOrigin(req) {
  const configuredPublicBaseUrl = String(
    process.env.PUBLIC_BASE_URL || process.env.APP_PUBLIC_BASE_URL || ''
  ).trim();
  if (configuredPublicBaseUrl) {
    return configuredPublicBaseUrl.replace(/\/+$/, '');
  }

  const protocol = String(
    req.headers['x-forwarded-proto'] || req.protocol || 'http'
  ).split(',')[0].trim();
  const host = String(
    req.headers['x-forwarded-host'] || (typeof req.get === 'function' ? req.get('host') : '') || ''
  ).split(',')[0].trim();

  if (!host) {
    return '';
  }

  return `${protocol || 'http'}://${host}`;
}

function resolveOpenMaicBaseUrl() {
  const configuredBaseUrl = String(process.env.OPENMAIC_BASE_URL || '').trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }

  return process.env.NODE_ENV === 'production' ? 'https://ai.codebn.cn' : 'http://localhost:3000';
}

function getExternalResourceDisposition(rawDisposition) {
  return String(rawDisposition || '').trim().toLowerCase() === 'inline' ? 'inline' : 'attachment';
}

function getExternalResourceTokenExpiry() {
  return `${OPENMAIC_DIRECT_IMPORT_TOKEN_TTL_SECONDS}s`;
}

function buildExternalResourceAccessUrl(req, resource, disposition = 'attachment') {
  const normalizedDisposition = getExternalResourceDisposition(disposition);
  const token = generateExternalResourceToken({
    resourceId: resource.id,
    disposition: normalizedDisposition
  }, getExternalResourceTokenExpiry());
  const origin = getRequestOrigin(req);
  const query = `token=${encodeURIComponent(token)}&disposition=${encodeURIComponent(normalizedDisposition)}`;
  const relativePath = `/resource/external/${resource.id}?${query}`;

  return origin ? `${origin}${relativePath}` : relativePath;
}

function formatResourceRecord(resource) {
  let resourceName = resource.resource_name;

  try {
    if (resourceName && /[脙楼脗路脗娄脙陇脗赂脗潞脙漏脗\x80脗戮]/i.test(resourceName)) {
      resourceName = Buffer.from(resourceName, 'latin1').toString('utf8');
    }
  } catch (error) {
    logger.warn('修复资源名称编码失败', { id: resource.id, error: error.message });
  }

  return {
    id: resource.id,
    title: resourceName,
    name: resourceName,
    resource_name: resourceName,
    type: resource.resource_type,
    resource_type: resource.resource_type,
    size: resource.file_size,
    file_size: resource.file_size,
    sizeText: formatFileSize(resource.file_size),
    format: resource.file_extension,
    file_extension: resource.file_extension,
    folder: resource.folder_id,
    uploadTime: resource.create_time,
    create_time: resource.create_time,
    uploadBy: resource.uploader_name,
    downloads: resource.download_count || 0,
    download_count: resource.download_count || 0,
    views: resource.view_count || 0,
    description: resource.description || '',
    courseId: resource.course_id,
    courseName: resource.course_name,
    courseSystem: resource.course_system || '',
    courseStage: resource.course_stage || '',
    courseSystemLabel: resource.course_system || '未分类',
    courseStageLabel: resource.course_stage || '未分阶段',
    isFavorite: false,
    fileUrl: resource.file_url || '',
    fileName: resource.file_name || resourceName,
    tags: String(resource.tags || '').split(',').map(tag => tag.trim()).filter(Boolean),
    previewUrl: `/api/teaching/course/resources/preview/${resource.id}`,
    downloadUrl: `/api/teaching/course/resources/download/${resource.id}`
  };
}

/**
 * 获取资源列表
 * GET /resource/list 或 /teaching/course/resources/list
 */
exports.getResourceList = async (req, res) => {
  try {
    const lessonAttributes = await getTeachingCourseUnitSelectableAttributes();
    const resourceAttributes = await getTeachingResourceSelectableAttributes();
    const resourceSchemaSupport = await getTeachingResourceSchemaSupport();
    const {
      pageNo = 1,
      pageSize = 10,
      type,
      keyword,
      courseId,
      lessonId,
      courseSystem,
      courseStage
    } = req.query;
    const limit = parseInt(pageSize, 10);
    const currentPage = parseInt(pageNo, 10);
    const offset = (currentPage - 1) * limit;

    const where = { del_flag: 0 };
    
    // 如果指定了lessonId，先查询课节关联的资源ID
    if (lessonId) {
      logger.debug('Filter resource list by lesson', { lessonId });
      const lesson = await models.TeachingCourseUnit.findOne({
        where: { id: lessonId, del_flag: 0 },
        attributes: lessonAttributes
      });
      
      if (lesson && lesson.resource_id) {
        logger.debug('Resolved lesson resource mapping', { lessonId, resourceId: lesson.resource_id });
        // 返回该课节关联的资源
        const resource = await models.TeachingResource.findOne({
          where: { id: lesson.resource_id, del_flag: 0 },
          attributes: resourceAttributes
        });
        
        if (resource) {
          const resourceData = formatResourceRecord(resource);
          return res.json(Response.page([resourceData], 1, pageNo, pageSize));
        } else {
          logger.warn('Lesson resource mapping points to a missing resource', { lessonId, resourceId: lesson.resource_id });
          return res.json(Response.page([], 0, pageNo, pageSize));
        }
      } else {
        logger.debug('Lesson has no linked resource', { lessonId });
        return res.json(Response.page([], 0, pageNo, pageSize));
      }
    }
    
    // 如果指定了courseId，返回该课程的资源 + 未关联课程的通用资源
    if (courseId && resourceSchemaSupport.courseId) {
      where[Op.or] = [
        { course_id: courseId },
        { course_id: null }
      ];
      logger.debug('Filter resource list by course', { courseId });
    } else if (courseId && !resourceSchemaSupport.courseId) {
      logger.warn('Ignoring course resource courseId filter because teaching_resource.course_id is missing', { courseId });
    }
    
    if (type) {
      where.resource_type = type;
    }
    
    if (keyword) {
      where.resource_name = { [Op.like]: `%${keyword}%` };
    }

    const normalizedCourseSystem = normalizeResourceField(courseSystem, 100);
    const normalizedCourseStage = normalizeResourceField(courseStage, 100);
    const normalizedKeyword = normalizeResourceField(keyword, 100);

    if (normalizedCourseSystem && resourceSchemaSupport.courseSystem) {
      where.course_system = normalizedCourseSystem;
    }

    if (normalizedCourseStage && resourceSchemaSupport.courseStage) {
      where.course_stage = normalizedCourseStage;
    }

    if (normalizedKeyword) {
      const keywordConditions = [
        { resource_name: { [Op.like]: `%${normalizedKeyword}%` } },
        { description: { [Op.like]: `%${normalizedKeyword}%` } }
      ];

      if (resourceSchemaSupport.courseName) {
        keywordConditions.push({ course_name: { [Op.like]: `%${normalizedKeyword}%` } });
      }

      if (resourceSchemaSupport.courseSystem) {
        keywordConditions.push({ course_system: { [Op.like]: `%${normalizedKeyword}%` } });
      }

      if (resourceSchemaSupport.courseStage) {
        keywordConditions.push({ course_stage: { [Op.like]: `%${normalizedKeyword}%` } });
      }

      delete where.resource_name;
      where[Op.and] = [
        {
          [Op.or]: keywordConditions
        }
      ];
    }

    const { count, rows } = await models.TeachingResource.findAndCountAll({
      where,
      attributes: resourceAttributes,
      limit,
      offset,
      order: [['create_time', 'DESC']]
    });

    // 格式化响应
    const resources = rows.map(formatResourceRecord); /*
      return formatResourceRecord(r);
      // 尝试修复可能的编码问题（旧数据）
      let resourceName = r.resource_name;
      try {
        // 检测是否为乱码（包含特殊字符）
        if (resourceName && /[Ã¥Â·Â¦Ã¤Â¸ÂºÃ©Â\x80Â¾]/i.test(resourceName)) {
          // 尝试转换：假设原本是UTF-8但被当作latin1读取了
          resourceName = Buffer.from(resourceName, 'latin1').toString('utf8');
          console.log(`🔧 [RESOURCE LIST] 修复文件名编码: "${r.resource_name}" -> "${resourceName}"`);
        }
      } catch (e) {
        // 如果转换失败，使用原名称
        console.warn(`⚠️ [RESOURCE LIST] 无法修复文件名: ${r.resource_name}`, e);
      }
      
      return {
        id: r.id,
        title: resourceName,
        name: resourceName,
        resource_name: resourceName, // 添加这个字段以兼容前端
        type: r.resource_type,
        resource_type: r.resource_type, // 添加这个字段以兼容前端
        size: r.file_size,
        file_size: r.file_size, // 添加这个字段以兼容前端
        sizeText: formatFileSize(r.file_size),
        format: r.file_extension,
        file_extension: r.file_extension, // 添加这个字段以兼容前端
        folder: r.folder_id,
        uploadTime: r.create_time,
        create_time: r.create_time, // 添加这个字段以兼容前端
        uploadBy: r.uploader_name,
        downloads: r.download_count || 0,
        download_count: r.download_count || 0, // 添加这个字段以兼容前端
        views: r.view_count || 0,
        isFavorite: false,
        previewUrl: `/api/resource/preview/${r.id}`,
        downloadUrl: `/api/resource/download/${r.id}`
      };
    });

    */
    res.json(Response.page(resources, count, pageNo, pageSize));
  } catch (error) {
    logger.error('获取资源列表失败:', error);
    res.status(500).json(Response.error('获取资源列表失败'));
  }
};

/**
 * 上传资源
 * POST /resource/upload
 */
exports.uploadResource = async (req, res) => {
  try {
    if (!req.file) {
      return res.json(Response.error('请选择要上传的文件', 400));
    }

    const {
      courseId,
      courseName,
      description,
      resourceType,
      name,
      courseSystem,
      courseStage
    } = req.body;
    const file = req.file;
    
    // 修复中文文件名编码问题
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');

    logger.info('Resource upload request received', {
      originalname: originalname,
      filename: file.filename,
      size: file.size,
      courseId,
      courseName,
      resourceType
    });

    const aiPackageValidationError = validateAiPackageFileExtension(resourceType, originalname);
    if (aiPackageValidationError) {
      return res.status(400).json(Response.error(aiPackageValidationError, 400));
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const forceOss = String(process.env.FORCE_OSS || (isProduction ? 'true' : 'false')).toLowerCase() === 'true';

    // 确定文件URL和存储类型
    let fileUrl = `/uploads/${file.filename}`;
    let filePath = file.filename;
    let storageType = 'local';

    if (!ossUtil.isOSSConfigured() && forceOss) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(500).json(Response.error('OSS未配置，已禁止本地上传', 500));
    }

    // 如果OSS已配置，上传到OSS
    if (ossUtil.isOSSConfigured()) {
      try {
        const ossPath = ossUtil.generateOSSPath('course', file.filename);
        const ossResult = await ossUtil.uploadToOSS(file.path, ossPath);
        fileUrl = ossResult.url;
        filePath = ossResult.path;
        storageType = 'oss';
        logger.info('Resource upload stored in OSS', { fileUrl, ossPath });
      } catch (ossError) {
        logger.error('Resource upload to OSS failed', { error: ossError.message });
        if (forceOss) {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return res.status(500).json(Response.error('OSS上传失败，已禁止本地存储', 500));
        }
      }
    }

    // 创建资源记录（包含课程关联）
    const resourceCreatePayload = await filterTeachingResourcePayload({
      id: uuidUtil.generate(),
      resource_name: normalizeResourceName(name, originalname),
      resource_type: resourceType || getResourceType(file.mimetype, originalname),
      course_id: courseId || null,  // 保存课程ID
      course_name: courseName || null,  // 保存课程名称
      course_system: normalizeResourceField(courseSystem, 100),
      course_stage: normalizeResourceField(courseStage, 100),
      file_name: originalname,
      file_path: filePath,
      file_size: file.size,
      file_extension: path.extname(originalname).replace('.', ''),
      mime_type: file.mimetype,
      file_url: fileUrl,
      storage_type: storageType,
      category: normalizeResourceField(courseSystem, 100) || resourceType,
      description: normalizeResourceField(description, 1000),
      uploader_id: req.user?.id,
      uploader_name: req.user?.realname || 'Admin',
      download_count: 0,
      view_count: 0,
      del_flag: 0,
      create_time: new Date()
    });
    const resource = await models.TeachingResource.create(resourceCreatePayload);

    logger.info('Resource upload completed', { resourceId: resource.id, storageType });

    res.json(Response.success({
      id: resource.id,
      name: resource.resource_name,
      url: `/api/resource/download/${resource.id}`,
      previewUrl: `/api/resource/preview/${resource.id}`,
      size: resource.file_size,
      type: resource.resource_type
    }, '上传成功'));

  } catch (error) {
    logger.error('Upload resource failed', { error: error.message, stack: error.stack });
    res.status(500).json(Response.error('上传失败'));
  }
};

/**
 * 获取资源详情
 * GET /teaching/course/resources/details/:id
 */
exports.getResourceDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const resourceAttributes = await getTeachingResourceSelectableAttributes();

    const resource = await models.TeachingResource.findOne({
      where: { id, del_flag: 0 },
      attributes: resourceAttributes
    });

    if (!resource) {
      return res.status(404).json(Response.error('资源不存在', 404));
    }

    // 格式化响应
    const resourceDetails = {
      id: resource.id,
      title: resource.resource_name,
      name: resource.resource_name,
      type: resource.resource_type,
      size: resource.file_size,
      sizeText: formatFileSize(resource.file_size),
      format: resource.file_extension,
      mimeType: resource.mime_type,
      description: resource.description,
      uploadTime: resource.create_time,
      uploadBy: resource.uploader_name,
      uploaderId: resource.uploader_id,
      downloads: resource.download_count || 0,
      views: resource.view_count || 0,
      courseId: resource.course_id,
      courseName: resource.course_name,
      fileUrl: resource.file_url,  // OSS或本地文件URL
      courseSystem: resource.course_system || '',
      courseStage: resource.course_stage || '',
      tags: String(resource.tags || '').split(',').map(tag => tag.trim()).filter(Boolean),
      storageType: resource.storage_type || 'local',
      previewUrl: `/api/teaching/course/resources/preview/${resource.id}`,
      downloadUrl: `/api/teaching/course/resources/download/${resource.id}`
    };

    res.json(Response.success(resourceDetails));
  } catch (error) {
    logger.error('Get resource details failed', { error: error.message, stack: error.stack });
    res.status(500).json(Response.error('获取资源详情失败'));
  }
};

/**
 * 下载资源
 * GET /resource/download/:id
 */
exports.updateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const resourceAttributes = await getTeachingResourceSelectableAttributes();
    const resourceSchemaSupport = await getTeachingResourceSchemaSupport();
    const resource = await models.TeachingResource.findOne({
      where: { id, del_flag: 0 },
      attributes: resourceAttributes
    });

    if (!resource) {
      return res.status(404).json(Response.error('资源不存在', 404));
    }

    const normalizedName = normalizeResourceName(req.body.name, resource.resource_name);
    const normalizedType = normalizeResourceField(req.body.resourceType || req.body.type, 50) || resource.resource_type;
    const normalizedDescription = normalizeResourceField(req.body.description, 1000);
    const normalizedCourseSystem = normalizeResourceField(req.body.courseSystem, 100);
    const normalizedCourseStage = normalizeResourceField(req.body.courseStage, 100);
    const normalizedCourseId = normalizeResourceField(req.body.courseId, 32);
    const normalizedCourseNameFromRequest = normalizeResourceField(req.body.courseName, 200);

    if (normalizedType === 'ai_package') {
      const aiPackageValidationError = validateAiPackageFileExtension(
        normalizedType,
        resource.file_name || getResourceDownloadName(resource)
      );
      if (aiPackageValidationError) {
        return res.status(400).json(Response.error(aiPackageValidationError, 400));
      }
    }

    let normalizedCourseName = normalizedCourseNameFromRequest;
    if (normalizedCourseId) {
      const course = await models.TeachingCourse.findOne({
        where: { id: normalizedCourseId, del_flag: 0 }
      });

      if (!course) {
        return res.status(400).json(Response.error('关联课程不存在或已删除', 400));
      }

      normalizedCourseName = course.course_name || normalizedCourseNameFromRequest || null;
    }

    const normalizedTags = Array.isArray(req.body.tags)
      ? req.body.tags.map(tag => String(tag || '').trim()).filter(Boolean).join(',')
      : normalizeResourceField(req.body.tags, 255);

    const resourceUpdatePayload = await filterTeachingResourcePayload({
      resource_name: normalizedName,
      resource_type: normalizedType,
      course_id: normalizedCourseId || null,
      course_name: normalizedCourseId ? normalizedCourseName : null,
      course_system: resourceSchemaSupport.courseSystem ? normalizedCourseSystem : null,
      course_stage: resourceSchemaSupport.courseStage ? normalizedCourseStage : null,
      category: normalizedCourseSystem || normalizedType || null,
      tags: normalizedTags,
      description: normalizedDescription,
      update_time: new Date()
    });

    await models.TeachingResource.update(resourceUpdatePayload, {
      where: { id: resource.id }
    });

    const updatedResource = await models.TeachingResource.findOne({
      where: { id: resource.id, del_flag: 0 },
      attributes: resourceAttributes
    });

    return res.json(Response.success(formatResourceRecord(updatedResource), '资源信息更新成功'));
  } catch (error) {
    logger.error('Update resource metadata failed', { error: error.message, stack: error.stack });
    return res.status(500).json(Response.error('更新资源信息失败'));
  }
};

exports.downloadResource = async (req, res) => {
  try {
    const { id } = req.params;
    const resourceAttributes = await getTeachingResourceSelectableAttributes();

    const resource = await models.TeachingResource.findOne({
      where: { id, del_flag: 0 },
      attributes: resourceAttributes
    });

    if (!resource) {
      return res.status(404).json(Response.error('资源不存在，可能已被删除', 404));
    }

    // 处理OSS存储的文件
    if (!ensureResourceAccess(req, res, resource, 'download')) {
      return;
    }

    if (resource.storage_type === 'oss' && resource.file_url) {
      // 增加下载计数
      await incrementResourceCounter(resource, 'download_count');
      
      // 返回OSS直接下载链接
      return res.json(Response.success({
        downloadUrl: resource.file_url,
        fileName: getResourceDownloadName(resource),
        isRemote: true
      }, '获取下载链接成功'));
    }
    
    // 若发现是远程URL，直接返回远程下载链接
    if (resource.file_url && isRemoteUrl(resource.file_url)) {
      await incrementResourceCounter(resource, 'download_count');
      return res.json(Response.success({
        downloadUrl: resource.file_url,
        fileName: getResourceDownloadName(resource),
        isRemote: true
      }, '获取下载链接成功'));
    }

    // 处理本地文件
    let fileName;
    try {
      fileName = getSafeUploadFileName(resource.file_path || resource.file_name || '');
    } catch (e) {
      logger.error('非法文件路径:', { id, file_path: resource.file_path });
      return res.status(400).json(Response.error('文件路径不合法', 400));
    }
    let filePath;
    try {
      filePath = resolvePathWithinDir(uploadDir, fileName);
    } catch (e) {
      logger.error('非法文件路径:', { id, fileName });
      return res.status(400).json(Response.error('文件路径不合法', 400));
    }
    
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('Download local resource file', { resourceId: id, filePath });
    }

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      logger.error(`文件不存在: ${filePath}`);
      return res.status(404).json(Response.error(
        '文件不存在，可能已被移动或删除。请联系管理员或重新上传资源。',
        404
      ));
    }

    // 检查文件是否可读
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch (err) {
      logger.error(`文件无法读取: ${filePath}`, err);
      return res.status(403).json(Response.error(
        '文件无法访问，请联系管理员检查文件权限。',
        403
      ));
    }

    // 增加下载计数
    await incrementResourceCounter(resource, 'download_count');

    // 设置下载响应头
    applyResourceTransferHeaders(res, resource, {
      disposition: 'attachment',
      includeLength: true
    });

    // 使用流式传输，更高效且支持大文件
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      logger.error('文件流读取错误:', error);
      if (!res.headersSent) {
        res.status(500).json(Response.error('文件下载失败，请稍后重试', 500));
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    logger.error('下载资源失败:', error);
    res.status(500).json(Response.error('下载失败'));
  }
};

/**
 * 预览资源
 * GET /resource/preview/:id
 */
exports.previewResource = async (req, res) => {
  try {
    const { id } = req.params;
    const resourceAttributes = await getTeachingResourceSelectableAttributes();

    const resource = await models.TeachingResource.findOne({
      where: { id, del_flag: 0 },
      attributes: resourceAttributes
    });

    if (!resource) {
      return res.status(404).json(Response.error('资源不存在', 404));
    }

    // OSS 文件直接跳转预览
    if (!ensureResourceAccess(req, res, resource, 'preview')) {
      return;
    }

    if (resource.storage_type === 'oss' && resource.file_url) {
      await incrementResourceCounter(resource, 'view_count');
      return res.redirect(resource.file_url);
    }
    if (resource.file_url && isRemoteUrl(resource.file_url)) {
      await incrementResourceCounter(resource, 'view_count');
      return res.redirect(resource.file_url);
    }

    // file_path可能是完整路径或文件名，需要处理
    let fileName;
    try {
      fileName = getSafeUploadFileName(resource.file_path || resource.file_name || '');
    } catch (e) {
      return res.status(400).json(Response.error('文件路径不合法', 400));
    }
    let filePath;
    try {
      filePath = resolvePathWithinDir(uploadDir, fileName);
    } catch (e) {
      return res.status(400).json(Response.error('文件路径不合法', 400));
    }
    
    logger.debug('Preview local resource file', { resourceId: id, filePath });

    if (!fs.existsSync(filePath)) {
      return res.status(404).json(Response.error('文件不存在', 404));
    }

    // 设置响应头（不强制下载，允许浏览器预览）
    await incrementResourceCounter(resource, 'view_count');
    applyResourceTransferHeaders(res, resource, { disposition: 'inline' });

    // 发送文件
    res.sendFile(filePath);

  } catch (error) {
    logger.error('预览资源失败:', error);
    res.status(500).json(Response.error('预览失败'));
  }
};

/**
 * 删除资源
 * DELETE /resource/:id
 */
exports.deleteResource = async (req, res) => {
  try {
    const { id } = req.params;
    const resourceAttributes = await getTeachingResourceSelectableAttributes();

    const resource = await models.TeachingResource.findOne({
      where: { id, del_flag: 0 },
      attributes: resourceAttributes
    });

    if (!resource) {
      return res.status(404).json(Response.error('资源不存在', 404));
    }

    // 软删除
    await models.TeachingResource.update(
      { del_flag: 1, update_time: new Date() },
      { where: { id } }
    );

    // 可选：删除物理文件
    // const filePath = path.join(uploadDir, resource.file_path);
    // if (fs.existsSync(filePath)) {
    //   fs.unlinkSync(filePath);
    // }

    res.json(Response.success(null, '删除成功'));

  } catch (error) {
    logger.error('删除资源失败:', error);
    res.status(500).json(Response.error('删除失败'));
  }
};

/**
 * 获取资源详情
 * GET /resource/:id
 */
exports.getResourceById = async (req, res) => {
  try {
    const { id } = req.params;
    const resourceAttributes = await getTeachingResourceSelectableAttributes();

    const resource = await models.TeachingResource.findOne({
      where: { id, del_flag: 0 },
      attributes: resourceAttributes
    });

    if (!resource) {
      return res.status(404).json(Response.error('资源不存在', 404));
    }

    if (!ensureResourceAccess(req, res, resource, 'details')) {
      return;
    }

    res.json(Response.success({
      id: resource.id,
      name: resource.resource_name,
      type: resource.resource_type,
      size: resource.file_size,
      sizeText: formatFileSize(resource.file_size),
      format: resource.file_extension,
      courseId: resource.course_id,
      courseName: resource.course_name,
      fileName: resource.file_name || resource.resource_name,
      description: resource.description,
      uploadTime: resource.create_time,
      uploadBy: resource.uploader_name,
      downloads: resource.download_count || 0,
      previewUrl: `/api/resource/preview/${resource.id}`,
      downloadUrl: `/api/resource/download/${resource.id}`,
      status: resource.status
    }));

  } catch (error) {
    logger.error('获取资源详情失败:', error);
    res.status(500).json(Response.error('获取资源详情失败'));
  }
};

/**
 * 获取资源分类统计
 * GET /resource/statistics
 */
exports.getResourceStatistics = async (req, res) => {
  try {
    const resourceSchemaSupport = await getTeachingResourceSchemaSupport();
    const { type, courseSystem, courseStage } = req.query;
    const where = { del_flag: 0 };
    const normalizedCourseSystem = normalizeResourceField(courseSystem, 100);
    const normalizedCourseStage = normalizeResourceField(courseStage, 100);

    if (type && type !== 'all') {
      where.resource_type = type;
    }

    if (normalizedCourseSystem && resourceSchemaSupport.courseSystem) {
      where.course_system = normalizedCourseSystem;
    }

    if (normalizedCourseStage && resourceSchemaSupport.courseStage) {
      where.course_stage = normalizedCourseStage;
    }

    const total = await models.TeachingResource.count({ where });

    const byType = await models.TeachingResource.findAll({
      attributes: [
        'resource_type',
        [models.Sequelize.fn('COUNT', models.Sequelize.col('id')), 'count']
      ],
      where,
      group: ['resource_type']
    });

    const bySystem = resourceSchemaSupport.courseSystem
      ? await models.TeachingResource.findAll({
          attributes: [
            'course_system',
            [models.Sequelize.fn('COUNT', models.Sequelize.col('id')), 'count']
          ],
          where,
          group: ['course_system']
        })
      : [];

    const byStage = resourceSchemaSupport.courseStage
      ? await models.TeachingResource.findAll({
          attributes: [
            'course_stage',
            [models.Sequelize.fn('COUNT', models.Sequelize.col('id')), 'count']
          ],
          where,
          group: ['course_stage']
        })
      : [];

    const aiPackageCount = await models.TeachingResource.count({
      where: {
        ...where,
        resource_type: 'ai_package'
      }
    });

    const uncategorizedConditions = [];
    if (resourceSchemaSupport.courseSystem) {
      uncategorizedConditions.push({ course_system: null }, { course_system: '' });
    }
    if (resourceSchemaSupport.courseStage) {
      uncategorizedConditions.push({ course_stage: null }, { course_stage: '' });
    }

    const uncategorizedCount = uncategorizedConditions.length > 0
      ? await models.TeachingResource.count({
          where: {
            ...where,
            [Op.or]: uncategorizedConditions
          }
        })
      : total;

    const statistics = {
      total,
      aiPackageCount,
      uncategorizedCount,
      byType: byType.map(item => ({
        type: item.resource_type || 'other',
        count: parseInt(item.get('count'), 10)
      })),
      bySystem: bySystem.map(item => ({
        system: item.course_system || '',
        count: parseInt(item.get('count'), 10)
      })),
      byStage: byStage.map(item => ({
        stage: item.course_stage || '',
        count: parseInt(item.get('count'), 10)
      }))
    };

    res.json(Response.success(statistics));

  } catch (error) {
    logger.error('获取资源统计失败:', error);
    res.status(500).json(Response.error('获取资源统计失败'));
  }
};

exports.getResourceShareLink = async (req, res) => {
  try {
    const { id } = req.params;
    const resourceAttributes = await getTeachingResourceSelectableAttributes();
    const resource = await models.TeachingResource.findOne({
      where: { id, del_flag: 0 },
      attributes: resourceAttributes
    });

    if (!resource) {
      return res.status(404).json(Response.error('资源不存在', 404));
    }

    const previewUrl = buildExternalResourceAccessUrl(req, resource, 'inline');
    const downloadUrl = buildExternalResourceAccessUrl(req, resource, 'attachment');
    const shareUrl = isAiPackageZipResource(resource) ? downloadUrl : previewUrl;
    const openMaicBaseUrl = resolveOpenMaicBaseUrl();

    return res.json(Response.success({
      shareUrl,
      previewUrl,
      downloadUrl,
      expiresInSeconds: OPENMAIC_DIRECT_IMPORT_TOKEN_TTL_SECONDS,
      aiPackageDownloadUrl: isAiPackageZipResource(resource) ? downloadUrl : null,
      openMaicHomeUrl: openMaicBaseUrl || null
    }));
  } catch (error) {
    logger.error('Get resource share link failed', { error: error.message, stack: error.stack });
    return res.status(500).json(Response.error('获取分享链接失败'));
  }
};

exports.accessExternalResource = async (req, res) => {
  try {
    const { id } = req.params;
    const token = String(req.query.token || '').trim();
    const resourceAttributes = await getTeachingResourceSelectableAttributes();

    if (!token) {
      return res.status(401).json(Response.error('缺少访问令牌', 401));
    }

    let decoded;
    try {
      decoded = verifyExternalResourceToken(token);
    } catch (error) {
      return res.status(401).json(Response.error('访问令牌无效或已过期', 401));
    }

    if (!decoded || String(decoded.resourceId || '') !== String(id)) {
      return res.status(403).json(Response.error('资源访问权限校验失败', 403));
    }

    const resource = await models.TeachingResource.findOne({
      where: { id, del_flag: 0 },
      attributes: resourceAttributes
    });

    if (!resource) {
      return res.status(404).json(Response.error('资源不存在', 404));
    }

    const disposition = getExternalResourceDisposition(req.query.disposition || decoded.disposition);
    const counterField = disposition === 'inline' ? 'view_count' : 'download_count';
    await models.TeachingResource.update(
      { [counterField]: (resource[counterField] || 0) + 1 },
      { where: { id: resource.id } }
    );

    if (resource.storage_type === 'oss' && resource.file_path && ossUtil.isOSSConfigured()) {
      try {
        const signedUrl = await ossUtil.getSignedUrl(resource.file_path, OPENMAIC_DIRECT_IMPORT_TOKEN_TTL_SECONDS);
        return res.redirect(signedUrl);
      } catch (error) {
        logger.warn('Falling back to OSS file url for external resource access', {
          resourceId: resource.id,
          error: error.message
        });
      }
    }

    if (resource.file_url && isRemoteUrl(resource.file_url)) {
      return res.redirect(resource.file_url);
    }

    let fileName;
    try {
      fileName = getSafeUploadFileName(resource.file_path || resource.file_name || '');
    } catch (error) {
      return res.status(400).json(Response.error('文件路径不合法', 400));
    }

    let filePath;
    try {
      filePath = resolvePathWithinDir(uploadDir, fileName);
    } catch (error) {
      return res.status(400).json(Response.error('文件路径不合法', 400));
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json(Response.error('文件不存在', 404));
    }

    applyResourceTransferHeaders(res, resource, { disposition });

    return res.sendFile(filePath);
  } catch (error) {
    logger.error('External resource access failed', { error: error.message, stack: error.stack });
    return res.status(500).json(Response.error('资源访问失败'));
  }
};

// ========== OSS Direct Upload Methods ==========

/**
 * 获取资源上传凭证（预签名URL）
 * POST /course/resource/upload-token
 */
exports.getResourceUploadToken = async (req, res) => {
  try {
    const { fileName, fileType, fileSize } = req.body;
    const userId = req.user?.id;
    const normalizedFileName = normalizeUploadFileName(fileName);

    // 输入验证
    if (!normalizedFileName || !fileType) {
      return res.status(400).json(Response.error('文件信息不完整', 400));
    }

    const fileExt = getNormalizedFileExtension(normalizedFileName);
    if (!RESOURCE_UPLOAD_ALLOWED_EXTENSIONS.has(fileExt)) {
      return res.status(400).json(Response.error('不支持的文件类型', 400));
    }

    const timestamp = Date.now();
    const fileKey = `resources/${userId}/${timestamp}_${normalizedFileName}`;

    const tokenData = await ossUtil.getUploadToken(fileKey, Number(fileSize) || 0, fileType);

    logger.info('✅ 生成资源上传凭证成功', {
      userId,
      fileName: normalizedFileName,
      fileKey
    });

    return res.json(Response.success({
      uploadUrl: tokenData.uploadUrl,
      fileKey: fileKey,
      expiration: Date.now() + 300000 // 5分钟后过期
    }));

  } catch (error) {
    logger.error('❌ 获取上传凭证失败:', error);
    return res.status(500).json(Response.error('获取上传凭证失败,请稍后重试', 500));
  }
};

/**
 * 保存资源元数据（OSS上传成功后调用）
 * POST /course/resource/metadata
 */
exports.saveResourceMetadata = async (req, res) => {
  try {
    const {
      fileKey,
      fileName,
      fileSize,
      fileType,
      courseId,
      unitId,
      name,
      resourceType,
      description,
      courseName,
      courseSystem,
      courseStage
    } = req.body;
    const userId = req.user?.id;
    const normalizedCourseId = normalizeResourceField(courseId, 32);
    const normalizedCourseSystem = normalizeResourceField(courseSystem, 100);
    const normalizedCourseStage = normalizeResourceField(courseStage, 100);
    let normalizedCourseName = normalizeResourceField(courseName, 200);

    // 验证必填字段
    const normalizedFileSize = Number(fileSize);
    if (!fileKey || !fileName || !Number.isFinite(normalizedFileSize) || normalizedFileSize <= 0) {
      return res.status(400).json(Response.error('文件信息不完整', 400));
    }

    // 验证文件大小（100MB限制）
    if (normalizedFileSize > 100 * 1024 * 1024) {
      return res.status(400).json(Response.error('文件大小超过限制', 400));
    }

    const normalizedFileKey = String(fileKey || '').trim();
    const expectedFileKeyPrefix = userId ? `resources/${String(userId).trim()}/` : '';
    if (expectedFileKeyPrefix && !normalizedFileKey.startsWith(expectedFileKeyPrefix)) {
      return res.status(403).json(Response.error('无权保存该资源文件', 403));
    }

    // 验证文件是否存在于OSS
    const exists = await ossUtil.fileExists(normalizedFileKey);
    if (!exists) {
      return res.status(400).json(Response.error('文件上传未完成,请重试', 400));
    }

    // 提取文件扩展名
    const normalizedFileName = normalizeUploadFileName(fileName);
    const normalizedExtension = getNormalizedFileExtension(normalizedFileName);
    if (!RESOURCE_UPLOAD_ALLOWED_EXTENSIONS.has(normalizedExtension)) {
      return res.status(400).json(Response.error('不支持的文件类型', 400));
    }

    const aiPackageValidationError = validateAiPackageFileExtension(resourceType, normalizedFileName);
    if (aiPackageValidationError) {
      return res.status(400).json(Response.error(aiPackageValidationError, 400));
    }

    const fileExtension = normalizedExtension.replace(/^\./, '');

    let courseRecord = null;
    if (normalizedCourseId) {
      courseRecord = await models.TeachingCourse.findOne({
        where: { id: normalizedCourseId, del_flag: 0 },
        attributes: ['id', 'course_name'],
        raw: true
      });

      if (!courseRecord) {
        return res.status(400).json(Response.error('所属课程不存在或已删除', 400));
      }

      normalizedCourseName = normalizedCourseName || normalizeResourceField(courseRecord.course_name, 200);
    }

    // 创建资源记录
    const resourceCreatePayload = await filterTeachingResourcePayload({
      id: uuidUtil.generate(),
      resource_name: normalizeResourceName(name, normalizedFileName),
      resource_type: (resourceType && String(resourceType).trim()) || getResourceType(fileType, normalizedFileName),
      course_id: normalizedCourseId || null,
      course_name: normalizedCourseName || null,
      course_system: normalizedCourseSystem,
      course_stage: normalizedCourseStage,
      file_name: normalizedFileName,
      file_path: normalizedFileKey, // 存储OSS key
      file_size: normalizedFileSize,
      file_extension: fileExtension,
      mime_type: fileType,
      file_url: ossUtil.getOSSUrl(normalizedFileKey), // 存储完整OSS URL
      storage_type: 'oss',
      category: normalizedCourseSystem || resourceType || null,
      description: normalizeResourceField(description, 1000),
      uploader_id: userId,
      uploader_name: req.user?.realname || 'Unknown',
      download_count: 0,
      view_count: 0,
      del_flag: 0,
      create_time: new Date()
    });
    const resource = await models.TeachingResource.create(resourceCreatePayload);

    if (unitId) {
      await models.TeachingCourseUnit.update(
        {
          resource_id: resource.id,
          resource_name: resource.resource_name,
          update_by: userId || null,
          update_time: new Date()
        },
        {
          where: { id: unitId, del_flag: 0 }
        }
      );
    }

    logger.info('✅ 资源元数据保存成功', {
      resourceId: resource.id,
      fileName,
      fileKey: normalizedFileKey
    });

    return res.json(Response.success({
      id: resource.id,
      name: resource.resource_name,
      url: `/api/resource/download/${resource.id}`,
      previewUrl: `/api/resource/preview/${resource.id}`,
      size: resource.file_size,
      type: resource.resource_type
    }, '资源上传成功'));

  } catch (error) {
    logger.error('❌ 保存资源元数据失败:', error);

    // 处理数据库唯一约束错误
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json(Response.error('该文件已存在,请检查是否有重复信息', 400));
    }

    return res.status(500).json(Response.error('文件信息保存失败,请稍后重试', 500));
  }
};

/**
 * 获取资源下载URL（带签名）
 * GET /course/resource/:id/download-url
 */
exports.getResourceDownloadUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const resourceAttributes = await getTeachingResourceSelectableAttributes();

    // 查找资源
    const resource = await models.TeachingResource.findOne({
      where: { id, del_flag: 0 },
      attributes: resourceAttributes
    });

    if (!resource) {
      return res.status(404).json(Response.error('资源不存在', 404));
    }

    // 检查是否已被软删除
    if (resource.del_flag === 1) {
      return res.status(404).json(Response.error('资源不存在', 404));
    }

    const downloadUrl = buildExternalResourceAccessUrl(req, resource, 'attachment');

    logger.info('Generated resource download url', {
      resourceId: id,
      fileName: resource.resource_name
    });

    return res.json(Response.success({
      downloadUrl,
      fileName: getResourceDownloadName(resource),
      expiration: Date.now() + (OPENMAIC_DIRECT_IMPORT_TOKEN_TTL_SECONDS * 1000)
    }));

  } catch (error) {
    logger.error('Get resource download url failed', { error: error.message, stack: error.stack });
    return res.status(500).json(Response.error('获取下载链接失败,请稍后重试', 500));
  }
};

// ========== 辅助函数 ==========

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 根据MIME类型和文件名判断资源类型
 */
function getResourceType(mimeType, filename) {
  const safeMimeType = String(mimeType || '').toLowerCase();
  const safeFilename = String(filename || '').toLowerCase();

  if (safeMimeType.startsWith('image/')) return 'image';
  if (safeMimeType.startsWith('video/')) return 'video';
  if (safeMimeType.startsWith('audio/')) return 'audio';
  if (safeMimeType === 'application/pdf' || safeFilename.endsWith('.pdf')) return 'pdf';
  if (safeMimeType.includes('powerpoint') || safeMimeType.includes('presentation') || safeFilename.endsWith('.ppt') || safeFilename.endsWith('.pptx')) return 'ppt';
  if (safeMimeType.includes('word') || safeMimeType.includes('document')) return 'document';
  if (safeMimeType.includes('excel') || safeMimeType.includes('spreadsheet')) return 'document';
  if (safeFilename.endsWith('.sb3') || safeFilename.endsWith('.sb2') || safeFilename.endsWith('.py') || safeFilename.endsWith('.js') || safeFilename.endsWith('.ts') || safeFilename.endsWith('.cpp') || safeFilename.endsWith('.c')) return 'code';
  return 'document';
}
