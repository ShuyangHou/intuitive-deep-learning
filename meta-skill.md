---
name: create-interactive-learning-module
description: 为 Intuitive Deep Learning 新建或扩展 React + TypeScript 交互式教学模块。
---

# 新建交互式教学模块

## 先确认当前规范

开始修改前，读取当前工作树中的以下文件；以代码现状为准，不凭记忆套模板：

- `modules/Loss-Guide-React/`、`modules/Hyperparameter-Module/`：参考 React/TypeScript 目录、页面组合、内容块和交互结构。借鉴结构，不照抄内容密度、私有样式或已有缺陷。
- `modules/shared/react/index.ts` 与 `modules/shared/react/routing/UiKitPage.tsx`：确认已有共享组件及其实际 API；也要 查看`/shared/ui-kit` 。
- `src/app/modules.tsx`、`src/app/routes.tsx`：确认完整模块与子模块的当前注册方式。

遵守设计原则：

- **结构先行、局部生成**：先和用户确定教学目标、子模块边界与顺序，再一次完成一个子模块，不直接生成整张大页面。
- **一个模块解决一个难点**：从具体问题出发，通过操作暴露原有直觉或方法的不足，再引入真正需要的概念。
- **按需交互**：交互只是帮助学生更好理解知识的手段，不是目标。默认优先设计合适的交互；如果没有必要交互，或交互反而增加理解成本，先向用户说明理由并确认，确认后改用更清楚的静态讲解、示例或练习。
- **无意识设计**：让操作方式直接映射正在学习的概念，使学生无需先学习界面规则，仅凭对象本身的视觉线索和一句简短提示，就能自然理解下一步该做什么；如果必须额外讲解按钮含义、操作流程或复杂控制，优先简化界面或重新设计交互。
- **渐进披露**：每阶段尽可能只增加一个主要概念或变量，在问题和现象出现后再补充术语、公式与实现细节。
- **直觉、边界与迁移优先**：优先让学生理解方法解决什么问题、为何有效、何时不适用，并能在新情境中做判断；根据作答与操作表现调整提示强度和解释深度。

判断一个模块能否作为实现参考时，以它是否使用 React、TypeScript 和 `modules/shared/react` 为准。React 参考模块也只是结构样例，不继承“任意非空回答即完成”或“被动页尾即完成”等缺陷。

本流程默认只覆盖当前 React/Vite 开发应用。除非用户明确要求，不要顺带修改 `intro.html`、CourseMap、`modules/index.json` 或旧模块元数据。

## 1. 锁定教学范围

先把用户需求整理成一份简短教学契约。需求已经明确时直接复述确认；主题或边界会显著改变实现时，只追问最关键的问题。

```text
主题：
学习结果：完成后，零基础学生能做出什么可观察的判断或操作？
前置知识：默认仅具备高中数学与基础计算机常识。
不包含：
子模块草案：2–4 个，每个一句目标。
```

一个顶层模块只解决一个主要概念难点。教学子模块控制在 2–4 个，结尾或资源页不计入数量；默认采用三段：

1. 在具体情境中建立直觉。
2. 通过比较或实验理解机制。
3. 在新情境中应用、辨析并认识限制。

如果压缩后仍超过 4 个独立学习目标、标题需要连接多个并列主题、途中明显切换前置知识层级，或一道综合迁移题无法覆盖全部内容，应先建议拆成多个顶层模块，并给出模块名称、顺序和依赖关系；确认拆分后，完成并注册第一个顶层模块，再开始下一个。

## 2. 设计每个子模块

每个子模块只增加一个主要概念或变量，并明确六件事：

```text
要回答的问题 → 学习者的操作 → 唯一主要变量 → 可见现象 → 得出的结论 → 证明理解的检查点
```

按上面的“预测 → 操作 → 观察 → 反馈 → 判断”闭环组织内容，并用答题、达成实验目标或换情境判断来完成本段。

不要把“点击过按钮”“拖动过滑块”当作理解完成。`onComplete` 必须由有意义的结果触发，例如达成目标、正确解释现象或通过检查题。交互应服务于概念，不要为了视觉效果加入无助于判断的三维图、动画或复杂控制。

## 3. Shared 优先

写组件或 CSS 前，先在 shared 的公共出口和 UI Kit 中按“语义”查找，而不是按外观重新制作。

- 页面与流程优先复用 `ModuleShell`、`LessonFlow`、`ContentBlock`、`LessonStage`、`LessonFooter`。
- 控件优先复用 `Button`、`RangeControl`、`Select`、`TextInput`、`Switch`。
- 教学与反馈优先复用 `Question`、`FormulaBlock`、`ValueTile`、`Callout`、`NoticeStrip`、`Feedback`、`AttentionHint`。
- 可视化优先复用 `FunctionPlot`、`PlotlyChart`、`EChartsChart` 等 shared wrapper，不要在新模块直接接入旧式全局脚本。
- 优先从 `../shared/react` 或 `../../shared/react` 的公共出口导入，不要重复导入 `styles.css`。

缺失能力若可能被第二个模块复用，应扩展 shared，并同步公共出口与 UI Kit；只有与本课高度绑定、其他模块很难复用的结构才留在模块内，例如专属棋盘、小游戏、领域示意图或特殊 Canvas/SVG 舞台。

确需私有 CSS 时：

- 只处理该模块独有的布局、状态和可视化；颜色、字体、圆角、阴影继续使用 `--ui-*` token。
- 用唯一模块根类约束所有私有选择器，并为私有类、模块自建变量和 keyframes 使用同一个前缀；允许使用已经确认的 `--ui-*` token 和 shared 公共变量。
- 禁止未限定的 `:root`、`html`、`body`、`*`、裸元素或 `.card`、`.button` 等全局选择器；模块根内的通配或裸元素选择器也应谨慎使用。
- 不要直接重定义 `.edu-*`、`.dl-*` 或猜测 shared 内部类名；优先向组件传 `className` 或增加私有 wrapper。
- 补齐窄屏、键盘焦点和 `prefers-reduced-motion`。普通 CSS 会进入同一全局空间，页面内导入不等于样式隔离。

## 4. 一次完成一个子模块

采用轻量结构，按需要增加目录，不预建空文件：

```text
modules/<ModuleName>/
├── <ModuleName>Page.tsx
├── blocks/
│   ├── <First>Block.tsx
│   └── <ModuleName>LessonFooter.tsx
├── services/ 或 domain/        # 仅在确有请求或纯计算时
└── <module-prefix>.css         # 仅在 shared 无法表达专属交互时
```

页面组件只负责组合：使用 `ModuleShell` 包住 `LessonFlow`，把稳定的 `LessonFlowStep[]` 常量放在组件外。每个教学块独立接收 `onComplete`，复杂算法、请求和可视化生命周期不要堆进 Page。创建 Page 后先按下一节要求注册完整模块，让后续每个 Block 都能从完整流程和独立入口访问。

严格按以下循环推进，当前子模块完成后再做下一个：

1. 实现一个 Block 及其真实完成条件。
2. 把它接入 Page 的 `LessonFlow`。
3. 立即注册它的独立预览路由。
4. 完成当前 Block 后，再开始下一个 Block。

并行工作只用于只读盘点，不要让多个智能体同时编辑同一模块的不同子模块。

为 `LessonFlow`、step 和每道可恢复题目使用唯一、稳定且带模块语义的 key。自定义可恢复交互复用 shared telemetry API 和稳定的 state key，不重复上报同一动作。只有流程或判题语义改变、旧状态不再兼容时才升级 key 版本。`completesLesson` 不会因 step 被渲染而自动生效：最后一个真实考核 Block 必须调用 `complete()`，且对应 step 设置 `completesLesson: true`，之后再展示被动的 `LessonFooter`。不要在 mount effect 或状态恢复完成前自动触发完成。定时器、监听器、RAF 和第三方实例必须在卸载时清理。

## 5. 注册到 React/Vite 应用

完整模块在 `src/app/modules.tsx` 中注册：

1. 导入 Page。
2. 向 `migratedModules` 添加唯一的 `id`、`title`、`description`、`path`、`badge` 和 `element`。
3. 使用稳定的小写短横线路径，例如 `/modules/<module-slug>`。

`src/app/routes.tsx` 会自动把 `migratedModules` 展开为完整模块路由，不要重复手写同一路由。

每个子模块都要在 `src/app/routes.tsx` 完成四项注册，缺一不可：

1. 导入 Block。
2. 向 `blockPreviews` 添加唯一元数据与 `/dev/blocks/<module-slug>/<block-slug>` 路径。
3. 创建 `BlockPreview` 包装组件；有 `onComplete` 的教学 Block 才传入预览上下文的 `complete`，被动 Footer 或 Resources 直接渲染。
4. 向 `appRoutes` 添加对应预览路由。

完成实现与注册后停止，交由人工检验。
