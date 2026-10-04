/**
 * 课堂聊天消息模型
 * 用于持久化保存课堂内的聊天记录
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeachingClassroomChat = sequelize.define('TeachingClassroomChat', {
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
    user_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: '发送者ID'
    },
    user_name: {
      type: DataTypes.STRING(100),
      comment: '发送者名称'
    },
    user_role: {
      type: DataTypes.STRING(20),
      comment: '发送者角色: teacher/student'
    },
    message_type: {
      type: DataTypes.STRING(20),
      defaultValue: 'text',
      comment: '消息类型: text/image/file/system'
    },
    content: {
      type: DataTypes.TEXT,
      comment: '消息内容'
    },
    file_name: {
      type: DataTypes.STRING(255),
      comment: '文件名'
    },
    file_size: {
      type: DataTypes.INTEGER,
      comment: '文件大小（字节）'
    },
    file_type: {
      type: DataTypes.STRING(100),
      comment: '文件MIME类型'
    },
    file_url: {
      type: DataTypes.STRING(500),
      comment: '文件URL'
    },
    avatar: {
      type: DataTypes.STRING(255),
      comment: '发送者头像'
    },
    del_flag: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    create_time: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'teaching_classroom_chat',
    timestamps: false,
    indexes: [
      {
        fields: ['classroom_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['create_time']
      }
    ]
  });

  return TeachingClassroomChat;
};
