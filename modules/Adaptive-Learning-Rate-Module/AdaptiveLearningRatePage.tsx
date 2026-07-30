import { LessonFlow, ModuleShell, type LessonFlowStep } from '../shared/react';
import './adaptive-learning-rate.css';
import { SgdFoundationBlock } from './blocks/SgdFoundationBlock';
import { AdaGradBlock } from './blocks/AdaGradBlock';
import { AdamBlock } from './blocks/AdamBlock';
import { AdaptiveLearningRateLessonFooter } from './blocks/AdaptiveLearningRateLessonFooter';

const steps: LessonFlowStep[] = [
  {
    id: 'adaptive-lr-sgd-foundation',
    render: ({ complete }) => <SgdFoundationBlock onComplete={complete} />,
  },
  {
    id: 'adaptive-lr-adagrad-history',
    revealMode: 'cue',
    render: ({ complete }) => <AdaGradBlock onComplete={complete} />,
  },
  {
    id: 'adaptive-lr-adam-moments',
    revealMode: 'cue',
    completesLesson: true,
    render: ({ complete }) => <AdamBlock onComplete={complete} />,
  },
  {
    id: 'adaptive-lr-ending',
    revealMode: 'cue',
    render: () => <AdaptiveLearningRateLessonFooter />,
  },
];

export function AdaptiveLearningRatePage() {
  return (
    <ModuleShell
      title="从 SGD 到自适应学习率"
      subtitle="先看懂最基础的参数更新，再逐步加入 AdaGrad 的历史缩放与 Adam 的方向记忆。"
      shellClassName="alr-shell edu-shell--scaled"
    >
      <LessonFlow steps={steps} persistenceKey="adaptive-learning-rate-module-v1" />
    </ModuleShell>
  );
}
