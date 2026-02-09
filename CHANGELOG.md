# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**注意：此文件由自动化工具生成，请勿手动编辑。**

## [Unreleased]

### Added
- 新功能将在此处列出

### Changed
- 变更将在此处列出

### Deprecated
- 弃用功能将在此处列出

### Removed
- 移除功能将在此处列出

### Fixed
- 修复 `useAuth` 中 `expiresIn` 属性的 TypeScript 类型错误
- 修复 `Settings` 和 `Profile` 组件中未使用变量/导入的警告
- 修复 `profiles` 表查询时使用 `.maybeSingle()` 替代 `.single()` 避免记录不存在时报错
- 添加自动创建用户 profile 的逻辑，提升首次使用体验

### Security
- 在 Supabase Schema 中添加 `Users can insert own profile` RLS 策略，允许用户创建自己的 profile 记录

## [1.0.0] - 2026-02-05

### Added
- 初始版本发布
- 任务管理功能（创建、编辑、删除任务）
- 任务添加到今日计划
- 任务完成状态切换
- 一键完成所有任务
- 积分系统
  - 完成任务获得积分
  - 实时积分显示
  - 积分历史记录
- 奖品系统
  - 自定义奖品库
  - 使用积分兑换奖品
  - 兑换记录追踪
- 成就徽章系统
  - 多种成就徽章解锁
  - 连续完成任务统计
  - 分类任务统计
- 用户认证
  - 邮箱密码登录
  - 注册功能
- Supabase 云端同步
- 本地数据存储支持
- 数据管理
  - 导出应用数据
  - 导入恢复数据
  - 重置今日任务
  - 清空所有数据
- 音效反馈
- Toast 通知系统
- 响应式设计
- 移动端优化

### Security
- Supabase Row Level Security (RLS) 策略
- 用户数据隔离保护

[Unreleased]: https://github.com/username/repo/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/username/repo/releases/tag/v1.0.0
