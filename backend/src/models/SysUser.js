/**
 * 系统用户模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SysUser = sequelize.define('SysUser', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: '登录账号'
    },
    realname: {
      type: DataTypes.STRING(100),
      comment: '真实姓名'
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '密码'
    },
    salt: {
      type: DataTypes.STRING(45),
      comment: '盐值'
    },
    avatar: {
      type: DataTypes.STRING(500),
      comment: '头像'
    },
    birthday: {
      type: DataTypes.DATEONLY,
      comment: '生日'
    },
    sex: {
      type: DataTypes.INTEGER,
      comment: '性别 1-男 2-女'
    },
    email: {
      type: DataTypes.STRING(100),
      comment: '邮箱'
    },
    phone: {
      type: DataTypes.STRING(20),
      comment: '手机号'
    },
    org_code: {
      type: DataTypes.STRING(64),
      comment: '机构编码'
    },
    status: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: '状态 1-正常 2-冻结'
    },
    del_flag: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '删除标记 0-正常 1-已删除'
    },
    third_id: {
      type: DataTypes.STRING(100),
      comment: '第三方ID'
    },
    third_type: {
      type: DataTypes.STRING(50),
      comment: '第三方类型'
    },
    activiti_sync: {
      type: DataTypes.INTEGER,
      comment: '工作流同步'
    },
    work_no: {
      type: DataTypes.STRING(100),
      comment: '工号'
    },
    post: {
      type: DataTypes.STRING(100),
      comment: '职位'
    },
    telephone: {
      type: DataTypes.STRING(20),
      comment: '座机'
    },
    create_by: {
      type: DataTypes.STRING(36),
      comment: '创建人'
    },
    create_time: {
      type: DataTypes.DATE,
      comment: '创建时间'
    },
    update_by: {
      type: DataTypes.STRING(36),
      comment: '更新人'
    },
    update_time: {
      type: DataTypes.DATE,
      comment: '更新时间'
    }
  }, {
    tableName: 'sys_user',
    timestamps: false
  });

  return SysUser;
};








