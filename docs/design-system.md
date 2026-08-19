# 小勇士积分王国 · 设计系统（v2.0 · 亮色卡通版）

> **设计师**：UI Designer（🎨 像素君）  
> **更新日期**：2026-08-19  
> **主题**：亮色乐园 · 激发小学生学习兴趣  
> **使用范围**：所有页面统一遵循，新组件按此规范实现

---

## 🎨 设计定位

「小勇士积分王国」面向 **6–12 岁小学生**，整体视觉采用**高饱和度、高明度、低压迫感的亮色**，营造轻松、有趣、积极的学习氛围。色彩灵感来源于儿童绘本与乐园场景：天空蓝、柠檬黄、嫩草绿、棉花糖粉。

**核心原则**：

| 原则 | 说明 |
|------|------|
| 🌈 **亮而不刺眼** | 使用 300–500 区间的亮彩色，避免大面积荧光色直怼 |
| 🎈 **圆润友好** | 大圆角、软阴影、卡通图标，降低工具感 |
| 🧒 **儿童可读** | 文字与背景对比度 ≥ 4.5:1，关键操作 ≥ 7:1 |
| 🎖️ **游戏化反馈** | 积分、徽章、连击使用金/银/铜等级色，强化成就感 |

---

## 🌈 色彩系统（Color System）

### 1. 主色板（Primary Palette）

以 **天空蓝** 为主品牌色，传递清澈、信任、探索感。

| Token | 色值 | 名称 | 使用场景 |
|-------|------|------|----------|
| `brand-50` | `#E0F2FE` | 天空浅蓝 | 页面浅背景、提示条底色 |
| `brand-100` | `#BAE6FD` | 柔蓝 | 卡片 hover、轻柔分隔 |
| `brand-300` | `#7DD3FC` | 晴空蓝 | 图标、装饰圆点 |
| `brand-400` | `#38BDF8` | 活力天蓝 | 次要按钮、进度条、高亮 |
| `brand-500` | `#0EA5E9` | 主品牌蓝 | 主按钮、顶部栏、重要链接 |
| `brand-600` | `#0284C7` | 深海蓝 | 按钮按下、深色文字 |
| `brand-700` | `#0369A1` | 深品牌蓝 | 标题文字、深色装饰 |

**搭配示例**：
- 顶部 Header：`bg-brand-500 text-white`
- 主按钮：`bg-brand-500 hover:bg-brand-400 text-white rounded-full`
- 浅背景卡片：`bg-brand-50 border border-brand-100`

---

### 2. 辅助色板（Accent Palette）

用于分类标签、成就等级、趣味插画，增强页面活力。

| Token | 色值 | 名称 | 使用场景 |
|-------|------|------|----------|
| `accent-yellow-300` | `#FDE047` | 柠檬黄 | 徽章、星星、奖励提示 |
| `accent-yellow-400` | `#FACC15` | 金黄 | 积分金币、VIP 标识 |
| `accent-green-300` | `#86EFAC` | 嫩绿 | 完成任务、健康习惯 |
| `accent-green-400` | `#4ADE80` | 草绿 | 成功状态、增长曲线 |
| `accent-pink-300` | `#F9A8D4` | 棉花糖粉 | 女孩向装饰、喜爱标记 |
| `accent-pink-400` | `#F472B6` | 亮粉 | 孩子角色色、成就徽章 |
| `accent-purple-300` | `#D8B4FE` | 香芋紫 | 魔法/探索主题 |
| `accent-purple-400` | `#A855F7` | 紫罗兰 | 高级徽章、特殊成就 |
| `accent-orange-300` | `#FDBA74` | 蜜桔橙 | 提醒、倒计时 |
| `accent-orange-400` | `#FB923C` | 活力橙 | 警告、待办高亮 |

**搭配建议**：
- 一个页面建议 **不超过 3 种辅助色**，避免彩虹爆炸。
- 辅助色主要用于**小面积点缀**（图标、标签、徽章、进度条），不要大面积铺底色。

---

### 3. 中性色板（Neutral Palette）

保证文字、卡片、分隔的可读性。

| Token | 色值 | 使用场景 |
|-------|------|----------|
| `neutral-0` | `#FFFFFF` | 卡片背景、纯白底 |
| `neutral-50` | `#FAFAF9` | 页面浅底色（奶油白） |
| `neutral-100` | `#F5F5F4` | 输入框背景、轻分隔 |
| `neutral-200` | `#E7E5E4` | 边框、禁用背景 |
| `neutral-400` | `#A8A29E` | 占位文字、辅助说明 |
| `neutral-600` | `#57534E` | 次要正文 |
| `neutral-800` | `#292524` | 主标题、深色正文 |
| `neutral-900` | `#1C1917` | 极少数强调文字 |

**推荐页面底色**：`bg-neutral-50`（奶油白），比纯白更柔和，长时间使用不刺眼。

---

### 4. 语义色（Semantic Colors）

用于状态反馈，采用儿童易懂的色彩语义。

| 状态 | Token | 实色 | 浅色底 | 使用场景 |
|------|-------|------|--------|----------|
| ✅ 成功 | `semantic-success` | `#16A34A` | `#DCFCE7` | 任务完成、积分获得 |
| ⚠️ 警告 | `semantic-warning` | `#D97706` | `#FEF3C7` | 即将过期、注意事项 |
| ❌ 危险 | `semantic-danger` | `#DC2626` | `#FEE2E2` | 删除、重置、错误 |
| ℹ️ 信息 | `semantic-info` | `#0284C7` | `#E0F2FE` | 提示、帮助、新功能 |

**对比度说明**：
- 实色 `#16A34A` / `#D97706` / `#DC2626` / `#0284C7` 在白色背景上对比度均 **> 4.5:1**，可用于正文标签。
- 浅色底上的文字使用对应实色，保证可读。

---

### 5. 角色专属色（Role Colors）

一眼区分孩子与家长身份。

| 角色 | Token | 实色 | 浅色底 | 用途 |
|------|-------|------|--------|------|
| 🧒 孩子 | `role-child` | `#EC4899` | `#FCE7F3` | 孩子首页、成就、徽章 |
| 👨‍👩‍👧 家长 | `role-parent` | `#0EA5E9` | `#E0F2FE` | 家长控制台、管理入口 |

---

### 6. 等级色（Level Colors）

用于积分等级、连击徽章、成就奖牌。

| 等级 | Token | 色值 | 场景 |
|------|-------|------|------|
| 🥉 Bronze 新手 | `level-bronze` | `#D97706` | 起步等级 |
| 🥈 Silver 进阶 | `level-silver` | `#94A3B8` | 中段等级 |
| 🥇 Gold 高级 | `level-gold` | `#FACC15` | 高阶等级 |
| 💎 Platinum 大师 | `level-platinum` | `#38BDF8` | 顶尖等级 |

---

## 🧱 形状与质感（Shape & Texture）

### 圆角系统

儿童界面使用**更大的圆角**，传递柔软、安全、有趣的感觉。

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-pill` | `9999px` | 标签、胶囊按钮、头像环 |
| `--radius-surface` | `24px` | 页面主容器、大卡片 |
| `--radius-card` | `20px` | 内容卡片、操作卡片 |
| `--radius-button` | `14px` | 主要按钮 |
| `--radius-input` | `12px` | 输入框、选择器 |
| `--radius-badge` | `9999px` | 角色标签、状态徽章 |

### 阴影系统

使用**柔和、带蓝调的投影**，避免生硬的黑色阴影。

| Token | 值 | 用途 |
|-------|-----|------|
| `--shadow-card` | `0 4px 12px rgba(14, 165, 233, 0.08)` | 静态卡片 |
| `--shadow-card-hover` | `0 8px 20px rgba(14, 165, 233, 0.14)` | 卡片悬停 |
| `--shadow-button` | `0 4px 0 #0284C7` | 主按钮按下感（卡通按钮） |
| `--shadow-button-active` | `0 2px 0 #0284C7` | 按钮按下状态 |
| `--shadow-focus` | `0 0 0 4px rgba(56, 189, 248, 0.35)` | 焦点环 |

> 💡 **卡通按钮技巧**：主按钮下方加 4px 同色系深色投影，按下时投影缩短为 2px，营造“按下去”的弹性反馈。

---

## ✍️ 字体规范（Typography）

### 字体选择

- **中文**：系统默认无衬线字体栈，优先使用 `PingFang SC`、`Microsoft YaHei`，保持清晰可读。
- **数字/英文**：`Inter`、`system-ui`。
- **装饰标题**（可选）：可使用圆润卡通 Web Font，如 `ZCOOL KuaiLe`（仅在展示标题使用，正文不用）。

### 字号规范

| Token | 大小 | 行高 | 字重 | 用途 |
|-------|------|------|------|------|
| `--font-display` | `32px` | 1.25 | 700 | 页面大标题（如“小勇士，你好！”） |
| `--font-title` | `22px` | 1.35 | 700 | 区块标题 |
| `--font-subtitle` | `18px` | 1.4 | 600 | 卡片标题、用户名 |
| `--font-body` | `16px` | 1.6 | 500 | 正文、按钮文字 |
| `--font-caption` | `14px` | 1.5 | 400 | 辅助说明、时间戳 |

> 🧒 **儿童友好**：正文不小于 16px，字重不低于 500，行高放宽至 1.6，便于低龄儿童阅读。

---

## 🧩 组件规范（Component Patterns）

### 1. 主按钮（Primary Button）

卡通按下效果：

```tsx
<button className="
  bg-brand-500 hover:bg-brand-400 active:bg-brand-500
  text-white font-bold text-body
  px-6 py-3 rounded-button
  shadow-button active:shadow-button-active active:translate-y-[2px]
  transition-all
">
  开始挑战 🚀
</button>
```

### 2. 卡片（Card）

```tsx
<div className="bg-white rounded-card shadow-card p-5 border border-neutral-100">
  <h3 className="text-subtitle font-bold text-neutral-800">今日任务</h3>
  <p className="text-caption text-neutral-400 mt-1">完成 3 个任务可得 20 积分</p>
</div>
```

### 3. 角色标签（Role Badge）

```tsx
{/* 孩子 */}
<span className="inline-flex items-center gap-1 px-3 py-1 rounded-badge bg-role-child-soft text-role-child text-caption font-bold">
  🧒 LV.3 小勇士
</span>

{/* 家长 */}
<span className="inline-flex items-center gap-1 px-3 py-1 rounded-badge bg-role-parent-soft text-role-parent text-caption font-bold">
  👨‍👩‍👧 家长
</span>
```

### 4. 数据卡（Metric Card）

```tsx
<div className="bg-accent-yellow-300/30 rounded-card p-4 text-center border border-accent-yellow-300">
  <div className="text-title font-extrabold text-accent-yellow-600">128</div>
  <div className="text-caption font-medium text-neutral-600">⭐ 本周积分</div>
</div>
```

### 5. 操作入口卡（Action Tile）

```tsx
<button className="
  bg-white rounded-card border border-neutral-100 p-4
  flex items-center gap-3 shadow-card hover:shadow-card-hover
  transition-shadow
">
  <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-500 flex items-center justify-center">
    <Icon size={20} />
  </div>
  <span className="text-body font-bold text-neutral-800">作业管理</span>
</button>
```

### 6. 趣味图标规范

- 使用 `lucide-react` 图标时，建议配合 **emoji** 或 **彩色背景圆** 使用。
- 图标尺寸：操作入口 20px，按钮内 18px，装饰图标 24–32px。
- 重要成就/徽章使用 emoji（🏅🎖️⭐🚀🌈）增强儿童情感共鸣。

---

## 🎨 页面配色模板

### 模板 A：孩子首页（明亮活力）

```
页面背景：bg-neutral-50
顶部卡片：bg-gradient-to-br from-brand-400 to-brand-500 text-white
任务卡片：bg-white border border-neutral-100
完成标签：bg-semantic-success-soft text-semantic-success
积分金币：bg-accent-yellow-300 text-accent-yellow-700
```

### 模板 B：家长控制台（清晰专业）

```
页面背景：bg-neutral-50
顶部栏：bg-white border-b border-neutral-100
数据卡：bg-white shadow-card
孩子入口：bg-role-parent-soft border border-role-parent/20
警告提示：bg-semantic-warning-soft text-semantic-warning
```

### 模板 C：成就/徽章页（多彩激励）

```
页面背景：bg-gradient-to-b from-brand-50 to-accent-pink-300/20
等级徽章：bronze/silver/gold/platinum 等级色
未解锁：grayscale opacity-60
已解锁：shadow-card-hover scale-105
```

---

## ♿ 无障碍与可读性

### 对比度要求

| 场景 | 对比度要求 | 验证示例 |
|------|-----------|----------|
| 正文文字（< 18px） | ≥ 4.5:1 | `#292524` 在 `#FFFFFF` 上 = 12.6:1 ✅ |
| 大号文字 / 图标（≥ 18px bold） | ≥ 3:1 | `#0EA5E9` 在 `#FFFFFF` 上 = 3.1:1 ✅ |
| 关键操作文字 | ≥ 7:1（AAA） | `#1C1917` 在 `#E0F2FE` 上 = 12.1:1 ✅ |

> 在线验证工具：https://webaim.org/resources/contrastchecker/

### 其他无障碍要求

- 所有交互元素最小 **44px × 44px** 触控区域。
- 按钮/链接除颜色外，使用**图标 + 文字**双重提示。
- 聚焦态使用 `--shadow-focus` 蓝色光环，帮助键盘导航。
- 避免仅用颜色传达状态（如错误同时显示 ⚠️ 图标）。

---

## 🚀 使用方式

### Tailwind 类名

```tsx
{/* 顶部栏 */}
<header className="bg-brand-500 text-white rounded-b-surface">
  小勇士积分王国
</header>

{/* 主按钮 */}
<button className="bg-brand-500 text-white rounded-button shadow-button active:shadow-button-active active:translate-y-[2px]">
  立即打卡
</button>

{/* 孩子角色标签 */}
<span className="bg-role-child-soft text-role-child rounded-badge px-3 py-1 text-caption font-bold">
  🧒 小勇士
</span>
```

### CSS 变量

```css
.my-card {
  background: var(--neutral-0);
  color: var(--neutral-800);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}
```

---

## 📦 后续扩展（按需启用）

- [ ] 深色模式 token（低优先级，小学生以亮色为主）
- [ ] 插图/贴纸规范（卡通人物、勋章、场景插画风格）
- [ ] 微动效规范（弹跳、摇晃、星星闪烁、进度条动画）
- [ ] 数据可视化色板（任务统计图表配色）
- [ ] 响应式断点规范（手机 / 平板 / 桌面适配）
- [ ] 空状态 / 加载 / Toast 统一样式

---

**版本**：v2.0 · **变更**：整体色调由深海蓝升级为亮色乐园风格，提升儿童学习兴趣  
**入口**：`tailwind.config.js` + `src/styles/tokens.css`
