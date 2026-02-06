# Supabase 设置指南

## 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com/) 并注册/登录
2. 点击 "New Project" 创建新项目
3. 填写项目名称和密码，等待项目创建完成

## 2. 获取 API 密钥

1. 进入项目 Dashboard
2. 点击左侧菜单 "Project Settings" → "API"
3. 复制以下信息：
   - **Project URL**: `https://<your-project>.supabase.co`
   - **anon public**: `eyJhbGciOiJIUzI1NiIs...`

## 3. 配置环境变量

1. 在项目根目录创建 `.env` 文件：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入你的 Supabase 信息：
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 4. 创建数据库表

1. 在 Supabase Dashboard 中，点击左侧 "SQL Editor"
2. 创建新查询，粘贴 `supabase-schema.sql` 文件中的全部内容
3. 点击 "Run" 执行 SQL

或者使用以下简化命令：

```sql
-- 执行完整的 schema 创建
-- 见 supabase-schema.sql 文件
```

## 5. 配置认证（可选）

### 邮箱认证（默认已启用）
1. 进入 "Authentication" → "Providers"
2. 确保 "Email" 提供商已启用

### Google 登录（可选）
1. 进入 "Authentication" → "Providers"
2. 启用 "Google"
3. 在 [Google Cloud Console](https://console.cloud.google.com/) 创建 OAuth 凭据
4. 填写 Client ID 和 Client Secret

## 6. 启动应用

```bash
npm run dev
```

## 数据库 Schema 说明

### 表结构

| 表名 | 说明 |
|------|------|
| `profiles` | 用户资料，与 auth.users 一对一关联 |
| `tasks` | 作业任务库 |
| `daily_records` | 每日作业完成记录 |
| `rewards` | 奖品库 |
| `redemptions` | 奖品兑换记录 |
| `badges` | 用户解锁的徽章记录 |

### 安全策略 (RLS)

所有表都启用了 Row Level Security，确保用户只能访问自己的数据：
- 用户只能查看/修改自己的记录
- 家长角色可以查看关联孩子的数据

## 故障排除

### 问题：无法连接到 Supabase
- 检查 `.env` 文件中的 URL 和 KEY 是否正确
- 确保网络可以访问 Supabase 服务

### 问题：数据库查询失败
- 检查 SQL Schema 是否正确执行
- 查看浏览器控制台错误信息
- 检查 RLS 策略是否正确配置

### 问题：认证失败
- 确认邮箱认证提供商已启用
- 检查垃圾邮件文件夹是否有验证邮件

## 更多信息

- [Supabase 文档](https://supabase.com/docs)
- [Supabase Auth 指南](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
