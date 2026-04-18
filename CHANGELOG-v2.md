# 变更日志 v2 / Changelog v2

> 本文件记录 v1.15.2 起的增量版本更新。  
> 历史版本请参阅 [`CHANGELOG.md`](./CHANGELOG.md)（v1.0.0 – v1.15.1）。
>
> This file tracks incremental updates starting from v1.15.2.  
> For historical versions, see [`CHANGELOG.md`](./CHANGELOG.md) (v1.0.0 – v1.15.1).

---

## [1.15.2] - 2026-04-18

### ✨ Added / 新增

- **Collapsible Turn Groups in Timeline / 时间线可折叠轮次分组**:
  Refactored the "Recent Activity" timeline from a flat segment list into collapsible `<details>` turn groups. Each group is anchored by the user's message and visually titled with a preview of the user input. The latest turn defaults to **open**; historical turns default to **collapsed**, dramatically reducing visual clutter on long conversations.
  将"最近操作"时间线从平铺的 segment 列表重构为可折叠的 `<details>` 轮次分组。每个分组以用户消息为锚点，标题行预览用户输入文本。最新轮次默认**展开**，历史轮次默认**折叠**，极大减少长对话下的视觉噪音。

- **Segment Summary Chips / 分组摘要标签**:
  Each turn header now shows a row of compact, color-coded chips aggregated from GM data within that turn:
  - 🔵 **Model** — dominant model name (filtered `MODEL_PLACEHOLDER_*`)
  - 🟢 **Calls** — number of reasoning calls
  - 🟡 **Tools** — tool invocation count (`🔧N`)
  - 🔴 **Tokens** — total input + output tokens (e.g. `15.2k tok`)
  - 🟤 **Cache** — cache read tokens
  - 🟠 **Credits** — credit consumption (`0.4 cr`)
  - ⚫ **Duration** — wall-clock span between first and last event (`2m14s`)
  
  每个轮次 header 右侧显示从 GM 数据聚合的彩色摘要 chip：模型、调用数、工具数、Token、缓存、积分、耗时。

### ✨ Improved / 改进

- **User Anchor at Bottom / 用户消息移至底部**:
  Within each expanded turn, the user message (turn origin) now renders at the bottom, with the newest AI actions at the top. This matches the visual convention where top = newest, bottom = oldest, making the timeline read naturally from the most recent action downward to the triggering input.
  展开的分组内，用户消息（轮次起点）移到底部，AI 最新操作在顶部。视觉逻辑：顶部 = 最新 → 底部 = 起点，符合从结果向起因的阅读顺序。

### 🗑 Removed / 移除

- **Alias / Placeholder / Basis Tags / 别名类标签**:
  Removed the `Alias (别名)`, `Summary (摘要)`, `Generator (生成器)`, and `Dominant (主模型)` tags from timeline rows. These were legacy indicators from the era before GM provided exact model identification via `responseModel`. Since GM now reliably returns exact model names, these ambiguous "model basis" labels are no longer needed.
  移除时间线行上的"别名""摘要""生成器""主模型"标签。这些是 GM 引入精确 `responseModel` 之前的遗留指示器，现在 GM 已提供精确模型名称，这些模糊的"模型来源"标签不再需要。

### 🎨 Styles / 样式

- **Turn Group CSS / 轮次分组样式**:
  New `.act-tl-turn` / `.act-tl-turn-header` / `.seg-chip-*` CSS system with:
  - Smooth triangle arrow rotation (90° on open)
  - Green border highlight when expanded (`.act-tl-turn[open]`)
  - Hover background feedback
  - Full light theme (`body.vscode-light`) overrides for all 7 chip variants (`model`, `calls`, `tools`, `tok`, `cache`, `credits`, `dur`)
  
  新增可折叠分组 CSS 系统：平滑三角箭头旋转动画、展开态绿色边框高亮、hover 背景反馈，以及浅色主题下全部 7 种 chip 变体的完整适配。

- **Light Theme Fix / 浅色主题修复**:
  Fixed `seg-chip-dur` (duration) and `seg-chip-credits` being invisible on light backgrounds due to missing `body.vscode-light` overrides. Duration now uses `#334155` (dark slate), credits use `var(--lt-orange-text)`.
  修复浅色背景下耗时和积分 chip 不可见的问题，补全缺失的 light theme 覆盖。

### 📊 Stats / 统计

- **Files changed**: 2 (`activity-panel.ts`, `webview-styles.ts`)
- **TypeScript compile**: Zero errors
- **Net change**: ~+100 lines (CSS) / ~+60 lines (render logic) / −30 lines (removed alias tags)
---

## [1.15.3] - 2026-04-18

### 🔬 Breakthrough / 技术突破

- **Per-Step AI Response Extraction / 逐步 AI 回复提取**:
  Discovered that `GetCascadeTrajectory` endpoint's embedded GM data contains `messagePrompts` with complete conversation history, where each SYSTEM message carries a `stepIdx` field. Built a `stepIdx → AI snippet` mapping system that enables each GM call to display its **own** AI response text or tool calls, rather than sharing identical previews.
  发现 `GetCascadeTrajectory` 端点的嵌入式 GM 数据包含完整 messagePrompts，每条 SYSTEM 消息自带 `stepIdx` 字段。建立了 `stepIdx → AI 片段` 映射系统，使每个 GM 调用能显示**自己的** AI 回复文本或工具调用名称。

  **Data Pipeline**:
  ```
  GetCascadeTrajectory → embedded GM → messagePrompts (array[180+])
    → SYSTEM messages with { stepIdx, prompt, toolCalls }
    → extractAISnippetsByStep() → Record<stepIdx, snippet>
    → maybeEnrichCallsFromTrajectory() broadcasts to ALL calls
    → buildGMVirtualPreview() lookups by call.stepIndices
  ```

### ✨ Improved / 改进

- **GM Timeline Row Previews / GM 时间线行预览**:
  - AI text responses now show actual response content (e.g. "OK！", "读完了！v1.15.2...")
  - Tool-call-only steps show `🔧 view_file` instead of generic "GM 调用"
  - Combined steps show text + tool badge: `好的，让我看...  🔧grep_search`
  - Eliminated duplicate metrics in detail text (tokens/TTFT already shown as right-side chips)
  
  AI 文本回复现在显示实际内容，工具调用步骤显示 `🔧 工具名`，组合步骤同时显示文本和工具标记。消除了 detail 与右侧芯片的重复指标。

- **Data Model Upgrade / 数据模型升级**:
  `GMCallEntry.lastAISnippet: string` → `GMCallEntry.aiSnippetsByStep: Record<number, string>` — from single shared string to per-step indexed map, solving the "all rows show same text" problem.
  数据模型从单一共享字符串升级为逐步索引映射，解决了"所有行显示相同文本"的问题。

### 🔧 Tools / 工具

- **`gm-live-watcher.ts` v3**: Real-time GM call monitor with dual-endpoint cross-validation (`GetCascadeTrajectoryGeneratorMetadata` vs `GetCascadeTrajectory`). Displays per-call AI response (📝), thinking preview (🧠), and tool invocations (🔧). Key diagnostic tool for validating data pipeline changes.
  实时 GM 调用监控器，双端点交叉验证，显示每次调用的 AI 回复、思考预览和工具调用。验证数据管道变更的关键诊断工具。

### 📊 Stats / 统计

- **Files changed**: 3 (`gm-tracker.ts`, `activity-tracker.ts`, `diag-scripts/deep-dive/gm-live-watcher.ts`)
- **TypeScript compile**: Zero errors
- **Key discovery**: `GetCascadeTrajectoryGeneratorMetadata` has NO messagePrompts; only `GetCascadeTrajectory` embedded GM has them

---
