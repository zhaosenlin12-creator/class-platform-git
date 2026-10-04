-- =============================================
-- 作业管理系统重构 - 添加模板支持
-- =============================================

-- 1. 在 teaching_homework 表中添加模板相关字段
ALTER TABLE `teaching_homework` 
ADD COLUMN `is_template` tinyint(1) DEFAULT '0' COMMENT '是否为模板 0-已分配的作业 1-作业模板',
ADD COLUMN `template_id` varchar(32) DEFAULT NULL COMMENT '模板ID（如果是从模板创建的作业）',
ADD COLUMN `homework_type` varchar(50) DEFAULT NULL COMMENT '作业类型',
ADD COLUMN `difficulty` int(11) DEFAULT '1' COMMENT '难度等级 1-5',
ADD COLUMN `requirements` text COMMENT '作业要求',
ADD COLUMN `attachments` text COMMENT '附件（JSON）',
ADD COLUMN `pass_score` decimal(5,2) DEFAULT '60.00' COMMENT '及格分',
ADD COLUMN `allow_late_submit` tinyint(1) DEFAULT '0' COMMENT '是否允许迟交',
ADD COLUMN `submitted_count` int(11) DEFAULT '0' COMMENT '提交数量',
ADD COLUMN `total_students` int(11) DEFAULT '0' COMMENT '学生总数',
ADD INDEX `idx_is_template` (`is_template`),
ADD INDEX `idx_template_id` (`template_id`);

-- 2. 创建作业提交表
CREATE TABLE IF NOT EXISTS `teaching_homework_submission` (
  `id` varchar(32) NOT NULL COMMENT 'Primary Key',
  `homework_id` varchar(32) NOT NULL COMMENT '作业ID',
  `student_id` varchar(32) NOT NULL COMMENT '学生ID',
  `student_name` varchar(100) DEFAULT NULL COMMENT '学生姓名',
  `content` text COMMENT '作业内容',
  `attachments` text COMMENT '附件（JSON）',
  `submit_time` datetime DEFAULT NULL COMMENT '提交时间',
  `is_late` tinyint(1) DEFAULT '0' COMMENT '是否迟交',
  `score` decimal(5,2) DEFAULT NULL COMMENT '分数',
  `feedback` text COMMENT '批改反馈',
  `status` varchar(20) DEFAULT 'pending' COMMENT '状态 pending-待批改 reviewed-已批改 returned-已退回',
  `reviewer_id` varchar(32) DEFAULT NULL COMMENT '批改人ID',
  `reviewer_name` varchar(100) DEFAULT NULL COMMENT '批改人姓名',
  `review_time` datetime DEFAULT NULL COMMENT '批改时间',
  `revision_count` int(11) DEFAULT '0' COMMENT '修订次数',
  PRIMARY KEY (`id`),
  KEY `idx_homework_id` (`homework_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作业提交表';

-- 3. 创建作业-班级关联表
CREATE TABLE IF NOT EXISTS `teaching_homework_class` (
  `id` varchar(32) NOT NULL COMMENT 'Primary Key',
  `homework_id` varchar(32) NOT NULL COMMENT '作业ID',
  `class_id` varchar(32) NOT NULL COMMENT '班级ID',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_homework_class` (`homework_id`, `class_id`),
  KEY `idx_homework_id` (`homework_id`),
  KEY `idx_class_id` (`class_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作业-班级关联表';

-- =============================================
-- 说明：
-- 1. is_template = 1 表示这是作业模板（在作业管理中创建）
-- 2. is_template = 0 表示这是已分配的作业（从模板创建）
-- 3. template_id 指向原始模板的ID
-- =============================================
