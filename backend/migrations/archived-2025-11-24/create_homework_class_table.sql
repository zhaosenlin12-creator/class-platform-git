-- 作业-班级关联表
CREATE TABLE IF NOT EXISTS `teaching_homework_class` (
  `id` VARCHAR(36) NOT NULL COMMENT '主键ID',
  `homework_id` VARCHAR(36) NOT NULL COMMENT '作业ID',
  `class_id` VARCHAR(36) NOT NULL COMMENT '班级ID',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_homework_id` (`homework_id`),
  KEY `idx_class_id` (`class_id`),
  KEY `idx_homework_class` (`homework_id`, `class_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作业班级关联表';








