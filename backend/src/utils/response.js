/**
 * 统一返回格式封装
 * 确保所有API返回格式与前端期望一致
 */

/**
 * 成功响应
 * @param {*} data - 返回的数据
 * @param {string} message - 提示消息
 * @returns {object} 标准响应格式
 */
exports.success = (data = {}, message = '操作成功') => {
  return {
    success: true,
    result: data,
    message: message,
    code: 200,
    timestamp: Date.now()
  };
};

/**
 * 失败响应
 * @param {string} message - 错误消息
 * @param {number} code - 错误码
 * @returns {object} 标准响应格式
 */
exports.error = (message = '操作失败', code = 500) => {
  return {
    success: false,
    result: null,
    message: message,
    code: code,
    timestamp: Date.now()
  };
};

/**
 * 分页成功响应
 * @param {array} records - 数据列表
 * @param {number} total - 总记录数
 * @param {number} current - 当前页码
 * @param {number} size - 每页大小
 * @returns {object} 分页响应格式
 */
exports.page = (records = [], total = 0, current = 1, size = 10) => {
  return {
    success: true,
    result: {
      records,
      total,
      size: parseInt(size),
      current: parseInt(current),
      pageSize: parseInt(size),  // 兼容前端
      pageNo: parseInt(current),  // 兼容前端
      pages: Math.ceil(total / size)
    },
    message: '查询成功',
    code: 200,
    timestamp: Date.now()
  };
};









