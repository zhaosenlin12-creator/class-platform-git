USE teaching_platform;

SELECT COUNT(*) INTO @table_exists
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'teaching_classroom_chat';

SET @db_name = DATABASE();

SET @sql = IF(
  @table_exists > 0 AND EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'teaching_classroom_chat'
      AND COLUMN_NAME = 'file_name'
  ),
  'SELECT ''file_name exists'' AS message',
  'ALTER TABLE teaching_classroom_chat ADD COLUMN file_name VARCHAR(255) NULL COMMENT ''chat file name'' AFTER content'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  @table_exists > 0 AND EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'teaching_classroom_chat'
      AND COLUMN_NAME = 'file_size'
  ),
  'SELECT ''file_size exists'' AS message',
  'ALTER TABLE teaching_classroom_chat ADD COLUMN file_size INT NULL COMMENT ''chat file size bytes'' AFTER file_name'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  @table_exists > 0 AND EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'teaching_classroom_chat'
      AND COLUMN_NAME = 'file_type'
  ),
  'SELECT ''file_type exists'' AS message',
  'ALTER TABLE teaching_classroom_chat ADD COLUMN file_type VARCHAR(100) NULL COMMENT ''chat file mime type'' AFTER file_size'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  @table_exists > 0 AND EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'teaching_classroom_chat'
      AND COLUMN_NAME = 'file_url'
  ),
  'SELECT ''file_url exists'' AS message',
  'ALTER TABLE teaching_classroom_chat ADD COLUMN file_url VARCHAR(500) NULL COMMENT ''chat file url'' AFTER file_type'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT
  COLUMN_NAME,
  DATA_TYPE,
  CHARACTER_MAXIMUM_LENGTH,
  COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'teaching_classroom_chat'
  AND COLUMN_NAME IN ('file_name', 'file_size', 'file_type', 'file_url');
