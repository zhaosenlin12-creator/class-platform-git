/**
 * 日期时间处理工具
 */

const moment = require('moment');

// 设置默认时区为中国
moment.locale('zh-cn');

/**
 * 格式化日期时间
 * @param {Date|string} date - 日期对象或字符串
 * @param {string} format - 格式（默认：YYYY-MM-DD HH:mm:ss）
 * @returns {string} 格式化后的日期字符串
 */
exports.format = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return moment(date).format(format);
};

/**
 * 获取当前时间
 * @param {string} format - 格式
 * @returns {string} 当前时间字符串
 */
exports.now = (format = 'YYYY-MM-DD HH:mm:ss') => {
  return moment().format(format);
};

/**
 * 解析日期字符串为Date对象
 * @param {string} dateString - 日期字符串
 * @returns {Date} Date对象
 */
exports.parse = (dateString) => {
  return moment(dateString).toDate();
};

/**
 * 计算日期差
 * @param {Date|string} date1 - 日期1
 * @param {Date|string} date2 - 日期2
 * @param {string} unit - 单位（days/hours/minutes等）
 * @returns {number} 差值
 */
exports.diff = (date1, date2, unit = 'days') => {
  return moment(date1).diff(moment(date2), unit);
};

/**
 * 添加时间
 * @param {Date|string} date - 日期
 * @param {number} amount - 数量
 * @param {string} unit - 单位
 * @returns {Date} 新日期
 */
exports.add = (date, amount, unit = 'days') => {
  return moment(date).add(amount, unit).toDate();
};







