/**
 * 在线教室模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeachingClassroom = sequelize.define('TeachingClassroom', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false
    },
    classroom_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '教室名称'
    },
    classroom_code: {
      type: DataTypes.STRING(50),
      comment: '教室编码'
    },
    class_id: {
      type: DataTypes.STRING(36),
      comment: '班级ID'
    },
    teacher_id: {
      type: DataTypes.STRING(36),
      comment: '教师ID'
    },
    teacher_name: {
      type: DataTypes.STRING(100),
      comment: '教师姓名'
    },
    course_id: {
      type: DataTypes.STRING(36),
      comment: '关联课程ID'
    },
    course_name: {
      type: DataTypes.STRING(200),
      comment: '课程名称'
    },
    lesson_id: {
      type: DataTypes.STRING(36),
      comment: '关联课节ID'
    },
    lesson_name: {
      type: DataTypes.STRING(200),
      comment: '课节名称'
    },
    resource_id: {
      type: DataTypes.STRING(36),
      comment: '关联资源ID'
    },
    resource_name: {
      type: DataTypes.STRING(200),
      comment: '资源名称'
    },
    resource_url: {
      type: DataTypes.STRING(500),
      comment: '资源访问URL'
    },
    content_type: {
      type: DataTypes.STRING(50),
      comment: '课堂内容类型'
    },
    selected_language: {
      type: DataTypes.STRING(50),
      comment: '默认演示语言'
    },
    start_time: {
      type: DataTypes.DATE,
      comment: '开始时间'
    },
    end_time: {
      type: DataTypes.DATE,
      comment: '结束时间'
    },
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '时长（分钟）'
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'scheduled',
      comment: '状态 scheduled-已安排 ongoing-进行中 finished-已结束'
    },
    max_students: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      comment: '最大学生数'
    },
    current_students: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '当前学生数'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '描述'
    },
    demo_content: {
      type: DataTypes.TEXT('long'),
      comment: '展示区代码内容（JSON格式，包含language和code）'
    },
    demo_language: {
      type: DataTypes.STRING(50),
      comment: '展示区编程语言'
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
    tableName: 'teaching_classroom',
    timestamps: false
  });

  return TeachingClassroom;
};








