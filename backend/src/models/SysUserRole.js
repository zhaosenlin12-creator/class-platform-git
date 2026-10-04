/**
 * 用户-角色关联模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SysUserRole = sequelize.define('SysUserRole', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: '用户ID'
    },
    role_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: '角色ID'
    }
  }, {
    tableName: 'sys_user_role',
    timestamps: false
  });

  return SysUserRole;
};








