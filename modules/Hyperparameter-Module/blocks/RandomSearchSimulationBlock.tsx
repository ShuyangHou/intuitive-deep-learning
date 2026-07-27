import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, ContentBlock, PlotlyChart, Question, RangeControl, Select, type PlotlyLayout, type PlotlyTrace } from '../../shared/react';

interface RandomSearchSimulationBlockProps { onComplete?: () => void; }
type ParameterKey = 'learningRate' | 'weightDecay' | 'dropout';
type Distribution = 'uniform' | 'log-uniform';
type DistributionMap = Record<ParameterKey, Distribution>;
type CenterMap = Record<ParameterKey, number>;
type Sample = { id: number; learningRate: number; weightDecay: number; dropout: number; score: number };
type LandscapeProfile = 'plateau' | 'sharp' | 'multimodal';
type Landscape = { peak: number; optimum: { lr: number; wd: number; dropout: number }; phases: [number, number, number]; profile: LandscapeProfile };
type Scenario = Landscape & { samples: Sample[]; referenceMaximum: number };

const DEFAULT_BUDGET = 8;
const defaultDistributions: DistributionMap = { learningRate: 'log-uniform', weightDecay: 'uniform', dropout: 'uniform' };
const defaultCenters: CenterMap = { learningRate: .5, weightDecay: .5, dropout: .5 };
const parameterConfigs: Array<{ key: ParameterKey; abbr: string; name: string; range: string }> = [
  { key: 'learningRate', abbr: 'lr', name: 'Learning Rate', range: '1e−5 ～ 1e−2' },
  { key: 'weightDecay', abbr: 'wd', name: 'Weight Decay', range: '0 ～ 0.1' },
  { key: 'dropout', abbr: 'dropout', name: 'Dropout', range: '0 ～ 0.5' },
];
const distributionOptions = [{ value: 'uniform', label: 'Uniform' }, { value: 'log-uniform', label: 'Log-Uniform' }];
const landscapePresets: Array<{ value: LandscapeProfile; label: string; description: string; landscape: Landscape }> = [
  { value: 'plateau', label: '平缓曲面', description: '较大范围内性能接近，容易找到稳定的可用方案。', landscape: { peak: 95.8, optimum: { lr: .55, wd: .38, dropout: .42 }, phases: [.8, 2.1, 4.3], profile: 'plateau' } },
  { value: 'sharp', label: '尖峰曲面', description: '高性能区域很小，采样范围和搜索轮数更关键。', landscape: { peak: 97.2, optimum: { lr: .31, wd: .68, dropout: .27 }, phases: [2.4, .6, 3.7], profile: 'sharp' } },
  { value: 'multimodal', label: '多峰曲面', description: '存在多个局部好区域，少量实验可能过早停在次优方案。', landscape: { peak: 96.5, optimum: { lr: .72, wd: .29, dropout: .66 }, phases: [4.8, 1.7, .4], profile: 'multimodal' } },
];

function formatScientific(value: number) {
  return value.toExponential(1).replace('.0e', 'e').replace('e-', 'e−');
}

function randomPositions(budget: number, center: number) {
  const bias = 1 + Math.abs(center - .5) * 3.2;
  return Array.from({ length: budget }, () => {
    const position = Math.random();
    if (center < .5) return position ** bias;
    if (center > .5) return 1 - (1 - position) ** bias;
    return position;
  });
}

function valueFromPosition(key: ParameterKey, distribution: Distribution, position: number) {
  if (key === 'learningRate') return distribution === 'log-uniform' ? 10 ** (-5 + position * 3) : 1e-5 + position * (1e-2 - 1e-5);
  if (key === 'weightDecay') return distribution === 'log-uniform' ? 10 ** (-5 + position * 4) : position * .1;
  return distribution === 'log-uniform' ? 10 ** (-3 + position * Math.log10(500)) : position * .5;
}

function normalized(sample: Pick<Sample, 'learningRate' | 'weightDecay' | 'dropout'>) {
  return { lr: (Math.log10(sample.learningRate) + 5) / 3, wd: sample.weightDecay / .1, dropout: sample.dropout / .5 };
}

function performance(position: { lr: number; wd: number; dropout: number }, scenario: Landscape) {
  const weights = scenario.profile === 'plateau' ? [32, 26, 22] : scenario.profile === 'sharp' ? [75, 62, 54] : [45, 36, 30];
  const distance = weights[0] * (position.lr - scenario.optimum.lr) ** 2 + weights[1] * (position.wd - scenario.optimum.wd) ** 2 + weights[2] * (position.dropout - scenario.optimum.dropout) ** 2;
  const ripple = Math.sin(position.lr * 24 + scenario.phases[0]) * .75
    + Math.cos(position.wd * 22 + scenario.phases[1]) * .65
    + Math.sin((position.lr + position.wd) * 17 + scenario.phases[2]) * .48
    + Math.cos((position.lr - position.wd) * 31) * .28;
  if (scenario.profile === 'multimodal') {
    const secondaryA = 4.7 * Math.exp(-38 * ((position.lr - .28) ** 2 + (position.wd - .72) ** 2 + (position.dropout - .34) ** 2));
    const secondaryB = 3.9 * Math.exp(-44 * ((position.lr - .44) ** 2 + (position.wd - .43) ** 2 + (position.dropout - .78) ** 2));
    const rawScore = scenario.peak - distance + ripple + secondaryA + secondaryB;
    return scenario.peak - Math.log1p(Math.exp(4 * (scenario.peak - rawScore))) / 4;
  }
  const rawScore = scenario.peak - distance + ripple * (scenario.profile === 'sharp' ? .65 : .45);
  return scenario.peak - Math.log1p(Math.exp(4 * (scenario.peak - rawScore))) / 4;
}

function estimateMaximum(landscape: Landscape) {
  let maximum = -Infinity;
  for (let lr = 0; lr <= 1; lr += .04) for (let wd = 0; wd <= 1; wd += .04) for (let dropout = 0; dropout <= 1; dropout += .04) {
    maximum = Math.max(maximum, performance({ lr, wd, dropout }, landscape));
  }
  return Number(maximum.toFixed(4));
}

function createSamples(landscape: Landscape, distributions: DistributionMap, centers: CenterMap, budget: number) {
  const lrPositions = randomPositions(budget, centers.learningRate);
  const wdPositions = randomPositions(budget, centers.weightDecay);
  const dropoutPositions = randomPositions(budget, centers.dropout);
  return Array.from({ length: budget }, (_, id) => {
    const sample = {
      id,
      learningRate: valueFromPosition('learningRate', distributions.learningRate, lrPositions[id]),
      weightDecay: valueFromPosition('weightDecay', distributions.weightDecay, wdPositions[id]),
      dropout: valueFromPosition('dropout', distributions.dropout, dropoutPositions[id]),
      score: 0,
    };
    return { ...sample, score: Number(performance(normalized(sample), landscape).toFixed(4)) };
  });
}

function createScenario(profile: LandscapeProfile, distributions: DistributionMap, centers: CenterMap, budget: number): Scenario {
  const landscape = landscapePresets.find((preset) => preset.value === profile)!.landscape;
  return { ...landscape, samples: createSamples(landscape, distributions, centers, budget), referenceMaximum: estimateMaximum(landscape) };
}

export function RandomSearchSimulationBlock({ onComplete }: RandomSearchSimulationBlockProps) {
  const [distributions, setDistributions] = useState<DistributionMap>(defaultDistributions);
  const [centers, setCenters] = useState<CenterMap>(defaultCenters);
  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [landscapeProfile, setLandscapeProfile] = useState<LandscapeProfile>('plateau');
  const [scenario, setScenario] = useState<Scenario>(() => createScenario('plateau', defaultDistributions, defaultCenters, DEFAULT_BUDGET));
  const [completed, setCompleted] = useState(0);
  const [running, setRunning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeParameter, setActiveParameter] = useState<ParameterKey | null>('learningRate');
  const [chartHost, setChartHost] = useState<HTMLDivElement | null>(null);
  const timer = useRef<number | null>(null);
  const visibleSamples = scenario.samples.slice(0, completed);
  const bestSample = useMemo(() => visibleSamples.reduce<Sample | null>((best, sample) => !best || sample.score > best.score ? sample : best, null), [visibleSamples]);
  const performanceRange = useMemo(() => ({
    minimum: Math.min(...scenario.samples.map((sample) => sample.score)),
    maximum: Math.max(...scenario.samples.map((sample) => sample.score)),
  }), [scenario]);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);
  const revealNext = (index: number) => {
    if (index >= budget) { setRunning(false); return; }
    timer.current = window.setTimeout(() => { setCompleted(index + 1); revealNext(index + 1); }, 90);
  };
  const start = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setScenario((current) => ({ ...current, samples: createSamples(current, distributions, centers, budget) }));
    setCompleted(0);
    setSettingsOpen(false);
    setRunning(true);
    revealNext(0);
  };
  const changeDistribution = (key: ParameterKey, value: string) => {
    if (running) return;
    setDistributions((current) => ({ ...current, [key]: value as Distribution }));
    setCompleted(0);
  };
  const changeCenter = (key: ParameterKey, value: number) => {
    if (running) return;
    setCenters((current) => ({ ...current, [key]: value }));
    setCompleted(0);
  };
  const changeBudget = (value: number) => {
    if (running) return;
    setBudget(value);
    setCompleted(0);
  };
  const changeLandscape = (value: string) => {
    if (running) return;
    const profile = value as LandscapeProfile;
    setLandscapeProfile(profile);
    setScenario(createScenario(profile, distributions, centers, budget));
    setCompleted(0);
  };

  const chartData = useMemo<PlotlyTrace[]>(() => [{
      type: 'scatter3d', mode: 'markers',
      x: [-5, -2], y: [0, .1], z: [0, .5],
      hoverinfo: 'skip', showlegend: false,
      marker: { size: .1, color: 'rgba(0,0,0,0)', opacity: 0 },
    }, {
      type: 'scatter3d', mode: 'markers',
      x: [null, null], y: [null, null], z: [null, null], customdata: [[], []],
      hovertemplate: '%{customdata[0]}<br>lr=%{customdata[1]}<br>wd=%{customdata[2]}<br>dropout=%{customdata[3]}<br>性能=%{customdata[4]}%<extra></extra>',
      marker: {
        size: 3,
        color: [0, 1],
        cmin: 0,
        cmax: 1,
        colorscale: [[0, '#dbe6f3'], [.28, '#87a8cf'], [.56, '#315d8d'], [.78, '#f0ad72'], [1, '#e7643c']],
        opacity: .92,
        showscale: true,
        colorbar: { title: { text: '性能' }, thickness: 11, len: .62, x: .94, tickfont: { size: 9 } },
      },
    }], []);

  const handleGraphReady = useCallback((_graph: unknown, host: HTMLDivElement) => setChartHost(host), []);

  useEffect(() => {
    if (!chartHost || !window.Plotly?.restyle) return;
    const hasSamples = visibleSamples.length > 0;
    const emptyCoordinates = [null, null];
    void window.Plotly.restyle(chartHost, {
      x: [hasSamples ? visibleSamples.map((sample) => Math.log10(sample.learningRate)) : emptyCoordinates],
      y: [hasSamples ? visibleSamples.map((sample) => sample.weightDecay) : emptyCoordinates],
      z: [hasSamples ? visibleSamples.map((sample) => sample.dropout) : emptyCoordinates],
      customdata: [hasSamples ? visibleSamples.map((sample) => [`#${String(sample.id + 1).padStart(2, '0')}`, formatScientific(sample.learningRate), sample.weightDecay.toFixed(4), sample.dropout.toFixed(3), sample.score.toFixed(1)]) : [[], []]],
      'marker.color': [hasSamples ? visibleSamples.map((sample) => sample.score) : [performanceRange.minimum, performanceRange.maximum]],
      'marker.cmin': [performanceRange.minimum],
      'marker.cmax': [performanceRange.maximum],
    }, [1]).catch(() => undefined);
  }, [chartHost, performanceRange, visibleSamples]);

  const chartLayout = useMemo<PlotlyLayout>(() => ({
    autosize: true, margin: { l: 0, r: 0, t: 8, b: 0 }, paper_bgcolor: 'rgba(0,0,0,0)', uirevision: 'random-search-camera',
    showlegend: false,
    scene: { bgcolor: '#f8fafd', domain: { x: [0, .9], y: [0, 1] }, aspectmode: 'manual', aspectratio: { x: 1.55, y: 1.12, z: 1 }, camera: { eye: { x: 1.18, y: 1.18, z: .9 } },
      xaxis: { title: { text: 'lr' }, range: [-5, -2], tickvals: [-5, -4, -3, -2], ticktext: ['1e−5', '1e−4', '1e−3', '1e−2'], gridcolor: '#d6dfeb', zeroline: false },
      yaxis: { title: { text: 'wd' }, range: [0, .1], nticks: 4, gridcolor: '#d6dfeb', zeroline: false },
      zaxis: { title: { text: 'dropout' }, range: [0, .5], nticks: 4, gridcolor: '#d6dfeb', zeroline: false },
    },
  }), []);

  const activePreset = landscapePresets.find((preset) => preset.value === landscapeProfile)!;

  return <ContentBlock className="hp-block hp-random-block" title="随机搜索：把预算用在更多取值上" subtitle="设定采样范围，让有限的实验覆盖更多参数组合。">
    <section className="hp-random-scenes" aria-label="练习场景">
      <div role="group" aria-label="选择性能地形">{landscapePresets.map((preset) => <button key={preset.value} type="button" className={preset.value === landscapeProfile ? 'is-active' : ''} disabled={running} aria-pressed={preset.value === landscapeProfile} onClick={() => changeLandscape(preset.value)}>{preset.label}</button>)}</div>
      <p>{activePreset.description}</p>
    </section>
    <section className="hp-random-3d-stage"><PlotlyChart className="hp-random-plot" data={chartData} layout={chartLayout} minHeight={470} aria-label="以热力颜色表示验证性能的三维随机搜索空间" onGraphReady={handleGraphReady} /></section>
    <section className="hp-random-command" aria-label="随机搜索控制">
      <div className="hp-random-command-status"><span>{running ? '正在搜索' : completed === budget ? '搜索完成' : '实验预算'}</span><strong>{running ? `${completed} / ${budget}` : `${budget} 次`}</strong></div>
      <div className="hp-random-command-result"><span>当前方案最高值</span><strong>{bestSample ? `${bestSample.score.toFixed(1)}%` : '—'}</strong></div>
      <div className="hp-random-command-result"><span>该分布最高值</span><strong>{scenario.referenceMaximum.toFixed(1)}%</strong></div>
      <button className="hp-random-settings-toggle" type="button" disabled={running} aria-expanded={settingsOpen} onClick={() => setSettingsOpen((open) => !open)}><span className="hp-random-settings-icon" aria-hidden="true"><i /><i /><i /></span><b>采样设置</b><span className="hp-random-settings-chevron" aria-hidden="true" /></button>
      <Button className="hp-random-start" variant="primary" disabled={running} onClick={start}>{completed ? '重新搜索' : '开始搜索'}</Button>
    </section>
    {settingsOpen && <section className="hp-random-settings" aria-label="采样设置">
      <header><div><strong>采样设置</strong><span>三个参数独立采样，共同组成一次实验。</span></div><button type="button" onClick={() => setSettingsOpen(false)}>完成</button></header>
      <div className="hp-random-setting-list">{parameterConfigs.map((parameter) => {
        const open = activeParameter === parameter.key;
        return <article key={parameter.key} className={open ? 'is-open' : ''}>
          <button className="hp-random-setting-row" type="button" aria-expanded={open} onClick={() => setActiveParameter(open ? null : parameter.key)}><code>{parameter.abbr}</code><span><strong>{parameter.name}</strong><small>{parameter.range}</small></span><b>{distributions[parameter.key] === 'log-uniform' ? 'Log-Uniform' : 'Uniform'}</b><i aria-hidden="true">›</i></button>
          {open && <div className="hp-random-setting-detail"><Select label="采样分布" options={distributionOptions} value={distributions[parameter.key]} onChange={(value) => changeDistribution(parameter.key, value)} /><RangeControl label="采样中心" min={0} max={1} step={.05} value={centers[parameter.key]} scale={['偏小', '偏大']} formatValue={(value) => `${Math.round(Number(value) * 100)}%`} onChange={(event) => changeCenter(parameter.key, Number(event.currentTarget.value))} /></div>}
        </article>;
      })}</div>
      <div className="hp-random-settings-budget"><RangeControl label="实验预算" min={4} max={32} step={4} value={budget} discrete scale={['4', '8', '12', '16', '20', '24', '28', '32']} formatValue={(value) => `${value} 次`} onChange={(event) => changeBudget(Number(event.currentTarget.value))} /></div>
    </section>}
    {completed === budget && !running && <Question persistenceKey="random-search-advantage-v7" type="choice" title="在实验预算相同的情况下，随机搜索的主要优势是什么？" options={[{ key: 'A', value: 'grid', label: '按固定间隔系统地覆盖预设候选组合，便于复现实验路径', wrongFeedback: '这是网格搜索：它穷举固定候选组合，而不是从分布中独立采样。' }, { key: 'B', value: 'local', label: '围绕当前表现最好的组合逐步缩小范围，提高局部搜索精度', wrongFeedback: '这是局部搜索思路；普通随机搜索不会根据当前最好结果自动缩小范围。' }, { key: 'C', value: 'coverage', label: '每次独立采样，可以覆盖更多不同的参数取值' }, { key: 'D', value: 'adaptive', label: '根据已有验证结果调整下一次采样位置，把预算集中到高分区域', wrongFeedback: '这是自适应或贝叶斯优化思路；普通随机搜索的下一次采样不依赖已有分数。' }]} answer="coverage" feedback={{ correct: '正确。随机搜索通过独立采样探索不同取值，较少把预算重复花在固定网格线上。', wrong: '固定间隔对应网格搜索，围绕高分区域缩小或调整采样位置则属于局部或自适应搜索。' }} onCheck={(result) => { if (result.ok) onComplete?.(); }} />}
  </ContentBlock>;
}
