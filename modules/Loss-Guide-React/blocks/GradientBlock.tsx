import { useState } from 'react';
import { Callout } from '../../shared/react/feedback/Callout';
import { ContentBlock } from '../../shared/react/layout/ContentBlock';
import {
  MathFormulaBlock,
  MathFormulaStatic,
  MathFormulaTerm,
} from '../../shared/react/learning/MathFormulaBlock';
import { Question } from '../../shared/react/learning/Question';
import { Typography } from '../../shared/react/typography/Typography';
import type { LessonBlockProps } from './NumberLineBlock';
import { GradientFoundationsSections, KnowledgePoint, LikelihoodSection } from './rigor';

export function GradientBlock({ onComplete }: LessonBlockProps) {
  const [l1Complete, setL1Complete] = useState(false);
  const [l2Complete, setL2Complete] = useState(false);
  const [comparisonComplete, setComparisonComplete] = useState(false);

  return (
    <ContentBlock
      className="lg-react-block"
      title="计算 L1 与 L2 的梯度"
      subtitle="损失告诉我们错了多少；梯度进一步告诉模型预测值应该往哪个方向改，以及需要多强的修正。"
    >
      <Callout
        tone="blue"
        label="怎样读梯度"
        text="梯度的正负表示修正方向，绝对值表示当前误差产生的修正强度。训练时会沿梯度的反方向更新预测。"
      />

      <GradientFoundationsSections />

      <section className="lg-react-gradient-step">
        <Typography as="h3" variant="h3" tone="accent">L1 Loss</Typography>
        <MathFormulaBlock ariaLabel="L1 损失等于预测值与真实值之差的绝对值">
          <MathFormulaTerm latex="\ell_{\mathrm{L1}}" tooltip="ℓL1：当前样本的 L1 损失，本模块用它表示绝对误差。" ariaLabel="L1 损失" />
          <MathFormulaStatic latex="=" />
          <MathFormulaTerm latex="|\hat{y}-y|" tooltip="预测值与真实值之差的绝对值：保留偏离大小，同时去掉高估或低估的符号。" ariaLabel="预测值减真实值的绝对值" />
        </MathFormulaBlock>
        <MathFormulaBlock ariaLabel="L1 损失对预测值的偏导等于预测残差的符号">
          <MathFormulaTerm latex="\frac{\partial \ell_{\mathrm{L1}}}{\partial \hat{y}}" tooltip="L1 损失关于预测值的偏导；残差非零时绝对值为 1，在残差为零处不可导。" ariaLabel="L1 损失对预测值的偏导" />
          <MathFormulaStatic latex="=" />
          <MathFormulaTerm latex="\operatorname{sign}(\hat{y}-y)" tooltip="sign：残差为负时取 −1，为正时取 1，只保留当前误差方向。" ariaLabel="预测残差的符号函数" />
        </MathFormulaBlock>
        <MathFormulaBlock ariaLabel="绝对值函数的次梯度在负误差时为负一，在零误差时为负一到一的区间，在正误差时为正一">
          <MathFormulaTerm latex="\partial |e|" tooltip="∂|e|：绝对值函数的次微分；它在折点处用一个集合描述允许的次梯度。" ariaLabel="绝对值函数的次微分" />
          <MathFormulaStatic latex="=" />
          <MathFormulaTerm
            latex="\begin{cases}-1,&e<0\\ \left[-1,1\right],&e=0\\ 1,&e>0\end{cases}"
            tooltip="残差小于零时次梯度为 −1，大于零时为 1；等于零时可在区间 [−1,1] 中按实现约定选取，常用 0。"
            ariaLabel="绝对值函数的分段次梯度"
          />
        </MathFormulaBlock>
        <Question
          persistenceKey="l1-gradient"
          type="judgement"
          title="L1 Loss 的梯度包含误差大小信息。"
          options={[
            { key: '对', value: 'true', label: '有，误差越大梯度绝对值越大', wrongFeedback: 'L1 梯度由 sign 决定，非零误差的梯度绝对值通常固定为 1。' },
            { key: '错', value: 'false', label: '没有，它只用正负号表示方向' },
          ]}
          answer="false"
          feedback={{ correct: '正确。L1 梯度通常只有 -1 或 +1，不会保留误差大小。' }}
          onCheck={(result) => setL1Complete(result.ok)}
        />
      </section>

      {l1Complete && (
        <KnowledgePoint ariaLabel="L1 梯度知识点" title="知识点：L1 的非零梯度只保留方向">
          只要残差不为 0，L1 对预测值的梯度绝对值就是 1。误差变得更大不会让这个梯度同步变大；在残差为 0 的折点处则要使用次梯度约定。
        </KnowledgePoint>
      )}

      {l1Complete && (
        <section className="lg-react-gradient-step">
          <Typography as="h3" variant="h3" tone="accent">L2 Loss</Typography>
          <MathFormulaBlock ariaLabel="L2 损失等于预测值与真实值之差的平方">
            <MathFormulaTerm latex="\ell_{\mathrm{L2}}" tooltip="ℓL2：当前样本的 L2 损失，本模块沿用原命名表示平方误差。" ariaLabel="L2 损失" />
            <MathFormulaStatic latex="=" />
            <MathFormulaTerm latex="(\hat{y}-y)^2" tooltip="预测残差的平方：去掉方向，并以二次速度放大较大的残差。" ariaLabel="预测残差平方" />
          </MathFormulaBlock>
          <MathFormulaBlock ariaLabel="L2 损失对预测值的偏导等于二乘预测残差">
            <MathFormulaTerm latex="\frac{\partial \ell_{\mathrm{L2}}}{\partial \hat{y}}" tooltip="L2 损失关于预测值的偏导，既包含误差方向，也包含与残差成比例的大小。" ariaLabel="L2 损失对预测值的偏导" />
            <MathFormulaStatic latex="=" />
            <MathFormulaTerm latex="2(\hat{y}-y)" tooltip="平方求导产生系数 2，因此残差越大，梯度绝对值也越大。" ariaLabel="二乘预测残差" />
          </MathFormulaBlock>
          <MathFormulaBlock ariaLabel="二分之一乘残差平方对预测值的导数等于残差">
            <MathFormulaTerm latex="\frac{\partial}{\partial \hat{y}}\!\left(\frac{1}{2}e^2\right)" tooltip="教材常在平方误差前乘二分之一，使求导后的系数 2 被抵消；这一正常数缩放不会改变最优参数位置。" ariaLabel="二分之一残差平方对预测值的偏导" />
            <MathFormulaStatic latex="=" />
            <MathFormulaTerm latex="e" tooltip="e：预测值减真实值所得的残差。" ariaLabel="残差 e" />
            <MathFormulaStatic latex="=" />
            <MathFormulaTerm latex="\hat{y}-y" tooltip="残差展开为预测值减真实值。" ariaLabel="预测值减真实值" />
          </MathFormulaBlock>
          <Question
            persistenceKey="l2-gradient"
            type="judgement"
            title="L2 Loss 的梯度包含误差大小信息。"
            options={[
              { key: '对', value: 'true', label: '有，梯度绝对值会随误差变化' },
              { key: '错', value: 'false', label: '没有，梯度绝对值始终固定', wrongFeedback: 'L2 梯度为 2(ŷ−y)，误差变化时梯度绝对值也随之变化。' },
            ]}
            answer="true"
            feedback={{ correct: '正确。L2 梯度既提供方向，也会随着误差大小改变修正强度。' }}
            onCheck={(result) => setL2Complete(result.ok)}
          />
        </section>
      )}

      {l2Complete && (
        <KnowledgePoint ariaLabel="L2 梯度知识点" title="知识点：L2 的梯度会随残差缩放">
          L2 对预测值的梯度为残差的两倍。大残差产生更强的局部修正信号，接近目标时梯度随残差一起变小；这正是它与 L1 固定梯度幅度的关键差别。
        </KnowledgePoint>
      )}

      {l2Complete && (
        <Question
          persistenceKey="gradient-comparison"
          type="judgement"
          title="L1 的梯度只有方向信息，这是否意味着 L1 Loss 一定不如 L2 Loss？"
          options={[
            { key: '对', value: 'true', label: '是，L2 永远更好', wrongFeedback: '损失函数没有绝对优劣；L1 对离群点更不敏感，在部分任务中反而更合适。' },
            { key: '错', value: 'false', label: '不是，两者适合不同的误差假设' },
          ]}
          answer="false"
          feedback={{ correct: '正确。面对离群点时，L1 不会让单个异常样本无限放大更新。' }}
          onCheck={(result) => {
            if (result.ok) {
              setComparisonComplete(true);
              onComplete();
            }
          }}
        />
      )}

      {comparisonComplete && (
        <KnowledgePoint ariaLabel="损失梯度比较知识点" title="知识点：梯度形式反映了不同的误差取舍">
          L1 对大残差保持线性惩罚，L2 会同时放大损失和梯度。两者服务于不同的误差假设和训练目标，不能仅凭“梯度信息更多”判断哪一种一定更好。
        </KnowledgePoint>
      )}

      {l2Complete && (
        <LikelihoodSection />
      )}
    </ContentBlock>
  );
}
