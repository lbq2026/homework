# 上传代码至 GitHub · 操作指南

> 项目：小勇士积分王国 · 本地路径：`F:\AI-Center\homework-main`
> 生成时间：2026-08-19 · 状态：**本地仓库已就绪，待关联远程**

---

## ✅ 已完成部分（可直接跳过）

| 步骤 | 状态 | 说明 |
|------|------|------|
| Git 安装检查 | ✅ | Git 2.55.0.windows.3 已安装 |
| 独立仓库初始化 | ✅ | `git init -b main`（在 homework-main 内新建，避免混入父目录其他项目） |
| .gitignore 完善 | ✅ | 忽略 node_modules/dist/.env/.npmrc/.tsbuild/.cache/.workbuddy/临时脚本等 |
| 首次提交 | ✅ | `f952fea` · 143 个文件 · 分支 `main` |

---

## 1️⃣ 前置准备（已满足）

```bash
# 检查 Git 是否安装
git --version

# 检查 GitHub 账号身份（用户名 + 邮箱）
git config --global user.name
git config --global user.email
```

> ⚠️ 当前提交身份为全局占位符 `User / user@example.com`。**建议改成本人信息**，否则 GitHub 无法关联提交记录：
> ```bash
> git config --global user.name "你的GitHub用户名"
> git config --global user.email "你的GitHub邮箱"
> # 改完后再重新提交一次（仅对后续提交生效）
> ```

---

## 2️⃣ 关联远程仓库

在 GitHub 网页新建仓库（`New repository`）：

- **仓库名建议**：`little-warrior-points` 或 `homework-kingdom`（英文，无空格）
- **可见性**：
  - `Private`（推荐）：家庭项目，含业务逻辑，不公开
  - `Public`：想分享给其他家庭使用再选
- **不要勾选** README/.gitignore/LICENSE（本地已有，勾了会产生合并冲突）

创建后在「Quick setup」复制仓库地址（两种格式任选）：

```bash
# HTTPS 格式（推荐，需 Token 认证）
https://github.com/<你的用户名>/<仓库名>.git

# SSH 格式（需先配置 SSH Key）
git@github.com:<你的用户名>/<仓库名>.git
```

然后在项目根目录关联（**二选一**，用 HTTPS 示例）：

```bash
cd F:/AI-Center/homework-main

# HTTPS 方式
git remote add origin https://github.com/<你的用户名>/<仓库名>.git

# 查看是否关联成功
git remote -v
```

> 若提示 `remote origin already exists`（本仓库无旧 origin，正常不会出现），用：
> ```bash
> git remote set-url origin https://github.com/<你的用户名>/<仓库名>.git
> ```

---

## 3️⃣ 推送代码（含认证处理）

```bash
git push -u origin main
```

### 🔑 首次推送的权限 / 身份验证

GitHub 已于 2021-08 起**禁止用账号密码推送**，HTTPS 需使用 **Personal Access Token（PAT）**：

| 方式 | 操作 | 适用 |
|------|------|------|
| **HTTPS + Token**（推荐） | 创建 PAT → push 时用户名填 GitHub 用户名，密码框粘贴 Token | 通用 |
| **SSH Key** | 生成 key → 添加至 GitHub → 用 SSH 地址推送 | 长期稳定 |

**创建 PAT 步骤**：
1. GitHub → 右上角头像 → `Settings`
2. 左侧 `Developer settings` → `Personal access tokens` → `Tokens (classic)` → `Generate new token`
3. 勾选 `repo` 权限（完整仓库读写）
4. 生成后**立即复制**（只显示一次），形如 `ghp_xxxxxxxxxxxxxxxx`
5. 推送时按提示输入：
   ```
   Username: 你的GitHub用户名
   Password: 粘贴 ghp_ 开头的 Token（不会显示，直接回车）
   ```

**SSH Key 方式（可选）**：
```bash
ssh-keygen -t ed25519 -C "你的邮箱"      # 一路回车
cat ~/.ssh/id_ed25519.pub                # 复制公钥
# GitHub → Settings → SSH and GPG keys → New SSH key → 粘贴 → Save
```

### 推送成功后

```bash
# 验证
git remote -v
git log --oneline -1
```

---

## 4️⃣ 日常更新流程

每次改完代码后：

```bash
git add .                                  # 暂存所有改动
git commit -m "描述本次改动"                # 例如：修复 Profile 邮箱溢出
git push                                   # 推送到 GitHub（已设 -u 后无需再带 origin main）
```

**推荐习惯**：
- 提交信息用中文/英文均可，**描述清楚做了什么**，如 `feat: 新增家长控制台`、`fix: 修复邮箱溢出`、`style: 亮色设计系统全站落地`
- 每次只提交**一个逻辑变更**，避免大杂烩提交
- 推之前先 `git status` 确认没有误提交敏感文件

---

## 5️⃣ 忽略文件配置（.gitignore）

已配置内容（见项目根 `.gitignore`）：

| 类别 | 规则 | 原因 |
|------|------|------|
| 依赖 | `node_modules/` | 体积大，用 `pnpm install` 重建 |
| 构建产物 | `dist/` `build/` | 可随时重新构建 |
| **敏感配置** | **`.env` `.env.local`** | **含 Supabase 密钥，严禁入库** |
| 本地环境 | `.npmrc`（pnpm store 路径） | 机器相关 |
| 缓存 | `.tsbuild/` `.cache/` | 构建缓存 |
| 项目数据 | `.workbuddy/` | 本地记忆/任务数据 |
| 临时文件 | `*.tmp` `*.log` `*.tgz` `parser_fix.js` `univ_check.js` | 模板遗留/临时脚本 |
| 本地数据库 | `_sqlite_test.db` `*.db` | 测试数据 |

> 🔐 **安全提醒**：推送前务必确认 `.env` 未被跟踪：
> ```bash
> git ls-files | grep "^\.env$"   # 无输出 = 安全
> ```

---

## 📌 当前待办

只差一步：**把 GitHub 仓库 URL 发给我**（或告诉我仓库名/用户名），即可执行：

```bash
git remote add origin <你的URL>
git push -u origin main
```
