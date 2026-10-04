/**
 * 学生状态变更日志模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeachingStudentStatusLog = sequelize.define('TeachingStudentStatusLog', {
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
    old_status: {
      type: DataTypes.STRING(20),
      comment: '原状态'
    },
    new_status: {
      type: DataTypes.STRING(20),
      comment: '新状态'
    },
    reason: {
      type: DataTypes.TEXT,
      comment: '变更原因'
    },
    operator: {
      type: DataTypes.STRING(36),
      comment: '操作人'
    },
    create_time: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'teaching_student_status_log',
    timestamps: false
  });

  return TeachingStudentStatusLog;
};








