# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-13

### Added
- 积分管理页面
  - 新增 PointManagement.tsx 视图组件
  - 手动加分和扣分功能
  - 积分调整记录展示
  - 调整记录编辑和删除功能
  - 积分统计卡片（累计加分、累计扣分）
  - 按类型筛选调整记录（全部/加分/扣分）
- 新增自定义 Hook
  - useDataBackup.ts - 数据备份 Hook
  - useSyncedAppState.ts - 同步应用状态 Hook
- 新增组件
  - IconPicker.tsx - 图标选择器组件
- 新增 SQL 修复脚本
  - sql/fix-infinite-recursion.sql - 修复无限递归问题
  - sql/fix-missing-functions.sql - 修复缺失的函数
  - sql/safe-fix-all.sql - 安全修复所有问题

### Changed
- 任务分类系统优化
  - 三级分类结构改进
  - 分类管理界面优化
- 积分调整功能增强
  - 支持编辑和删除调整记录
  - 调整记录时间戳优化
- 项目结构优化
  - hooks 目录新增数据同步相关 Hook
  - components 目录新增图标选择器

### Fixed
- 数据库递归查询问题修复
- 缺失数据库函数修复
- 积分同步逻辑优化
- 数据备份和恢复功能改进

### Security
- 积分调整记录操作权限验证
- 三级分类表 RLS 策略优化

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

[Unreleased]: https://github.com/username/repo/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/username/repo/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/username/repo/releases/tag/v1.0.0
