import { useEffect, useRef, useState } from 'react';
import { Button, Callout, ContentBlock, FormulaBlock, NoticeStrip, Question } from '../../shared/react';
import { emitTelemetry, getTelemetryState } from '../../shared/react/telemetry';
import type { LessonBlockProps } from './NumberLineBlock';
import { LOSS_GUIDE_MODULE_ID, lossGuideStateKey } from '../lessonConfig';

type ExtensionMode = 'closed' | 'opened' | 'skipped' | 'completed';

const extensionStateKey = lossGuideStateKey('control:probability-extension');

export function ProbabilityExtensionBlock({ onComplete }: LessonBlockProps) {
  const [mode, setMode] = useState<ExtensionMode>('closed');
  const [independenceComplete, setIndependenceComplete] = useState(false);
  const [logComplete, setLogComplete] = useState(false);
  const extensionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void getTelemetryState<{ mode?: ExtensionMode }>(extensionStateKey, LOSS_GUIDE_MODULE_ID).then((entry) => {
      const restored = entry?.state?.mode;
      if (active && (restored === 'opened' || restored === 'skipped' || restored === 'completed')) {
        setMode(restored);
        if (restored === 'completed') {
          setIndependenceComplete(true);
          setLogComplete(true);
        }
      }
    });
    return () => { active = false; };
  }, []);

  const updateMode = (next: ExtensionMode) => {
    setMode(next);
    emitTelemetry('control_commit', extensionRef.current, {
      state_key: extensionStateKey,
      state: { mode: next },
      value: next,
    });
  };

  const skip = () => {
    updateMode('skipped');
    onComplete();
  };

  return (
    <ContentBlock
      className="lg-react-block lg-react-extension"
      title="可选拓展：损失函数从哪里来？"
      subtitle="用 15 分钟从数据生成假设出发，推导联合似然、负对数似然以及高斯/拉普拉斯噪声对应的损失函数。"
    >
      <div ref={extensionRef} className="lg-react-extension-body">
        {mode === 'closed' && (
          <>
            <Callout
              tone="orange"
              label="选择你的课堂路径"
              text="本科核心内容已经完成。可以继续完成一条从概率模型到损失函数的推导，也可以直接进入课程总结。"
            />
            <div className="lg-react-actions">
              <Button variant="primary" hint onClick={() => updateMode('opened')}>进入 15 分钟概率推导</Button>
              <Button onClick={skip}>暂时跳过拓展</Button>
            </div>
          </>
        )}

        {mode === 'skipped' && (
          <>
            <NoticeStrip tone="blue" lead="已跳过：">
              这部分不影响核心课程完成状态，之后可以返回重新学习。
            </NoticeStrip>
            <div className="lg-react-actions">
              <Button onClick={() => updateMode('opened')}>重新进入概率推导</Button>
            </div>
          </>
        )}

        {(mode === 'opened' || mode === 'completed') && (
          <>
            <Callout
              tone="blue"
              label="从残差的生成过程开始"
              text="设 yᵢ = ŷᵢ + εᵢ。损失函数将由我们对噪声 εᵢ 的分布假设决定，而不是凭空挑选。"
            />
            <div className="lg-react-derivation-step">
              <h3>第一步：从单个样本走向整个数据集</h3>
              <FormulaBlock ariaLabel="单样本条件概率">
                p(y<sub>i</sub> | ŷ<sub>i</sub>) = p<sub>ε</sub>(y<sub>i</sub> − ŷ<sub>i</sub>)
              </FormulaBlock>
              <Question
                persistenceKey={lossGuideStateKey('likelihood-independence')}
                title="若给定模型参数后，各样本残差相互独立，整个数据集的联合似然应怎样组合？"
                options={[
                  { value: 'sum', label: '直接相加各样本概率' },
                  { value: 'product', label: '相乘各样本条件概率' },
                  { value: 'maximum', label: '只保留概率最大的样本' },
                ]}
                answer="product"
                feedback={{
                  correct: '正确。条件独立使联合概率分解为各样本条件概率的乘积。',
                  wrong: '回忆独立事件的联合概率：同时发生的概率等于各自概率相乘。',
                }}
                onCheck={(result) => setIndependenceComplete(result.ok)}
              />
            </div>

            {independenceComplete && (
              <div className="lg-react-derivation-step">
                <h3>第二步：把概率乘积变成可优化的求和目标</h3>
                <FormulaBlock ariaLabel="独立样本的联合似然">
                  p(D | θ) = ∏<sub>i=1</sub><sup>n</sup> p(y<sub>i</sub> | ŷ<sub>i</sub>(θ))
                </FormulaBlock>
                <FormulaBlock ariaLabel="数据集负对数似然">
                  −log p(D | θ) = −Σ<sub>i=1</sub><sup>n</sup> log p(y<sub>i</sub> | ŷ<sub>i</sub>(θ))
                </FormulaBlock>
                <NoticeStrip tone="blue" lead="为什么取负对数？">
                  对数把概率乘积变成求和；前面的负号把“最大化似然”改写成优化器熟悉的“最小化损失”。
                </NoticeStrip>
                <Question
                  persistenceKey={lossGuideStateKey('likelihood-log')}
                  type="judgement"
                  title="因为 log 函数单调递增，最大化似然与最小化负对数似然拥有相同的最优参数。"
                  options={[
                    { key: '对', value: 'true', label: '正确，只改变目标的表达方式' },
                    { key: '错', value: 'false', label: '错误，取对数会改变最优参数' },
                  ]}
                  answer="true"
                  feedback={{ correct: '正确。接下来只需代入具体噪声密度，就能得到对应的损失形状。' }}
                  onCheck={(result) => setLogComplete(result.ok)}
                />
              </div>
            )}

            {logComplete && (
              <div className="lg-react-derivation-step">
                <h3>第三步：代入噪声分布</h3>
                <div className="lg-react-probability-grid">
                  <section>
                    <h3>高斯噪声 ε ~ N(0, σ²)</h3>
                    <FormulaBlock ariaLabel="高斯概率密度">
                      p(ε) = 1/(√(2π)σ) · exp(−ε²/(2σ²))
                    </FormulaBlock>
                    <FormulaBlock ariaLabel="高斯负对数似然与平方误差">
                      −log p(D | θ) = 常数 + (1/(2σ²))Σ(y<sub>i</sub> − ŷ<sub>i</sub>)²
                    </FormulaBlock>
                    <p className="edu-body">固定 σ 时，最小化负对数似然等价于最小化平方误差；除以 n 后得到 MSE。</p>
                  </section>
                  <section>
                    <h3>拉普拉斯噪声 ε ~ Laplace(0, b)</h3>
                    <FormulaBlock ariaLabel="拉普拉斯概率密度">
                      p(ε) = 1/(2b) · exp(−|ε|/b)
                    </FormulaBlock>
                    <FormulaBlock ariaLabel="拉普拉斯负对数似然与绝对误差">
                      −log p(D | θ) = 常数 + (1/b)Σ|y<sub>i</sub> − ŷ<sub>i</sub>|
                    </FormulaBlock>
                    <p className="edu-body">固定 b 时，最小化负对数似然等价于最小化绝对误差；除以 n 后得到 MAE。</p>
                  </section>
                </div>
                <Question
                  persistenceKey={lossGuideStateKey('probability-extension')}
                  title="若残差分布具有比高斯分布更重的尾部，且极端误差偶尔出现，哪组建模更自然？"
                  options={[
                    { value: 'gaussian-mse', label: '高斯噪声假设 + MSE' },
                    { value: 'laplace-mae', label: '拉普拉斯噪声假设 + MAE' },
                  ]}
                  answer="laplace-mae"
                  feedback={{
                    correct: '正确。损失函数可以看成数据生成假设的编码，而不只是人为挑选的公式。',
                    wrong: '比较两个分布的尾部：拉普拉斯分布允许极端残差拥有更高概率。',
                  }}
                  onCheck={(result) => {
                    if (result.ok) {
                      updateMode('completed');
                      onComplete();
                    }
                  }}
                />
                {mode === 'completed' && (
                  <NoticeStrip tone="green" lead="推导完成：">
                    你已经从条件独立、联合似然和负对数似然出发，推导出高斯噪声对应 MSE、拉普拉斯噪声对应 MAE。
                  </NoticeStrip>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </ContentBlock>
  );
}
