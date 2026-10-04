/**
 * 班级-学生关联模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeachingClassStudent = sequelize.define('TeachingClassStudent', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false
    },
    class_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: '班级ID'
    },
    student_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: '学生ID'
    },
    join_date: {
      type: DataTypes.DATE,
      comment: '加入日期'
    },
    leave_date: {
      type: DataTypes.DATE,
      comment: '离开日期'
    },
    status: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: '状态 1-在读 2-已离开'
    },
    create_time: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'teaching_class_student',
    timestamps: false
  });

  return TeachingClassStudent;
};








