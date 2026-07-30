# LaTeX 公式渲染与悬浮解释接入说明

本文只记录本次和 LaTeX 公式渲染、公式片段解释相关的改动，以及后续如何继续插入可解释公式。

## 本次新增内容

### 静态 HTML 公式演示模块

目录：`modules/Formula-Tooltip-Lab/`

主要文件：

- `index.html`
  - 展示一个带 L2 正则项的训练目标公式。
  - 每个关键公式片段都可以通过鼠标悬浮、点击或键盘聚焦查看含义。
- `style.css`
  - 保持项目现有教学模块风格：浅色公式卡片、深蓝公式主体、橙色正则项强调。
- `script.js`
  - MathLive 加载完成后，把 `data-latex` 写入只读 `math-field`。
- `info.json`、`module.json`
  - 模块元信息，用于模块索引和课程入口识别。

静态模块可作为旧 HTML 模块接入公式渲染的参考实现。

### React 公式演示模块

目录：`modules/Formula-Tooltip-React/`

主要文件：

- `FormulaTooltipPage.tsx`
  - React 版公式演示页面。
  - 可通过 Vite 路由 `/modules/formula-tooltip-react` 访问。
- `formula-tooltip-react.css`
  - React 公式展示和 tooltip 样式。
- `index.html`
  - 静态模块索引用的桥接页，提示实际 React 入口。
- `info.json`
  - 模块元信息。

React 模块适合作为后续新模块或 `Loss-Guide-React` 继续扩展公式说明的主要参考。

### 共享 MathLive 支撑文件

相关文件：

- `modules/shared/mathlive-loader.js`
  - 静态 HTML 模块使用的 MathLive 动态加载器。
  - 从本地 `modules/shared/vendor/mathlive/mathlive.min.mjs` 加载 MathLive。
- `modules/shared/react/styles.css`
  - develop 体系的统一设计系统样式。
  - 静态公式演示页也直接复用它，不再依赖已移除的旧 `base.css` 和 `module-components.css`。
- `modules/shared/vendor/mathlive/`
  - 本地 vendor 化的 MathLive 包资源。
  - 包含 `mathlive.min.mjs`、`mathlive-fonts.css`、字体文件等。
- `modules/shared/react/learning/MathFormulaBlock.tsx`
  - React 共享公式组件。
  - 提供 `MathFormulaBlock`、`MathFormulaTerm`、`MathFormulaStatic`。
- `src/types/math-field.d.ts`
  - 给 JSX 里的 `<math-field>` 自定义元素补类型。
- `src/types/vendor-modules.d.ts`
  - 给动态导入 `.mjs` vendor 文件补类型声明。

### 路由和索引更新

相关文件：

- `src/App.tsx`
  - 引入 MathLive 字体 CSS。
- `src/app/modules.tsx`
  - 注册 React 公式模块入口 `/modules/formula-tooltip-react`。
- `modules/shared/react/index.ts`
  - 导出 `MathFormulaBlock` 相关组件。
- `tsconfig.json`
  - 把公式 React 模块纳入类型检查范围。
- `modules/index.json`
  - 新增 `Formula-Tooltip-Lab` 和 `Formula-Tooltip-React`。

## 使用的 LaTeX 渲染器

本次采用 **MathLive**。

选择原因：

- MathLive 提供 `<math-field>` Web Component，可以直接渲染 LaTeX。
- 可以设置为只读模式，用作专业公式展示器。
- 每个公式片段都能单独渲染，再由外层元素承载 tooltip。
- 很适合教育场景中“解释公式局部含义”的需求。
- 相比 KaTeX/MathJax，不需要额外解析渲染后的复杂 DOM，后续维护更轻。

本次不是把整条公式一次性渲染成一个大块，而是把公式拆成语义片段。例如：

- `W^{*}`：训练得到的最优权重
- `\underset{W}{\operatorname{arg\,min}}`：在所有候选权重中寻找目标函数最小的一组
- `\operatorname{Loss}`：损失函数
- `y`：真实值
- `\hat{y}`：预测值
- `\lambda`：正则化强度
- `\lVert W\rVert_2^2`：L2 正则项

这样用户停在哪一段，页面就解释哪一段。

## 静态 HTML 模块如何插入公式

适用于 `modules/<ModuleName>/index.html + style.css + script.js` 这类模块。

### 1. 引入 MathLive 字体

在 `<head>` 中加入：

```html
<link rel="stylesheet" href="../shared/vendor/mathlive/mathlive-fonts.css">
```

### 2. 引入 develop 共享样式和 MathLive loader

在 `<head>` 中加入：

```html
<link rel="stylesheet" href="../shared/react/styles.css">
```

在页面底部加入：

```html
<script src="../shared/mathlive-loader.js"></script>
```

静态公式模块的 tooltip 由模块自身的 CSS/JS 提供，不依赖旧的 `module-components.js`。

### 3. 插入可解释公式片段

推荐写法：外层负责解释，内层 `math-field` 负责 LaTeX 渲染。

```html
<span
  class="ftl-term"
  tabindex="0"
  data-dl-explain="λ：正则化强度，决定模型在拟合数据和保持权重较小之间如何权衡。"
  aria-label="lambda，正则化强度"
  aria-expanded="false"
>
  <math-field read-only virtual-keyboard-mode="manual" data-latex="\lambda" aria-hidden="true">
    \lambda
  </math-field>
</span>
```

### 4. 插入普通连接符

不需要解释的符号使用普通只读 `math-field`：

```html
<math-field class="ftl-static" read-only virtual-keyboard-mode="manual" data-latex="+" aria-hidden="true">+</math-field>
```

常见连接符包括：

- `=`
- `+`
- `-`
- `,`
- `(`、`)`

## React 模块如何插入公式

适用于 Vite React 模块。

### 1. 引入组件

```tsx
import { MathFormulaBlock, MathFormulaStatic, MathFormulaTerm } from '../shared/react';
```

如果文件层级不同，根据实际路径调整。

### 2. 写公式块

```tsx
<MathFormulaBlock ariaLabel="带 L2 正则化的训练目标函数">
  <MathFormulaTerm
    latex="W^{*}"
    tooltip="W*：训练结束时找到的最优权重。"
    ariaLabel="W star，训练得到的最优权重"
  />
  <MathFormulaStatic latex="=" />
  <MathFormulaTerm
    latex="\underset{W}{\operatorname{arg\,min}}"
    tooltip="arg min：在所有候选权重 W 中，选择让目标函数最小的一组。"
    ariaLabel="arg min，对 W 寻找最小目标值"
  />
  <MathFormulaStatic latex="(" />
  <MathFormulaTerm
    latex="\operatorname{Loss}"
    tooltip="Loss：损失函数，衡量预测和真实答案之间相差多少。"
    ariaLabel="Loss，损失函数"
  />
  <MathFormulaStatic latex="+" />
  <MathFormulaTerm
    latex="\lambda"
    tooltip="λ：正则化强度。"
    ariaLabel="lambda，正则化强度"
    tone="warm"
  />
  <MathFormulaTerm
    latex="\lVert W\rVert_2^2"
    tooltip="||W||₂²：权重的 L2 正则项，用来惩罚过大的权重。"
    ariaLabel="W 的 L2 范数平方"
    tone="warm"
  />
  <MathFormulaStatic latex=")" />
</MathFormulaBlock>
```

### 3. 组件选择规则

使用 `MathFormulaTerm`：

- 变量：`y`、`\hat{y}`、`W`、`\theta`
- 算子：`\operatorname{Loss}`、`\operatorname{softmax}`
- 需要解释的结构：`\lVert W\rVert_2^2`、`\frac{\partial L}{\partial W}`
- 学习者可能不熟悉的任何公式片段

使用 `MathFormulaStatic`：

- 等号、加号、减号
- 括号、逗号
- 不需要解释的连接符

## 插入新公式的建议

### 推荐原则

1. 不要把整条公式塞进一个 tooltip。
2. 按学习者真正会疑惑的地方拆分公式。
3. 每个 `MathFormulaTerm` 都写 `tooltip` 和 `ariaLabel`。
4. 数学本体写 LaTeX，中文解释写在 `tooltip`。
5. 分式、上下标、范数、希腊字母交给 MathLive 渲染，不再手搓 HTML。

### 交叉熵示例

```tsx
<MathFormulaBlock ariaLabel="多分类交叉熵损失公式">
  <MathFormulaTerm latex="L" tooltip="L：当前样本的损失值。" ariaLabel="L，损失值" />
  <MathFormulaStatic latex="=" />
  <MathFormulaStatic latex="-" />
  <MathFormulaStatic latex="\sum" />
  <MathFormulaTerm latex="y_i" tooltip="y_i：第 i 类的真实标签，通常是 one-hot 编码。" ariaLabel="第 i 类真实标签" />
  <MathFormulaTerm latex="\log" tooltip="log：对数函数，会强烈惩罚真实类别概率过低的情况。" ariaLabel="对数函数" />
  <MathFormulaStatic latex="(" />
  <MathFormulaTerm latex="p_i" tooltip="p_i：模型预测样本属于第 i 类的概率。" ariaLabel="第 i 类预测概率" />
  <MathFormulaStatic latex=")" />
</MathFormulaBlock>
```

### 梯度下降示例

```tsx
<MathFormulaBlock ariaLabel="梯度下降参数更新公式">
  <MathFormulaTerm latex="W_{t+1}" tooltip="W_{t+1}：更新后的权重。" ariaLabel="下一步权重" />
  <MathFormulaStatic latex="=" />
  <MathFormulaTerm latex="W_t" tooltip="W_t：当前这一步的权重。" ariaLabel="当前权重" />
  <MathFormulaStatic latex="-" />
  <MathFormulaTerm latex="\eta" tooltip="η：学习率，控制每次更新走多远。" ariaLabel="学习率" tone="warm" />
  <MathFormulaTerm latex="\nabla_W L" tooltip="∇_W L：损失函数对权重的梯度，指出损失上升最快的方向。" ariaLabel="损失对权重的梯度" />
</MathFormulaBlock>
```

## 本地验证命令

安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

访问 React 公式模块：

```text
http://127.0.0.1:5173/modules/formula-tooltip-react
```

访问静态 HTML 公式模块：

```text
http://127.0.0.1:5173/modules/Formula-Tooltip-Lab/
```

静态模块检查项：

1. 公式应以专业排版显示，而不是显示 LaTeX 源码。
2. 悬浮 `W*`、`arg min`、`Loss`、`ŷ`、`λ`、`||W||₂²` 时，应显示对应解释。
3. 点击任一公式片段后，解释应保持显示；点击空白处或按 `Escape` 应关闭解释。
4. 用 `Tab` 聚焦公式片段时，也应显示解释。

类型检查：

```bash
npm run typecheck
```

生产构建：

```bash
npm run build
```

模块索引检查：

```bash
cd modules
python3 build_module_index.py --check
```

## 当前验证结果

已验证：

- `npm run typecheck` 通过。
- `npm run build` 通过。
- `python3 build_module_index.py --check` 通过。
- `git diff --check` 通过。

构建时可能出现大 chunk 警告，主要来自 Plotly、ECharts、MathLive 等第三方库，不影响当前功能运行。后续如果关注首屏性能，可以继续做按路由拆包或按需加载。
