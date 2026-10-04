/**
 * 课堂笔记模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeachingClassroomNote = sequelize.define('TeachingClassroomNote', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false
    },
    classroom_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: '课堂ID'
    },
    student_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: '学生ID'
    },
    content: {
      type: DataTypes.TEXT,
      comment: '笔记内容'
    },
    del_flag: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    create_time: {
      type: DataTypes.DATE
    },
    update_time: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'teaching_classroom_note',
    timestamps: false
  });

  return TeachingClassroomNote;
};









