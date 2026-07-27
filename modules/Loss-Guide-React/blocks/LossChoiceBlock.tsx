import { useState } from 'react';
import { Callout, ContentBlock, NoticeStrip, Question } from '../../shared/react';
import type { LessonBlockProps } from './NumberLineBlock';
import { lossGuideStateKey } from '../lessonConfig';

export function LossChoiceBlock({ onComplete }: LessonBlockProps) {
  const [sensorComplete, setSensorComplete] = useState(false);
  const [annotationComplete, setAnnotationComplete] = useState(false);

  return (
    <ContentBlock
      className="lg-react-block"
      title="损失函数不是排行榜，而是一组假设"
      subtitle="真正的选择题不是“哪个公式更高级”，而是“哪种误差结构更符合数据与任务代价”。"
    >
      <Callout
        tone="blue"
        label="课堂决策"
        text="分别阅读两个场景。先判断数据里的误差来自哪里，再选择损失函数。"
      />
      <Question
        persistenceKey={lossGuideStateKey('loss-choice-sensor')}
        title="高精度温度传感器的误差通常小、近似对称，较大的偏差应被重点纠正。优先选择："
        options={[
          { value: 'mae', label: 'MAE，让每个误差按绝对值线性计入' },
          { value: 'mse', label: 'MSE，让较大的误差获得更强惩罚' },
        ]}
        answer="mse"
        feedback={{
          correct: '合理。误差近似高斯且大偏差代价更高时，MSE 是常见选择。',
          wrong: '再看一次条件：“较大的偏差应被重点纠正”意味着惩罚应随误差更快增长。',
        }}
        onCheck={(result) => setSensorComplete(result.ok)}
      />
      {sensorComplete && (
        <Question
          persistenceKey={lossGuideStateKey('loss-choice-annotation')}
          title="众包标注数据偶尔出现严重误标，但多数样本可靠。若不希望少数误标主导训练，优先选择："
          options={[
            { value: 'mae', label: 'MAE，降低极端误差的相对影响' },
            { value: 'mse', label: 'MSE，继续平方放大极端误差' },
          ]}
          answer="mae"
          feedback={{
            correct: '合理。MAE 对离群点更稳健，但零点不可导和优化特性也需要一并考虑。',
            wrong: '回想刚才的离群点实验：哪个损失没有把误差 10 放大成 100？',
          }}
          onCheck={(result) => {
            setAnnotationComplete(result.ok);
            if (result.ok) onComplete();
          }}
        />
      )}
      {annotationComplete && (
        <NoticeStrip tone="green" lead="核心课程完成：">
          你已经能从误差结构、离群点影响和梯度特性三个角度解释 MAE 与 MSE 的取舍。下面的概率解释是可选拓展。
        </NoticeStrip>
      )}
    </ContentBlock>
  );
}
