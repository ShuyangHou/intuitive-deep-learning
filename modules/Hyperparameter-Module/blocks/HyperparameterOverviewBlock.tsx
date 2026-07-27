import { useState } from 'react';
import { ContentBlock, NoticeStrip, Question, RangeControl } from '../../shared/react';

interface HyperparameterOverviewBlockProps { onComplete?: () => void; }

type SliderRow = {
  id: string;
  abbr: string;
  name: string;
  effect: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  format: (value: number) => string;
  low: string;
  middle: string;
  high: string;
};

const rows: SliderRow[] = [
  { id: 'lr', abbr: 'lr', name: '学习率', effect: '控制每次参数更新的步幅', min: 0.00001, max: 0.1, step: 0.00001, initial: 0.001, format: (value) => value.toExponential(0), low: '收敛慢，训练通常更稳定', middle: '速度与稳定性需要平衡', high: '收敛快，但可能波动或发散' },
  { id: 'bs', abbr: 'bs', name: 'Batch Size', effect: '一次更新使用的样本数', min: 8, max: 2048, step: 8, initial: 128, format: (value) => String(Math.round(value)), low: '梯度噪声更大，显存更省', middle: '噪声与效率相对平衡', high: '梯度更平滑，但更耗显存' },
  { id: 'epoch', abbr: 'epoch', name: '训练轮数', effect: '完整遍历训练集的次数', min: 1, max: 200, step: 1, initial: 40, format: (value) => String(Math.round(value)), low: '可能尚未学充分', middle: '需要结合验证表现判断', high: '可能过拟合，训练时间更长' },
  { id: 'wd', abbr: 'wd', name: '权重衰减', effect: '抑制参数过度变大，提供正则化', min: 0, max: 0.1, step: 0.001, initial: 0.01, format: (value) => value.toFixed(3), low: '约束更弱，可能过拟合', middle: '正则化程度适中', high: '约束更强，可能欠拟合' },
  { id: 'dropout', abbr: 'dropout', name: '随机失活率', effect: '训练时随机屏蔽部分神经元', min: 0, max: 0.5, step: 0.01, initial: 0.1, format: (value) => value.toFixed(2), low: '正则化更弱', middle: '正则化程度适中', high: '正则化更强，但可能学不够' },
  { id: 'clip', abbr: 'clip', name: '梯度裁剪阈值', effect: '限制梯度范数，防止更新突然过大', min: 0.5, max: 5, step: 0.1, initial: 1, format: (value) => value.toFixed(1), low: '裁剪更强，可能限制学习', middle: '对异常梯度适度约束', high: '裁剪更弱，异常梯度风险更高' },
  { id: 'channels', abbr: 'c', name: '通道数', effect: '决定每层可学习的特征数量', min: 16, max: 1024, step: 16, initial: 128, format: (value) => String(Math.round(value)), low: '表达能力较弱，计算较省', middle: '表达能力与计算量平衡', high: '表达能力更强，但更耗算力' },
  { id: 'dim', abbr: 'dim', name: '隐藏维度', effect: '决定 token 表示和主干宽度', min: 128, max: 4096, step: 128, initial: 768, format: (value) => String(Math.round(value)), low: '容量和计算量较小', middle: '容量与计算量平衡', high: '容量更大，但计算更重' },
  { id: 'warmup', abbr: 'warmup', name: '学习率预热步数/比例', effect: '让学习率从较小值逐渐升高', min: 0, max: 10, step: 0.5, initial: 2, format: (value) => `${value.toFixed(1)}%`, low: '更快进入正常学习率', middle: '预热程度适中', high: '训练初期更稳，但有效训练变慢' },
];

const PARAMETERS_PER_PAGE = 4;

function interpretation(row: SliderRow, value: number) {
  const position = (value - row.min) / (row.max - row.min);
  if (position < .34) return row.low;
  if (position > .66) return row.high;
  return row.middle;
}

function valueBand(row: SliderRow, value: number) {
  const position = (value - row.min) / (row.max - row.min);
  if (position < .34) return 'low';
  if (position > .66) return 'high';
  return 'middle';
}

export function HyperparameterOverviewBlock({ onComplete }: HyperparameterOverviewBlockProps) {
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(rows.map((row) => [row.id, row.initial])));
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(rows.length / PARAMETERS_PER_PAGE);
  const pageStart = page * PARAMETERS_PER_PAGE;
  const visibleRows = rows.slice(pageStart, pageStart + PARAMETERS_PER_PAGE);

  return (
    <ContentBlock className="hp-block" title="先分清参数与超参数" subtitle="参数在训练中学到；超参数决定模型怎样训练。">
      <div className="ds-parameter-compare">
        <section><span>参数 Parameters</span><strong>模型在训练中学到</strong><p>例如权重、偏置，由反向传播不断更新。</p></section>
        <section><span>超参数 Hyperparameters</span><strong>由我们设定或搜索</strong><p>例如学习率、Batch Size、层数，决定怎样训练。</p></section>
      </div>
      <section className="ds-parameter-table-section">
        <header className="ds-parameter-table-head">
          <div><h3>常见超参数</h3><p>拖动滑杆，观察取值变化通常带来的影响。</p></div>
          <nav className="ds-parameter-pagination" aria-label="超参数分页">
            <span>{page + 1} / {pageCount}</span>
            <span className="ds-parameter-page-tabs" role="tablist" aria-label="超参数页组">
              {Array.from({ length: pageCount }, (_, index) => (
                <button
                  className={index === page ? 'is-current' : undefined}
                  type="button"
                  role="tab"
                  aria-label={`查看第 ${index + 1} 页超参数`}
                  aria-selected={index === page}
                  key={index}
                  onClick={() => setPage(index)}
                ><span aria-hidden="true" /></button>
              ))}
            </span>
          </nav>
        </header>
        <div className="ds-parameter-list" key={page}>
          {visibleRows.map((row) => {
            const value = values[row.id] ?? row.initial;
            return <article className="ds-parameter-row" key={row.id}>
              <header className="ds-param-identity"><code>{row.abbr}</code><strong>{row.name}</strong></header>
              <p className="ds-param-effect">{row.effect}</p>
              <div className="ds-param-control"><RangeControl label="取值倾向" aria-label={`${row.name}取值倾向`} min={row.min} max={row.max} step={row.step} value={value} scale={['较小', '较大']} formatValue={() => valueBand(row, value) === 'low' ? '较小' : valueBand(row, value) === 'high' ? '较大' : '适中'} onChange={(event) => { const nextValue = Number(event.currentTarget.value); setValues((current) => ({ ...current, [row.id]: nextValue })); }} /></div>
              <NoticeStrip tone="blue" className="ds-param-reading" lead="当前倾向：">{interpretation(row, value)}</NoticeStrip>
            </article>;
          })}
        </div>
        <NoticeStrip tone="blue" lead="注意：">这些只是常见趋势，合适的取值需要通过验证集比较。</NoticeStrip>
      </section>
      <Question
        persistenceKey="hyperparameter-definition-v4"
        type="choice"
        title="哪一句最准确地描述了超参数？"
        options={[
          { key: 'A', value: 'configured', label: '由开发者设定或通过搜索选择，不由模型的梯度更新直接学得，用于控制训练过程或模型结构的配置' },
          { key: 'B', value: 'gradient', label: '由训练数据决定，并在反向传播中随梯度不断更新的量', wrongFeedback: '这是模型参数，例如权重和偏置；它们由梯度直接更新。' },
          { key: 'C', value: 'metric', label: '不参与梯度更新，用来衡量模型训练效果的所有数值，例如准确率和损失', wrongFeedback: '这是评价指标；指标描述表现，但不负责配置训练过程或模型结构。' },
          { key: 'D', value: 'validation', label: '由验证集在训练结束后自动计算，并直接写入模型作为最终参数的配置', wrongFeedback: '验证集用于比较超参数方案，不会自动生成配置或把它写成模型参数。' },
        ]}
        answer="configured"
        feedback={{ correct: '正确。超参数不由梯度直接学得，而要通过验证表现进行选择。', wrong: '超参数由人设定或搜索，用来控制训练过程或模型结构。' }}
        onCheck={(result) => { if (result.ok) onComplete?.(); }}
      />
    </ContentBlock>
  );
}
