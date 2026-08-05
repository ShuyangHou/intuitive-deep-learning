import { MathFormulaBlock, MathFormulaStatic, MathFormulaTerm } from '../../../shared/react/learning/MathFormulaBlock';
import { Typography } from '../../../shared/react/typography/Typography';

interface ManualObjectiveSectionProps {
  target: number;
}

export function ManualObjectiveSection({ target }: ManualObjectiveSectionProps) {
  return (
    <section className="gd-react-rigor-note" aria-labelledby="gd-manual-objective-title">
      <Typography as="h3" variant="h3" tone="accent" id="gd-manual-objective-title">把“调权重”写成一个优化问题</Typography>
      <Typography variant="bodySmall">沿用本页记号：y 表示网络预测，GT = {target} 表示真实目标，隐藏层输出 h₁ = 3、h₂ = 1 保持不变；当前需要学习的参数只有两个输出层权重 v₁、v₂。</Typography>
      <div className="gd-react-prose-sequence">
        <Typography variant="bodySmall">训练过程中被调整、并决定输入输出关系的数值叫作<strong>模型参数</strong>。本阶段只有 v₁、v₂ 属于参数；输入和隐藏层输出被固定，不参与优化。</Typography>
        <Typography variant="bodySmall"><strong>目标函数</strong>把一组参数映射为一个标量代价。这里它就是当前样本的 L1 Loss。优化要在相同输入和 GT 下比较不同权重，并反复执行“计算方向—更新参数—重新评价”，逐步寻找更低的目标值。</Typography>
        <Typography variant="bodySmall">这种逐步逼近得到的是<strong>数值解</strong>，不是一次写出的闭式答案。深度网络通常依靠数值优化训练；但训练 Loss 下降只说明训练目标被降低，模型在未见数据上的泛化能力还要另行评估。</Typography>
      </div>
      <MathFormulaBlock ariaLabel="参数向量 theta 由 v1 和 v2 组成，预测 y 等于 v1 h1 加 v2 h2，目标函数 L 等于预测与真实目标之差的绝对值">
        <MathFormulaTerm latex="\boldsymbol{\theta}" tooltip="θ：当前阶段全部待学习参数组成的向量。" ariaLabel="参数向量 theta" />
        <MathFormulaStatic latex="=" />
        <MathFormulaTerm latex="\begin{bmatrix}v_1\\v_2\end{bmatrix}" tooltip="v₁、v₂：当前需要调节的两个输出层权重。" ariaLabel="由 v1 和 v2 组成的参数向量" />
        <MathFormulaStatic latex="," />
        <MathFormulaTerm latex="y(\boldsymbol{\theta})" tooltip="y(θ)：参数取 θ 时网络得到的预测值。" ariaLabel="参数 theta 对应的预测值" />
        <MathFormulaStatic latex="=" />
        <MathFormulaTerm latex="v_1h_1+v_2h_2" tooltip="输出层的线性组合：每个权重乘对应隐藏层输出后求和。" ariaLabel="输出层加权和" />
        <MathFormulaStatic latex="," />
        <MathFormulaTerm latex="L(\boldsymbol{\theta})" tooltip="L(θ)：当前参数在这个样本上产生的 L1 损失。" ariaLabel="参数 theta 的损失" />
        <MathFormulaStatic latex="=" />
        <MathFormulaTerm latex="\left|y(\boldsymbol{\theta})-\mathrm{GT}\right|" tooltip="预测值与真实目标 GT 之差的绝对值。" ariaLabel="预测与真实目标的绝对误差" />
      </MathFormulaBlock>
      <Typography variant="bodySmall">因为这一层对权重是线性的，权重变化与预测变化之间存在下面的精确关系。它把后面的“哪个权重影响更大”从观察结论写成了可计算的关系。</Typography>
      <MathFormulaBlock ariaLabel="预测变化量 delta y 等于 h1 乘 delta v1 加 h2 乘 delta v2，在当前数值下等于三倍 delta v1 加 delta v2">
        <MathFormulaTerm latex="\Delta y" tooltip="Δy：本次权重变化引起的预测值变化量。" ariaLabel="预测变化量 delta y" />
        <MathFormulaStatic latex="=" />
        <MathFormulaTerm latex="h_1\Delta v_1+h_2\Delta v_2" tooltip="每个权重变化量按对应隐藏层输出缩放后相加。" ariaLabel="隐藏层输出加权的权重变化" />
        <MathFormulaStatic latex="=" />
        <MathFormulaTerm latex="3\Delta v_1+\Delta v_2" tooltip="当前 h₁=3、h₂=1，因此 v₁ 的同等变化对输出影响是 v₂ 的三倍。" ariaLabel="当前数值下的预测变化" />
      </MathFormulaBlock>
    </section>
  );
}
