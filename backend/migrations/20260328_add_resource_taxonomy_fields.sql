SET @db_name = DATABASE();

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'teaching_resource'
      AND COLUMN_NAME = 'course_system'
  ),
  'SELECT ''course_system exists''',
  'ALTER TABLE teaching_resource ADD COLUMN course_system VARCHAR(100) NULL COMMENT ''课程体系/系列'' AFTER course_name'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'teaching_resource'
      AND COLUMN_NAME = 'course_stage'
  ),
  'SELECT ''course_stage exists''',
  'ALTER TABLE teaching_resource ADD COLUMN course_stage VARCHAR(100) NULL COMMENT ''课程阶段'' AFTER course_system'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'teaching_resource'
      AND INDEX_NAME = 'idx_teaching_resource_course_system'
  ),
  'SELECT ''idx_teaching_resource_course_system exists''',
  'ALTER TABLE teaching_resource ADD INDEX idx_teaching_resource_course_system (course_system)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'teaching_resource'
      AND INDEX_NAME = 'idx_teaching_resource_course_stage'
  ),
  'SELECT ''idx_teaching_resource_course_stage exists''',
  'ALTER TABLE teaching_resource ADD INDEX idx_teaching_resource_course_stage (course_stage)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
