-- 创建学生作品表
CREATE TABLE IF NOT EXISTS `teaching_student_work` (
  `id` VARCHAR(36) NOT NULL COMMENT '主键ID',
  `work_name` VARCHAR(200) NOT NULL COMMENT '作品名称',
  `work_description` TEXT COMMENT '作品描述',
  `work_type` VARCHAR(50) COMMENT '作品类型 scratch/python/web等',
  `work_file_url` VARCHAR(500) COMMENT '作品文件URL',
  `work_file_name` VARCHAR(255) COMMENT '文件名称',
  `work_file_size` BIGINT DEFAULT 0 COMMENT '文件大小（字节）',
  `work_file_extension` VARCHAR(20) COMMENT '文件扩展名',
  `work_cover_url` VARCHAR(500) COMMENT '作品封面URL',
  `work_tags` VARCHAR(500) COMMENT '作品标签（JSON数组）',
  `is_public` TINYINT DEFAULT 0 COMMENT '是否公开 0-私有 1-公开',
  `view_count` INT DEFAULT 0 COMMENT '浏览次数',
  `like_count` INT DEFAULT 0 COMMENT '点赞次数',
  `comment_count` INT DEFAULT 0 COMMENT '评论次数',
  `rating` DECIMAL(3,2) DEFAULT 0.00 COMMENT '评分',
  `student_id` VARCHAR(36) NOT NULL COMMENT '学生ID',
  `student_name` VARCHAR(100) COMMENT '学生姓名',
  `classroom_id` VARCHAR(36) COMMENT '关联课堂ID（可选）',
  `course_id` VARCHAR(36) COMMENT '关联课程ID（可选）',
  `work_status` TINYINT DEFAULT 1 COMMENT '状态 1-正常 2-草稿 3-已删除',
  `del_flag` INT DEFAULT 0 COMMENT '删除标志 0-正常 1-已删除',
  `create_by` VARCHAR(36) COMMENT '创建人',
  `create_time` DATETIME COMMENT '创建时间',
  `update_by` VARCHAR(36) COMMENT '更新人',
  `update_time` DATETIME COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_work_type` (`work_type`),
  KEY `idx_is_public` (`is_public`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生作品表';









