import { useEffect, useRef, useState } from 'react';
import { Button, Callout, ContentBlock, FormulaBlock, NoticeStrip, Question } from '../../shared/react';
import { emitTelemetry, getTelemetryState } from '../../shared/react/telemetry';
import type { LessonBlockProps } from './NumberLineBlock';
import { LOSS_GUIDE_MODULE_ID, lossGuideStateKey } from '../lessonConfig';

type ExtensionMode = 'closed' | 'opened' | 'skipped' | 'completed';

const extensionStateKey = lossGuideStateKey('control:probability-extension');

export function ProbabilityExtensionBlock({ onComplete }: LessonBlockProps) {
  const [mode, setMode] = useState<ExtensionMode>('closed');
  const extensionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void getTelemetryState<{ mode?: ExtensionMode }>(extensionStateKey, LOSS_GUIDE_MODULE_ID).then((entry) => {
      const restored = entry?.state?.mode;
      if (active && (restored === 'opened' || restored === 'skipped' || restored === 'completed')) {
        setMode(restored);
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
      subtitle="用 15 分钟把经验选择连接到概率建模：最小化损失，也可以理解为最大化观测数据出现的可能性。"
    >
      <div ref={extensionRef} className="lg-react-extension-body">
        {mode === 'closed' && (
          <>
            <Callout
              tone="orange"
              label="选择你的课堂路径"
              text="本科核心内容已经完成。可以继续推导高斯/拉普拉斯噪声与 MSE/MAE 的关系，也可以直接进入课程总结。"
            />
            <div className="lg-react-actions">
              <Button variant="primary" hint onClick={() => updateMode('opened')}>进入 15 分钟概率拓展</Button>
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
              <Button onClick={() => updateMode('opened')}>重新进入概率拓展</Button>
            </div>
          </>
        )}

        {(mode === 'opened' || mode === 'completed') && (
          <>
            <Callout
              tone="blue"
              label="统一视角"
              text="设观测值满足 y = ŷ + ε。选择不同的噪声分布，就会得到不同形状的负对数似然，也就得到不同的损失函数。"
            />
            <div className="lg-react-probability-grid">
              <section>
                <h3>高斯噪声 ε ~ N(0, σ²)</h3>
                <FormulaBlock ariaLabel="高斯负对数似然与平方误差">
                  −log p(y | ŷ) = 常数 + (y − ŷ)² / (2σ²)
                </FormulaBlock>
                <p className="edu-body">固定 σ 时，最大化似然等价于最小化平方误差；对数据集取平均就得到 MSE。</p>
              </section>
              <section>
                <h3>拉普拉斯噪声 ε ~ Laplace(0, b)</h3>
                <FormulaBlock ariaLabel="拉普拉斯负对数似然与绝对误差">
                  −log p(y | ŷ) = 常数 + |y − ŷ| / b
                </FormulaBlock>
                <p className="edu-body">固定 b 时，最大化似然等价于最小化绝对误差；对数据集取平均就得到 MAE。</p>
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
              <NoticeStrip tone="green" lead="拓展完成：">
                你已经把 MAE 与 MSE 的经验性质连接到了噪声分布和最大似然估计。
              </NoticeStrip>
            )}
          </>
        )}
      </div>
    </ContentBlock>
  );
}
