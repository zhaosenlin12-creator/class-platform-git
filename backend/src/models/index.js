/**
 * Sequelize Models 统一导出
 * 注意：由于表已经存在，这里主要用于查询操作
 * 表结构以数据库schema.sql为准
 */

const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');
const initTeachingClassroomStudent = require('./TeachingClassroomStudent');
const initTeachingStudentProgress = require('./TeachingStudentProgress');
const initTeachingStudentStatusLog = require('./TeachingStudentStatusLog');
const SysDictItem = require('./SysDictItem');

// 定义所有模型
const models = {};
models.SysDictItem = SysDictItem;

// 用户模型
models.SysUser = sequelize.define('sys_user', {
  id: { type: DataTypes.STRING(32), primaryKey: true },
  username: { type: DataTypes.STRING(100), allowNull: false },
  realname: { type: DataTypes.STRING(100) },
  password: { type: DataTypes.STRING(255), allowNull: false },
  salt: { type: DataTypes.STRING(45) },
  avatar: { type: DataTypes.STRING(255) },
  birthday: { type: DataTypes.DATE },
  sex: { type: DataTypes.INTEGER },
  email: { type: DataTypes.STRING(100) },
  phone: { type: DataTypes.STRING(20) },
  status: { type: DataTypes.INTEGER, defaultValue: 1 },
  del_flag: { type: DataTypes.INTEGER, defaultValue: 0, field: 'del_flag' },
  user_identity: { type: DataTypes.INTEGER, defaultValue: 1, field: 'user_identity' },
  create_time: { type: DataTypes.DATE, field: 'create_time' },
  update_time: { type: DataTypes.DATE, field: 'update_time' }
}, {
  tableName: 'sys_user',
  timestamps: false
});

// 角色模型
models.SysRole = sequelize.define('sys_role', {
  id: { type: DataTypes.STRING(32), primaryKey: true },
  role_name: { type: DataTypes.STRING(200), allowNull: false, field: 'role_name' },
  role_code: { type: DataTypes.STRING(100), allowNull: false, field: 'role_code' },
  description: { type: DataTypes.STRING(255) },
  create_time: { type: DataTypes.DATE, field: 'create_time' }
}, {
  tableName: 'sys_role',
  timestamps: false
});

// 用户角色关联模型
models.SysUserRole = sequelize.define('sys_user_role', {
  id: { type: DataTypes.STRING(32), primaryKey: true },
  user_id: { type: DataTypes.STRING(32), allowNull: false, field: 'user_id' },
  role_id: { type: DataTypes.STRING(32), allowNull: false, field: 'role_id' }
}, {
  tableName: 'sys_user_role',
  timestamps: false
});

// 权限模型
models.SysPermission = sequelize.define('sys_permission', {
  id: { type: DataTypes.STRING(32), primaryKey: true },
  parent_id: { type: DataTypes.STRING(32), field: 'parent_id' },
  name: { type: DataTypes.STRING(100), allowNull: false },
  url: { type: DataTypes.STRING(255) },
  component: { type: DataTypes.STRING(255) },
  menu_type: { type: DataTypes.INTEGER, defaultValue: 0, field: 'menu_type' },
  perms: { type: DataTypes.STRING(255) },
  sort_no: { type: DataTypes.INTEGER, defaultValue: 1, field: 'sort_no' },
  icon: { type: DataTypes.STRING(100) },
  status: { type: DataTypes.INTEGER, defaultValue: 1 },
  hidden: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'sys_permission',
  timestamps: false
});

// 班级模型（mapping to teaching_class table）
models.SysDepart = sequelize.define('sys_depart', {
  id: { type: DataTypes.STRING(32), primaryKey: true },
  depart_name: { type: DataTypes.STRING(100), allowNull: false, field: 'class_name' }, // 映射到 class_name
  status: { type: DataTypes.INTEGER, defaultValue: 1 },
  del_flag: { type: DataTypes.INTEGER, defaultValue: 0, field: 'del_flag' }
}, {
  tableName: 'teaching_class',
  timestamps: false
});

// 学生模型
models.TeachingStudent = sequelize.define('teaching_student', {
  id: { type: DataTypes.STRING(32), primaryKey: true },
  student_no: { type: DataTypes.STRING(50), allowNull: false, field: 'student_no' },
  realname: { type: DataTypes.STRING(100), allowNull: false },
  username: { type: DataTypes.STRING(100) },
  sex: { type: DataTypes.INTEGER },
  birthday: { type: DataTypes.DATEONLY },
  phone: { type: DataTypes.STRING(20) },
  email: { type: DataTypes.STRING(100) },
  avatar: { type: DataTypes.STRING(255) },
  id_card: { type: DataTypes.STRING(18), field: 'id_card' },
  parent_phone: { type: DataTypes.STRING(20), field: 'parent_phone' },
  parent_name: { type: DataTypes.STRING(100), field: 'parent_name' },
  address: { type: DataTypes.STRING(255) },
  enrollment_date: { type: DataTypes.DATEONLY, field: 'enrollment_date' },
  status: { type: DataTypes.INTEGER, defaultValue: 1 },
  learning_status: { type: DataTypes.STRING(50), defaultValue: 'normal', field: 'learning_status' },
  seat: { type: DataTypes.STRING(50) },
  remark: { type: DataTypes.TEXT },
  del_flag: { type: DataTypes.INTEGER, defaultValue: 0, field: 'del_flag' },
  create_time: { type: DataTypes.DATE, field: 'create_time' },
  update_time: { type: DataTypes.DATE, field: 'update_time' }
}, {
  tableName: 'teaching_student',
  timestamps: false
});

// 班级模型
models.TeachingClass = sequelize.define('teaching_class', {
  id: { type: DataTypes.STRING(32), primaryKey: true },
  class_name: { type: DataTypes.STRING(100), allowNull: false, field: 'class_name' },
  class_no: { type: DataTypes.STRING(50), field: 'class_no' },
  teacher_id: { type: DataTypes.STRING(32), field: 'teacher_id' },
  teacher_name: { type: DataTypes.STRING(100), field: 'teacher_name' },
  start_date: { type: DataTypes.DATEONLY, field: 'start_date' },
  end_date: { type: DataTypes.DATEONLY, field: 'end_date' },
  status: { type: DataTypes.INTEGER, defaultValue: 1 },
  student_count: { type: DataTypes.INTEGER, defaultValue: 0, field: 'student_count' },
  max_students: { type: DataTypes.INTEGER, defaultValue: 30, field: 'max_students' },
  classroom: { type: DataTypes.STRING(100) },
  schedule_weekdays: { type: DataTypes.TEXT, field: 'schedule_weekdays' },
  schedule_time_slots: { type: DataTypes.TEXT, field: 'schedule_time_slots' },
  description: { type: DataTypes.TEXT },
  del_flag: { type: DataTypes.INTEGER, defaultValue: 0, field: 'del_flag' },
  create_time: { type: DataTypes.DATE, field: 'create_time' },
  update_time: { type: DataTypes.DATE, field: 'update_time' }
}, {
  tableName: 'teaching_class',
  timestamps: false
});

// 班级学生关联模型
models.TeachingClassStudent = sequelize.define('teaching_class_student', {
  id: { type: DataTypes.STRING(32), primaryKey: true },
  class_id: { type: DataTypes.STRING(32), allowNull: false, field: 'class_id' },
  student_id: { type: DataTypes.STRING(32), allowNull: false, field: 'student_id' },
  join_date: { type: DataTypes.DATEONLY, field: 'join_date' },
  status: { type: DataTypes.INTEGER, defaultValue: 1 },
  del_flag: { type: DataTypes.INTEGER, defaultValue: 0, field: 'del_flag' },
  create_by: { type: DataTypes.STRING(32), field: 'create_by' },
  create_time: { type: DataTypes.DATE, field: 'create_time' },
  update_time: { type: DataTypes.DATE, field: 'update_time' }
}, {
  tableName: 'teaching_class_student',
  timestamps: false
});

// 课程模型
models.TeachingCourse = sequelize.define('teaching_course', {
  id: { type: DataTypes.STRING(32), primaryKey: true },
  course_name: { type: DataTypes.STRING(200), allowNull: false, field: 'course_name' },
  course_code: { type: DataTypes.STRING(100), field: 'course_code' },
  cover: { type: DataTypes.STRING(255) },
  category: { type: DataTypes.STRING(50) },
  level: { type: DataTypes.STRING(50) },
  description: { type: DataTypes.TEXT },
  duration: { type: DataTypes.INTEGER, defaultValue: 0 },
  price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  teacher_id: { type: DataTypes.STRING(32), field: 'teacher_id' },
  teacher_name: { type: DataTypes.STRING(100), field: 'teacher_name' },
  student_count: { type: DataTypes.INTEGER, defaultValue: 0, field: 'student_count' },
  status: { type: DataTypes.INTEGER, defaultValue: 1 },
  avg_rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0, field: 'avg_rating' },
  del_flag: { type: DataTypes.INTEGER, defaultValue: 0, field: 'del_flag' },
  create_time: { type: DataTypes.DATE, field: 'create_time' },
  update_time: { type: DataTypes.DATE, field: 'update_time' }
}, {
  tableName: 'teaching_course',
  timestamps: false
});

// 课程单元模型
models.TeachingCourseUnit = sequelize.define('teaching_course_unit', {
  id: { type: DataTypes.STRING(32), primaryKey: true },
  course_id: { type: DataTypes.STRING(32), allowNull: false, field: 'course_id' },
  unit_name: { type: DataTypes.STRING(200), allowNull: false, field: 'unit_name' },
  unit_no: { type: DataTypes.INTEGER, field: 'unit_no' },
  content_type: { type: DataTypes.STRING(50), field: 'content_type' },  // 内容类型（programming, video, document等）
  content_url: { type: DataTypes.STRING(500), field: 'content_url' },    // 内容URL
  resource_id: { type: DataTypes.STRING(32), field: 'resource_id' },     // 关联资源ID
  resource_name: { type: DataTypes.STRING(200), field: 'resource_name' }, // 资源名称
  objectives: { type: DataTypes.TEXT, field: 'objectives' },             // 学习目标（JSON格式，编程内容存储在此）
  description: { type: DataTypes.TEXT },
  duration: { type: DataTypes.INTEGER, defaultValue: 0 },
  sort_no: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_no' },
  del_flag: { type: DataTypes.INTEGER, defaultValue: 0, field: 'del_flag' },
  create_by: { type: DataTypes.STRING(32), field: 'create_by' },
  create_time: { type: DataTypes.DATE, field: 'create_time' },
  update_by: { type: DataTypes.STRING(32), field: 'update_by' },
  update_time: { type: DataTypes.DATE, field: 'update_time' }
}, {
  tableName: 'teaching_course_unit',
  timestamps: false
});

// 作业模型
models.TeachingHomework = sequelize.define('teaching_homework', {
  id: { type: DataTypes.STRING(32), primaryKey: true },
  homework_title: { type: DataTypes.STRING(200), allowNull: false, field: 'homework_title' },
  homework_type: { type: DataTypes.STRING(50), field: 'homework_type' },
  difficulty: { type: DataTypes.INTEGER, defaultValue: 1 },
  course_id: { type: DataTypes.STRING(32), field: 'course_id' },
  unit_id: { type: DataTypes.STRING(32), field: 'unit_id' },
  description: { type: DataTypes.TEXT },
  requirements: { type: DataTypes.TEXT },
  attachments: { type: DataTypes.TEXT },
  resources: { type: DataTypes.TEXT },  // 新增：资源列表（JSON）
  is_template: { type: DataTypes.INTEGER, defaultValue: 0, field: 'is_template' },  // 新增：是否为模板
  template_id: { type: DataTypes.STRING(32), field: 'template_id' },  // 新增：模板ID
  total_score: { type: DataTypes.INTEGER, defaultValue: 100, field: 'total_score' },
  pass_score: { type: DataTypes.INTEGER, defaultValue: 60, field: 'pass_score' },
  publish_time: { type: DataTypes.DATE, field: 'publish_time' },
  deadline: { type: DataTypes.DATE },
  allow_late_submit: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'allow_late_submit' },
  teacher_id: { type: DataTypes.STRING(32), field: 'teacher_id' },
  teacher_name: { type: DataTypes.STRING(100), field: 'teacher_name' },
  status: { type: DataTypes.STRING(50), defaultValue: 'pending' },
  submitted_count: { type: DataTypes.INTEGER, defaultValue: 0, field: 'submitted_count' },
  total_students: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_students' },
  create_by: { type: DataTypes.STRING(32), field: 'create_by' },
  create_time: { type: DataTypes.DATE, field: 'create_time' },
  update_by: { type: DataTypes.STRING(32), field: 'update_by' },
  update_time: { type: DataTypes.DATE, field: 'update_time' },
  del_flag: { type: DataTypes.INTEGER, defaultValue: 0, field: 'del_flag' }
}, {
  tableName: 'teaching_homework',
  timestamps: false
});

// 作业班级关联模型
models.TeachingHomeworkClass = sequelize.define('teaching_homework_class', {
  id: { type: DataTypes.STRING(32), primaryKey: true },
  homework_id: { type: DataTypes.STRING(32), allowNull: false, field: 'homework_id' },
  class_id: { type: DataTypes.STRING(32), allowNull: false, field: 'class_id' },
  class_name: { type: DataTypes.STRING(100), field: 'class_name' },
  create_time: { type: DataTypes.DATE, field: 'create_time' }
}, {
  tableName: 'teaching_homework_class',
  timestamps: false
});

// 作业提交模型
models.TeachingHomeworkSubmission = sequelize.define('teaching_homework_submission', {
  id: { type: DataTypes.STRING(32), primaryKey: true },
  homework_id: { type: DataTypes.STRING(32), allowNull: false, field: 'homework_id' },
  student_id: { type: DataTypes.STRING(32), allowNull: false, field: 'student_id' },
  student_name: { type: DataTypes.STRING(100), field: 'student_name' },
  content: { type: DataTypes.TEXT },
  attachments: { type: DataTypes.TEXT },
  submit_time: { type: DataTypes.DATE, field: 'submit_time' },
  is_late: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_late' },
  status: { type: DataTypes.STRING(50), defaultValue: 'pending' },
  score: { type: DataTypes.INTEGER },
  feedback: { type: DataTypes.TEXT },
  reviewer_id: { type: DataTypes.STRING(32), field: 'reviewer_id' },
  reviewer_name: { type: DataTypes.STRING(100), field: 'reviewer_name' },
  review_time: { type: DataTypes.DATE, field: 'review_time' },
  revision_count: { type: DataTypes.INTEGER, defaultValue: 0, field: 'revision_count' }
}, {
  tableName: 'teaching_homework_submission',
  timestamps: false
});

// 教室模型
models.TeachingClassroom = sequelize.define('teaching_classroom', {
  id: { type: DataTypes.STRING(32), primaryKey: true },
  classroom_name: { type: DataTypes.STRING(200), allowNull: false, field: 'classroom_name' },
  classroom_code: { type: DataTypes.STRING(100), field: 'classroom_code' },
  class_id: { type: DataTypes.STRING(32), field: 'class_id' },
  teacher_id: { type: DataTypes.STRING(32), field: 'teacher_id' },
  teacher_name: { type: DataTypes.STRING(100), field: 'teacher_name' },
  course_id: { type: DataTypes.STRING(32), field: 'course_id' },
  course_name: { type: DataTypes.STRING(200), field: 'course_name' },
  lesson_id: { type: DataTypes.STRING(32), field: 'lesson_id' },
  lesson_name: { type: DataTypes.STRING(200), field: 'lesson_name' },
  resource_id: { type: DataTypes.STRING(32), field: 'resource_id' },
  resource_name: { type: DataTypes.STRING(200), field: 'resource_name' },
  resource_url: { type: DataTypes.STRING(500), field: 'resource_url' },
  content_type: { type: DataTypes.STRING(50), field: 'content_type' },
  selected_language: { type: DataTypes.STRING(50), field: 'selected_language' },
  start_time: { type: DataTypes.DATE, field: 'start_time' },
  end_time: { type: DataTypes.DATE, field: 'end_time' },
  duration: { type: DataTypes.INTEGER, defaultValue: 0, field: 'duration' },
  status: { type: DataTypes.STRING(50), defaultValue: 'scheduled', field: 'status' },
  max_students: { type: DataTypes.INTEGER, defaultValue: 50, field: 'max_students' },
  current_students: { type: DataTypes.INTEGER, defaultValue: 0, field: 'current_students' },
  description: { type: DataTypes.TEXT, field: 'description' },
  demo_content: { type: DataTypes.TEXT('long'), field: 'demo_content' },
  demo_language: { type: DataTypes.STRING(50), field: 'demo_language' },
  del_flag: { type: DataTypes.INTEGER, defaultValue: 0, field: 'del_flag' },
  create_time: { type: DataTypes.DATE, field: 'create_time' },
  update_time: { type: DataTypes.DATE, field: 'update_time' }
}, {
  tableName: 'teaching_classroom',
  timestamps: false
});

// 资源模型
models.TeachingClassroomStudent = initTeachingClassroomStudent(sequelize);
models.TeachingStudentProgress = initTeachingStudentProgress(sequelize);
models.TeachingStudentStatusLog = initTeachingStudentStatusLog(sequelize);

models.TeachingResource = sequelize.define('teaching_resource', {
  id: { type: DataTypes.STRING(32), primaryKey: true },
  resource_name: { type: DataTypes.STRING(200), allowNull: false, field: 'resource_name' },
  resource_type: { type: DataTypes.STRING(50), field: 'resource_type' },
  course_id: { type: DataTypes.STRING(32), field: 'course_id' },  // 新增：课程ID
  course_name: { type: DataTypes.STRING(200), field: 'course_name' },  // 新增：课程名称
  course_system: { type: DataTypes.STRING(100), field: 'course_system' },
  course_system: { type: DataTypes.STRING(100), field: 'course_system' },
  course_stage: { type: DataTypes.STRING(100), field: 'course_stage' },
  file_name: { type: DataTypes.STRING(255), field: 'file_name' },
  file_path: { type: DataTypes.STRING(500), field: 'file_path' },
  file_size: { type: DataTypes.BIGINT, defaultValue: 0, field: 'file_size' },
  file_extension: { type: DataTypes.STRING(20), field: 'file_extension' },
  mime_type: { type: DataTypes.STRING(100), field: 'mime_type' },
  file_url: { type: DataTypes.STRING(500), field: 'file_url' },
  storage_type: { type: DataTypes.STRING(50), field: 'storage_type' },
  folder_id: { type: DataTypes.STRING(32), field: 'folder_id' },
  category: { type: DataTypes.STRING(100), field: 'category' },
  tags: { type: DataTypes.STRING(255), field: 'tags' },
  description: { type: DataTypes.TEXT },
  download_count: { type: DataTypes.INTEGER, defaultValue: 0, field: 'download_count' },
  view_count: { type: DataTypes.INTEGER, defaultValue: 0, field: 'view_count' },
  uploader_id: { type: DataTypes.STRING(32), field: 'uploader_id' },
  uploader_name: { type: DataTypes.STRING(100), field: 'uploader_name' },
  del_flag: { type: DataTypes.INTEGER, defaultValue: 0, field: 'del_flag' },
  create_time: { type: DataTypes.DATE, field: 'create_time' },
  update_time: { type: DataTypes.DATE, field: 'update_time' }
}, {
  tableName: 'teaching_resource',
  timestamps: false
});

// 课堂聊天消息模型
models.TeachingClassroomChat = sequelize.define('teaching_classroom_chat', {
  id: { type: DataTypes.STRING(36), primaryKey: true },
  classroom_id: { type: DataTypes.STRING(36), allowNull: false, field: 'classroom_id' },
  user_id: { type: DataTypes.STRING(36), allowNull: false, field: 'user_id' },
  user_name: { type: DataTypes.STRING(100), field: 'user_name' },
  user_role: { type: DataTypes.STRING(20), field: 'user_role' },
  message_type: { type: DataTypes.STRING(20), defaultValue: 'text', field: 'message_type' },
  content: { type: DataTypes.TEXT, field: 'content' },
  file_name: { type: DataTypes.STRING(255), field: 'file_name' },
  file_size: { type: DataTypes.INTEGER, field: 'file_size' },
  file_type: { type: DataTypes.STRING(100), field: 'file_type' },
  file_url: { type: DataTypes.STRING(500), field: 'file_url' },
  avatar: { type: DataTypes.STRING(255), field: 'avatar' },
  del_flag: { type: DataTypes.INTEGER, defaultValue: 0, field: 'del_flag' },
  create_time: { type: DataTypes.DATE, field: 'create_time' }
}, {
  tableName: 'teaching_classroom_chat',
  timestamps: false
});

// 课堂笔记模型
models.TeachingClassroomNote = sequelize.define('teaching_classroom_note', {
  id: { type: DataTypes.STRING(36), primaryKey: true },
  classroom_id: { type: DataTypes.STRING(36), allowNull: false, field: 'classroom_id' },
  student_id: { type: DataTypes.STRING(36), allowNull: false, field: 'student_id' },
  content: { type: DataTypes.TEXT, field: 'content' },
  del_flag: { type: DataTypes.INTEGER, defaultValue: 0, field: 'del_flag' },
  create_time: { type: DataTypes.DATE, field: 'create_time' },
  update_time: { type: DataTypes.DATE, field: 'update_time' }
}, {
  tableName: 'teaching_classroom_note',
  timestamps: false
});

// 学生作品模型
models.TeachingStudentWork = sequelize.define('teaching_student_work', {
  id: { type: DataTypes.STRING(36), primaryKey: true },
  work_name: { type: DataTypes.STRING(200), allowNull: false, field: 'work_name' },
  work_description: { type: DataTypes.TEXT, field: 'work_description' },
  work_type: { type: DataTypes.STRING(50), field: 'work_type' },
  work_file_url: { type: DataTypes.STRING(500), field: 'work_file_url' },
  work_file_name: { type: DataTypes.STRING(255), field: 'work_file_name' },
  work_file_size: { type: DataTypes.BIGINT, defaultValue: 0, field: 'work_file_size' },
  work_file_extension: { type: DataTypes.STRING(20), field: 'work_file_extension' },
  work_cover_url: { type: DataTypes.STRING(500), field: 'work_cover_url' },
  work_tags: { type: DataTypes.STRING(500), field: 'work_tags' },
  is_public: { type: DataTypes.TINYINT, defaultValue: 0, field: 'is_public' },
  view_count: { type: DataTypes.INTEGER, defaultValue: 0, field: 'view_count' },
  like_count: { type: DataTypes.INTEGER, defaultValue: 0, field: 'like_count' },
  comment_count: { type: DataTypes.INTEGER, defaultValue: 0, field: 'comment_count' },
  rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0.00, field: 'rating' },
  student_id: { type: DataTypes.STRING(36), allowNull: false, field: 'student_id' },
  student_name: { type: DataTypes.STRING(100), field: 'student_name' },
  classroom_id: { type: DataTypes.STRING(36), field: 'classroom_id' },
  course_id: { type: DataTypes.STRING(36), field: 'course_id' },
  work_status: { type: DataTypes.TINYINT, defaultValue: 1, field: 'work_status' },
  del_flag: { type: DataTypes.INTEGER, defaultValue: 0, field: 'del_flag' },
  create_by: { type: DataTypes.STRING(36), field: 'create_by' },
  create_time: { type: DataTypes.DATE, field: 'create_time' },
  update_by: { type: DataTypes.STRING(36), field: 'update_by' },
  update_time: { type: DataTypes.DATE, field: 'update_time' }
}, {
  tableName: 'teaching_student_work',
  timestamps: false
});

// 导出Sequelize以便使用Op等操作符
models.Sequelize = require('sequelize');
models.sequelize = sequelize; // ✅ 导出sequelize实例

// ==========================================
// 定义模型关联
// ==========================================

// 1. 作业提交关联学生
models.TeachingHomeworkSubmission.belongsTo(models.TeachingStudent, {
  foreignKey: 'student_id',
  targetKey: 'id',
  as: 'student'
});

// 2. 作业提交关联作业
models.TeachingHomeworkSubmission.belongsTo(models.TeachingHomework, {
  foreignKey: 'homework_id',
  targetKey: 'id',
  as: 'homework'
});

// 3. 作业关联提交（一对多）
models.TeachingHomework.hasMany(models.TeachingHomeworkSubmission, {
  foreignKey: 'homework_id',
  sourceKey: 'id',
  as: 'submissions'
});

// 导出所有模型
module.exports = models;


