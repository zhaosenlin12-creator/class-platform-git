/**
 * 系统角色模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SysRole = sequelize.define('SysRole', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false
    },
    role_name: {
      type: DataTypes.STRING(200),
      comment: '角色名称'
    },
    role_code: {
      type: DataTypes.STRING(100),
      unique: true,
      comment: '角色编码'
    },
    description: {
      type: DataTypes.STRING(255),
      comment: '描述'
    },
    create_by: {
      type: DataTypes.STRING(36)
    },
    create_time: {
      type: DataTypes.DATE
    },
    update_by: {
      type: DataTypes.STRING(36)
    },
    update_time: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'sys_role',
    timestamps: false
  });

  return SysRole;
};








