/**
 * 作业提交模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeachingHomeworkSubmission = sequelize.define('TeachingHomeworkSubmission', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false
    },
    homework_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: '作业ID'
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
    content: {
      type: DataTypes.TEXT,
      comment: '作业内容'
    },
    attachments: {
      type: DataTypes.TEXT,
      comment: '附件（JSON）'
    },
    submit_time: {
      type: DataTypes.DATE,
      comment: '提交时间'
    },
    is_late: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '是否迟交'
    },
    score: {
      type: DataTypes.DECIMAL(5, 2),
      comment: '分数'
    },
    feedback: {
      type: DataTypes.TEXT,
      comment: '批改反馈'
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending',
      comment: '状态 pending-待批改 reviewed-已批改 returned-已退回'
    },
    reviewer_id: {
      type: DataTypes.STRING(36),
      comment: '批改人ID'
    },
    reviewer_name: {
      type: DataTypes.STRING(100),
      comment: '批改人姓名'
    },
    review_time: {
      type: DataTypes.DATE,
      comment: '批改时间'
    },
    revision_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '修订次数'
    }
  }, {
    tableName: 'teaching_homework_submission',
    timestamps: false
  });

  return TeachingHomeworkSubmission;
};








