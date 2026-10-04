-- 为teaching_course_unit表添加编程工作台所需字段
-- 执行时间: 2025-10-26

USE teaching_platform;

-- 添加content_type字段（内容类型）
ALTER TABLE teaching_course_unit 
ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT NULL COMMENT '内容类型（programming, video, document等）';

-- 添加content_url字段（内容URL）
ALTER TABLE teaching_course_unit 
ADD COLUMN IF NOT EXISTS content_url VARCHAR(500) DEFAULT NULL COMMENT '内容URL';

-- 添加objectives字段（学习目标，编程内容以JSON格式存储在此）
ALTER TABLE teaching_course_unit 
ADD COLUMN IF NOT EXISTS objectives TEXT DEFAULT NULL COMMENT '学习目标（JSON格式，编程内容存储在此）';

-- 添加create_by字段
ALTER TABLE teaching_course_unit 
ADD COLUMN IF NOT EXISTS create_by VARCHAR(32) DEFAULT NULL COMMENT '创建人ID';

-- 添加update_by字段
ALTER TABLE teaching_course_unit 
ADD COLUMN IF NOT EXISTS update_by VARCHAR(32) DEFAULT NULL COMMENT '更新人ID';

-- 添加update_time字段
ALTER TABLE teaching_course_unit 
ADD COLUMN IF NOT EXISTS update_time DATETIME DEFAULT NULL COMMENT '更新时间';

-- 验证字段是否添加成功
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH, 
    COLUMN_COMMENT 
FROM 
    INFORMATION_SCHEMA.COLUMNS 
WHERE 
    TABLE_SCHEMA = 'teaching_platform' 
    AND TABLE_NAME = 'teaching_course_unit'
    AND COLUMN_NAME IN ('content_type', 'content_url', 'objectives', 'create_by', 'update_by', 'update_time');





