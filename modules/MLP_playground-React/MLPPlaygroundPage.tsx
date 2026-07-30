import {
  LessonFlow,
  ModuleShell,
  type LessonFlowStep,
} from '../shared/react';
import { MlpLabBlock } from './blocks/MlpLabBlock';
import { MlpTransitionBlock } from './blocks/MlpTransitionBlock';
import {
  MlpGuideSessionProvider,
  PersistedBoundaryChallengeBlock,
  PersistedScenarioIntroBlock,
} from './blocks/PersistedGuideBlocks';
import { ResourcesBlock } from './blocks/ResourcesBlock';
import './mlp-playground-react.css';

export const mlpPlaygroundLessonSteps: LessonFlowStep[] = [
  {
    id: 'personalized-scenario',
    render: ({ complete, isComplete }) => (
      <PersistedScenarioIntroBlock
        lessonStepComplete={isComplete}
        onComplete={complete}
      />
    ),
  },
  {
    id: 'manual-boundary',
    revealMode: 'scroll',
    render: ({ complete, isComplete }) => (
      <PersistedBoundaryChallengeBlock
        lessonStepComplete={isComplete}
        onComplete={complete}
      />
    ),
  },
  {
    id: 'mlp-transition',
    revealMode: 'scroll',
    render: ({ complete, isComplete }) => (
      <MlpTransitionBlock opened={isComplete} onComplete={complete} />
    ),
  },
  {
    id: 'mlp-1d',
    revealMode: 'scroll',
    render: ({ complete }) => (
      <MlpLabBlock dimension={1} onComplete={complete} />
    ),
  },
  {
    id: 'mlp-2d',
    revealMode: 'cue',
    render: ({ complete }) => (
      <MlpLabBlock dimension={2} onComplete={complete} />
    ),
  },
  {
    id: 'mlp-3d',
    revealMode: 'cue',
    completesLesson: true,
    render: ({ complete }) => (
      <MlpLabBlock dimension={3} onComplete={complete} />
    ),
  },
  {
    id: 'resources',
    revealMode: 'immediate',
    render: () => <ResourcesBlock />,
  },
];

function scrollToNewestMlpStep() {
  const steps = document.querySelectorAll<HTMLElement>(
    '.mlp-react-shell .edu-lesson-flow-step.is-revealed',
  );
  const target = steps.item(steps.length - 1);
  target?.scrollIntoView({
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
    block: 'start',
  });
}

export function MLPPlaygroundPage() {
  return (
    <ModuleShell
      title="多层感知机与分类边界"
      subtitle="从二维特征空间中的点分类出发，理解 MLP 如何通过训练学习决策边界。"
      shellClassName="mlp-react-shell z06-root z07-root"
      headerClassName="z06-header"
    >
      <MlpGuideSessionProvider>
        <LessonFlow
          steps={mlpPlaygroundLessonSteps}
          persistenceKey="mlp-playground-react"
          cueText={(
            <button
              className="mlp-react-cue-button"
              type="button"
              aria-label="下方有新内容，滚动或点击查看"
              onClick={scrollToNewestMlpStep}
            >
              <strong>下方有新内容</strong>
              <small>滚动或点击查看</small>
            </button>
          )}
        />
      </MlpGuideSessionProvider>
    </ModuleShell>
  );
}
