-- ============================================
-- 修复字典数据
-- ============================================

USE teaching_platform;

-- 清空现有字典数据（如果有）
DELETE FROM sys_dict_item WHERE dict_id = 'course_type';
DELETE FROM sys_dict WHERE dict_code = 'course_type';

-- 插入课程类型字典
INSERT INTO `sys_dict` VALUES ('dict_course_type', '课程类型', 'course_type', '课程类型字典', 0, NULL, NOW(), NULL, NULL);
INSERT INTO `sys_dict_item` (id, dict_id, item_text, item_value, description, sort_order, status, del_flag, create_by, create_time, update_by, update_time) 
VALUES 
('dict_course_type_1', 'course_type', 'Scratch编程', 'scratch', 'Scratch图形化编程', 1, 1, 0, NULL, NOW(), NULL, NULL),
('dict_course_type_2', 'course_type', 'Python编程', 'python', 'Python代码编程', 2, 1, 0, NULL, NOW(), NULL, NULL),
('dict_course_type_3', 'course_type', 'JavaScript编程', 'javascript', 'JavaScript网页编程', 3, 1, 0, NULL, NOW(), NULL, NULL),
('dict_course_type_4', 'course_type', 'C++编程', 'cpp', 'C++代码编程', 4, 1, 0, NULL, NOW(), NULL, NULL),
('dict_course_type_5', 'course_type', 'Java编程', 'java', 'Java代码编程', 5, 1, 0, NULL, NOW(), NULL, NULL);

SELECT '✅ 字典数据修复完成！' AS status;
SELECT COUNT(*) AS '课程类型字典项数量' FROM sys_dict_item WHERE dict_id = 'course_type';
