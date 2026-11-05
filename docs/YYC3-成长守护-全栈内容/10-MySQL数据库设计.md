---
file: 10-MySQL数据库设计.md
title: YYC³ 智能 AI 项目全栈（十）MySQL 数据库设计
description: 数据库设计、表结构、索引优化与数据安全策略
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-02
updated: 2026-11-02
status: stable
tags: [design, database, schema]
category: design
language: zh-CN
audience: developers,managers,stakeholders
complexity: advanced
project: yyc3-baby-mochen
phase: design
parent_doc: 智能AI项目-全栈完整内容
related_docs: README.md
---

# YYC³ 智能 AI 项目全栈（十）MySQL 数据库设计

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 核心理念

**五高架构**：高可用 | 高性能 | 高安全 | 高扩展 | 高智能
**五标体系**：标准化 | 规范化 | 自动化 | 可视化 | 智能化
**五化转型**：流程化 | 数字化 | 生态化 | 工具化 | 服务化
**五维评估**：时间维 | 空间维 | 属性维 | 事件维 | 关联维

---

## 十、MySQL

### 10.1 数据库设计

```sql
-- 用户表
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    birth_date DATE,
    gender ENUM('male', 'female', 'other'),
    role ENUM('user', 'admin', 'guardian', 'educator') DEFAULT 'user',
    avatar_url VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户角色表
CREATE TABLE user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    role_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY idx_user_role (user_id, role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户关系表
CREATE TABLE user_relationships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    related_user_id VARCHAR(36) NOT NULL,
    relationship_type ENUM('parent', 'child', 'guardian', 'educator', 'family', 'friend') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_related_user_id (related_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 成长事件表
CREATE TABLE growth_events (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type ENUM('first_milestone', 'daily_activity', 'health_record', 'educational_activity', 'social_interaction', 'cultural_experience', 'special_occasion') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATETIME NOT NULL,
    location VARCHAR(255),
    participants JSON,
    emotions JSON,
    media_ids JSON,
    tags JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_date (date),
    FULLTEXT idx_description (description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 健康记录表
CREATE TABLE health_records (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type ENUM('vaccination', 'checkup', 'illness', 'dental', 'nutrition', 'sleep', 'physical_development') NOT NULL,
    date DATE NOT NULL,
    data JSON NOT NULL,
    notes TEXT,
    media_ids JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 里程碑表
CREATE TABLE milestones (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    category ENUM('physical', 'cognitive', 'language', 'social_emotional', 'self_care', 'cultural') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    expected_age VARCHAR(50),
    achieved_date DATETIME,
    evidence TEXT,
    media_ids JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_category (category),
    INDEX idx_achieved_date (achieved_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 情感记录表
CREATE TABLE emotion_records (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    emotion ENUM('happy', 'sad', 'angry', 'excited', 'calm', 'fear', 'surprise', 'disgust', 'love', 'pride', 'shame', 'guilt') NOT NULL,
    intensity DECIMAL(3,2) NOT NULL CHECK (intensity >= 0 AND intensity <= 1),
    triggers JSON,
    context TEXT,
    duration INT,
    resolution TEXT,
    date DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_emotion (emotion),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 媒体资源表
CREATE TABLE media_resources (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type ENUM('image', 'video', 'audio', 'document') NOT NULL,
    url VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    metadata JSON,
    tags JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_filename (filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 事件媒体关联表
CREATE TABLE event_media (
    event_id VARCHAR(36),
    media_id VARCHAR(36),
    PRIMARY KEY (event_id, media_id),
    FOREIGN KEY (event_id) REFERENCES growth_events(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media_resources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 健康记录媒体关联表
CREATE TABLE health_media (
    health_record_id VARCHAR(36),
    media_id VARCHAR(36),
    PRIMARY KEY (health_record_id, media_id),
    FOREIGN KEY (health_record_id) REFERENCES health_records(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media_resources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 里程碑媒体关联表
CREATE TABLE milestone_media (
    milestone_id VARCHAR(36),
    media_id VARCHAR(36),
    PRIMARY KEY (milestone_id, media_id),
    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media_resources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 情感记录媒体关联表
CREATE TABLE emotion_media (
    emotion_record_id VARCHAR(36),
    media_id VARCHAR(36),
    PRIMARY KEY (emotion_record_id, media_id),
    FOREIGN KEY (emotion_record_id) REFERENCES emotion_records(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media_resources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET8mb4 COLLATE=utf8mb4_unicode_ci;

-- 情感响应记录表
CREATE TABLE emotional_responses (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    trigger VARCHAR(255),
    emotion ENUM('happy', 'sad', 'angry', 'excited', 'calm', 'fear', 'surprise', 'disgust', 'love', 'pride', 'shame', 'guilt') NOT NULL,
    intensity DECIMAL(3,2) NOT NULL CHECK (intensity >= 0 AND intensity <= 1),
    response TEXT,
    outcome TEXT,
    date DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_emotion (emotion),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET8mb4 COLLATE=utf8mb4_unicode_ci;

-- 兴趣信号表
CREATE TABLE interest_signals (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    signal TEXT NOT NULL,
    context TEXT,
    strength DECIMAL(3,2) NOT NULL CHECK (strength >= 0 AND strength <= 1),
    category ENUM('reading', 'art', 'music', 'math', 'science', 'physical', 'social', 'general'),
    persistence DECIMAL(3,2) NOT NULL CHECK (persistence >= 0 AND persistence <= 1),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_category (category),
    INDEX idx_strength (strength)
) ENGINE=InnoDB DEFAULT CHARSET8mb4 COLLATE=utf8mb4_unicode_ci;

-- 社交互动观察表
CREATE TABLE social_interactions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    participants JSON,
    setting VARCHAR(255),
    interaction_type ENUM('parallel', 'cooperative', 'competitive', 'conflict', 'solitary'),
    duration INT,
    child_role ENUM('initiator', 'follower', 'leader', 'observer', 'participant'),
    outcomes JSON,
    skills JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_interaction_type (interaction_type)
) ENGINE=InnoDB DEFAULT CHARSET8mb4 COLLATE=utf8mb4_unicode_ci;

-- 挑战记录表
CREATE TABLE challenge_records (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    challenge TEXT NOT NULL,
    context TEXT,
    coping_strategies JSON,
    outcome TEXT,
    lessons_learned TEXT,
    date DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET8mb4 COLLATE=utf8mb4_unicode_ci;

-- 语言记录表
CREATE TABLE language_records (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type ENUM('receptive', 'expressive', 'pragmatic'),
    content TEXT,
    context TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET8mb4 COLLATE=utf8mb4_unicode_ci;

-- 传统节日表
CREATE TABLE traditional_festivals (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    date_pattern VARCHAR(50) NOT NULL,
    duration INT,
    description TEXT,
    symbols JSON,
    activities JSON,
    foods JSON,
    values JSON,
    stories JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET8mb4 COLLATE=utf8mb4_unicode_ci;

-- 文化故事表
CREATE TABLE cultural_stories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('mythology', 'legend', 'historical', 'folktale'),
    summary TEXT,
    cultural_significance TEXT,
    themes JSON,
    characters JSON,
    moral TEXT,
    adaptations JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FULLTEXT idx_summary (summary),
    INDEX idx_name (name),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET8mb4 COLLATE=utf8mb4_unicode_ci;

-- 文化仪式参与表
CREATE TABLE ritual_participations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    ritual_name VARCHAR(100) NOT NULL,
    ritual_type ENUM('family', 'community', 'cultural', 'religious', 'seasonal'),
    date DATE NOT NULL,
    role ENUM('observer', 'participant', 'helper', 'leader'),
    preparation JSON,
    experience TEXT,
    reflection TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_ritual_type (ritual_type),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET8mb4 COLLATE=utf8mb4_unicode_ci;

-- 系统配置表
CREATE TABLE system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 系统日志表
CREATE TABLE system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level ENUM('ERROR', 'WARN', 'INFO', 'DEBUG') NOT NULL,
    message TEXT NOT NULL,
    context JSON,
    user_id VARCHAR(36),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_level (level),
    INDEX idx_created_at (created_at),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET8mb4 COLLATE=utf8mb4_unicode_ci;

-- API访问日志表
CREATE TABLE api_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(255) NOT NULL,
    status_code INT NOT NULL,
    response_time INT NOT NULL,
    user_id VARCHAR(36),
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_method (method),
    idx_path (path),
    idx_status_code (status_code),
    idx_created_at (created_at),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

```

### 10.2 表结构说明

1. 用户相关表：
    - users：用户基本信息
    - user_roles：用户角色
    - user_relationships：用户关系
2. 成长记录表：
    - growth_events：成长事件
    - health_records：健康记录
    - milestones：发展里程碑
    - emotion_records：情感记录
3. 媒体资源表：
    - media_resources：媒体资源
    - event_media：事件媒体关联
    - health_media：健康记录媒体关联
    - milestone_media：里程碑媒体关联
    - emotion_media：情感记录媒体关联
4. 发展分析表：
    - emotional_responses：情感响应记录
    - interest_signals：兴趣信号
    - social_interactions：社交互动观察
    - challenge_records：挑战记录
    - language_records：语言记录
5. 文化传承表：
    - traditional_festivals：传统节日
    - cultural_stories：文化故事
    - ritual_participations：文化仪式参与
6. 系统表：
    - system_config：系统配置
    - system_logs：系统日志
    - api_logs：API访问日志

### 10.3 索引优化

```sql
-- 复合索引优化
CREATE INDEX idx_user_type_date ON growth_events(user_id, type, date);
CREATE INDEX idx_user_emotion_date ON emotion_records(user_id, emotion, date);
CREATE INDEX idx_user_category_achieved ON milestones(user_id, category, achieved_date);
CREATE INDEX idx_user_type_date ON health_records(user_id, type, date);
CREATE INDEX idx_user_category_persistence ON interest_signals(user_id, category, persistence);
CREATE INDEX idx_user_ritual_type_date ON ritual_participations(user_id, ritual_type, date);

-- 全文索引优化
ALTER TABLE growth_events ADD FULLTEXT idx_fulltext (title, description);
ALTER TABLE cultural_stories ADD FULLTEXT idx_fulltext (summary, moral);
ALTER TABLE system_logs ADD FULLTEXT idx_fulltext (message);

-- 分区表优化（按时间分区）
ALTER TABLE growth_events PARTITION BY RANGE (TO_DAYS(date)) (
    PARTITION p0 VALUES LESS THAN (TO_DAYS('2020-01-01')),
    PARTITION p1 VALUES LESS THAN (TO_DAYS('2021-01-01')),
    PARTITION p2 VALUES LESS THAN (TO_DAYS('2022-01-01')),
    PARTITION p3 VALUES LESS THAN (TO_DAYS('2023-01-01')),
    PARTITION p4 VALUES LESS THAN MAXVALUE
);

-- 外键约束优化
ALTER TABLE growth_events ADD CONSTRAINT fk_growth_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE health_records ADD CONSTRAINT fk_health_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE milestones ADD CONSTRAINT fk_milestones_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE emotion_records ADD CONSTRAINT fk_emotion_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

```

### 10.4 数据安全

```sql
-- 创建只读用户
CREATE USER 'yyc3ai_readonly'@'%' IDENTIFIED BY 'secure_password';
GRANT SELECT ON yyc3ai_xiaoyu.* TO 'yyc3ai_readonly'@'%';

-- 创建读写用户
CREATE USER 'yyc3ai_readwrite'@'%' IDENTIFIED BY 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON yyc3ai_xiaoyu.* TO 'yyc3ai_readwrite'@'%';

-- 创建管理员用户
CREATE USER 'yyc3ai_admin'@'%' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON yyc3ai_xiaoyu.* TO 'yyc3ai_admin'@'%';

-- 数据加密配置
ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
ALTER TABLE system_config MODIFY COLUMN config_value VARBINARY(255);

-- 审计字段
ALTER TABLE users ADD COLUMN created_by VARCHAR(36);
ALTER TABLE users ADD COLUMN updated_by VARCHAR(36);
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

```

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-02 | 由《智能 AI 项目全栈完整内容》第 10 章拆分独立成篇 · 统一标头标尾 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
