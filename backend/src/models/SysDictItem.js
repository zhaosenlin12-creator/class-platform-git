/**
 * 数据字典项模型
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SysDictItem = sequelize.define('SysDictItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '主键ID'
  },
  dict_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '字典ID'
  },
  item_text: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '字典项文本'
  },
  item_value: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '字典项值'
  },
  description: {
    type: DataTypes.STRING(255),
    comment: '描述'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序'
  },
  status: {
    type: DataTypes.TINYINT,
    defaultValue: 1,
    comment: '状态(1-正常,0-禁用)'
  },
  del_flag: {
    type: DataTypes.TINYINT,
    defaultValue: 0,
    comment: '删除标志(0-正常,1-已删除)'
  },
  create_by: {
    type: DataTypes.STRING(50),
    comment: '创建人'
  },
  create_time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '创建时间'
  },
  update_by: {
    type: DataTypes.STRING(50),
    comment: '更新人'
  },
  update_time: {
    type: DataTypes.DATE,
    comment: '更新时间'
  }
}, {
  tableName: 'sys_dict_item',
  timestamps: false,
  comment: '数据字典项表'
});

module.exports = SysDictItem;
