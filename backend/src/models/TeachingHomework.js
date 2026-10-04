/**
 * 作业信息模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeachingHomework = sequelize.define('TeachingHomework', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false
    },
    homework_title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '作业标题'
    },
    homework_type: {
      type: DataTypes.STRING(50),
      comment: '作业类型'
    },
    difficulty: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: '难度等级 1-5'
    },
    course_id: {
      type: DataTypes.STRING(36),
      comment: '关联课程ID'
    },
    unit_id: {
      type: DataTypes.STRING(36),
      comment: '关联单元ID'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '作业描述'
    },
    requirements: {
      type: DataTypes.TEXT,
      comment: '作业要求'
    },
    attachments: {
      type: DataTypes.TEXT,
      comment: '附件（JSON）'
    },
    resources: {
      type: DataTypes.TEXT,
      comment: '资源列表（JSON）'
    },
    is_template: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '是否为模板 0-否 1-是'
    },
    template_id: {
      type: DataTypes.STRING(36),
      comment: '模板ID（从模板创建的作业）'
    },
    total_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 100,
      comment: '总分'
    },
    pass_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 60,
      comment: '及格分'
    },
    publish_time: {
      type: DataTypes.DATE,
      comment: '发布时间'
    },
    deadline: {
      type: DataTypes.DATE,
      comment: '截止时间'
    },
    allow_late_submit: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '是否允许迟交'
    },
    teacher_id: {
      type: DataTypes.STRING(36),
      comment: '教师ID'
    },
    teacher_name: {
      type: DataTypes.STRING(100),
      comment: '教师姓名'
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending',
      comment: '状态 pending-待发布 ongoing-进行中 closed-已截止'
    },
    submitted_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '提交数量'
    },
    total_students: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '学生总数'
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
    tableName: 'teaching_homework',
    timestamps: false
  });

  return TeachingHomework;
};








