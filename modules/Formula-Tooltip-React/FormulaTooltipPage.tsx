import { Callout, ContentBlock, MathFormulaBlock, MathFormulaStatic, MathFormulaTerm, ModuleShell } from '../shared/react';
import './formula-tooltip-react.css';

export function FormulaTooltipPage() {
  return (
    <ModuleShell
      title="训练目标如何写成公式"
      subtitle="用 LaTeX 渲染专业公式，并把变量、算子和正则项逐段解释清楚。"
      shellClassName="formula-tooltip-shell edu-shell--scaled"
    >
      <ContentBlock title="一个可解释的训练目标" subtitle="模型寻找一组权重，让预测更准确，同时避免权重无限变大。">
        <MathFormulaBlock ariaLabel="W star 等于对 W 求使损失函数加 lambda 乘 W 的二范数平方最小的值">
          <MathFormulaTerm latex="W^{*}" tooltip="W*：训练结束时找到的最优权重。它是本次优化要得到的结果。" ariaLabel="W star，训练得到的最优权重" />
          <MathFormulaStatic latex="=" />
          <MathFormulaTerm latex="\underset{W}{\operatorname{arg\,min}}" tooltip="arg min：在所有候选权重 W 中，选择让整个目标函数数值最小的一组。" ariaLabel="arg min，对 W 寻找最小目标值" />
          <MathFormulaStatic latex="(" />
          <MathFormulaTerm latex="\operatorname{Loss}" tooltip="Loss：损失函数，衡量模型预测和真实答案之间相差多少。" ariaLabel="Loss，衡量预测误差的损失函数" />
          <MathFormulaStatic latex="(" />
          <MathFormulaTerm latex="y" tooltip="y：样本的真实目标值，也就是训练数据提供的正确答案。" ariaLabel="y，样本真实目标值" />
          <MathFormulaStatic latex="," />
          <MathFormulaTerm latex="\hat{y}" tooltip="ŷ：模型根据当前权重 W 给出的预测值。" ariaLabel="y hat，模型预测值" />
          <MathFormulaStatic latex=")" />
          <MathFormulaStatic latex="+" />
          <MathFormulaTerm latex="\lambda" tooltip="λ：正则化强度。它决定模型在“拟合数据”和“保持权重较小”之间如何权衡。" ariaLabel="lambda，正则化强度" tone="warm" />
          <MathFormulaTerm latex="\lVert W\rVert_2^2" tooltip="||W||₂²：权重的 L2 正则项。较大的权重会带来更大的惩罚，帮助抑制过拟合。" ariaLabel="W 的 L2 范数平方，权重大小惩罚" tone="warm" />
          <MathFormulaStatic latex=")" />
        </MathFormulaBlock>
        <Callout tone="blue" label="实现方式">
          公式片段由 MathLive 的 math-field 渲染，解释浮层沿用 shared 公式项样式，因此鼠标悬浮、点击和键盘聚焦都能触发说明。
        </Callout>
      </ContentBlock>
    </ModuleShell>
  );
}
