import { useState } from 'react';
import { Callout } from '../../shared/react/feedback/Callout';
import { ContentBlock } from '../../shared/react/layout/ContentBlock';
import { Question } from '../../shared/react/learning/Question';
import type { LessonBlockProps } from './NumberLineBlock';
import { CrossEntropySection, KnowledgePoint } from './rigor';

export function CrossEntropyBlock({ onComplete }: LessonBlockProps) {
  const [bceComplete, setBceComplete] = useState(false);
  const [gradientComplete, setGradientComplete] = useState(false);

  return (
    <ContentBlock
      className="lg-react-block"
      title="分类问题与交叉熵"
      subtitle="回归任务用 L1/L2 衡量数值差距；分类任务需要衡量概率分布之间的差异——交叉熵是分类损失的标准选择。"
    >
      <CrossEntropySection />

      <Callout
        tone="orange"
        label="你的任务"
        text="阅读上面的推导，完成两道判断题，验证你对交叉熵的理解。"
      />

      <Question
        persistenceKey="bce-basics"
        type="judgement"
        title="二分类交叉熵 = -[y log(p) + (1-y) log(1-p)]。当 y=1 时，损失 = -log(p)，所以预测概率 p 趋近 1 时损失趋近 0，p 趋近 0 时损失趋近正无穷。这说明交叉熵对「自信地犯错」施加极大的惩罚。"
        options={[
          { key: '对', value: 'true', label: '是，交叉熵会严厉惩罚高置信度的错误预测' },
          { key: '错', value: 'false', label: '不是，交叉熵对所有错误一视同仁', wrongFeedback: '交叉熵包含 log(p)，当 p 趋近 0 且 y=1 时 -log(p) 趋近正无穷，远大于 p=0.5 时的 -log(0.5) 约等于 0.693。自信犯错比犹豫犯错的代价大得多。' },
        ]}
        answer="true"
        feedback={{ correct: '正确。交叉熵对高置信度错误施加的惩罚远超低置信度错误，这促使模型在不确定时保持谨慎。' }}
        onCheck={(result) => setBceComplete(result.ok)}
      />

      {bceComplete && (
        <KnowledgePoint ariaLabel="二分类交叉熵知识点" title="知识点：交叉熵惩罚的是「自信犯错」">
          与 L1/L2 不同，交叉熵的 log 函数在 p 趋近 0 时趋于负无穷。这意味着模型如果给出 p=0.01 却说 y=1（完全猜反），接收到的梯度信号远强于给出 p=0.5。这种不对称惩罚是交叉熵驱动概率校准的关键机制。
        </KnowledgePoint>
      )}

      {bceComplete && (
        <Question
          persistenceKey="ce-vs-mse-gradient"
          type="judgement"
          title="分类问题可以用 MSE，但交叉熵 + softmax 的梯度为 (p_k - y_k)，简洁且无饱和；而 MSE + sigmoid 的梯度包含 p(1-p) 因子，在 p 趋近 0 或 p 趋近 1 时趋于 0。因此分类任务中交叉熵收敛更快、更稳定。"
          options={[
            { key: '对', value: 'true', label: '是，梯度不饱和是交叉熵的核心优势' },
            { key: '错', value: 'false', label: '不是，MSE 的梯度饱和不影响训练', wrongFeedback: 'MSE+sigmoid 在 p 约等于 0 或 1 时，p(1-p) 趋近 0 会让梯度几乎消失，即使预测完全错误也几乎不更新参数。这是实验可验证的事实。' },
          ]}
          answer="true"
          feedback={{ correct: '正确。CE+softmax 的梯度不含饱和因子，这是它成为分类标准损失的根本原因。' }}
          onCheck={(result) => {
            if (result.ok) {
              setGradientComplete(true);
              onComplete();
            }
          }}
        />
      )}

      {gradientComplete && (
        <KnowledgePoint ariaLabel="交叉熵梯度知识点" title="知识点：数学形式的简洁背后是建模假设的匹配">
          交叉熵并不是「凭空更好」——它来源于对标签分布的伯努利/范畴分布假设下的最大似然估计。梯度不饱和只是这一假设的自然结果。选择损失函数时，应先问「数据标签服从什么分布」，再推导对应的损失，而不是先选损失再找理由。
        </KnowledgePoint>
      )}
    </ContentBlock>
  );
}
