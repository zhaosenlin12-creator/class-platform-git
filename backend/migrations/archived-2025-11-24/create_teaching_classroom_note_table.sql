-- 创建课堂笔记表
CREATE TABLE IF NOT EXISTS `teaching_classroom_note` (
  `id` VARCHAR(36) NOT NULL COMMENT '主键ID',
  `classroom_id` VARCHAR(36) NOT NULL COMMENT '课堂ID',
  `student_id` VARCHAR(36) NOT NULL COMMENT '学生ID',
  `content` TEXT COMMENT '笔记内容',
  `del_flag` INT DEFAULT 0 COMMENT '删除标志 0-正常 1-已删除',
  `create_time` DATETIME COMMENT '创建时间',
  `update_time` DATETIME COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_classroom_student` (`classroom_id`, `student_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_classroom_id` (`classroom_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='课堂笔记表';









