/**
 * 课程单元模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeachingCourseUnit = sequelize.define('TeachingCourseUnit', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false
    },
    course_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: '课程ID'
    },
    unit_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '单元名称'
    },
    unit_no: {
      type: DataTypes.STRING(50),
      comment: '单元编号'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '单元描述'
    },
    objectives: {
      type: DataTypes.TEXT,
      comment: '学习目标'
    },
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '时长（分钟）'
    },
    content_type: {
      type: DataTypes.STRING(50),
      comment: '内容类型'
    },
    content_url: {
      type: DataTypes.STRING(500),
      comment: '内容URL'
    },
    resource_id: {
      type: DataTypes.STRING(32),
      comment: '关联资源ID'
    },
    resource_name: {
      type: DataTypes.STRING(200),
      comment: '资源名称'
    },
    sort_no: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序号'
    },
    del_flag: {
      type: DataTypes.INTEGER,
      defaultValue: 0
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
    tableName: 'teaching_course_unit',
    timestamps: false
  });

  return TeachingCourseUnit;
};








