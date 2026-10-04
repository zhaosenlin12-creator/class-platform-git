SET @db_name = DATABASE();

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'teaching_class'
      AND COLUMN_NAME = 'schedule_weekdays'
  ),
  'SELECT ''schedule_weekdays exists''',
  'ALTER TABLE teaching_class ADD COLUMN schedule_weekdays TEXT NULL COMMENT ''schedule weekdays json'' AFTER classroom'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'teaching_class'
      AND COLUMN_NAME = 'schedule_time_slots'
  ),
  'SELECT ''schedule_time_slots exists''',
  'ALTER TABLE teaching_class ADD COLUMN schedule_time_slots TEXT NULL COMMENT ''schedule time slots json'' AFTER schedule_weekdays'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
