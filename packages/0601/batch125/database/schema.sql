-- 幼儿园接送签到系统数据库设计

-- 1. 园所表
CREATE TABLE `kindergartens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '园所ID',
  `name` VARCHAR(100) NOT NULL COMMENT '园所名称',
  `address` VARCHAR(255) COMMENT '园所地址',
  `contact_phone` VARCHAR(20) COMMENT '联系电话',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用 1-启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='园所表';

-- 2. 班级表
CREATE TABLE `classes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '班级ID',
  `kindergarten_id` BIGINT UNSIGNED NOT NULL COMMENT '园所ID',
  `name` VARCHAR(50) NOT NULL COMMENT '班级名称(如: 小一班)',
  `grade` VARCHAR(20) NOT NULL COMMENT '年级: 小班/中班/大班',
  `class_qr_code` VARCHAR(255) NOT NULL COMMENT '班级签到二维码内容/标识',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用 1-启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kindergarten_id` (`kindergarten_id`),
  UNIQUE KEY `uk_class_qr_code` (`class_qr_code`),
  CONSTRAINT `fk_classes_kindergarten` FOREIGN KEY (`kindergarten_id`) REFERENCES `kindergartens` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班级表';

-- 3. 老师表
CREATE TABLE `teachers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '老师ID',
  `kindergarten_id` BIGINT UNSIGNED NOT NULL COMMENT '园所ID',
  `name` VARCHAR(50) NOT NULL COMMENT '姓名',
  `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
  `id_card` VARCHAR(18) COMMENT '身份证号',
  `avatar_url` VARCHAR(255) COMMENT '头像URL',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用 1-启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kindergarten_id` (`kindergarten_id`),
  UNIQUE KEY `uk_phone` (`phone`),
  CONSTRAINT `fk_teachers_kindergarten` FOREIGN KEY (`kindergarten_id`) REFERENCES `kindergartens` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='老师表';

-- 4. 班级老师关系表
CREATE TABLE `class_teacher_relations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `class_id` BIGINT UNSIGNED NOT NULL COMMENT '班级ID',
  `teacher_id` BIGINT UNSIGNED NOT NULL COMMENT '老师ID',
  `role` VARCHAR(20) NOT NULL DEFAULT 'teacher' COMMENT '角色: teacher-班主任, assistant-助教',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_class_teacher` (`class_id`, `teacher_id`),
  CONSTRAINT `fk_ctr_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  CONSTRAINT `fk_ctr_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班级老师关系表';

-- 5. 家长表
CREATE TABLE `parents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '家长ID',
  `name` VARCHAR(50) NOT NULL COMMENT '姓名',
  `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
  `id_card` VARCHAR(18) NOT NULL COMMENT '身份证号',
  `avatar_url` VARCHAR(255) COMMENT '头像URL',
  `id_card_verified` TINYINT NOT NULL DEFAULT 0 COMMENT '身份证是否已验证: 0-未验证 1-已验证',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用 1-启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_phone` (`phone`),
  UNIQUE KEY `uk_id_card` (`id_card`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='家长表';

-- 6. 学生表
CREATE TABLE `students` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '学生ID',
  `class_id` BIGINT UNSIGNED NOT NULL COMMENT '班级ID',
  `name` VARCHAR(50) NOT NULL COMMENT '姓名',
  `gender` TINYINT COMMENT '性别: 1-男 2-女',
  `birthday` DATE COMMENT '出生日期',
  `avatar_url` VARCHAR(255) COMMENT '头像URL',
  `student_no` VARCHAR(50) COMMENT '学号',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-离校 1-在校',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_class_id` (`class_id`),
  UNIQUE KEY `uk_class_student_no` (`class_id`, `student_no`),
  CONSTRAINT `fk_students_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生表';

-- 7. 学生家长关系表
CREATE TABLE `student_parent_relations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` BIGINT UNSIGNED NOT NULL COMMENT '学生ID',
  `parent_id` BIGINT UNSIGNED NOT NULL COMMENT '家长ID',
  `relation` VARCHAR(20) NOT NULL COMMENT '关系: 父亲/母亲/爷爷/奶奶等',
  `is_primary` TINYINT NOT NULL DEFAULT 0 COMMENT '是否主要联系人: 0-否 1-是',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_parent` (`student_id`, `parent_id`),
  KEY `idx_parent_id` (`parent_id`),
  CONSTRAINT `fk_spr_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`),
  CONSTRAINT `fk_spr_parent` FOREIGN KEY (`parent_id`) REFERENCES `parents` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生家长关系表';

-- 8. 临时接送人授权表
CREATE TABLE `temp_authorizations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '授权ID',
  `student_id` BIGINT UNSIGNED NOT NULL COMMENT '学生ID',
  `parent_id` BIGINT UNSIGNED NOT NULL COMMENT '发起授权的家长ID',
  `authorized_person_name` VARCHAR(50) NOT NULL COMMENT '被授权人姓名',
  `authorized_person_phone` VARCHAR(20) NOT NULL COMMENT '被授权人手机号',
  `authorized_person_id_card` VARCHAR(18) NOT NULL COMMENT '被授权人身份证号',
  `id_card_front_url` VARCHAR(255) COMMENT '身份证正面照片URL',
  `id_card_back_url` VARCHAR(255) COMMENT '身份证背面照片URL',
  `start_time` DATETIME NOT NULL COMMENT '授权开始时间',
  `end_time` DATETIME NOT NULL COMMENT '授权结束时间',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态: 0-待审核 1-审核通过 2-审核拒绝 3-已过期',
  `reviewer_id` BIGINT UNSIGNED COMMENT '审核人ID(老师ID)',
  `review_time` DATETIME COMMENT '审核时间',
  `review_remark` VARCHAR(255) COMMENT '审核备注',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_status` (`status`),
  KEY `idx_time_range` (`start_time`, `end_time`),
  CONSTRAINT `fk_ta_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`),
  CONSTRAINT `fk_ta_parent` FOREIGN KEY (`parent_id`) REFERENCES `parents` (`id`),
  CONSTRAINT `fk_ta_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `teachers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='临时接送人授权表';

-- 9. 签到记录表
CREATE TABLE `checkin_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '签到记录ID',
  `class_id` BIGINT UNSIGNED NOT NULL COMMENT '班级ID',
  `student_id` BIGINT UNSIGNED NOT NULL COMMENT '学生ID',
  `checkin_type` TINYINT NOT NULL COMMENT '签到类型: 1-入园签到 2-离园签到',
  `checkin_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '签到时间',
  `picker_id` BIGINT UNSIGNED COMMENT '接送人ID(家长ID或临时授权人ID)',
  `picker_type` TINYINT COMMENT '接送人类型: 1-家长 2-临时授权人',
  `picker_name` VARCHAR(50) COMMENT '接送人姓名(冗余字段)',
  `picker_relation` VARCHAR(20) COMMENT '接送人与学生关系',
  `checkin_method` TINYINT NOT NULL DEFAULT 1 COMMENT '签到方式: 1-扫码签到 2-手动补签',
  `operator_id` BIGINT UNSIGNED COMMENT '操作人ID(手动补签时为老师ID)',
  `remark` VARCHAR(255) COMMENT '备注',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_class_id` (`class_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_checkin_time` (`checkin_time`),
  KEY `idx_class_date` (`class_id`, `checkin_time`),
  CONSTRAINT `fk_cr_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  CONSTRAINT `fk_cr_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='签到记录表';

-- 10. 签到流水号表(用于生成每日唯一签到序号)
CREATE TABLE `checkin_sequences` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `class_id` BIGINT UNSIGNED NOT NULL,
  `checkin_date` DATE NOT NULL,
  `sequence` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_class_date` (`class_id`, `checkin_date`),
  CONSTRAINT `fk_cs_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='签到序号表';
