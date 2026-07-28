import { useState } from 'react';
import { Callout, ContentBlock, NoticeStrip, Question } from '../../shared/react';
import type { LessonBlockProps } from './NumberLineBlock';
import { lossGuideStateKey } from '../lessonConfig';

export function LossChoiceBlock({ onComplete }: LessonBlockProps) {
  const [sensorComplete, setSensorComplete] = useState(false);
  const [annotationComplete, setAnnotationComplete] = useState(false);
  const [huberComplete, setHuberComplete] = useState(false);

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
          }}
        />
      )}
      {annotationComplete && (
        <Question
          persistenceKey={lossGuideStateKey('loss-choice-huber')}
          title="一个回归任务的大多数误差较小，但偶尔出现离群点；同时希望零点附近保持平滑、极端误差的梯度受到限制。优先选择："
          options={[
            { value: 'mae', label: '只使用 MAE' },
            { value: 'mse', label: '只使用 MSE' },
            { value: 'huber', label: '使用带合适阈值 δ 的 Huber Loss' },
          ]}
          answer="huber"
          feedback={{
            correct: '合理。Huber Loss 在小误差区域保留二次损失的平滑性，在大误差区域限制梯度。',
            wrong: '回想上一环节：哪个损失会在 |e| 超过 δ 后切换到线性增长？',
          }}
          onCheck={(result) => {
            setHuberComplete(result.ok);
            if (result.ok) onComplete();
          }}
        />
      )}
      {huberComplete && (
        <>
          <div className="lg-react-table-wrap">
            <table className="lg-react-data-table lg-react-decision-table">
              <caption>回归损失函数决策表</caption>
              <thead>
                <tr>
                  <th scope="col">数据与任务特征</th>
                  <th scope="col">常见选择</th>
                  <th scope="col">梯度特性</th>
                  <th scope="col">主要风险</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">近似高斯噪声，重视大偏差</th>
                  <td>MSE</td>
                  <td>随误差线性增大</td>
                  <td>容易受离群点支配</td>
                </tr>
                <tr>
                  <th scope="row">重尾噪声或偶发误标</th>
                  <td>MAE</td>
                  <td>非零处大小固定</td>
                  <td>零点不可导</td>
                </tr>
                <tr>
                  <th scope="row">小误差平滑、大误差稳健</th>
                  <td>Huber</td>
                  <td>连续且在大误差处受限</td>
                  <td>需要选择阈值 δ</td>
                </tr>
              </tbody>
            </table>
          </div>
          <NoticeStrip tone="green" lead="核心课程完成：">
            你已经能从误差增长、离群点影响、参数梯度、噪声假设和任务代价五个角度选择或设计回归损失函数。
          </NoticeStrip>
        </>
      )}
    </ContentBlock>
  );
}
