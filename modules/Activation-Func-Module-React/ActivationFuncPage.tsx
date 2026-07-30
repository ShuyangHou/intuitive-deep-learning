import { LessonFlow, ModuleShell, type LessonFlowStep } from '../shared/react';
import './activation-func-module-react.css';
import { ActivationCatalogBlock } from './blocks/ActivationCatalogBlock';
import { ApproximationBlock } from './blocks/ApproximationBlock';
import { DeepLinearBlock } from './blocks/DeepLinearBlock';
import { LinearConclusionBlock } from './blocks/LinearConclusionBlock';
import {
  Linear2DChoiceBlock,
  Linear3DChoiceBlock,
} from './blocks/LinearChoiceBlocks';
import { ReluIntroBlock } from './blocks/ReluIntroBlock';
import { ReluNetworkBlock } from './blocks/ReluNetworkBlock';
import { ShallowLinearBlock } from './blocks/ShallowLinearBlock';

export const activationFuncLessonSteps: LessonFlowStep[] = [
  {
    id: 'linear-2d',
    render: ({ complete }) => <Linear2DChoiceBlock onComplete={complete} />,
  },
  {
    id: 'linear-3d',
    revealMode: 'scroll',
    render: ({ complete }) => <Linear3DChoiceBlock onComplete={complete} />,
  },
  {
    id: 'linear-shallow',
    revealMode: 'scroll',
    render: ({ complete }) => <ShallowLinearBlock onComplete={complete} />,
  },
  {
    id: 'linear-deep',
    revealMode: 'cue',
    render: ({ complete }) => <DeepLinearBlock onComplete={complete} />,
  },
  {
    id: 'linear-conclusion',
    revealMode: 'scroll',
    render: ({ complete }) => <LinearConclusionBlock onComplete={complete} />,
  },
  {
    id: 'relu-intro',
    revealMode: 'scroll',
    render: ({ complete }) => <ReluIntroBlock onComplete={complete} />,
  },
  {
    id: 'relu-network',
    revealMode: 'scroll',
    render: ({ complete }) => <ReluNetworkBlock onComplete={complete} />,
  },
  {
    id: 'relu-approximation',
    revealMode: 'cue',
    completesLesson: true,
    render: ({ complete }) => <ApproximationBlock onComplete={complete} />,
  },
  {
    id: 'activation-summary',
    revealMode: 'immediate',
    render: () => <ActivationCatalogBlock />,
  },
];

function scrollToNewestStep() {
  const steps = document.querySelectorAll<HTMLElement>(
    '.af-react-shell .edu-lesson-flow-step.is-revealed',
  );
  const target = steps.item(steps.length - 1);
  target?.scrollIntoView({
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
    block: 'start',
  });
}

export function ActivationFuncPage() {
  return (
    <ModuleShell
      title="激活函数如何带来非线性"
      subtitle="先理解什么是线性，再看看神经网络为什么需要打破线性。"
      shellClassName="af-react-shell"
    >
      <LessonFlow
        steps={activationFuncLessonSteps}
        persistenceKey="activation-func-module-react"
        cueText={(
          <button
            className="af-react-cue-button"
            type="button"
            aria-label="下方有新内容，滚动或点击查看"
            onClick={scrollToNewestStep}
          >
            <strong>下方有新内容</strong>
            <small>滚动或点击查看</small>
          </button>
        )}
      />
    </ModuleShell>
  );
}
