/**
 * 教室-学生关联模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeachingClassroomStudent = sequelize.define('TeachingClassroomStudent', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false
    },
    classroom_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: '教室ID'
    },
    student_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: '学生ID'
    },
    student_name: {
      type: DataTypes.STRING(100),
      comment: '学生姓名'
    },
    join_time: {
      type: DataTypes.DATE,
      comment: '加入时间'
    },
    leave_time: {
      type: DataTypes.DATE,
      comment: '离开时间'
    },
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '在线时长（分钟）'
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'offline',
      comment: '状态 online-在线 offline-离线'
    },
    is_present: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: '是否签到'
    }
  }, {
    tableName: 'teaching_classroom_student',
    timestamps: false
  });

  return TeachingClassroomStudent;
};








