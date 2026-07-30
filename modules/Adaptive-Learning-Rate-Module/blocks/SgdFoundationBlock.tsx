import { useState } from 'react';
import {
  Button,
  ContentBlock,
  FormulaBlock,
  FormulaTerm,
  NoticeStrip,
  Question,
  RangeControl,
  ValueTile,
  emitTelemetry,
} from '../../shared/react';

interface SgdFoundationBlockProps {
  onComplete?: () => void;
}

const INITIAL_PARAMETER = 4;

export function SgdFoundationBlock({ onComplete }: SgdFoundationBlockProps) {
  const [learningRate, setLearningRate] = useState(.25);
  const [parameter, setParameter] = useState(INITIAL_PARAMETER);
  const [hasUpdated, setHasUpdated] = useState(false);
  const gradient = parameter;
  const nextParameter = parameter - learningRate * gradient;
  const loss = .5 * parameter ** 2;
  const nextLoss = .5 * nextParameter ** 2;

  function updateOnce(button: HTMLButtonElement) {
    setParameter(nextParameter);
    setHasUpdated(true);
    emitTelemetry('optimizer_step', button, {
      state_key: 'experiment:adaptive-lr-sgd-v1',
      optimizer: 'sgd',
      learning_rate: learningRate,
      parameter_before: parameter,
      gradient,
      parameter_after: nextParameter,
      state: { learning_rate: learningRate, parameter: nextParameter, has_updated: true },
    });
  }

  function reset() {
    setParameter(INITIAL_PARAMETER);
    setHasUpdated(false);
  }

  return (
    <ContentBlock
      className="alr-block"
      title="SGD：沿着梯度的反方向走一步"
      subtitle="SGD 是后续优化器的标准骨架：先算当前梯度，再用一个全局学习率决定步长。"
    >
      <div className="alr-concept-pair">
        <section><span>梯度 g</span><strong>告诉我们哪边是上坡</strong><p>要降低损失，就朝梯度的反方向移动。</p></section>
        <section><span>学习率 η</span><strong>决定这一步走多远</strong><p>SGD 对所有参数使用同一套预先设定的步幅规则。</p></section>
      </div>

      <FormulaBlock ariaLabel="SGD 参数更新公式">
        <FormulaTerm tooltip="下一步的参数">θ<sub>t+1</sub></FormulaTerm>
        {' = '}
        <FormulaTerm tooltip="当前参数">θ<sub>t</sub></FormulaTerm>
        {' − '}
        <FormulaTerm tooltip="学习率：控制整体步幅">η</FormulaTerm>
        {' · '}
        <FormulaTerm tooltip="当前梯度：指出损失上升最快的方向">g<sub>t</sub></FormulaTerm>
      </FormulaBlock>

      <section className="alr-lab" aria-labelledby="alr-sgd-lab-title">
        <header>
          <div><span>一步更新实验</span><h3 id="alr-sgd-lab-title">把小球往碗底推</h3></div>
          <div className="alr-lab-actions">
            <Button onClick={reset}>回到起点</Button>
            <Button variant="primary" hint={!hasUpdated} onClick={(event) => updateOnce(event.currentTarget)}>按 SGD 更新一步</Button>
          </div>
        </header>
        <RangeControl
          label="全局学习率 η"
          min=".1"
          max="1.2"
          step=".05"
          value={learningRate}
          digits={2}
          scale={['谨慎', '激进']}
          onChange={(event) => {
            setLearningRate(Number(event.currentTarget.value));
            reset();
          }}
        />
        <div className="alr-bowl" role="img" aria-label={`参数当前位置 ${parameter.toFixed(2)}，碗底在 0`}>
          <svg viewBox="0 0 640 230" aria-hidden="true">
            <path className="alr-bowl-curve" d="M40 35 Q320 385 600 35" />
            <line x1="320" x2="320" y1="190" y2="205" />
            <text x="320" y="222">最小值 θ = 0</text>
            <circle
              className="alr-ball"
              cx={320 + parameter * 55}
              cy={190 - parameter ** 2 * 9.5}
              r="13"
            />
          </svg>
        </div>
        <div className="alr-values">
          <ValueTile tone="blue" label="当前参数 θ" value={parameter.toFixed(2)} />
          <ValueTile tone="orange" label="当前梯度 g = θ" value={gradient.toFixed(2)} />
          <ValueTile tone={nextLoss < loss ? 'success' : 'danger'} label="更新后的 Loss" value={nextLoss.toFixed(2)} />
        </div>
        <NoticeStrip tone={learningRate > 1 ? 'red' : learningRate > .7 ? 'orange' : 'blue'} lead="当前这一步：">
          {learningRate > 1
            ? `会越过碗底，从 θ=${parameter.toFixed(2)} 跳到 θ=${nextParameter.toFixed(2)}。方向没错，但步子偏大。`
            : learningRate > .7
              ? `会靠近碗底，也可能越过最低点；新的 θ=${nextParameter.toFixed(2)}。`
              : `沿梯度反方向靠近碗底，新的 θ=${nextParameter.toFixed(2)}。`}
        </NoticeStrip>
      </section>

      {hasUpdated && (
        <Question
          persistenceKey="adaptive-lr-sgd-direction-v1"
          type="choice"
          title="若当前梯度 g 为正，SGD 为了降低损失应该怎样更新参数？"
          options={[
            { key: 'A', value: 'subtract', label: '从参数中减去 η·g，向负方向移动' },
            { key: 'B', value: 'add', label: '给参数加上 η·g，继续向正方向移动', wrongFeedback: '正梯度表示向正方向会让损失上升，因此应走相反方向。' },
            { key: 'C', value: 'ignore', label: '不看梯度，只按固定距离随机移动', wrongFeedback: 'SGD 的方向来自梯度；固定的是学习率规则，不是随机方向。' },
          ]}
          answer="subtract"
          feedback={{ correct: '正确。SGD 的核心就是“当前参数 − 学习率 × 当前梯度”。' }}
          onCheck={(result) => { if (result.ok) onComplete?.(); }}
        />
      )}
    </ContentBlock>
  );
}
