/**
 * 课程-学生关联模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeachingCourseStudent = sequelize.define('TeachingCourseStudent', {
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
    student_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: '学生ID'
    },
    enroll_date: {
      type: DataTypes.DATE,
      comment: '注册日期'
    },
    status: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: '状态 1-学习中 2-已完成 3-已退出'
    },
    create_time: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'teaching_course_student',
    timestamps: false
  });

  return TeachingCourseStudent;
};








