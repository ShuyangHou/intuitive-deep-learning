import { useState } from 'react';
import { Callout, ContentBlock, FormulaBlock, NoticeStrip, Question } from '../../shared/react';
import type { LessonBlockProps } from './NumberLineBlock';
import { lossGuideStateKey } from '../lessonConfig';

export function GradientBlock({ onComplete }: LessonBlockProps) {
  const [absoluteComplete, setAbsoluteComplete] = useState(false);
  const [zeroComplete, setZeroComplete] = useState(false);

  return (
    <ContentBlock
      className="lg-react-block"
      title="梯度怎样把损失变成更新信号？"
      subtitle="损失是一个标量；梯度描述预测值发生微小变化时，损失上升最快的方向和变化率。训练时沿负梯度方向更新。"
    >
      <Callout
        tone="blue"
        label="符号方向"
        text="梯度为正表示增大 ŷ 会让损失上升，因此梯度下降会减小 ŷ；梯度为负时则相反。"
      />

      <section className="lg-react-gradient-step">
        <h3>绝对误差的梯度：大小固定，零点例外</h3>
        <div className="lg-react-formula-grid">
          <FormulaBlock ariaLabel="绝对误差公式">
            ℓ<sub>abs</sub>(y, ŷ) = |ŷ − y|
          </FormulaBlock>
          <FormulaBlock ariaLabel="绝对误差在非零误差处的梯度">
            ∂ℓ<sub>abs</sub>/∂ŷ = −1（ŷ &lt; y），+1（ŷ &gt; y）
          </FormulaBlock>
        </div>
        <Question
          persistenceKey={lossGuideStateKey('absolute-gradient-direction')}
          type="judgement"
          title="当 ŷ > y 时，绝对误差对 ŷ 的梯度为 +1；执行梯度下降会让 ŷ 减小并靠近 y。"
          options={[
            { key: '对', value: 'true', label: '正确' },
            { key: '错', value: 'false', label: '错误' },
          ]}
          answer="true"
          feedback={{ correct: '正确。更新式 ŷ ← ŷ − η·1 会减小预测值。' }}
          onCheck={(result) => setAbsoluteComplete(result.ok)}
        />
      </section>

      {absoluteComplete && (
        <section className="lg-react-gradient-step">
          <h3>不可导不等于无法优化</h3>
          <FormulaBlock ariaLabel="绝对误差在零点的次梯度">
            ŷ = y 时不可导；次梯度集合 ∂ℓ<sub>abs</sub> = [−1, 1]
          </FormulaBlock>
          <p className="edu-body">
            绝对值函数在零点有尖角，普通导数不存在。优化算法通常选取集合中的一个次梯度；取 0 时，已经命中目标的预测不会继续移动。
          </p>
          <Question
            persistenceKey={lossGuideStateKey('absolute-subgradient')}
            type="judgement"
            title="在 ŷ = y 时取 0 作为绝对误差的次梯度，是一个合法选择。"
            options={[
              { key: '对', value: 'true', label: '正确，0 属于 [−1, 1]' },
              { key: '错', value: 'false', label: '错误，不可导就无法更新' },
            ]}
            answer="true"
            feedback={{ correct: '正确。这里必须区分“导数不存在”和“没有可用的优化方向”。' }}
            onCheck={(result) => setZeroComplete(result.ok)}
          />
        </section>
      )}

      {zeroComplete && (
        <section className="lg-react-gradient-step">
          <h3>MSE 的梯度：误差越大，更新信号越强</h3>
          <div className="lg-react-formula-grid">
            <FormulaBlock ariaLabel="均方误差公式">
              L<sub>MSE</sub> = (1/n) Σ<sub>i=1</sub><sup>n</sup> (ŷ<sub>i</sub> − y<sub>i</sub>)²
            </FormulaBlock>
            <FormulaBlock ariaLabel="均方误差对单个预测的梯度">
              ∂L<sub>MSE</sub>/∂ŷ<sub>i</sub> = (2/n)(ŷ<sub>i</sub> − y<sub>i</sub>)
            </FormulaBlock>
          </div>
          <NoticeStrip tone="orange" lead="约定会改变常数：">
            有些教材使用 (1/2n)Σ(ŷ−y)²，使梯度中的系数 2 消失。两种定义都正确，但整节课必须保持同一约定。
          </NoticeStrip>
          <FormulaBlock ariaLabel="梯度下降更新预测值">
            ŷ<sub>i</sub> ← ŷ<sub>i</sub> − η · ∂L/∂ŷ<sub>i</sub>
          </FormulaBlock>
          <Question
            persistenceKey={lossGuideStateKey('mse-gradient')}
            title="同一批次中，样本 A 的 |ŷ−y| = 1，样本 B 的 |ŷ−y| = 5。使用 MSE 时，哪个样本产生的梯度绝对值更大？"
            options={[
              { value: 'same', label: '两者相同，梯度只记录方向' },
              { value: 'a', label: '样本 A 更大' },
              { value: 'b', label: '样本 B 更大，约为 A 的 5 倍' },
            ]}
            answer="b"
            feedback={{ correct: '正确。MSE 梯度保留误差大小，这也解释了离群点为什么可能主导更新。' }}
            onCheck={(result) => {
              if (result.ok) onComplete();
            }}
          />
        </section>
      )}
    </ContentBlock>
  );
}
