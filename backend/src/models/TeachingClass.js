/**
 * 班级信息模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeachingClass = sequelize.define('TeachingClass', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false
    },
    class_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '班级名称'
    },
    class_no: {
      type: DataTypes.STRING(50),
      comment: '班级编号'
    },
    teacher_id: {
      type: DataTypes.STRING(36),
      comment: '教师ID'
    },
    teacher_name: {
      type: DataTypes.STRING(100),
      comment: '教师姓名'
    },
    start_date: {
      type: DataTypes.DATE,
      comment: '开班日期'
    },
    end_date: {
      type: DataTypes.DATE,
      comment: '结束日期'
    },
    status: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: '状态 1-进行中 2-已结束 3-已归档'
    },
    student_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '学生数量'
    },
    max_students: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      comment: '最大学生数'
    },
    classroom: {
      type: DataTypes.STRING(50),
      comment: '教室'
    },
    schedule_weekdays: {
      type: DataTypes.TEXT,
      field: 'schedule_weekdays',
      comment: 'schedule weekdays json'
    },
    schedule_time_slots: {
      type: DataTypes.TEXT,
      field: 'schedule_time_slots',
      comment: 'schedule time slots json'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '班级描述'
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
    tableName: 'teaching_class',
    timestamps: false
  });

  return TeachingClass;
};








