import { useState } from 'react';
import { Callout } from '../../shared/react/feedback/Callout';
import { ContentBlock } from '../../shared/react/layout/ContentBlock';
import { Question } from '../../shared/react/learning/Question';
import { FunctionPlot, type FunctionSeries } from '../../shared/react';
import type { LessonBlockProps } from './NumberLineBlock';
import { reviewLossComparison } from '../services/lossFeedback';
import { lossGuideStateKey } from '../lessonConfig';

const lossSeries: FunctionSeries[] = [
  { id: 'absolute', label: '绝对误差 = |ŷ − y|', fn: (error) => Math.abs(error), stroke: '#f07e47', strokeWidth: 3 },
  { id: 'squared', label: '平方误差 = (ŷ − y)²', fn: (error) => error ** 2, stroke: '#27446e', strokeWidth: 3 },
];

export function LossCalculationBlock({ onComplete }: LessonBlockProps) {
  const [calculated, setCalculated] = useState(false);
  const [scaled, setScaled] = useState(false);

  return (
    <ContentBlock className="lg-react-block" title="把刚才的观察写成单样本损失" subtitle="设真实值 y = 3、预测值 ŷ = 7。先固定符号约定 e = ŷ − y，再比较绝对误差与平方误差。">
      <Callout tone="orange" label="你的任务" text="计算 e、|e| 和 e²，并从函数图中判断误差放大时两种损失增长得有多快。" />
      <FunctionPlot className="lg-react-chart" series={lossSeries} showLegend xLabel="误差 ŷ − y" yLabel="单样本损失" initialCenter={{ x: 0, y: 8 }} initialScale={{ x: .025, y: .055 }} minHeight={340} ariaLabel="绝对误差与平方误差函数图" />
      <Question
        persistenceKey={lossGuideStateKey('loss-calculation')}
        type="fill"
        title="e = ____，绝对误差 |e| = ____，平方误差 e² = ____。"
        blanks={[
          { label: '有符号误差', placeholder: 'e' },
          { label: '绝对误差', placeholder: '|e|' },
          { label: '平方误差', placeholder: 'e²' },
        ]}
        answer={['4', '4', '16']}
        feedback={{
          correct: '计算正确。符号记录方向，绝对值和平方把误差变成非负损失。',
          wrong: '先计算 e = 7 − 3，再分别取绝对值和平方。',
        }}
        onCheck={(result) => setCalculated(result.ok)}
      />
      {calculated && (
        <>
          <Question
            persistenceKey={lossGuideStateKey('loss-scaling')}
            title="若误差绝对值从 2 增大到 4，两个单样本损失怎样变化？"
            options={[
              { value: 'same', label: '绝对误差和平方误差都变为原来的 2 倍' },
              { value: 'different', label: '绝对误差变为 2 倍，平方误差变为 4 倍' },
              { value: 'reverse', label: '绝对误差变为 4 倍，平方误差变为 2 倍' },
            ]}
            answer="different"
            feedback={{ correct: '正确。平方误差对较大的偏差增长得更快。' }}
            onCheck={(result) => {
              setScaled(result.ok);
              if (result.ok) onComplete();
            }}
          />
          {scaled && (
            <Question
              persistenceKey={lossGuideStateKey('loss-comparison')}
              type="short"
              title="用自己的话解释：绝对误差与平方误差分别怎样对待大误差？"
              submitText="获取反馈"
              review={(answers) => reviewLossComparison(answers[0] ?? '')}
            />
          )}
        </>
      )}
    </ContentBlock>
  );
}
