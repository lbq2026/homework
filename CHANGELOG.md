# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **积分管理功能**
  - 支持手动增加积分并注明原因（如：额外奖励、帮助家长等）
  - 支持手动扣除积分并注明原因（如：违反约定、作业质量不佳等）
  - 积分调整历史记录查看，支持按全部/加分/扣分筛选
  - 积分统计（累计加分、累计扣分）
  - **积分调整与账户绑定**，自动汇总至总积分，支持云端同步
  - 新增 `point_adjustments` 数据表用于存储积分调整记录
- **用户认证增强**
  - 新增手机号登录功能
  - 支持记住登录状态（30天）
- **云端备份功能**
  - 支持创建云端备份
  - 支持从云端恢复数据
  - 查看历史备份列表
  - 新增 `backups` 数据表用于存储云端备份
- **个人中心**
  - 用户资料展示与编辑
  - 账户安全设置（修改密码、绑定邮箱/手机号）
  - 数据同步状态显示

### Changed
- **积分管理入口迁移**：从设置页面移至个人中心的总积分卡片
- **数据同步优化**：使用 `useSyncedAppState` Hook 统一管理本地和云端数据同步

### Fixed
- 修复 `useAuth` 中 `expiresIn` 属性的 TypeScript 类型错误
- 修复 `Settings` 和 `Profile` 组件中未使用变量/导入的警告
- 修复 `profiles` 表查询时使用 `.maybeSingle()` 替代 `.single()` 避免记录不存在时报错
- 修复用户注册时自动创建 profile 记录失败的问题

### Security
- 在 Supabase Schema 中添加 `Users can insert own profile` RLS 策略，允许用户创建自己的 profile 记录
- 添加 `point_adjustments` 表的 RLS 策略，确保用户只能查看和操作自己的积分调整记录

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

[Unreleased]: https://github.com/lbq2026/homework/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/lbq2026/homework/releases/tag/v1.0.0
