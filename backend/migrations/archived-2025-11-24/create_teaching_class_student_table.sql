-- 创建班级学生关联表
CREATE TABLE IF NOT EXISTS `teaching_class_student` (
  `id` varchar(32) NOT NULL COMMENT '主键ID',
  `class_id` varchar(32) NOT NULL COMMENT '班级ID',
  `student_id` varchar(32) NOT NULL COMMENT '学生ID',
  `join_date` date DEFAULT NULL COMMENT '加入日期',
  `status` int DEFAULT '1' COMMENT '状态：1=正常，0=禁用',
  `del_flag` int DEFAULT '0' COMMENT '删除标志：0=未删除，1=已删除',
  `create_by` varchar(32) DEFAULT NULL COMMENT '创建人',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_class_id` (`class_id`),
  KEY `idx_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='班级学生关联表';











