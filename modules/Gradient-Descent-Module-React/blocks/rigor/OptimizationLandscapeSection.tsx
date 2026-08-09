import { MathFormulaBlock, MathFormulaStatic, MathFormulaTerm } from '../../../shared/react/learning/MathFormulaBlock';
import { Typography } from '../../../shared/react/typography/Typography';

export function OptimizationLandscapeSection() {
  return (
    <section className="gd-react-rigor-note" aria-labelledby="gd-landscape-title">
      <Typography as="h3" variant="h3" tone="accent" id="gd-landscape-title">梯度为零不等于已经找到全局最优解</Typography>
      <Typography variant="bodySmall">梯度下降依据当前位置的一阶信息移动。在深度网络的非凸目标上，低梯度区域可能对应全局最小值、局部最小值、鞍点或近乎平坦的区域，因此需要结合目标值变化和验证表现判断训练状态。</Typography>
      <div className="gd-react-prose-sequence">
        <Typography variant="bodySmall"><strong>局部最小值</strong>只要求目标值小于附近位置；<strong>全局最小值</strong>才要求它不大于整个可行域中的任何位置。梯度下降只利用局部信息，所以到达局部低点后通常不会主动寻找远处是否还有更好的解。</Typography>
        <Typography variant="bodySmall"><strong>鞍点</strong>的梯度也可以为零，但沿不同方向观察时，目标可能一边上升、一边下降，因此它不是最小值。高维非凸问题中的鞍点与平坦区域都会让一阶更新变慢。</Typography>
        <Typography variant="bodySmall">另一种停滞来自<strong>梯度消失</strong>：梯度在反向传递中变得很小，使靠近输入端的参数几乎无法更新。它表示训练信号衰减，不能被解释成“模型已经收敛到好解”。</Typography>
      </div>
      <MathFormulaBlock ariaLabel="驻点 theta s 满足梯度等于零，但这一条件并不能推出 theta s 是全局最小值">
        <MathFormulaTerm latex="\nabla J(\boldsymbol\theta_s)" tooltip="目标函数在驻点 θs 处的一阶梯度。" ariaLabel="目标函数在驻点处的梯度" />
        <MathFormulaStatic latex="=" />
        <MathFormulaTerm latex="\boldsymbol 0" tooltip="零向量表示每个参数方向上的一阶偏导都为零。" ariaLabel="零向量" />
        <MathFormulaStatic latex="\nRightarrow" />
        <MathFormulaTerm latex="\boldsymbol\theta_s\in\operatorname*{arg\,min}_{\boldsymbol\theta}J(\boldsymbol\theta)" tooltip="梯度为零只是驻点的必要候选条件，不能单独证明它是全局最小值。" ariaLabel="驻点不一定属于全局最小值集合" />
      </MathFormulaBlock>
    </section>
  );
}
