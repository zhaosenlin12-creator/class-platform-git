-- 插入测试课程数据
USE teaching_platform;

-- 插入课程数据
INSERT INTO teaching_course (id, course_name, course_code, category, level, description, duration, teacher_id, teacher_name, student_count, status, del_flag, create_time)
VALUES 
('course-001', 'Scratch图形化编程', 'SCRATCH-001', 'Scratch', '初级', '面向儿童的图形化编程入门课程', 60, '1', '系统管理员', 0, 1, 0, NOW()),
('course-002', 'Python基础编程', 'PYTHON-001', 'Python', '中级', 'Python语言基础与算法', 90, '1', '系统管理员', 0, 1, 0, NOW()),
('course-003', 'ScratchJr启蒙课', 'SCRATCHJR-001', 'ScratchJr', '入门', '幼儿编程启蒙课程', 45, '1', '系统管理员', 0, 1, 0, NOW());

-- 插入课程资源数据
INSERT INTO teaching_resource (
  id, resource_name, resource_type, file_name, file_path, file_size, file_extension, 
  mime_type, file_url, storage_type, category, description, 
  uploader_id, uploader_name, download_count, view_count, del_flag, create_time
)
VALUES 
('resource-001', 'Scratch教学PPT', 'document', 'scratch-lesson1.pdf', 'uploads/scratch-lesson1.pdf', 2048576, 'pdf', 'application/pdf', '/uploads/scratch-lesson1.pdf', 'local', 'document', 'Scratch第一课教学课件', '1', '系统管理员', 0, 0, 0, NOW()),
('resource-002', '示例项目-小猫跳跃', 'project', 'cat-jump.sb3', 'uploads/cat-jump.sb3', 512000, 'sb3', 'application/x-scratch-project', '/uploads/cat-jump.sb3', 'local', 'project', 'Scratch示例项目', '1', '系统管理员', 0, 0, 0, NOW()),
('resource-003', 'Python入门教程', 'video', 'python-intro.mp4', 'uploads/python-intro.mp4', 52428800, 'mp4', 'video/mp4', '/uploads/python-intro.mp4', 'local', 'video', 'Python编程入门视频教程', '1', '系统管理员', 0, 0, 0, NOW());

-- 插入课程单元数据（课程内容）
INSERT INTO teaching_course_unit (
  id, course_id, unit_name, unit_no, content_type, description, duration, sort_no, del_flag, create_by, create_time
)
VALUES 
('unit-001', 'course-001', '第一课：认识Scratch', 1, 'lesson', 'Scratch界面介绍与基本操作', 45, 1, 0, '1', NOW()),
('unit-002', 'course-001', '第二课：角色与舞台', 2, 'lesson', '学习角色添加和舞台设置', 45, 2, 0, '1', NOW()),
('unit-003', 'course-002', 'Python环境安装', 1, 'lesson', 'Python开发环境配置', 30, 1, 0, '1', NOW());

-- 关联课程和资源（如果有关联表的话）
-- UPDATE teaching_resource SET course_id = 'course-001' WHERE id IN ('resource-001', 'resource-002');
-- UPDATE teaching_resource SET course_id = 'course-002' WHERE id = 'resource-003';

SELECT '✅ 测试数据插入成功！' AS status;
SELECT COUNT(*) AS course_count FROM teaching_course WHERE del_flag = 0;
SELECT COUNT(*) AS resource_count FROM teaching_resource WHERE del_flag = 0;
SELECT COUNT(*) AS unit_count FROM teaching_course_unit WHERE del_flag = 0;





