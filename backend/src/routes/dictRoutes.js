/**
 * 数据字典路由
 */
const express = require('express');
const router = express.Router();
const models = require('../models');
const { logger } = require('../middleware/logger');

// 获取字典项列表（根据字典编码）
router.get('/dict/getDictItems/:dictCode', async (req, res) => {
  try {
    const { dictCode } = req.params;
    
    logger.debug('Load dict items', { dictCode });
    
    // 查询字典项
    const dictItems = await models.SysDictItem.findAll({
      where: {
        dict_id: dictCode,
        status: 1
      },
      order: [['sort_order', 'ASC']],
      attributes: ['id', 'item_text', 'item_value', 'description', 'sort_order']
    });
    
    logger.debug('Loaded dict items', { dictCode, count: dictItems.length });
    
    res.json({
      success: true,
      result: dictItems.map(item => ({
        text: item.item_text,
        value: item.item_value,
        title: item.item_text,
        label: item.item_text
      })),
      message: '查询成功',
      code: 200
    });
  } catch (error) {
    logger.error('Load dict items failed', { dictCode: req.params.dictCode, error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: '查询字典项失败',
      error: error.message,
      code: 500
    });
  }
});

// 获取字典项列表（分页）
router.get('/dictItem/list', async (req, res) => {
  try {
    const { pageNo = 1, pageSize = 10 } = req.query;
    
    const offset = (parseInt(pageNo) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    const { count, rows } = await models.SysDictItem.findAndCountAll({
      where: {
        status: 1  // 只查询启用状态的
      },
      offset,
      limit,
      order: [['sort_order', 'ASC']]
    });
    
    res.json({
      success: true,
      result: {
        records: rows,
        total: count,
        size: limit,
        current: parseInt(pageNo),
        pages: Math.ceil(count / limit)
      },
      message: '查询成功',
      code: 200
    });
  } catch (error) {
    logger.error('Load dict item list failed', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: '查询失败',
      error: error.message,
      code: 500
    });
  }
});

// 获取部门树
router.get('/sysDepart/queryMyDeptTreeList', async (req, res) => {
  try {
    // 返回空数组，前端会处理
    res.json({
      success: true,
      result: [],
      message: '查询成功',
      code: 200
    });
  } catch (error) {
    logger.error('Load current department tree failed', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: '查询失败',
      error: error.message,
      code: 500
    });
  }
});

module.exports = router;
