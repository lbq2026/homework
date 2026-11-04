# 文档导航

> 当前版本：**v2.2.0**（2026-11-04）｜ 文档入口见下方索引；SQL 脚本单独索引在 [sql/README.md](../sql/README.md)。

## 1. 长期维护文档

| 文档 | 内容 | 何时更新 |
|---|---|---|
| [README.md](../README.md) | 功能特性、快速开始、使用示例、项目结构、贡献指南、版本历史 | 新增/变更用户可见功能、启动方式、版本号 |
| [CODE_WIKI.md](./CODE_WIKI.md) | 架构、模块职责、数据库表/RPC、业务流程、脚本排障矩阵 | 改动模块边界、数据库结构、RPC、关键流程 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本演进 + 开发批次详细记录（附录） | 每次功能合并/修复后追加版本条目 |
| [design-system.md](./design-system.md) | v2.0 亮色乐园设计系统规范（色板/圆角/字体/组件） | 调整 Token 或视觉规范 |
| [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) | Supabase 建库、认证、迁移与故障排除 | 数据库脚本顺序或认证方式变化 |
| [sql/README.md](../sql/README.md) | 12 个 SQL 脚本的分类、执行顺序、存量库排障与一次性脚本说明 | 新增/废弃 SQL 脚本 |

## 2. 设计与实施记录（docs/superpowers）

按「先设计、后计划、再实施」记录，均已落地：

| 日期 | 设计文档 | 实施计划 | 状态 |
|---|---|---|---|
| 2026-10-30 | [家长控制与孩子管理](./superpowers/specs/2026-10-30-parent-controls-design.md) | [实施计划](./superpowers/plans/2026-10-30-parent-controls.md) | ✅ 已实现（v2.1.4） |
| 2026-11-02 | [孩子数据继承（下发复制）](./superpowers/specs/2026-11-02-child-data-inheritance-design.md) | [实施计划](./superpowers/plans/2026-11-02-child-data-inheritance.md) | ✅ 已实现（v2.2.0） |
| 2026-11-03 | [家长手动加减分绑定孩子](./superpowers/specs/2026-11-03-child-points-binding-design.md) | [实施计划](./superpowers/plans/2026-11-03-child-points-binding.md) | ✅ 已实现（v2.2.0） |

> 新增需求时，在 `superpowers/specs/` 与 `superpowers/plans/` 下按 `YYYY-MM-DD-<feature>.md` 命名；完成后在本表补一行，并同步 CHANGELOG/README。

## 3. 历史文档合并说明

- 《项目总览》已并入 [CODE_WIKI.md](./CODE_WIKI.md)（§8 数据库设计 / §8.3 脚本排障矩阵）。
- 《项目历史》已并入 [CHANGELOG.md](./CHANGELOG.md) 附录「开发批次详细记录」。
- 已完成使命的分析/指南类文档与 RLS 历史排障脚本已从工作区移除，需要时可通过 git 历史恢复。

## 4. 维护约定

1. **功能合并**：CHANGELOG 追加版本条目 → README 更新功能/版本历史 → CODE_WIKI 更新模块/数据库 → 涉及脚本时更新 sql/README。
2. **数据库变更**：新增 SQL 脚本必须幂等、自包含、尾部附验证 SQL；家长写孩子数据走 `SECURITY DEFINER` RPC，不放松 RLS。
3. **版本号**：README 顶部、CODE_WIKI 顶部、CHANGELOG 最新条目保持一致。
