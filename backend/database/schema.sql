-- ============================================
-- 教学平台数据库建表脚本
-- Database: teaching_platform
-- Version: 1.0
-- Date: 2025-10-21
-- ============================================

-- 设置字符集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 用户权限模块
-- ============================================

-- 用户表
DROP TABLE IF EXISTS `sys_user`;
CREATE TABLE `sys_user` (
  `id` varchar(32) NOT NULL COMMENT '用户ID',
  `username` varchar(100) NOT NULL COMMENT '登录账号',
  `realname` varchar(100) DEFAULT NULL COMMENT '真实姓名',
  `password` varchar(255) NOT NULL COMMENT '密码（MD5加密）',
  `salt` varchar(45) DEFAULT NULL COMMENT '盐值',
  `avatar` varchar(255) DEFAULT NULL COMMENT '头像',
  `birthday` datetime DEFAULT NULL COMMENT '生日',
  `sex` int(1) DEFAULT NULL COMMENT '性别（1男 2女）',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `phone` varchar(20) DEFAULT NULL COMMENT '手机号',
  `org_code` varchar(64) DEFAULT NULL COMMENT '机构编码',
  `status` int(1) DEFAULT '1' COMMENT '状态（1正常 2冻结）',
  `del_flag` int(1) DEFAULT '0' COMMENT '删除状态（0正常 1删除）',
  `work_no` varchar(100) DEFAULT NULL COMMENT '工号',
  `post` varchar(100) DEFAULT NULL COMMENT '职务',
  `telephone` varchar(20) DEFAULT NULL COMMENT '座机',
  `create_by` varchar(32) DEFAULT NULL COMMENT '创建人',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(32) DEFAULT NULL COMMENT '更新人',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `user_identity` int(1) DEFAULT '1' COMMENT '身份（1普通用户 2学生 3教师）',
  `depart_ids` text COMMENT '部门IDs',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_username` (`username`),
  KEY `idx_status` (`status`),
  KEY `idx_del_flag` (`del_flag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 角色表
DROP TABLE IF EXISTS `sys_role`;
CREATE TABLE `sys_role` (
  `id` varchar(32) NOT NULL COMMENT '角色ID',
  `role_name` varchar(200) NOT NULL COMMENT '角色名称',
  `role_code` varchar(100) NOT NULL COMMENT '角色编码',
  `description` varchar(255) DEFAULT NULL COMMENT '角色描述',
  `create_by` varchar(32) DEFAULT NULL COMMENT '创建人',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(32) DEFAULT NULL COMMENT '更新人',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_role_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';

-- 权限表
DROP TABLE IF EXISTS `sys_permission`;
CREATE TABLE `sys_permission` (
  `id` varchar(32) NOT NULL COMMENT '权限ID',
  `parent_id` varchar(32) DEFAULT NULL COMMENT '父级ID',
  `name` varchar(100) NOT NULL COMMENT '菜单名称',
  `url` varchar(255) DEFAULT NULL COMMENT '菜单路径',
  `component` varchar(255) DEFAULT NULL COMMENT '前端组件',
  `is_route` tinyint(1) DEFAULT '1' COMMENT '是否路由菜单',
  `component_name` varchar(100) DEFAULT NULL COMMENT '组件名称',
  `redirect` varchar(255) DEFAULT NULL COMMENT '重定向地址',
  `menu_type` int(1) DEFAULT '0' COMMENT '菜单类型（0菜单 1按钮）',
  `perms` varchar(255) DEFAULT NULL COMMENT '权限标识',
  `perms_type` varchar(10) DEFAULT '0' COMMENT '权限类型',
  `sort_no` int(11) DEFAULT '1' COMMENT '排序',
  `always_show` tinyint(1) DEFAULT '0' COMMENT '总是显示',
  `icon` varchar(100) DEFAULT NULL COMMENT '图标',
  `status` int(1) DEFAULT '1' COMMENT '状态（1启用 0禁用）',
  `hidden` tinyint(1) DEFAULT '0' COMMENT '是否隐藏',
  `create_by` varchar(32) DEFAULT NULL COMMENT '创建人',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(32) DEFAULT NULL COMMENT '更新人',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `del_flag` int(1) DEFAULT '0' COMMENT '删除状态',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限表';

-- 用户角色关联表
DROP TABLE IF EXISTS `sys_user_role`;
CREATE TABLE `sys_user_role` (
  `id` varchar(32) NOT NULL COMMENT 'ID',
  `user_id` varchar(32) NOT NULL COMMENT '用户ID',
  `role_id` varchar(32) NOT NULL COMMENT '角色ID',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表';

-- 角色权限关联表
DROP TABLE IF EXISTS `sys_role_permission`;
CREATE TABLE `sys_role_permission` (
  `id` varchar(32) NOT NULL COMMENT 'ID',
  `role_id` varchar(32) NOT NULL COMMENT '角色ID',
  `permission_id` varchar(32) NOT NULL COMMENT '权限ID',
  PRIMARY KEY (`id`),
  KEY `idx_role_id` (`role_id`),
  KEY `idx_permission_id` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色权限关联表';

-- ============================================
-- 学员管理模块
-- ============================================

-- 学生基本信息表
DROP TABLE IF EXISTS `teaching_student`;
CREATE TABLE `teaching_student` (
  `id` varchar(32) NOT NULL COMMENT '学生ID',
  `student_no` varchar(50) NOT NULL COMMENT '学号（唯一）',
  `realname` varchar(100) NOT NULL COMMENT '学生姓名',
  `username` varchar(100) DEFAULT NULL COMMENT '登录账号',
  `sex` int(1) DEFAULT NULL COMMENT '性别（1男 2女）',
  `birthday` date DEFAULT NULL COMMENT '出生日期',
  `phone` varchar(20) DEFAULT NULL COMMENT '手机号',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `avatar` varchar(255) DEFAULT NULL COMMENT '头像',
  `id_card` varchar(18) DEFAULT NULL COMMENT '身份证号',
  `parent_phone` varchar(20) DEFAULT NULL COMMENT '家长电话',
  `parent_name` varchar(100) DEFAULT NULL COMMENT '家长姓名',
  `address` varchar(255) DEFAULT NULL COMMENT '家庭住址',
  `enrollment_date` date DEFAULT NULL COMMENT '入学日期',
  `graduation_date` date DEFAULT NULL COMMENT '毕业日期',
  `status` int(1) DEFAULT '1' COMMENT '状态（1正常 2暂停 3毕业）',
  `learning_status` varchar(50) DEFAULT 'normal' COMMENT '学习状态（normal正常 paused暂停 graduated毕业）',
  `seat` varchar(50) DEFAULT NULL COMMENT '座位号',
  `remark` text COMMENT '备注',
  `create_by` varchar(32) DEFAULT NULL COMMENT '创建人',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(32) DEFAULT NULL COMMENT '更新人',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `del_flag` int(1) DEFAULT '0' COMMENT '删除状态（0正常 1删除）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_student_no` (`student_no`),
  KEY `idx_status` (`status`),
  KEY `idx_learning_status` (`learning_status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生基本信息表';

-- 学生扩展信息表
DROP TABLE IF EXISTS `teaching_student_extend`;
CREATE TABLE `teaching_student_extend` (
  `id` varchar(32) NOT NULL COMMENT 'ID',
  `student_id` varchar(32) NOT NULL COMMENT '学生ID',
  `total_courses` int(11) DEFAULT '0' COMMENT '总课程数',
  `completed_courses` int(11) DEFAULT '0' COMMENT '完成课程数',
  `total_homework` int(11) DEFAULT '0' COMMENT '总作业数',
  `submitted_homework` int(11) DEFAULT '0' COMMENT '提交作业数',
  `avg_score` decimal(5,2) DEFAULT '0.00' COMMENT '平均分',
  `total_study_time` int(11) DEFAULT '0' COMMENT '总学习时长（分钟）',
  `last_login_time` datetime DEFAULT NULL COMMENT '最后登录时间',
  `tags` varchar(255) DEFAULT NULL COMMENT '标签（JSON）',
  `level` varchar(50) DEFAULT NULL COMMENT '等级',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生扩展信息表';

-- 学生状态变更日志表
DROP TABLE IF EXISTS `teaching_student_status_log`;
CREATE TABLE `teaching_student_status_log` (
  `id` varchar(32) NOT NULL COMMENT 'ID',
  `student_id` varchar(32) NOT NULL COMMENT '学生ID',
  `old_status` varchar(50) DEFAULT NULL COMMENT '原状态',
  `new_status` varchar(50) NOT NULL COMMENT '新状态',
  `reason` varchar(255) DEFAULT NULL COMMENT '变更原因',
  `operator` varchar(32) DEFAULT NULL COMMENT '操作人',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生状态变更日志表';

-- ============================================
-- 班级管理模块
-- ============================================

-- 班级表
DROP TABLE IF EXISTS `teaching_class`;
CREATE TABLE `teaching_class` (
  `id` varchar(32) NOT NULL COMMENT '班级ID',
  `class_name` varchar(100) NOT NULL COMMENT '班级名称',
  `class_no` varchar(50) DEFAULT NULL COMMENT '班级编号',
  `teacher_id` varchar(32) DEFAULT NULL COMMENT '班主任ID',
  `teacher_name` varchar(100) DEFAULT NULL COMMENT '班主任姓名',
  `start_date` date DEFAULT NULL COMMENT '开班日期',
  `end_date` date DEFAULT NULL COMMENT '结束日期',
  `status` int(1) DEFAULT '1' COMMENT '状态（1进行中 2已结束 3已归档）',
  `student_count` int(11) DEFAULT '0' COMMENT '学生数量',
  `max_students` int(11) DEFAULT '30' COMMENT '最大学生数',
  `classroom` varchar(100) DEFAULT NULL COMMENT '教室',
  `schedule` text COMMENT '课程表（JSON）',
  `description` text COMMENT '班级描述',
  `remark` text COMMENT '备注',
  `create_by` varchar(32) DEFAULT NULL COMMENT '创建人',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(32) DEFAULT NULL COMMENT '更新人',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `del_flag` int(1) DEFAULT '0' COMMENT '删除状态',
  PRIMARY KEY (`id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班级表';

-- 班级学生关联表
DROP TABLE IF EXISTS `teaching_class_student`;
CREATE TABLE `teaching_class_student` (
  `id` varchar(32) NOT NULL COMMENT 'ID',
  `class_id` varchar(32) NOT NULL COMMENT '班级ID',
  `student_id` varchar(32) NOT NULL COMMENT '学生ID',
  `join_date` date DEFAULT NULL COMMENT '加入日期',
  `leave_date` date DEFAULT NULL COMMENT '离开日期',
  `status` int(1) DEFAULT '1' COMMENT '状态（1在读 2已离开）',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_class_id` (`class_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班级学生关联表';

-- 班级课程安排表
DROP TABLE IF EXISTS `teaching_class_schedule`;
CREATE TABLE `teaching_class_schedule` (
  `id` varchar(32) NOT NULL COMMENT 'ID',
  `class_id` varchar(32) NOT NULL COMMENT '班级ID',
  `course_id` varchar(32) DEFAULT NULL COMMENT '课程ID',
  `week_day` int(1) DEFAULT NULL COMMENT '星期几（1-7）',
  `start_time` time DEFAULT NULL COMMENT '开始时间',
  `end_time` time DEFAULT NULL COMMENT '结束时间',
  `classroom` varchar(100) DEFAULT NULL COMMENT '教室',
  PRIMARY KEY (`id`),
  KEY `idx_class_id` (`class_id`),
  KEY `idx_course_id` (`course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班级课程安排表';

-- ============================================
-- 课程管理模块
-- ============================================

-- 课程包表
DROP TABLE IF EXISTS `teaching_course`;
CREATE TABLE `teaching_course` (
  `id` varchar(32) NOT NULL COMMENT '课程ID',
  `course_name` varchar(200) NOT NULL COMMENT '课程名称',
  `course_code` varchar(100) DEFAULT NULL COMMENT '课程编号',
  `cover` varchar(255) DEFAULT NULL COMMENT '课程封面',
  `category` varchar(50) DEFAULT NULL COMMENT '课程分类（scratch/python/javascript等）',
  `level` varchar(50) DEFAULT NULL COMMENT '难度等级（elementary初级/intermediate中级/advanced高级）',
  `description` text COMMENT '课程描述',
  `objectives` text COMMENT '学习目标（JSON）',
  `prerequisites` text COMMENT '前置要求',
  `duration` int(11) DEFAULT '0' COMMENT '课时数',
  `price` decimal(10,2) DEFAULT '0.00' COMMENT '价格',
  `teacher_id` varchar(32) DEFAULT NULL COMMENT '授课教师ID',
  `teacher_name` varchar(100) DEFAULT NULL COMMENT '授课教师姓名',
  `student_count` int(11) DEFAULT '0' COMMENT '学生数量',
  `status` int(1) DEFAULT '1' COMMENT '状态（1启用 0禁用）',
  `is_published` tinyint(1) DEFAULT '0' COMMENT '是否发布',
  `publish_time` datetime DEFAULT NULL COMMENT '发布时间',
  `avg_rating` decimal(3,2) DEFAULT '0.00' COMMENT '平均评分',
  `total_ratings` int(11) DEFAULT '0' COMMENT '评分人数',
  `view_count` int(11) DEFAULT '0' COMMENT '查看次数',
  `sort_no` int(11) DEFAULT '0' COMMENT '排序',
  `tags` varchar(255) DEFAULT NULL COMMENT '标签（JSON）',
  `create_by` varchar(32) DEFAULT NULL COMMENT '创建人',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(32) DEFAULT NULL COMMENT '更新人',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `del_flag` int(1) DEFAULT '0' COMMENT '删除状态',
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_level` (`level`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='课程包表';

-- 课程单元表
DROP TABLE IF EXISTS `teaching_course_unit`;
CREATE TABLE `teaching_course_unit` (
  `id` varchar(32) NOT NULL COMMENT '单元ID',
  `course_id` varchar(32) NOT NULL COMMENT '课程ID',
  `unit_name` varchar(200) NOT NULL COMMENT '单元名称',
  `unit_no` int(11) DEFAULT NULL COMMENT '单元序号',
  `description` text COMMENT '单元描述',
  `objectives` text COMMENT '单元目标',
  `duration` int(11) DEFAULT '0' COMMENT '课时',
  `content_type` varchar(50) DEFAULT NULL COMMENT '内容类型（video/document/interactive等）',
  `content_url` varchar(500) DEFAULT NULL COMMENT '内容URL',
  `resources` text COMMENT '资源列表（JSON）',
  `sort_no` int(11) DEFAULT '0' COMMENT '排序',
  `is_free` tinyint(1) DEFAULT '0' COMMENT '是否免费试学',
  `create_by` varchar(32) DEFAULT NULL COMMENT '创建人',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(32) DEFAULT NULL COMMENT '更新人',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `del_flag` int(1) DEFAULT '0' COMMENT '删除状态',
  PRIMARY KEY (`id`),
  KEY `idx_course_id` (`course_id`),
  KEY `idx_sort_no` (`sort_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='课程单元表';

-- 课程资源关联表
DROP TABLE IF EXISTS `teaching_course_resource`;
CREATE TABLE `teaching_course_resource` (
  `id` varchar(32) NOT NULL COMMENT 'ID',
  `course_id` varchar(32) NOT NULL COMMENT '课程ID',
  `resource_id` varchar(32) NOT NULL COMMENT '资源ID',
  `resource_type` varchar(50) DEFAULT NULL COMMENT '资源类型',
  `sort_no` int(11) DEFAULT '0' COMMENT '排序',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_course_id` (`course_id`),
  KEY `idx_resource_id` (`resource_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='课程资源关联表';

-- 课程学生关联表
DROP TABLE IF EXISTS `teaching_course_student`;
CREATE TABLE `teaching_course_student` (
  `id` varchar(32) NOT NULL COMMENT 'ID',
  `course_id` varchar(32) NOT NULL COMMENT '课程ID',
  `student_id` varchar(32) NOT NULL COMMENT '学生ID',
  `enroll_date` date DEFAULT NULL COMMENT '选课日期',
  `progress` decimal(5,2) DEFAULT '0.00' COMMENT '学习进度（%）',
  `completed_units` int(11) DEFAULT '0' COMMENT '完成单元数',
  `total_units` int(11) DEFAULT '0' COMMENT '总单元数',
  `last_study_time` datetime DEFAULT NULL COMMENT '最后学习时间',
  `status` int(1) DEFAULT '1' COMMENT '状态（1学习中 2已完成）',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_course_id` (`course_id`),
  KEY `idx_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='课程学生关联表';

-- ============================================
-- 资源管理模块
-- ============================================

-- 教学资源表
DROP TABLE IF EXISTS `teaching_resource`;
CREATE TABLE `teaching_resource` (
  `id` varchar(32) NOT NULL COMMENT '资源ID',
  `resource_name` varchar(200) NOT NULL COMMENT '资源名称',
  `resource_type` varchar(50) DEFAULT NULL COMMENT '资源类型（video/document/image/audio等）',
  `file_name` varchar(255) DEFAULT NULL COMMENT '文件名',
  `file_path` varchar(500) DEFAULT NULL COMMENT '文件路径',
  `file_size` bigint(20) DEFAULT '0' COMMENT '文件大小（字节）',
  `file_url` varchar(500) DEFAULT NULL COMMENT '文件URL',
  `storage_type` varchar(50) DEFAULT 'local' COMMENT '存储类型（local本地/oss阿里云）',
  `folder_id` varchar(32) DEFAULT NULL COMMENT '文件夹ID',
  `category` varchar(100) DEFAULT NULL COMMENT '分类',
  `tags` varchar(255) DEFAULT NULL COMMENT '标签（JSON）',
  `description` text COMMENT '描述',
  `download_count` int(11) DEFAULT '0' COMMENT '下载次数',
  `view_count` int(11) DEFAULT '0' COMMENT '查看次数',
  `uploader_id` varchar(32) DEFAULT NULL COMMENT '上传人ID',
  `uploader_name` varchar(100) DEFAULT NULL COMMENT '上传人姓名',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `del_flag` int(1) DEFAULT '0' COMMENT '删除状态',
  PRIMARY KEY (`id`),
  KEY `idx_resource_type` (`resource_type`),
  KEY `idx_folder_id` (`folder_id`),
  KEY `idx_uploader_id` (`uploader_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教学资源表';

-- 资源文件夹表
DROP TABLE IF EXISTS `teaching_resource_folder`;
CREATE TABLE `teaching_resource_folder` (
  `id` varchar(32) NOT NULL COMMENT '文件夹ID',
  `folder_name` varchar(200) NOT NULL COMMENT '文件夹名称',
  `parent_id` varchar(32) DEFAULT NULL COMMENT '父文件夹ID',
  `folder_path` varchar(500) DEFAULT NULL COMMENT '文件夹路径',
  `sort_no` int(11) DEFAULT '0' COMMENT '排序',
  `create_by` varchar(32) DEFAULT NULL COMMENT '创建人',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资源文件夹表';

-- ============================================
-- 作业管理模块
-- ============================================

-- 作业表
DROP TABLE IF EXISTS `teaching_homework`;
CREATE TABLE `teaching_homework` (
  `id` varchar(32) NOT NULL COMMENT '作业ID',
  `homework_title` varchar(200) NOT NULL COMMENT '作业标题',
  `homework_type` varchar(50) DEFAULT NULL COMMENT '作业类型（scratch/python/javascript/blockly等）',
  `difficulty` int(1) DEFAULT '1' COMMENT '难度（1简单 2中等 3困难）',
  `course_id` varchar(32) DEFAULT NULL COMMENT '关联课程ID',
  `unit_id` varchar(32) DEFAULT NULL COMMENT '关联单元ID',
  `description` text COMMENT '作业描述',
  `requirements` text COMMENT '作业要求',
  `attachments` text COMMENT '附件（JSON）',
  `total_score` int(11) DEFAULT '100' COMMENT '总分',
  `pass_score` int(11) DEFAULT '60' COMMENT '及格分',
  `publish_time` datetime DEFAULT NULL COMMENT '发布时间',
  `deadline` datetime DEFAULT NULL COMMENT '截止时间',
  `allow_late_submit` tinyint(1) DEFAULT '0' COMMENT '是否允许逾期提交',
  `teacher_id` varchar(32) DEFAULT NULL COMMENT '教师ID',
  `teacher_name` varchar(100) DEFAULT NULL COMMENT '教师姓名',
  `status` varchar(50) DEFAULT 'pending' COMMENT '状态（pending待发布/ongoing进行中/ended已结束）',
  `submitted_count` int(11) DEFAULT '0' COMMENT '提交人数',
  `total_students` int(11) DEFAULT '0' COMMENT '总学生数',
  `create_by` varchar(32) DEFAULT NULL COMMENT '创建人',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(32) DEFAULT NULL COMMENT '更新人',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `del_flag` int(1) DEFAULT '0' COMMENT '删除状态',
  PRIMARY KEY (`id`),
  KEY `idx_homework_type` (`homework_type`),
  KEY `idx_course_id` (`course_id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_deadline` (`deadline`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作业表';

-- 作业提交表
DROP TABLE IF EXISTS `teaching_homework_submission`;
CREATE TABLE `teaching_homework_submission` (
  `id` varchar(32) NOT NULL COMMENT '提交ID',
  `homework_id` varchar(32) NOT NULL COMMENT '作业ID',
  `student_id` varchar(32) NOT NULL COMMENT '学生ID',
  `student_name` varchar(100) DEFAULT NULL COMMENT '学生姓名',
  `content` text COMMENT '作业内容（代码或文本）',
  `attachments` text COMMENT '附件（JSON）',
  `submit_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  `is_late` tinyint(1) DEFAULT '0' COMMENT '是否逾期',
  `status` varchar(50) DEFAULT 'pending' COMMENT '状态（pending待批改/reviewed已批改）',
  `score` int(11) DEFAULT NULL COMMENT '得分',
  `feedback` text COMMENT '批改反馈',
  `reviewer_id` varchar(32) DEFAULT NULL COMMENT '批改人ID',
  `reviewer_name` varchar(100) DEFAULT NULL COMMENT '批改人姓名',
  `review_time` datetime DEFAULT NULL COMMENT '批改时间',
  `revision_count` int(11) DEFAULT '0' COMMENT '修订次数',
  PRIMARY KEY (`id`),
  KEY `idx_homework_id` (`homework_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作业提交表';

-- 作业班级关联表
DROP TABLE IF EXISTS `teaching_homework_class`;
CREATE TABLE `teaching_homework_class` (
  `id` varchar(32) NOT NULL COMMENT 'ID',
  `homework_id` varchar(32) NOT NULL COMMENT '作业ID',
  `class_id` varchar(32) NOT NULL COMMENT '班级ID',
  `class_name` varchar(100) DEFAULT NULL COMMENT '班级名称',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_homework_id` (`homework_id`),
  KEY `idx_class_id` (`class_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作业班级关联表';

-- ============================================
-- 课堂管理模块
-- ============================================

-- 教室表
DROP TABLE IF EXISTS `teaching_classroom`;
CREATE TABLE `teaching_classroom` (
  `id` varchar(32) NOT NULL COMMENT '教室ID',
  `classroom_name` varchar(200) NOT NULL COMMENT '教室名称',
  `classroom_code` varchar(100) DEFAULT NULL COMMENT '教室编号',
  `teacher_id` varchar(32) DEFAULT NULL COMMENT '教师ID',
  `teacher_name` varchar(100) DEFAULT NULL COMMENT '教师姓名',
  `course_id` varchar(32) DEFAULT NULL COMMENT '课程ID',
  `course_name` varchar(200) DEFAULT NULL COMMENT '课程名称',
  `start_time` datetime DEFAULT NULL COMMENT '开始时间',
  `end_time` datetime DEFAULT NULL COMMENT '结束时间',
  `duration` int(11) DEFAULT '0' COMMENT '时长（分钟）',
  `status` varchar(50) DEFAULT 'scheduled' COMMENT '状态（scheduled待开始/ongoing进行中/ended已结束）',
  `max_students` int(11) DEFAULT '50' COMMENT '最大学生数',
  `current_students` int(11) DEFAULT '0' COMMENT '当前学生数',
  `meeting_url` varchar(500) DEFAULT NULL COMMENT '会议链接',
  `recording_url` varchar(500) DEFAULT NULL COMMENT '录播链接',
  `materials` text COMMENT '课程材料（JSON）',
  `settings` text COMMENT '课堂设置（JSON）',
  `description` text COMMENT '描述',
  `create_by` varchar(32) DEFAULT NULL COMMENT '创建人',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(32) DEFAULT NULL COMMENT '更新人',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `del_flag` int(1) DEFAULT '0' COMMENT '删除状态',
  PRIMARY KEY (`id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_course_id` (`course_id`),
  KEY `idx_status` (`status`),
  KEY `idx_start_time` (`start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教室表';

-- 教室学生关联表
DROP TABLE IF EXISTS `teaching_classroom_student`;
CREATE TABLE `teaching_classroom_student` (
  `id` varchar(32) NOT NULL COMMENT 'ID',
  `classroom_id` varchar(32) NOT NULL COMMENT '教室ID',
  `student_id` varchar(32) NOT NULL COMMENT '学生ID',
  `student_name` varchar(100) DEFAULT NULL COMMENT '学生姓名',
  `join_time` datetime DEFAULT NULL COMMENT '加入时间',
  `leave_time` datetime DEFAULT NULL COMMENT '离开时间',
  `duration` int(11) DEFAULT '0' COMMENT '在线时长（分钟）',
  `is_present` tinyint(1) DEFAULT '1' COMMENT '是否出席',
  `status` varchar(50) DEFAULT 'online' COMMENT '状态（online在线/offline离线）',
  PRIMARY KEY (`id`),
  KEY `idx_classroom_id` (`classroom_id`),
  KEY `idx_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教室学生关联表';

-- ============================================
-- 统计分析模块
-- ============================================

-- 学生学习进度表
DROP TABLE IF EXISTS `teaching_student_progress`;
CREATE TABLE `teaching_student_progress` (
  `id` varchar(32) NOT NULL COMMENT 'ID',
  `student_id` varchar(32) NOT NULL COMMENT '学生ID',
  `course_id` varchar(32) NOT NULL COMMENT '课程ID',
  `unit_id` varchar(32) DEFAULT NULL COMMENT '单元ID',
  `progress` decimal(5,2) DEFAULT '0.00' COMMENT '进度（%）',
  `last_study_time` datetime DEFAULT NULL COMMENT '最后学习时间',
  `total_time` int(11) DEFAULT '0' COMMENT '学习时长（分钟）',
  `completed` tinyint(1) DEFAULT '0' COMMENT '是否完成',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_course_id` (`course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生学习进度表';

-- ============================================
-- 数据字典模块
-- ============================================

-- 字典主表
DROP TABLE IF EXISTS `sys_dict`;
CREATE TABLE `sys_dict` (
  `id` varchar(32) NOT NULL COMMENT '字典ID',
  `dict_name` varchar(100) NOT NULL COMMENT '字典名称',
  `dict_code` varchar(100) NOT NULL COMMENT '字典编码',
  `description` varchar(255) DEFAULT NULL COMMENT '描述',
  `del_flag` int(1) DEFAULT '0' COMMENT '删除状态',
  `create_by` varchar(32) DEFAULT NULL COMMENT '创建人',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(32) DEFAULT NULL COMMENT '更新人',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_dict_code` (`dict_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='字典主表';

-- 字典明细表
DROP TABLE IF EXISTS `sys_dict_item`;
CREATE TABLE `sys_dict_item` (
  `id` varchar(32) NOT NULL COMMENT '明细ID',
  `dict_id` varchar(32) NOT NULL COMMENT '字典ID',
  `item_text` varchar(100) NOT NULL COMMENT '显示文本',
  `item_value` varchar(100) NOT NULL COMMENT '存储值',
  `description` varchar(255) DEFAULT NULL COMMENT '描述',
  `sort_order` int(11) DEFAULT '0' COMMENT '排序',
  `status` int(1) DEFAULT '1' COMMENT '状态（1启用 0禁用）',
  `create_by` varchar(32) DEFAULT NULL COMMENT '创建人',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_by` varchar(32) DEFAULT NULL COMMENT '更新人',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_dict_id` (`dict_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='字典明细表';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 建表完成
-- ============================================





