/**
 * 验证码工具
 * 生成和验证图片验证码
 */

const svgCaptcha = require('svg-captcha');
const crypto = require('crypto');
const { logger } = require('../middleware/logger');

// 存储验证码的Map（生产环境应使用Redis）
const captchaStore = new Map();

/**
 * 生成验证码
 * @returns {Object} { text: 验证码文本, data: SVG图片数据, key: 验证码key }
 */
function generateCaptcha() {
  try {
    const captcha = svgCaptcha.create({
      size: 4, // 验证码长度（4位）
      // 只使用易读数字，避免 0/1 等字符在小屏幕上混淆。
      ignoreChars: '018',
      charPreset: '2345679',
      // 降低视觉干扰，使用高对比黑色字形和更大的画布。
      noise: 0,
      color: false,
      // 背景由前端容器提供；svg-captcha 设置 background 后会强制彩色字形。
      background: '',
      width: 132,
      height: 52,
      fontSize: 42
    });

    // 验证captcha对象和数据
    if (!captcha || !captcha.data || !captcha.text) {
      logger.error('[Captcha] svg-captcha generation returned invalid payload', {
        hasCaptcha: !!captcha,
        hasData: !!captcha?.data,
        hasText: !!captcha?.text
      });
      throw new Error('验证码生成失败');
    }

    logger.debug('[Captcha] generated', { dataLength: captcha.data.length });

    // 生成唯一key
    const key = crypto.randomBytes(16).toString('hex');
    
    // 存储验证码（5分钟过期）
    captchaStore.set(key, {
      text: captcha.text.toLowerCase(), // 转换为小写便于验证
      expireTime: Date.now() + 5 * 60 * 1000 // 5分钟后过期
    });

    // 定期清理过期验证码
    cleanExpiredCaptcha();

    const result = {
      key: key,
      data: captcha.data,
      text: captcha.text
    };
    
    logger.debug('[Captcha] response prepared', {
      key: result.key,
      dataLength: result.data ? result.data.length : 0
    });
    return result;
  } catch (error) {
    logger.error('[Captcha] generateCaptcha failed', { error: error.message });
    throw error;
  }
}

/**
 * 验证验证码
 * @param {String} key 验证码key
 * @param {String} code 用户输入的验证码
 * @returns {Boolean} 验证是否通过
 */
function verifyCaptcha(key, code) {
  if (!key || !code) {
    return false;
  }

  const captcha = captchaStore.get(key);
  
  if (!captcha) {
    return false; // 验证码不存在或已过期
  }

  // 检查是否过期
  if (Date.now() > captcha.expireTime) {
    captchaStore.delete(key);
    return false;
  }

  // 验证码不区分大小写
  const isValid = captcha.text.toLowerCase() === code.toLowerCase().trim();
  
  // 验证后删除验证码（一次性使用）
  captchaStore.delete(key);
  
  return isValid;
}

/**
 * 清理过期的验证码
 */
function cleanExpiredCaptcha() {
  const now = Date.now();
  for (const [key, captcha] of captchaStore.entries()) {
    if (now > captcha.expireTime) {
      captchaStore.delete(key);
    }
  }
}

/**
 * 删除指定key的验证码
 */
function deleteCaptcha(key) {
  captchaStore.delete(key);
}

module.exports = {
  generateCaptcha,
  verifyCaptcha,
  deleteCaptcha
};

