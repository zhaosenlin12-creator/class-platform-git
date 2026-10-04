-- 添加缺失的字段到 teaching_class_student 表

-- 添加 del_flag 字段
ALTER TABLE teaching_class_student 
ADD COLUMN del_flag INT DEFAULT 0 COMMENT '删除标志：0=未删除，1=已删除';

-- 添加 create_by 字段（如果不存在）
ALTER TABLE teaching_class_student 
ADD COLUMN create_by VARCHAR(32) DEFAULT NULL COMMENT '创建人';

-- 添加 update_time 字段（如果不存在）
ALTER TABLE teaching_class_student 
ADD COLUMN update_time DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间';

-- 验证表结构
DESCRIBE teaching_class_student;











