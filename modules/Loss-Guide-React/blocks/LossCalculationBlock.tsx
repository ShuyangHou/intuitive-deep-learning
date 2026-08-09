import { useState } from 'react';
import { FunctionPlot, type FunctionSeries } from '../../shared/react';
import { Callout } from '../../shared/react/feedback/Callout';
import { ContentBlock } from '../../shared/react/layout/ContentBlock';
import { Question } from '../../shared/react/learning/Question';
import { reviewLossComparison } from '../services/lossFeedback';
import type { LessonBlockProps } from './NumberLineBlock';
import { KnowledgePoint, LossObjectiveSection } from './rigor';

const lossSeries: FunctionSeries[] = [
  { id: 'l1', label: 'L1 = |ŷ − y|', fn: (error) => Math.abs(error), stroke: '#f07e47', strokeWidth: 3 },
  { id: 'l2', label: 'L2 = (ŷ − y)²', fn: (error) => error ** 2, stroke: '#27446e', strokeWidth: 3 },
];

export function LossCalculationBlock({ onComplete }: LessonBlockProps) {
  const [calculated, setCalculated] = useState(false);
  const [explained, setExplained] = useState(false);

  return (
    <ContentBlock className="lg-react-block" title="亲手算一次" subtitle="现在真实值为 3，预测值为 7。图中同时画出了 L1 和 L2 随误差变化的形状。">
      <LossObjectiveSection />
      <Callout tone="orange" label="你的任务" text="先算出当前预测的 L1、L2 损失。计算正确后，再解释两种损失的区别。" />
      <FunctionPlot className="lg-react-chart" series={lossSeries} showLegend xLabel="误差 ŷ − y" yLabel="损失" initialCenter={{ x: 0, y: 8 }} initialScale={{ x: .025, y: .055 }} minHeight={340} ariaLabel="L1 与 L2 损失函数图" />
      <Question persistenceKey="loss-calculation" type="fill" title="真实值为 3、预测值为 7：L1 Loss = ____，L2 Loss = ____。" blanks={[{ label: 'L1 Loss', placeholder: 'L1' }, { label: 'L2 Loss', placeholder: 'L2' }]} answer={['4', '16']} feedback={{ correct: '计算正确。L1 = 4，L2 = 16。现在继续解释两种损失的区别。' }} onCheck={(result) => setCalculated(result.ok)} />
      {calculated && (
        <KnowledgePoint ariaLabel="损失计算知识点" title="知识点：同一个残差会被不同方式惩罚">
          这里的残差是 7 − 3 = 4。绝对误差保持为 4，平方误差变成 16；因此误差变大时，平方误差的增长速度会超过绝对误差，大残差也更容易主导总体损失。
        </KnowledgePoint>
      )}
      {calculated && <Question persistenceKey="loss-comparison" type="short" title="L1 Loss 和 L2 Loss 的区别是什么？" submitText="提交回答" review={(answers) => reviewLossComparison(answers[0] ?? '')} onCheck={(result) => { if (!result.empty && !explained) { setExplained(true); onComplete(); } }} />}
      {explained && (
        <KnowledgePoint ariaLabel="损失选择知识点" title="知识点：损失函数没有脱离任务的绝对优劣">
          L2 强调大残差，适合希望模型优先修正大错误的情形；L1 对极端残差的放大更弱。选择哪一种损失，应由误差特征和建模假设决定，而不能只根据某一道题中的数值大小判断。
        </KnowledgePoint>
      )}
    </ContentBlock>
  );
}
