const models = require('../models');
const { Op } = require('sequelize');
const encrypt = require('../utils/encrypt');
const uuidUtil = require('../utils/uuid');
const { logger } = require('../middleware/logger');
const avatarUtil = require('../utils/avatar');

/**
 * 获取教师列表
 */
exports.getTeacherList = async (req, res) => {
  try {
    const { keyword, status, pageNo = 1, pageSize = 10 } = req.query;

    // 构建查询条件
    const whereClause = {
      user_identity: 2, // 2表示教师
      del_flag: 0
    };

    // 关键字搜索（姓名或账号）
    if (keyword) {
      whereClause[Op.or] = [
        { username: { [Op.like]: `%${keyword}%` } },
        { realname: { [Op.like]: `%${keyword}%` } }
      ];
    }

    // 状态筛选
    if (status !== undefined && status !== '') {
      whereClause.status = parseInt(status);
    }

    // 分页查询
    const limit = parseInt(pageSize);
    const offset = (parseInt(pageNo) - 1) * limit;

    const { count, rows } = await models.SysUser.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['create_time', 'DESC']],
      attributes: [
        'id',
        'username',
        'realname',
        'avatar',
        'sex',
        'email',
        'phone',
        'status',
        'create_time',
        'update_time'
      ]
    });

    const normalizedRows = rows.map((row) => {
      const data = row.toJSON();
      return {
        ...data,
        avatar: avatarUtil.normalizeAvatarUrl(data.avatar, data.username || data.realname)
      };
    });

    res.json({
      success: true,
      message: '查询成功',
      result: {
        records: normalizedRows,
        total: count,
        pageNo: parseInt(pageNo),
        pageSize: limit
      }
    });
  } catch (error) {
    logger.error('Get teacher list failed', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: '获取教师列表失败',
      error: error.message
    });
  }
};

/**
 * 添加教师
 */
exports.addTeacher = async (req, res) => {
  let transaction;

  try {
    transaction = await models.sequelize.transaction();
    const { username, realname, password, phone, email, sex, status } = req.body;

    // 验证必填字段
    if (!username || !realname || !password) {
      return res.status(400).json({
        success: false,
        message: '账号、姓名和密码不能为空'
      });
    }

    // 检查用户名是否已存在
    const existingUser = await models.SysUser.findOne({
      where: { username, del_flag: 0 },
      transaction
    });

    if (existingUser) {
      await transaction.rollback();
      transaction = null;
      return res.status(400).json({
        success: false,
        message: '该账号已存在'
      });
    }

    // 加密密码（bcrypt）
    const passwordHash = await encrypt.hashPassword(password);
    const teacherId = uuidUtil.generate();

    // 创建教师用户
    const teacher = await models.SysUser.create({
      id: teacherId,
      username,
      realname,
      password: passwordHash,
      // Keep persisted avatar empty. Read APIs already provide inline fallbacks,
      // which avoids oversized data URLs breaking older avatar columns.
      avatar: null,
      user_identity: 2, // 2表示教师
      phone: phone || null,
      email: email || null,
      sex: sex || 1,
      status: status !== undefined ? status : 1,
      del_flag: 0,
      create_time: new Date(),
      update_time: new Date()
    }, { transaction });

    // 关联教师角色
    const teacherRole = await models.SysRole.findOne({
      where: { role_code: 'teacher' }
    }, { transaction });

    if (teacherRole) {
      await models.SysUserRole.create({
        id: uuidUtil.generate(),
        user_id: teacherId,
        role_id: teacherRole.id
      }, { transaction });
    }

    await transaction.commit();
    transaction = null;

    res.json({
      success: true,
      message: '添加教师成功',
      result: {
        id: teacher.id,
        username: teacher.username,
        realname: teacher.realname
      }
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        logger.error('Add teacher rollback failed', { error: rollbackError.message });
      }
    }
    logger.error('Add teacher failed', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: '添加教师失败',
      error: error.message
    });
  }
};

/**
 * 编辑教师
 */
exports.editTeacher = async (req, res) => {
  try {
    const { id, realname, phone, email, sex, status } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: '教师ID不能为空'
      });
    }

    // 查找教师
    const teacher = await models.SysUser.findOne({
      where: {
        id,
        user_identity: 2,
        del_flag: 0
      }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: '教师不存在'
      });
    }

    // 更新教师信息
    await teacher.update({
      realname: realname || teacher.realname,
      phone: phone !== undefined ? phone : teacher.phone,
      email: email !== undefined ? email : teacher.email,
      sex: sex !== undefined ? sex : teacher.sex,
      status: status !== undefined ? status : teacher.status,
      update_time: new Date()
    });

    res.json({
      success: true,
      message: '更新教师信息成功'
    });
  } catch (error) {
    logger.error('Edit teacher failed', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: '编辑教师失败',
      error: error.message
    });
  }
};

/**
 * 删除教师
 */
exports.deleteTeacher = async (req, res) => {
  try {
    // 优先从query获取，然后从body获取
    const id = req.query.id || req.body.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: '教师ID不能为空'
      });
    }

    // 查找教师
    const teacher = await models.SysUser.findOne({
      where: {
        id,
        user_identity: 2,
        del_flag: 0
      }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: '教师不存在'
      });
    }

    // 软删除
    await teacher.update({
      del_flag: 1,
      update_time: new Date()
    });

    res.json({
      success: true,
      message: '删除教师成功'
    });
  } catch (error) {
    logger.error('Delete teacher failed', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: '删除教师失败',
      error: error.message
    });
  }
};

/**
 * 重置教师密码
 */
exports.resetPassword = async (req, res) => {
  try {
    const { id, password = '123456' } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: '教师ID不能为空'
      });
    }

    // 查找教师
    const teacher = await models.SysUser.findOne({
      where: {
        id,
        user_identity: 2,
        del_flag: 0
      }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: '教师不存在'
      });
    }

    // 更新密码（bcrypt）
    const passwordHash = await encrypt.hashPassword(password);
    await teacher.update({
      password: passwordHash,
      update_time: new Date()
    });

    res.json({
      success: true,
      message: '重置密码成功',
      result: {
        newPassword: password
      }
    });
  } catch (error) {
    logger.error('Reset teacher password failed', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: '重置密码失败',
      error: error.message
    });
  }
};





