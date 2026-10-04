/**
 * 学生信息模型
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeachingStudent = sequelize.define('TeachingStudent', {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      allowNull: false
    },
    student_no: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '学号'
    },
    realname: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '真实姓名'
    },
    sex: {
      type: DataTypes.INTEGER,
      comment: '性别 1-男 2-女'
    },
    birthday: {
      type: DataTypes.DATEONLY,
      comment: '出生日期'
    },
    phone: {
      type: DataTypes.STRING(20),
      comment: '手机号'
    },
    email: {
      type: DataTypes.STRING(100),
      comment: '邮箱'
    },
    id_card: {
      type: DataTypes.STRING(18),
      comment: '身份证号'
    },
    parent_phone: {
      type: DataTypes.STRING(20),
      comment: '家长电话'
    },
    parent_name: {
      type: DataTypes.STRING(100),
      comment: '家长姓名'
    },
    address: {
      type: DataTypes.STRING(255),
      comment: '家庭住址'
    },
    enrollment_date: {
      type: DataTypes.DATE,
      comment: '入学日期'
    },
    status: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: '状态 1-正常 2-暂停 3-毕业'
    },
    learning_status: {
      type: DataTypes.STRING(20),
      defaultValue: 'normal',
      comment: '学习状态 normal-正常 paused-暂停 graduated-毕业'
    },
    seat: {
      type: DataTypes.STRING(20),
      comment: '座位号'
    },
    remark: {
      type: DataTypes.TEXT,
      comment: '备注'
    },
    del_flag: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '删除标记 0-正常 1-已删除'
    },
    create_by: {
      type: DataTypes.STRING(36),
      comment: '创建人'
    },
    create_time: {
      type: DataTypes.DATE,
      comment: '创建时间'
    },
    update_by: {
      type: DataTypes.STRING(36),
      comment: '更新人'
    },
    update_time: {
      type: DataTypes.DATE,
      comment: '更新时间'
    }
  }, {
    tableName: 'teaching_student',
    timestamps: false
  });

  return TeachingStudent;
};








