-- ============================================
-- 教学平台初始数据脚本
-- Database: teaching_platform
-- Version: 1.0
-- Date: 2025-10-21
-- ============================================

SET NAMES utf8mb4;

-- ============================================
-- 插入默认管理员账号
-- ============================================
-- 密码: admin123 (MD5: 0192023a7bbd73250516f069df18b500)
INSERT INTO `sys_user` VALUES ('1', 'admin', '系统管理员', '0192023a7bbd73250516f069df18b500', NULL, NULL, NULL, 1, 'admin@teaching.com', '13800138000', NULL, 1, 0, 'ADMIN001', '系统管理员', NULL, NULL, NOW(), NULL, NULL, 1, NULL);

-- ============================================
-- 插入默认角色
-- ============================================
INSERT INTO `sys_role` VALUES ('role_admin', '系统管理员', 'admin', '拥有系统所有权限', NULL, NOW(), NULL, NULL);
INSERT INTO `sys_role` VALUES ('role_teacher', '教师', 'teacher', '教师角色，可以管理课程、作业、班级', NULL, NOW(), NULL, NULL);
INSERT INTO `sys_role` VALUES ('role_student', '学生', 'student', '学生角色，可以查看课程、提交作业', NULL, NOW(), NULL, NULL);

-- ============================================
-- 用户角色关联
-- ============================================
INSERT INTO `sys_user_role` VALUES ('ur_1', '1', 'role_admin');

-- ============================================
-- 插入权限数据（菜单）
-- ============================================

-- 首页
INSERT INTO `sys_permission` VALUES ('dashboard', NULL, '首页', '/dashboard', 'layouts/RouteView', 1, 'DashboardAnalysis', NULL, 0, NULL, '0', 1, 0, 'dashboard', 1, 0, NULL, NOW(), NULL, NULL, 0);

-- 学员管理
INSERT INTO `sys_permission` VALUES ('student', NULL, '学员管理', '/student', 'layouts/RouteView', 1, 'StudentManagement', NULL, 0, 'student:manage', '0', 2, 0, 'team', 1, 0, NULL, NOW(), NULL, NULL, 0);
INSERT INTO `sys_permission` VALUES ('student_list', 'student', '学员列表', '/student/list', 'views/student/StudentList', 1, 'StudentList', NULL, 0, 'student:list', '0', 1, 0, NULL, 1, 0, NULL, NOW(), NULL, NULL, 0);
INSERT INTO `sys_permission` VALUES ('student_add', 'student', '添加学员', NULL, NULL, 0, NULL, NULL, 1, 'student:add', '0', 2, 0, NULL, 1, 0, NULL, NOW(), NULL, NULL, 0);
INSERT INTO `sys_permission` VALUES ('student_edit', 'student', '编辑学员', NULL, NULL, 0, NULL, NULL, 1, 'student:edit', '0', 3, 0, NULL, 1, 0, NULL, NOW(), NULL, NULL, 0);
INSERT INTO `sys_permission` VALUES ('student_delete', 'student', '删除学员', NULL, NULL, 0, NULL, NULL, 1, 'student:delete', '0', 4, 0, NULL, 1, 0, NULL, NOW(), NULL, NULL, 0);

-- 班级管理
INSERT INTO `sys_permission` VALUES ('class', NULL, '班级管理', '/class', 'layouts/RouteView', 1, 'ClassManagement', NULL, 0, 'class:manage', '0', 3, 0, 'apartment', 1, 0, NULL, NOW(), NULL, NULL, 0);
INSERT INTO `sys_permission` VALUES ('class_list', 'class', '班级列表', '/class/list', 'views/class/ClassList', 1, 'ClassList', NULL, 0, 'class:list', '0', 1, 0, NULL, 1, 0, NULL, NOW(), NULL, NULL, 0);
INSERT INTO `sys_permission` VALUES ('class_add', 'class', '添加班级', NULL, NULL, 0, NULL, NULL, 1, 'class:add', '0', 2, 0, NULL, 1, 0, NULL, NOW(), NULL, NULL, 0);
INSERT INTO `sys_permission` VALUES ('class_edit', 'class', '编辑班级', NULL, NULL, 0, NULL, NULL, 1, 'class:edit', '0', 3, 0, NULL, 1, 0, NULL, NOW(), NULL, NULL, 0);
INSERT INTO `sys_permission` VALUES ('class_delete', 'class', '删除班级', NULL, NULL, 0, NULL, NULL, 1, 'class:delete', '0', 4, 0, NULL, 1, 0, NULL, NOW(), NULL, NULL, 0);

-- 课程管理
INSERT INTO `sys_permission` VALUES ('course', NULL, '课程管理', '/course', 'layouts/RouteView', 1, 'CourseManagement', NULL, 0, 'course:manage', '0', 4, 0, 'book', 1, 0, NULL, NOW(), NULL, NULL, 0);
INSERT INTO `sys_permission` VALUES ('course_list', 'course', '课程列表', '/course/list', 'views/course/CourseList', 1, 'CourseList', NULL, 0, 'course:list', '0', 1, 0, NULL, 1, 0, NULL, NOW(), NULL, NULL, 0);
INSERT INTO `sys_permission` VALUES ('course_add', 'course', '添加课程', NULL, NULL, 0, NULL, NULL, 1, 'course:add', '0', 2, 0, NULL, 1, 0, NULL, NOW(), NULL, NULL, 0);
INSERT INTO `sys_permission` VALUES ('course_edit', 'course', '编辑课程', NULL, NULL, 0, NULL, NULL, 1, 'course:edit', '0', 3, 0, NULL, 1, 0, NULL, NOW(), NULL, NULL, 0);
INSERT INTO `sys_permission` VALUES ('course_delete', 'course', '删除课程', NULL, NULL, 0, NULL, NULL, 1, 'course:delete', '0', 4, 0, NULL, 1, 0, NULL, NOW(), NULL, NULL, 0);

-- 作业管理
INSERT INTO `sys_permission` VALUES ('homework', NULL, '作业管理', '/homework', 'layouts/RouteView', 1, 'HomeworkManagement', NULL, 0, 'homework:manage', '0', 5, 0, 'file-text', 1, 0, NULL, NOW(), NULL, NULL, 0);
INSERT INTO `sys_permission` VALUES ('homework_list', 'homework', '作业列表', '/homework/list', 'views/homework/HomeworkList', 1, 'HomeworkList', NULL, 0, 'homework:list', '0', 1, 0, NULL, 1, 0, NULL, NOW(), NULL, NULL, 0);
INSERT INTO `sys_permission` VALUES ('homework_add', 'homework', '发布作业', NULL, NULL, 0, NULL, NULL, 1, 'homework:add', '0', 2, 0, NULL, 1, 0, NULL, NOW(), NULL, NULL, 0);
INSERT INTO `sys_permission` VALUES ('homework_review', 'homework', '批改作业', NULL, NULL, 0, NULL, NULL, 1, 'homework:review', '0', 3, 0, NULL, 1, 0, NULL, NOW(), NULL, NULL, 0);

-- 课堂管理
INSERT INTO `sys_permission` VALUES ('classroom', NULL, '课堂管理', '/classroom', 'layouts/RouteView', 1, 'ClassroomManagement', NULL, 0, 'classroom:manage', '0', 6, 0, 'video-camera', 1, 0, NULL, NOW(), NULL, NULL, 0);
INSERT INTO `sys_permission` VALUES ('classroom_list', 'classroom', '课堂列表', '/classroom/list', 'views/classroom/ClassroomList', 1, 'ClassroomList', NULL, 0, 'classroom:list', '0', 1, 0, NULL, 1, 0, NULL, NOW(), NULL, NULL, 0);
INSERT INTO `sys_permission` VALUES ('classroom_create', 'classroom', '创建课堂', NULL, NULL, 0, NULL, NULL, 1, 'classroom:create', '0', 2, 0, NULL, 1, 0, NULL, NOW(), NULL, NULL, 0);

-- 统计分析
INSERT INTO `sys_permission` VALUES ('statistics', NULL, '统计分析', '/statistics', 'layouts/RouteView', 1, 'Statistics', NULL, 0, 'statistics:view', '0', 7, 0, 'bar-chart', 1, 0, NULL, NOW(), NULL, NULL, 0);
INSERT INTO `sys_permission` VALUES ('statistics_dashboard', 'statistics', '数据仪表盘', '/statistics/dashboard', 'views/statistics/Dashboard', 1, 'StatisticsDashboard', NULL, 0, 'statistics:dashboard', '0', 1, 0, NULL, 1, 0, NULL, NOW(), NULL, NULL, 0);

-- ============================================
-- 角色权限关联（管理员拥有所有权限）
-- ============================================
INSERT INTO `sys_role_permission` VALUES ('rp_1', 'role_admin', 'dashboard');
INSERT INTO `sys_role_permission` VALUES ('rp_2', 'role_admin', 'student');
INSERT INTO `sys_role_permission` VALUES ('rp_3', 'role_admin', 'student_list');
INSERT INTO `sys_role_permission` VALUES ('rp_4', 'role_admin', 'student_add');
INSERT INTO `sys_role_permission` VALUES ('rp_5', 'role_admin', 'student_edit');
INSERT INTO `sys_role_permission` VALUES ('rp_6', 'role_admin', 'student_delete');
INSERT INTO `sys_role_permission` VALUES ('rp_7', 'role_admin', 'class');
INSERT INTO `sys_role_permission` VALUES ('rp_8', 'role_admin', 'class_list');
INSERT INTO `sys_role_permission` VALUES ('rp_9', 'role_admin', 'class_add');
INSERT INTO `sys_role_permission` VALUES ('rp_10', 'role_admin', 'class_edit');
INSERT INTO `sys_role_permission` VALUES ('rp_11', 'role_admin', 'class_delete');
INSERT INTO `sys_role_permission` VALUES ('rp_12', 'role_admin', 'course');
INSERT INTO `sys_role_permission` VALUES ('rp_13', 'role_admin', 'course_list');
INSERT INTO `sys_role_permission` VALUES ('rp_14', 'role_admin', 'course_add');
INSERT INTO `sys_role_permission` VALUES ('rp_15', 'role_admin', 'course_edit');
INSERT INTO `sys_role_permission` VALUES ('rp_16', 'role_admin', 'course_delete');
INSERT INTO `sys_role_permission` VALUES ('rp_17', 'role_admin', 'homework');
INSERT INTO `sys_role_permission` VALUES ('rp_18', 'role_admin', 'homework_list');
INSERT INTO `sys_role_permission` VALUES ('rp_19', 'role_admin', 'homework_add');
INSERT INTO `sys_role_permission` VALUES ('rp_20', 'role_admin', 'homework_review');
INSERT INTO `sys_role_permission` VALUES ('rp_21', 'role_admin', 'classroom');
INSERT INTO `sys_role_permission` VALUES ('rp_22', 'role_admin', 'classroom_list');
INSERT INTO `sys_role_permission` VALUES ('rp_23', 'role_admin', 'classroom_create');
INSERT INTO `sys_role_permission` VALUES ('rp_24', 'role_admin', 'statistics');
INSERT INTO `sys_role_permission` VALUES ('rp_25', 'role_admin', 'statistics_dashboard');

-- ============================================
-- 插入数据字典
-- ============================================

-- 课程类型字典（前端使用 course_type）
INSERT INTO `sys_dict` VALUES ('dict_course_type', '课程类型', 'course_type', '课程类型字典', 0, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_course_type_1', 'course_type', 'Scratch编程', 'scratch', 'Scratch图形化编程', 1, 1, 0, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_course_type_2', 'course_type', 'Python编程', 'python', 'Python代码编程', 2, 1, 0, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_course_type_3', 'course_type', 'JavaScript编程', 'javascript', 'JavaScript网页编程', 3, 1, 0, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_course_type_4', 'course_type', 'C++编程', 'cpp', 'C++代码编程', 4, 1, 0, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_course_type_5', 'course_type', 'Java编程', 'java', 'Java代码编程', 5, 1, 0, NULL, NOW(), NULL, NULL);

-- 课程分类字典
INSERT INTO `sys_dict` VALUES ('dict_course_category', '课程分类', 'course_category', '课程分类字典', 0, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_course_category_1', 'course_category', 'Scratch编程', 'scratch', 'Scratch图形化编程', 1, 1, 0, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_course_category_2', 'course_category', 'Python编程', 'python', 'Python代码编程', 2, 1, 0, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_course_category_3', 'course_category', 'JavaScript编程', 'javascript', 'JavaScript网页编程', 3, 1, 0, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_course_category_4', 'course_category', 'ScratchJr编程', 'scratchjr', 'ScratchJr幼儿编程', 4, 1, 0, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_course_category_5', 'course_category', 'Blockly编程', 'blockly', 'Blockly积木编程', 5, 1, 0, NULL, NOW(), NULL, NULL);

-- 课程难度等级字典
INSERT INTO `sys_dict` VALUES ('dict_course_level', '课程难度', 'course_level', '课程难度等级字典', 0, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_course_level_1', 'dict_course_level', '初级', 'elementary', '适合初学者', 1, 1, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_course_level_2', 'dict_course_level', '中级', 'intermediate', '有一定基础', 2, 1, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_course_level_3', 'dict_course_level', '高级', 'advanced', '适合进阶学习', 3, 1, NULL, NOW(), NULL, NULL);

-- 作业类型字典
INSERT INTO `sys_dict` VALUES ('dict_homework_type', '作业类型', 'homework_type', '作业类型字典', 0, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_homework_type_1', 'dict_homework_type', 'Scratch作业', 'scratch', 'Scratch项目作业', 1, 1, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_homework_type_2', 'dict_homework_type', 'Python作业', 'python', 'Python代码作业', 2, 1, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_homework_type_3', 'dict_homework_type', 'JavaScript作业', 'javascript', 'JavaScript代码作业', 3, 1, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_homework_type_4', 'dict_homework_type', 'Blockly作业', 'blockly', 'Blockly项目作业', 4, 1, NULL, NOW(), NULL, NULL);

-- 作业难度字典
INSERT INTO `sys_dict` VALUES ('dict_homework_difficulty', '作业难度', 'homework_difficulty', '作业难度等级', 0, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_homework_difficulty_1', 'dict_homework_difficulty', '简单', '1', '简单难度', 1, 1, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_homework_difficulty_2', 'dict_homework_difficulty', '中等', '2', '中等难度', 2, 1, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_homework_difficulty_3', 'dict_homework_difficulty', '困难', '3', '困难难度', 3, 1, NULL, NOW(), NULL, NULL);

-- 学生状态字典
INSERT INTO `sys_dict` VALUES ('dict_student_status', '学生状态', 'student_status', '学生学习状态', 0, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_student_status_1', 'dict_student_status', '正常', 'normal', '正常学习状态', 1, 1, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_student_status_2', 'dict_student_status', '暂停', 'paused', '暂停学习', 2, 1, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_student_status_3', 'dict_student_status', '毕业', 'graduated', '已毕业', 3, 1, NULL, NOW(), NULL, NULL);

-- 班级状态字典
INSERT INTO `sys_dict` VALUES ('dict_class_status', '班级状态', 'class_status', '班级运行状态', 0, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_class_status_1', 'dict_class_status', '进行中', '1', '班级正在进行', 1, 1, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_class_status_2', 'dict_class_status', '已结束', '2', '班级已结束', 2, 1, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_class_status_3', 'dict_class_status', '已归档', '3', '班级已归档', 3, 1, NULL, NOW(), NULL, NULL);

-- 性别字典
INSERT INTO `sys_dict` VALUES ('dict_sex', '性别', 'sex', '性别字典', 0, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_sex_1', 'dict_sex', '男', '1', '男性', 1, 1, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` VALUES ('dict_sex_2', 'dict_sex', '女', '2', '女性', 2, 1, NULL, NOW(), NULL, NULL);

-- ============================================
-- 初始数据导入完成
-- ============================================

-- 显示导入结果
SELECT '✅ 初始数据导入成功！' AS status;
SELECT '📌 默认管理员账号: admin' AS info;
SELECT '📌 默认管理员密码: admin123' AS info;
SELECT '⚠️ 请务必在首次登录后修改默认密码！' AS warning;





