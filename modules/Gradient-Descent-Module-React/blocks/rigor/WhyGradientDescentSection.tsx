import { MathFormulaBlock, MathFormulaStatic, MathFormulaTerm } from '../../../shared/react/learning/MathFormulaBlock';
import { Typography } from '../../../shared/react/typography/Typography';

export function WhyGradientDescentSection() {
  return (
    <section className="gd-react-rigor-note" aria-labelledby="gd-why-gd-title">
      <Typography as="h3" variant="h3" tone="accent" id="gd-why-gd-title">
        从手动调节到自动更新：为什么需要梯度下降
      </Typography>

      <div className="gd-react-prose-sequence">
        <Typography variant="bodySmall">
          你刚才手动调节了两个权重，让 Loss 降到了 0。这个过程揭示了三件事：
        </Typography>
      </div>

      <ol className="gd-react-process-list">
        <Typography as="li" variant="bodySmall">
          <strong>方向可计算：</strong>当前预测小于 GT 时，所有输出权重都应该增大；预测太大时应该减小。这个方向可以从 Loss 对权重的偏导精确算出，不需要靠猜。
        </Typography>
        <Typography as="li" variant="bodySmall">
          <strong>影响大小可量化：</strong>v₁ 调整同样幅度对输出的影响是 v₂ 的 3 倍，因为 ∂y/∂v₁ = h₁ = 3，∂y/∂v₂ = h₂ = 1。梯度分量会按这个比例自动分配更新强度。
        </Typography>
        <Typography as="li" variant="bodySmall">
          <strong>手动调节不可规模化：</strong>这个网络只有 2 个参数，你花了约一分钟找到合适值。真实的深度网络有数百万甚至数十亿参数——不可能逐个手动尝试。
        </Typography>
      </ol>

      <Typography variant="bodySmall">
        梯度下降把这三件事统一成一个算法循环：用所有训练样本（或一小批样本）计算 Loss → 反向传播求每个参数的梯度 → 沿负梯度方向按学习率更新参数 → 重复。梯度提供<strong>方向和相对强度</strong>，学习率控制<strong>每次迈出多远</strong>。
      </Typography>

      <MathFormulaBlock ariaLabel="梯度下降更新规则：下一步参数等于当前参数减学习率乘当前参数处的梯度">
        <MathFormulaTerm latex="\boldsymbol\theta^{(t+1)}" tooltip="θ⁽ᵗ⁺¹⁾：下一次迭代的新参数向量。" ariaLabel="下一步参数向量" />
        <MathFormulaStatic latex="=" />
        <MathFormulaTerm latex="\boldsymbol\theta^{(t)}" tooltip="θ⁽ᵗ⁾：当前迭代开始时的参数向量。" ariaLabel="当前参数向量" />
        <MathFormulaStatic latex="-" />
        <MathFormulaTerm latex="\eta" tooltip="η：学习率，控制一次更新沿梯度方向移动的步长。" ariaLabel="学习率 eta" tone="warm" />
        <MathFormulaTerm latex="\nabla J(\boldsymbol\theta^{(t)})" tooltip="在当前参数处计算的目标函数梯度，由反向传播得到。" ariaLabel="目标函数在 theta t 处的梯度" />
      </MathFormulaBlock>

      <Typography variant="bodySmall">
        接下来，你将亲手完成一次梯度推导——把刚才"感觉出来的方向"变成精确的数学计算，并用它自动更新权重。
      </Typography>
    </section>
  );
}
