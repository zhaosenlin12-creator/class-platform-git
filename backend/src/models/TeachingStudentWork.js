/**
 * 学生作品模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeachingStudentWork = sequelize.define('TeachingStudentWork', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false
    },
    work_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '作品名称'
    },
    work_description: {
      type: DataTypes.TEXT,
      comment: '作品描述'
    },
    work_type: {
      type: DataTypes.STRING(50),
      comment: '作品类型 scratch/python/web等'
    },
    work_file_url: {
      type: DataTypes.STRING(500),
      comment: '作品文件URL'
    },
    work_file_name: {
      type: DataTypes.STRING(255),
      comment: '文件名称'
    },
    work_file_size: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      comment: '文件大小（字节）'
    },
    work_file_extension: {
      type: DataTypes.STRING(20),
      comment: '文件扩展名'
    },
    work_cover_url: {
      type: DataTypes.STRING(500),
      comment: '作品封面URL'
    },
    work_tags: {
      type: DataTypes.STRING(500),
      comment: '作品标签（JSON数组）'
    },
    is_public: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
      comment: '是否公开 0-私有 1-公开'
    },
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '浏览次数'
    },
    like_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '点赞次数'
    },
    comment_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '评论次数'
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.00,
      comment: '评分'
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
    classroom_id: {
      type: DataTypes.STRING(36),
      comment: '关联课堂ID（可选）'
    },
    course_id: {
      type: DataTypes.STRING(36),
      comment: '关联课程ID（可选）'
    },
    work_status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: '状态 1-正常 2-草稿 3-已删除'
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
    tableName: 'teaching_student_work',
    timestamps: false
  });

  return TeachingStudentWork;
};









