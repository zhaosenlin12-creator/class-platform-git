-- 为作业表添加模板相关字段
-- 2025-11-24

USE teaching_platform;

-- 检查并添加资源列表字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'teaching_platform' 
  AND TABLE_NAME = 'teaching_homework' 
  AND COLUMN_NAME = 'resources';

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE teaching_homework ADD COLUMN resources TEXT COMMENT ''资源列表（JSON）'' AFTER attachments', 
  'SELECT ''resources字段已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加is_template字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'teaching_platform' 
  AND TABLE_NAME = 'teaching_homework' 
  AND COLUMN_NAME = 'is_template';

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE teaching_homework ADD COLUMN is_template INT DEFAULT 0 COMMENT ''是否为模板 0-否 1-是'' AFTER attachments', 
  'SELECT ''is_template字段已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加template_id字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'teaching_platform' 
  AND TABLE_NAME = 'teaching_homework' 
  AND COLUMN_NAME = 'template_id';

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE teaching_homework ADD COLUMN template_id VARCHAR(36) COMMENT ''模板ID（从模板创建的作业）'' AFTER is_template', 
  'SELECT ''template_id字段已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加is_template索引
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists 
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'teaching_platform' 
  AND TABLE_NAME = 'teaching_homework' 
  AND INDEX_NAME = 'idx_is_template';

SET @sql = IF(@idx_exists = 0, 
  'ALTER TABLE teaching_homework ADD INDEX idx_is_template (is_template)', 
  'SELECT ''idx_is_template索引已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加template_id索引
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists 
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'teaching_platform' 
  AND TABLE_NAME = 'teaching_homework' 
  AND INDEX_NAME = 'idx_template_id';

SET @sql = IF(@idx_exists = 0, 
  'ALTER TABLE teaching_homework ADD INDEX idx_template_id (template_id)', 
  'SELECT ''idx_template_id索引已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ 作业模板字段添加完成' AS message;
