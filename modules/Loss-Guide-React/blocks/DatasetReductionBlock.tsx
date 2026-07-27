import { useState } from 'react';
import { Callout, ContentBlock, FormulaBlock, NoticeStrip, Question, ValueTile } from '../../shared/react';
import type { LessonBlockProps } from './NumberLineBlock';
import { absoluteError, calculateLossMetrics, signedError, squaredError, type LossSample } from '../model/lossMath';
import { lossGuideStateKey } from '../lessonConfig';

const samples: LossSample[] = [
  { id: '1', target: 3, prediction: 0 },
  { id: '2', target: 5, prediction: 4 },
  { id: '3', target: 7, prediction: 8 },
  { id: '4', target: 9, prediction: 12 },
];

const metrics = calculateLossMetrics(samples);

export function DatasetReductionBlock({ onComplete }: LessonBlockProps) {
  const [calculated, setCalculated] = useState(false);

  return (
    <ContentBlock
      className="lg-react-block"
      title="从一个样本走向整个数据集"
      subtitle="训练不会只看一个样本。先对每个样本计算损失，再用 reduction 把它们汇总成一个可优化的标量。"
    >
      <Callout
        tone="blue"
        label="先观察一个陷阱"
        text="下面四个有符号误差恰好互相抵消。若直接平均误差，模型看起来像是完全没错。"
      />

      <div className="lg-react-table-wrap">
        <table className="lg-react-data-table">
          <caption>四个回归样本的误差与单样本损失</caption>
          <thead>
            <tr>
              <th scope="col">样本</th>
              <th scope="col">真实值 y</th>
              <th scope="col">预测值 ŷ</th>
              <th scope="col">误差 e = ŷ − y</th>
              <th scope="col">|e|</th>
              <th scope="col">e²</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((sample) => (
              <tr key={sample.id}>
                <th scope="row">S{sample.id}</th>
                <td>{sample.target}</td>
                <td>{sample.prediction}</td>
                <td>{signedError(sample.target, sample.prediction)}</td>
                <td>{absoluteError(sample.target, sample.prediction)}</td>
                <td>{squaredError(sample.target, sample.prediction)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lg-react-formula-grid">
        <FormulaBlock ariaLabel="平均绝对误差公式">
          L<sub>MAE</sub> = (1/n) Σ<sub>i=1</sub><sup>n</sup> |ŷ<sub>i</sub> − y<sub>i</sub>|
        </FormulaBlock>
        <FormulaBlock ariaLabel="均方误差公式">
          L<sub>MSE</sub> = (1/n) Σ<sub>i=1</sub><sup>n</sup> (ŷ<sub>i</sub> − y<sub>i</sub>)²
        </FormulaBlock>
      </div>
      <NoticeStrip tone="blue" lead="记号约定：">
        本模块用小写 ℓ 表示单样本损失，用大写 L 表示对数据集或批次完成 reduction 后的损失。
      </NoticeStrip>

      <Question
        persistenceKey={lossGuideStateKey('dataset-reduction')}
        type="fill"
        title="平均有符号误差 = ____，MAE = ____，MSE = ____。"
        blanks={[
          { label: '平均有符号误差', placeholder: '均值' },
          { label: 'MAE', placeholder: 'MAE' },
          { label: 'MSE', placeholder: 'MSE' },
        ]}
        answer={['0', '2', '5']}
        feedback={{
          correct: '计算正确。误差均值虽然为 0，但 MAE 和 MSE 都清楚地记录了预测偏差。',
          wrong: '先逐列求和，再除以样本数 n = 4。注意平方误差列为 9、1、1、9。',
        }}
        onCheck={(result) => setCalculated(result.ok)}
      />

      {calculated && (
        <>
          <div className="lg-react-value-grid lg-react-value-grid--three">
            <ValueTile tone="danger" label="平均有符号误差" value={metrics.meanSignedError.toFixed(1)} />
            <ValueTile tone="orange" label="MAE" value={metrics.mae.toFixed(1)} />
            <ValueTile tone="blue" label="MSE" value={metrics.mse.toFixed(1)} />
          </div>
          <Question
            persistenceKey={lossGuideStateKey('reduction-reason')}
            type="judgement"
            title="平均有符号误差可以直接作为回归训练的损失，因为正负误差会互相抵消。"
            options={[
              { key: '对', value: 'true', label: '可以，抵消后更稳定' },
              { key: '错', value: 'false', label: '不可以，抵消会掩盖真实偏差' },
            ]}
            answer="false"
            feedback={{ correct: '正确。绝对值或平方会阻止正负误差互相抵消。' }}
            onCheck={(result) => {
              if (result.ok) onComplete();
            }}
          />
        </>
      )}
    </ContentBlock>
  );
}
