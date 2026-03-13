# Supabase 设置指南

## 目录
- [1. 创建 Supabase 项目](#1-创建-supabase-项目)
- [2. 获取 API 密钥](#2-获取-api-密钥)
- [3. 配置环境变量](#3-配置环境变量)
- [4. 创建数据库表](#4-创建数据库表)
- [5. 配置认证](#5-配置认证)
- [6. 启动应用](#6-启动应用)
- [数据库 Schema 说明](#数据库-schema-说明)
- [数据库迁移](#数据库迁移)
- [故障排除](#故障排除)
- [更多信息](#更多信息)

## 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com/) 并注册/登录
2. 点击 "New Project" 创建新项目
3. 填写项目信息：
   - **Name**: 项目名称（例如：小勇士积分王国）
   - **Database Password**: 设置一个强密码（请妥善保存）
   - **Region**: 选择离你最近的区域
4. 点击 "Create new project"，等待项目创建完成（通常需要 1-2 分钟）

## 2. 获取 API 密钥

1. 项目创建完成后，进入项目 Dashboard
2. 点击左侧菜单 **"Project Settings"** → **"API"**
3. 复制以下信息：
   - **Project URL**: `https://<your-project>.supabase.co`
   - **anon public**: `eyJhbGciOiJIUzI1NiIs...`（这是公钥，可以安全使用）

## 3. 配置环境变量

1. 在项目根目录复制环境变量模板文件：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入你的 Supabase 信息：
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**注意**：
- 不要将 `.env` 文件提交到版本控制（已包含在 `.gitignore` 中）
- 如果需要部署，需要在部署平台上设置相同的环境变量

## 4. 创建数据库表

### 方法一：使用完整 Schema（推荐）

1. 在 Supabase Dashboard 中，点击左侧菜单 **"SQL Editor"**
2. 点击 **"New query"** 创建新查询
3. 打开项目中的 `sql/full-schema.sql` 文件，复制全部内容
4. 将内容粘贴到 SQL Editor 中
5. 点击 **"Run"** 执行 SQL

这个文件包含：
- 所有数据表（用户资料、任务、奖品、徽章等）
- 三级分类系统
- 积分调整功能
- Row Level Security (RLS) 策略
- 自动触发器
- 索引优化
- 默认分类初始化

### 方法二：分步执行（如需修复）

如果已有数据库但需要修复，可以按以下顺序执行：

1. 首先执行 `sql/fix-infinite-recursion.sql` - 修复递归问题
2. 然后执行 `sql/fix-missing-functions.sql` - 修复缺失函数
3. 最后执行 `sql/safe-fix-all.sql` - 安全修复所有问题

或者直接执行 `sql/safe-fix-all.sql` 一次性修复所有问题。

## 5. 配置认证

### 邮箱认证（默认已启用）

1. 进入 **"Authentication"** → **"Providers"**
2. 确保 **"Email"** 提供商已启用
3. （可选）配置邮件模板：
   - 进入 **"Authentication"** → **"Templates"**
   - 自定义确认邮件、重置密码邮件等

### 禁用邮箱确认（开发环境可选）

如果在开发环境中不想每次都验证邮箱：

1. 进入 **"Authentication"** → **"Providers"** → **"Email"**
2. 关闭 **"Confirm email"** 选项
3. 点击 **"Save"**

**注意**：生产环境建议启用邮箱确认。

### 手机号认证（可选）

本应用支持手机号绑定功能：

1. 进入 **"Authentication"** → **"Providers"**
2. 启用 **"Phone"** 提供商（如果需要）
3. 配置 SMS 服务（需要第三方 SMS 提供商）

## 6. 启动应用

```bash
npm install
npm run dev
```

应用将在 http://localhost:5173 启动。

## 数据库 Schema 说明

### 表结构

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| `profiles` | 用户资料表 | id, username, phone, role, total_points, parent_id |
| `tasks` | 作业任务库 | id, user_id, name, base_points, icon, primary/secondary/tertiary_category_id |
| `daily_records` | 每日作业完成记录 | id, user_id, date, tasks, total_points |
| `rewards` | 奖品库 | id, user_id, name, points, icon, category |
| `redemptions` | 奖品兑换记录 | id, user_id, reward_id, reward_name, points |
| `badges` | 用户解锁的徽章记录 | id, user_id, badge_type, unlocked_at |
| `point_adjustments` | 积分调整记录表 | id, user_id, points, reason, created_at |
| `primary_categories` | 一级分类表 | id, user_id, name, icon, key |
| `secondary_categories` | 二级分类表 | id, user_id, primary_category_id, name, icon |
| `tertiary_categories` | 三级分类表 | id, user_id, secondary_category_id, name, icon, default_points |

### 视图

| 视图名 | 说明 |
|--------|------|
| `user_category_hierarchy` | 用户分类层次结构视图，方便查询完整的三级分类 |

### 安全策略 (RLS)

所有表都启用了 Row Level Security，确保用户只能访问自己的数据：
- 用户只能查看/修改自己的记录
- 家长角色可以查看关联孩子的数据
- 三级分类表启用完整的 RLS 保护

### 触发器

- `on_auth_user_created`: 新用户注册时自动创建 profile 并初始化默认分类
- `update_*_updated_at`: 自动更新各表的 updated_at 字段
- `on_point_adjustment_created`: 积分调整时自动更新总积分
- `on_redemption_created`: 奖品兑换时自动更新总积分
- `on_daily_record_changed`: 每日记录变化时自动更新总积分

### 默认分类

新用户注册时会自动创建以下默认分类：

**一级分类**：
- 📚 学习
- ⚽ 运动
- 🎨 艺术
- 📌 其他

**二级分类（示例）**：
- 语文、数学、英语（学习分类下）
- 跑步、跳绳、球类（运动分类下）

**三级分类（示例）**：
- 听写、预习、复习、背诵（语文分类下）
- 口算、应用题（数学分类下）

## 数据库迁移

### 从旧版本升级

如果已有旧版本数据库，需要执行以下步骤：

1. 备份现有数据（重要！）
2. 执行 `sql/full-schema.sql`（安全，不会删除现有数据）
3. 验证数据完整性
4. 测试应用功能

### 备份和恢复

#### 备份数据

1. 在 Supabase Dashboard 中，进入 **"Database"** → **"Backups"**
2. 点击 **"Create backup"** 创建手动备份
3. 或者使用 pg_dump 命令行工具：

```bash
pg_dump -h db.<project-ref>.supabase.co -p 5432 -U postgres -d postgres > backup.sql
```

#### 恢复数据

1. 在 Supabase Dashboard 中，进入 **"Database"** → **"Backups"**
2. 选择要恢复的备份
3. 点击 **"Restore"**

## 故障排除

### 问题：无法连接到 Supabase

**可能原因**：
- 环境变量配置错误
- 网络问题
- Supabase 服务暂时不可用

**解决方法**：
- 检查 `.env` 文件中的 URL 和 KEY 是否正确
- 确保 URL 不以 `/` 结尾
- 检查网络连接
- 访问 [Supabase Status](https://status.supabase.com/) 查看服务状态

### 问题：数据库查询失败

**可能原因**：
- SQL Schema 未正确执行
- RLS 策略阻止访问
- 表或字段不存在

**解决方法**：
- 在 SQL Editor 中重新执行 `sql/full-schema.sql`
- 查看浏览器控制台错误信息
- 检查 RLS 策略是否正确配置
- 确认用户已登录

### 问题：认证失败

**可能原因**：
- 邮箱未验证
- 密码错误
- 认证提供商未启用

**解决方法**：
- 确认邮箱认证提供商已启用
- 检查垃圾邮件文件夹是否有验证邮件
- 在开发环境可以暂时禁用邮箱确认
- 重置密码

### 问题：积分计算不正确

**可能原因**：
- 触发器未正确创建
- 旧数据未更新

**解决方法**：
- 执行 `sql/safe-fix-all.sql` 修复
- 检查 point_adjustments 表数据
- 验证触发器是否正常工作

### 问题：新用户没有默认分类

**可能原因**：
- handle_new_user 触发器未创建
- initialize_default_categories_for_user 函数缺失

**解决方法**：
- 执行 `sql/full-schema.sql` 重新创建所有对象
- 手动为用户调用：`SELECT initialize_default_categories_for_user('user-uuid');`

## 性能优化

### 索引

数据库已创建以下索引优化查询性能：
- 所有表的 user_id 字段索引
- 分类关联字段索引
- 日期字段索引
- 状态字段索引

### 查询建议

1. 使用 `user_category_hierarchy` 视图查询分类层次结构
2. 避免 SELECT *，只查询需要的字段
3. 使用 LIMIT 分页大量数据
4. 利用 Supabase 的实时订阅功能

## 安全最佳实践

1. **永远不要**将 service_role key 暴露在前端
2. 始终使用 anon key 进行客户端操作
3. 启用 RLS 策略（本项目已配置）
4. 定期轮换 API 密钥
5. 使用强密码保护 Supabase 账户
6. 启用 2FA 双重验证

## 更多信息

- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase Auth 指南](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [SQL Editor 使用指南](https://supabase.com/docs/guides/database/sql-editor)
- [项目 README](./README.md)
