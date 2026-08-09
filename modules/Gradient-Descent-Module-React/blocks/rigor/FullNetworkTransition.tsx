import { Typography } from '../../../shared/react/typography/Typography';

export function FullNetworkTransition() {
  return (
    <section className="gd-react-rigor-note" aria-labelledby="gd-transition-title">
      <Typography as="h3" variant="h3" tone="accent" id="gd-transition-title">
        从输出层到全网络：梯度必须穿过更多层
      </Typography>

      <div className="gd-react-prose-sequence">
        <Typography variant="bodySmall">
          此前我们只训练了两个输出层权重 v₁、v₂，隐藏层的值 h₁=3、h₂=1 是预先算好并固定的。但在真实的神经网络中，<strong>所有层的参数都需要学习</strong>——包括把输入映射到隐藏层的第一层权重（w₁₁、w₂₁、w₁₂、w₂₂）。
        </Typography>
        <Typography variant="bodySmall">
          这就引入了一个新的问题：Loss 对第一层权重的梯度，需要穿过隐藏层再穿过输出层才能到达。整条路径是：
        </Typography>
      </div>

      <div className="gd-react-process-list">
        <Typography as="div" variant="bodySmall" style={{ lineHeight: 1.8 }}>
          <strong>输入 x₁, x₂</strong> → （乘以 w）→ <strong>隐藏层 h₁, h₂</strong> → （乘以 v）→ <strong>预测 y</strong> → （与 GT 比较）→ <strong>Loss</strong>
        </Typography>
      </div>

      <Typography variant="bodySmall">
        Loss 对第一层某个权重（比如 w₁₁）的偏导，需要链式法则沿这条路径逐段求导：∂L/∂w₁₁ = ∂L/∂y · ∂y/∂h₁ · ∂h₁/∂w₁₁。这需要复用前向传播中保存的中间结果（如 h₁、v₁ 的值），沿计算图反向累积——这正是<strong>反向传播</strong>。
      </Typography>

      <div className="gd-react-prose-sequence">
        <Typography variant="bodySmall">
          一旦所有参数的梯度都算出来，就可以在<strong>同一步中</strong>对所有 6 个权重同时执行梯度更新。两参数网络和全网络在更新逻辑上没有区别——只是梯度向量从 2 维变成了 6 维。
        </Typography>
        <Typography variant="bodySmall">
          接下来，你将观察一个完整的 6 参数网络被训练的全过程：输入 → 前向 → 计算 Loss → 反向传播 → 同时更新全部权重 → 重复。
        </Typography>
      </div>
    </section>
  );
}
