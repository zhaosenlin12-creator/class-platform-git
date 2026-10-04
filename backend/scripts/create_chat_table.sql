-- 课堂聊天消息表
-- 用于持久化保存课堂内的聊天记录，支持学生回顾

CREATE TABLE IF NOT EXISTS `teaching_classroom_chat` (
  `id` varchar(36) NOT NULL COMMENT '消息ID',
  `classroom_id` varchar(36) NOT NULL COMMENT '课堂ID',
  `user_id` varchar(36) NOT NULL COMMENT '发送者ID',
  `user_name` varchar(100) DEFAULT NULL COMMENT '发送者名称',
  `user_role` varchar(20) DEFAULT NULL COMMENT '发送者角色: teacher/student',
  `message_type` varchar(20) DEFAULT 'text' COMMENT '消息类型: text/image/file/system',
  `content` text COMMENT '消息内容',
  `avatar` varchar(255) DEFAULT NULL COMMENT '发送者头像',
  `del_flag` int(1) DEFAULT 0 COMMENT '删除标记',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_classroom_id` (`classroom_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='课堂聊天消息表';
