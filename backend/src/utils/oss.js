/**
 * Aliyun OSS helpers.
 */

const OSS = require('ali-oss');
const fs = require('fs');
const { logger } = require('../middleware/logger');

let client = null;
let initialized = false;

function getOSSConfig() {
  return {
    region: process.env.OSS_REGION || 'oss-cn-hangzhou',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
    bucket: process.env.OSS_BUCKET || ''
  };
}

function isOSSConfigured() {
  const config = getOSSConfig();
  return Boolean(config.accessKeyId && config.accessKeySecret && config.bucket);
}

function forceHttps(url) {
  return String(url || '').replace(/^http:\/\//i, 'https://');
}

function createOSSClient() {
  const config = getOSSConfig();

  if (!isOSSConfigured()) {
    throw new Error('OSS is not configured');
  }

  return new OSS({
    ...config,
    secure: true
  });
}

function initOSSClient() {
  if (initialized) {
    return client;
  }

  initialized = true;

  if (!isOSSConfigured()) {
    logger.info('OSS is not configured; falling back to local storage');
    return null;
  }

  try {
    client = createOSSClient();
    const config = getOSSConfig();
    logger.info('OSS client initialized', {
      region: config.region,
      bucket: config.bucket
    });
  } catch (error) {
    logger.error('OSS client initialization failed', { error: error.message, stack: error.stack });
    client = null;
  }

  return client;
}

async function uploadToOSS(localFilePath, ossPath) {
  initOSSClient();

  if (!client) {
    throw new Error('OSS is not configured');
  }

  try {
    const result = await client.put(ossPath, localFilePath);

    logger.info('File uploaded to OSS', {
      localPath: localFilePath,
      ossPath,
      url: result.url
    });

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
      logger.info('Temporary local upload removed', { path: localFilePath });
    }

    return {
      url: forceHttps(result.url),
      path: ossPath
    };
  } catch (error) {
    logger.error('Upload to OSS failed', {
      localPath: localFilePath,
      ossPath,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

async function deleteFromOSS(ossPath) {
  initOSSClient();

  if (!client) {
    throw new Error('OSS is not configured');
  }

  try {
    await client.delete(ossPath);
    logger.info('OSS object deleted', { path: ossPath });
  } catch (error) {
    logger.error('Delete from OSS failed', { path: ossPath, error: error.message, stack: error.stack });
    throw error;
  }
}

function generateOSSPath(category, filename) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${category}/${year}/${month}/${filename}`;
}

function getOSSUrl(ossPath) {
  const config = getOSSConfig();
  if (!config.bucket || !config.region) {
    return null;
  }

  return `https://${config.bucket}.${config.region}.aliyuncs.com/${ossPath}`;
}

async function getUploadToken(ossPath, fileSize, fileType) {
  try {
    const signClient = createOSSClient();
    const signatureOptions = {
      expires: parseInt(process.env.OSS_UPLOAD_URL_EXPIRES_SEC, 10) || 3600,
      method: 'PUT'
    };

    if (fileType) {
      signatureOptions['Content-Type'] = String(fileType).trim();
    }

    const rawUrl = signClient.signatureUrl(ossPath, signatureOptions);
    const uploadUrl = forceHttps(rawUrl);

    logger.info('OSS upload token issued', {
      ossPath,
      fileSize,
      fileType: fileType || null,
      expiresIn: signatureOptions.expires
    });

    const config = getOSSConfig();

    return {
      uploadUrl,
      ossPath,
      bucket: config.bucket,
      region: config.region,
      endpoint: `https://${config.bucket}.${config.region}.aliyuncs.com`,
      expiresIn: signatureOptions.expires
    };
  } catch (error) {
    logger.error('Get OSS upload token failed', { error: error.message, stack: error.stack, ossPath, fileType });
    throw new Error('获取上传凭证失败');
  }
}

async function getSignedUrl(ossPath, expiresIn = 3600) {
  try {
    const signClient = createOSSClient();
    const rawUrl = signClient.signatureUrl(ossPath, {
      expires: expiresIn,
      response: {
        'content-disposition': 'inline'
      }
    });

    const url = forceHttps(rawUrl);
    logger.info('OSS signed access URL issued', { ossPath, expiresIn });
    return url;
  } catch (error) {
    logger.error('Get OSS signed URL failed', { error: error.message, stack: error.stack, ossPath });
    throw new Error('生成文件访问URL失败');
  }
}

async function fileExists(ossPath) {
  try {
    const checkClient = createOSSClient();
    await checkClient.head(ossPath);
    return true;
  } catch (error) {
    if (error && (error.code === 'NoSuchKey' || error.status === 404)) {
      return false;
    }

    logger.error('OSS file existence check failed', { error: error.message, stack: error.stack, ossPath });
    throw new Error('检查文件是否存在失败');
  }
}

module.exports = {
  isOSSConfigured,
  uploadToOSS,
  deleteFromOSS,
  generateOSSPath,
  getOSSUrl,
  getUploadToken,
  getSignedUrl,
  fileExists
};
