import { LessonFlow, ModuleShell, type LessonFlowStep } from '../shared/react';
import './gradient-descent-module-react.css';
import { AutoUpdateBlock } from './blocks/AutoUpdateBlock';
import { FullNetworkTrainingBlock } from './blocks/FullNetworkTrainingBlock';
import { ManualTuningBlock } from './blocks/ManualTuningBlock';
import { ResourcesBlock } from './blocks/ResourcesBlock';

const steps: LessonFlowStep[] = [
  {
    id: 'manual-tuning',
    revealMode: 'scroll',
    render: ({ complete }) => <ManualTuningBlock onComplete={complete} />,
  },
  {
    id: 'auto-update',
    revealMode: 'scroll',
    render: ({ complete }) => <AutoUpdateBlock onComplete={complete} />,
  },
  {
    id: 'full-network-training',
    revealMode: 'cue',
    completesLesson: true,
    render: ({ complete }) => <FullNetworkTrainingBlock onComplete={complete} />,
  },
  {
    id: 'resources',
    revealMode: 'immediate',
    render: () => <ResourcesBlock />,
  },
];

export function GradientDescentPage() {
  return (
    <ModuleShell
      title="梯度下降如何让模型变好"
      subtitle="亲手缩小预测误差，再把观察到的规律变成网络的自动更新步骤。"
      shellClassName="gd-react-shell edu-shell--scaled"
    >
      <LessonFlow
        steps={steps}
        persistenceKey="gradient-descent-module-react"
        cueText={(
          <button
            type="button"
            aria-label="下方有新内容，滚动或点击查看"
            onClick={() => {
              const target = document.querySelector<HTMLElement>(
                '[data-step-id="full-network-training"]',
              );
              target?.scrollIntoView({
                behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
                  ? 'auto'
                  : 'smooth',
                block: 'start',
              });
            }}
            style={{
              border: 0,
              padding: 0,
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              font: 'inherit',
              textAlign: 'left',
            }}
          >
            <strong style={{ display: 'block' }}>下方有新内容</strong>
            <small style={{ display: 'block' }}>滚动或点击查看</small>
          </button>
        )}
      />
    </ModuleShell>
  );
}
