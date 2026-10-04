/**
 * 学生学习进度模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeachingStudentProgress = sequelize.define('TeachingStudentProgress', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false
    },
    student_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: '学生ID'
    },
    course_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: '课程ID'
    },
    unit_id: {
      type: DataTypes.STRING(36),
      comment: '单元ID'
    },
    progress: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: '进度百分比'
    },
    completed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '是否完成'
    },
    last_learn_time: {
      type: DataTypes.DATE,
      comment: '最后学习时间'
    },
    total_duration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '学习总时长（分钟）'
    },
    create_time: {
      type: DataTypes.DATE
    },
    update_time: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'teaching_student_progress',
    timestamps: false
  });

  return TeachingStudentProgress;
};








