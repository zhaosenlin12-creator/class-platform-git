-- 添加teaching_resource表缺失的字段
-- 修复 "Unknown column 'file_extension' in 'field list'" 错误

USE teaching_platform;

-- 检查并添加file_extension字段
ALTER TABLE teaching_resource 
ADD COLUMN IF NOT EXISTS file_extension VARCHAR(20) DEFAULT NULL COMMENT '文件扩展名' AFTER file_size;

-- 检查并添加mime_type字段
ALTER TABLE teaching_resource 
ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100) DEFAULT NULL COMMENT '文件MIME类型' AFTER file_extension;

-- 验证字段已添加
DESCRIBE teaching_resource;

SELECT '✅ teaching_resource表字段更新完成！' AS status;





