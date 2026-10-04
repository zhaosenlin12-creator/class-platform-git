/**
 * 系统权限模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SysPermission = sequelize.define('SysPermission', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false
    },
    parent_id: {
      type: DataTypes.STRING(36),
      comment: '父级ID'
    },
    name: {
      type: DataTypes.STRING(100),
      comment: '菜单名称'
    },
    url: {
      type: DataTypes.STRING(255),
      comment: '路径'
    },
    component: {
      type: DataTypes.STRING(255),
      comment: '组件'
    },
    component_name: {
      type: DataTypes.STRING(100),
      comment: '组件名称'
    },
    redirect: {
      type: DataTypes.STRING(255),
      comment: '重定向路径'
    },
    menu_type: {
      type: DataTypes.INTEGER,
      comment: '菜单类型 0-一级 1-子菜单 2-按钮'
    },
    perms: {
      type: DataTypes.STRING(255),
      comment: '权限标识'
    },
    perms_type: {
      type: DataTypes.STRING(10),
      comment: '权限类型'
    },
    sort_no: {
      type: DataTypes.DECIMAL(8, 2),
      comment: '排序'
    },
    always_show: {
      type: DataTypes.INTEGER,
      comment: '是否总是显示'
    },
    icon: {
      type: DataTypes.STRING(100),
      comment: '图标'
    },
    is_route: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: '是否路由'
    },
    is_leaf: {
      type: DataTypes.INTEGER,
      comment: '是否叶子节点'
    },
    keep_alive: {
      type: DataTypes.INTEGER,
      comment: '是否缓存'
    },
    hidden: {
      type: DataTypes.INTEGER,
      comment: '是否隐藏'
    },
    description: {
      type: DataTypes.STRING(255),
      comment: '描述'
    },
    status: {
      type: DataTypes.STRING(2),
      comment: '状态'
    },
    del_flag: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    rule_flag: {
      type: DataTypes.INTEGER,
      comment: '是否添加数据权限'
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
    },
    internal_or_external: {
      type: DataTypes.INTEGER,
      comment: '是否外部链接'
    }
  }, {
    tableName: 'sys_permission',
    timestamps: false
  });

  return SysPermission;
};








