import { useEffect, useRef, useState } from 'react';
import { Button, Callout, ContentBlock, FormulaBlock, FormulaTerm, NoticeStrip, Question, ValueTile } from '../../shared/react';
import { emitTelemetry, getTelemetryState } from '../../shared/react/telemetry';
import type { LessonBlockProps } from './NumberLineBlock';
import { LOSS_GUIDE_MODULE_ID, lossGuideStateKey } from '../lessonConfig';

const parameterStateKey = lossGuideStateKey('control:parameter-update');
const input = 2;
const target = 5;
const initialWeight = 1;
const bias = 0;
const learningRate = 0.1;
const initialPrediction = initialWeight * input + bias;
const predictionGradient = 2 * (initialPrediction - target);
const modelGradient = input;
const weightGradient = predictionGradient * modelGradient;
const updatedWeight = initialWeight - learningRate * weightGradient;
const updatedPrediction = updatedWeight * input + bias;
const initialLoss = (initialPrediction - target) ** 2;
const updatedLoss = (updatedPrediction - target) ** 2;

export function ParameterUpdateBlock({ onComplete }: LessonBlockProps) {
  const [chainRuleComplete, setChainRuleComplete] = useState(false);
  const [updated, setUpdated] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void getTelemetryState<{ updated?: boolean }>(parameterStateKey, LOSS_GUIDE_MODULE_ID).then((entry) => {
      if (active && entry?.state?.updated === true) {
        setChainRuleComplete(true);
        setUpdated(true);
      }
    });
    return () => { active = false; };
  }, []);

  const setUpdateState = (next: boolean) => {
    setUpdated(next);
    emitTelemetry('control_commit', rootRef.current, {
      state_key: parameterStateKey,
      state: { updated: next },
      value: next,
    });
  };

  return (
    <ContentBlock
      className="lg-react-block"
      title="模型不会直接修改预测值：梯度怎样传到参数？"
      subtitle="前面求出了损失对预测值的梯度。真正训练时，还要通过链式法则把更新信号传给模型参数。"
    >
      <div ref={rootRef} className="lg-react-parameter-update">
        <Callout
          tone="blue"
          label="一个最小线性模型"
          text="设 ŷ = wx + b，取 x = 2、y = 5、初始 w = 1、b = 0，并使用单样本平方损失 ℓ = (ŷ − y)²。先手算梯度，再执行一次参数更新。"
        />
        <div className="lg-react-formula-grid">
          <FormulaBlock ariaLabel="线性模型预测公式">
            <FormulaTerm tooltip="模型参数 w 决定输入 x 对预测的影响">ŷ = wx + b</FormulaTerm>
            {' '}= 1 × 2 + 0 = 2
          </FormulaBlock>
          <FormulaBlock ariaLabel="当前单样本平方损失">
            ℓ = (ŷ − y)² = (2 − 5)² = 9
          </FormulaBlock>
        </div>
        <FormulaBlock ariaLabel="链式法则计算参数梯度">
          <FormulaTerm tooltip="损失对参数 w 的梯度决定 w 的更新方向">∂ℓ/∂w</FormulaTerm>
          {' '}={' '}
          <FormulaTerm tooltip="损失对预测值的梯度">∂ℓ/∂ŷ</FormulaTerm>
          {' '}·{' '}
          <FormulaTerm tooltip="预测值对参数 w 的梯度；在线性模型中等于输入 x">∂ŷ/∂w</FormulaTerm>
        </FormulaBlock>
        <Question
          persistenceKey={lossGuideStateKey('parameter-chain-rule')}
          type="fill"
          title="∂ℓ/∂ŷ = ____，∂ŷ/∂w = ____，因此 ∂ℓ/∂w = ____。"
          blanks={[
            { label: '损失对预测的梯度', placeholder: '∂ℓ/∂ŷ' },
            { label: '预测对参数的梯度', placeholder: '∂ŷ/∂w' },
            { label: '损失对参数的梯度', placeholder: '∂ℓ/∂w' },
          ]}
          answer={['-6', '2', '-12']}
          feedback={{
            correct: '正确。负的参数梯度表示增大 w 会降低当前损失。',
            wrong: '先算 ∂ℓ/∂ŷ = 2(ŷ−y)，再算 ∂ŷ/∂w = x，最后将两项相乘。',
          }}
          onCheck={(result) => setChainRuleComplete(result.ok)}
        />

        {chainRuleComplete && (
          <>
            <FormulaBlock ariaLabel="梯度下降更新权重">
              w′ = w − η·∂ℓ/∂w = 1 − 0.1 × (−12) = 2.2
            </FormulaBlock>
            <div className="lg-react-actions">
              <Button variant="primary" hint={!updated} onClick={() => setUpdateState(true)}>执行一次参数更新</Button>
              <Button disabled={!updated} onClick={() => setUpdateState(false)}>恢复初始参数</Button>
            </div>
          </>
        )}

        {updated && (
          <>
            <div className="lg-react-value-grid lg-react-value-grid--four">
              <ValueTile tone="blue" label="更新后 w" value={updatedWeight.toFixed(1)} />
              <ValueTile tone="blue" label="更新后 ŷ" value={updatedPrediction.toFixed(1)} />
              <ValueTile tone="orange" label="更新前损失" value={initialLoss.toFixed(2)} />
              <ValueTile tone="success" label="更新后损失" value={updatedLoss.toFixed(2)} />
            </div>
            <NoticeStrip tone="green" lead="参数更新有效：">
              w 从 1.0 增至 2.2，预测从 2.0 靠近真实值 5.0，平方损失从 9.00 降至 0.36。
            </NoticeStrip>
            <Question
              persistenceKey={lossGuideStateKey('parameter-update-meaning')}
              type="judgement"
              title="训练线性模型时，优化器直接更新的是参数 w 和 b；预测值 ŷ 会随着参数变化而间接改变。"
              options={[
                { key: '对', value: 'true', label: '正确，链式法则连接了损失、预测和参数' },
                { key: '错', value: 'false', label: '错误，优化器只需要直接修改 ŷ' },
              ]}
              answer="true"
              feedback={{ correct: '正确。这一步把“损失函数的梯度”真正连接到了模型训练。' }}
              onCheck={(result) => {
                if (result.ok) onComplete();
              }}
            />
          </>
        )}
      </div>
    </ContentBlock>
  );
}
