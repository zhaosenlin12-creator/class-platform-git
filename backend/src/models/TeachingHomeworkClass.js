/**
 * 作业-班级关联模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeachingHomeworkClass = sequelize.define('TeachingHomeworkClass', {
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
    class_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: '班级ID'
    },
    create_time: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'teaching_homework_class',
    timestamps: false
  });

  return TeachingHomeworkClass;
};








