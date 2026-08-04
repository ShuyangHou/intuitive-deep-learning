import { useState } from 'react';
import { Callout } from '../../shared/react/feedback/Callout';
import { ContentBlock } from '../../shared/react/layout/ContentBlock';
import { MathFormulaBlock, MathFormulaStatic, MathFormulaTerm } from '../../shared/react/learning/MathFormulaBlock';
import { Question } from '../../shared/react/learning/Question';
import type { LessonBlockProps } from './NumberLineBlock';

export function GradientBlock({ onComplete }: LessonBlockProps) {
  const [l1Complete, setL1Complete] = useState(false);
  const [l2Complete, setL2Complete] = useState(false);

  return (
    <ContentBlock className="lg-react-block" title="计算 L1 与 L2 的梯度" subtitle="损失告诉我们错了多少；梯度进一步告诉模型预测值应该往哪个方向改，以及需要多强的修正。">
      <Callout tone="blue" label="怎样读梯度" text="梯度的正负表示修正方向，绝对值表示当前误差产生的修正强度。训练时会沿梯度的反方向更新预测。" />
      <section className="lg-react-gradient-step"><h3>L1 Loss</h3><MathFormulaBlock ariaLabel="L1 损失公式"><MathFormulaTerm latex="L_1" tooltip="L1：用绝对误差衡量预测偏差的损失" /><MathFormulaStatic latex="=" /><MathFormulaTerm latex="\lvert y-\hat{y}\rvert" tooltip="真实值与预测值之差的绝对值" /></MathFormulaBlock><MathFormulaBlock ariaLabel="L1 梯度公式"><MathFormulaTerm latex="\frac{\partial L_1}{\partial \hat{y}}" tooltip="L1 损失对预测值的偏导" /><MathFormulaStatic latex="=" /><MathFormulaTerm latex="\operatorname{sign}(\hat{y}-y)" tooltip="sign：只保留预测误差的正负方向" /></MathFormulaBlock><Question persistenceKey="l1-gradient" type="judgement" title="L1 Loss 的梯度包含误差大小信息。" options={[{ key: '对', value: 'true', label: '有，误差越大梯度绝对值越大', wrongFeedback: 'L1 梯度由 sign 决定，非零误差的梯度绝对值通常固定为 1。' }, { key: '错', value: 'false', label: '没有，它只用正负号表示方向' }]} answer="false" feedback={{ correct: '正确。L1 梯度通常只有 -1 或 +1，不会保留误差大小。' }} onCheck={(result) => setL1Complete(result.ok)} /></section>
      {l1Complete && <section className="lg-react-gradient-step"><h3>L2 Loss</h3><MathFormulaBlock ariaLabel="L2 损失公式"><MathFormulaTerm latex="L_2" tooltip="L2：用平方误差衡量预测偏差的损失" /><MathFormulaStatic latex="=" /><MathFormulaTerm latex="(y-\hat{y})^2" tooltip="真实值与预测值之差的平方" /></MathFormulaBlock><MathFormulaBlock ariaLabel="L2 梯度公式"><MathFormulaTerm latex="\frac{\partial L_2}{\partial \hat{y}}" tooltip="L2 损失对预测值的偏导" /><MathFormulaStatic latex="=" /><MathFormulaTerm latex="2(\hat{y}-y)" tooltip="梯度方向和强度都随预测误差变化" /></MathFormulaBlock><Question persistenceKey="l2-gradient" type="judgement" title="L2 Loss 的梯度包含误差大小信息。" options={[{ key: '对', value: 'true', label: '有，梯度绝对值会随误差变化' }, { key: '错', value: 'false', label: '没有，梯度绝对值始终固定', wrongFeedback: 'L2 梯度为 2(ŷ−y)，误差变化时梯度绝对值也随之变化。' }]} answer="true" feedback={{ correct: '正确。L2 梯度既提供方向，也会随着误差大小改变修正强度。' }} onCheck={(result) => setL2Complete(result.ok)} /></section>}
      {l2Complete && <Question persistenceKey="gradient-comparison" type="judgement" title="L1 的梯度只有方向信息，这是否意味着 L1 Loss 一定不如 L2 Loss？" options={[{ key: '对', value: 'true', label: '是，L2 永远更好', wrongFeedback: '损失函数没有绝对优劣；L1 对离群点更不敏感，在部分任务中反而更合适。' }, { key: '错', value: 'false', label: '不是，两者适合不同的误差假设' }]} answer="false" feedback={{ correct: '正确。面对离群点时，L1 不会让单个异常样本无限放大更新。' }} onCheck={(result) => { if (result.ok) onComplete(); }} />}
    </ContentBlock>
  );
}
