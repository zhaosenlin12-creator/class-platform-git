/**
 * 角色-权限关联模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SysRolePermission = sequelize.define('SysRolePermission', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false
    },
    role_id: {
      type: DataTypes.STRING(36),
      comment: '角色ID'
    },
    permission_id: {
      type: DataTypes.STRING(36),
      comment: '权限ID'
    },
    data_rule_ids: {
      type: DataTypes.STRING(1000),
      comment: '数据权限IDs'
    }
  }, {
    tableName: 'sys_role_permission',
    timestamps: false
  });

  return SysRolePermission;
};








