/**
 * 课程信息模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeachingCourse = sequelize.define('TeachingCourse', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false
    },
    course_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '课程名称'
    },
    course_code: {
      type: DataTypes.STRING(50),
      comment: '课程编码'
    },
    cover: {
      type: DataTypes.STRING(500),
      comment: '封面图'
    },
    category: {
      type: DataTypes.STRING(50),
      comment: '课程分类'
    },
    level: {
      type: DataTypes.STRING(20),
      comment: '难度级别'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '课程描述'
    },
    objectives: {
      type: DataTypes.TEXT,
      comment: '教学目标（JSON）'
    },
    prerequisites: {
      type: DataTypes.TEXT,
      comment: '前置条件'
    },
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '课程时长（分钟）'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: '价格'
    },
    teacher_id: {
      type: DataTypes.STRING(36),
      comment: '教师ID'
    },
    teacher_name: {
      type: DataTypes.STRING(100),
      comment: '教师姓名'
    },
    student_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '学生数量'
    },
    status: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: '状态 1-发布 2-草稿 3-下架'
    },
    avg_rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0,
      comment: '平均评分'
    },
    tags: {
      type: DataTypes.TEXT,
      comment: '标签（JSON）'
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
    tableName: 'teaching_course',
    timestamps: false
  });

  return TeachingCourse;
};








