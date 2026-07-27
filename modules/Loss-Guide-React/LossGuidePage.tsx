import { LessonFlow, ModuleShell, type LessonFlowStep } from '../shared/react';
import './loss-guide-react.css';
import { DatasetReductionBlock } from './blocks/DatasetReductionBlock';
import { LossCalculationBlock } from './blocks/LossCalculationBlock';
import { GradientBlock } from './blocks/GradientBlock';
import { LossChoiceBlock } from './blocks/LossChoiceBlock';
import { NumberLineBlock } from './blocks/NumberLineBlock';
import { OutlierExperimentBlock } from './blocks/OutlierExperimentBlock';
import { ProbabilityExtensionBlock } from './blocks/ProbabilityExtensionBlock';
import { ResourcesBlock } from './blocks/ResourcesBlock';
import { LOSS_GUIDE_MODULE_ID, LOSS_GUIDE_PROGRESS_VERSION, lossGuideLessonPlan } from './lessonConfig';

const steps: LessonFlowStep[] = [
  { id: 'number-line', revealMode: 'scroll', render: ({ complete }) => <NumberLineBlock onComplete={complete} /> },
  { id: 'calculation', revealMode: 'scroll', render: ({ complete }) => <LossCalculationBlock onComplete={complete} /> },
  { id: 'dataset-reduction', revealMode: 'scroll', render: ({ complete }) => <DatasetReductionBlock onComplete={complete} /> },
  { id: 'outlier-experiment', revealMode: 'scroll', render: ({ complete }) => <OutlierExperimentBlock onComplete={complete} /> },
  { id: 'gradient', revealMode: 'scroll', render: ({ complete }) => <GradientBlock onComplete={complete} /> },
  { id: 'loss-choice', revealMode: 'scroll', completesLesson: true, render: ({ complete }) => <LossChoiceBlock onComplete={complete} /> },
  { id: 'probability-extension', revealMode: 'scroll', render: ({ complete }) => <ProbabilityExtensionBlock onComplete={complete} /> },
  { id: 'resources', revealMode: 'immediate', render: () => <ResourcesBlock /> },
];

/** Undergraduate classroom lesson: 45-minute core plus a skippable 15-minute extension. */
export function LossGuidePage() {
  return (
    <ModuleShell
      title="从预测误差到损失函数"
      subtitle="面向有高数、线代与概率基础的本科生：从单样本误差出发，建立 MAE、MSE、梯度与概率假设之间的完整推理链。"
      badge="本科教学 · 45+15 分钟"
      shellClassName="lg-react-shell edu-shell--scaled"
    >
      <div className="lg-react-course-note" aria-label="课程结构">
        <strong>核心课</strong>
        <span>{lossGuideLessonPlan.stages.length} 个连续环节 · 约 {lossGuideLessonPlan.durationMinutes.core} 分钟</span>
        <span>概率解释为可选拓展，可直接跳过</span>
      </div>
      <details className="lg-react-agenda">
        <summary>查看课堂节奏与讨论问题</summary>
        <ol>
          {lossGuideLessonPlan.stages.map((stage) => (
            <li key={stage.id}>
              <div>
                <strong>{stage.title}</strong>
                <span>{stage.durationMinutes} 分钟</span>
              </div>
              <p>课堂追问：{stage.teacherPrompt}</p>
            </li>
          ))}
          <li className="is-extension">
            <div>
              <strong>可选：{lossGuideLessonPlan.extension.title}</strong>
              <span>{lossGuideLessonPlan.extension.durationMinutes} 分钟</span>
            </div>
            <p>课堂追问：{lossGuideLessonPlan.extension.teacherPrompt}</p>
          </li>
        </ol>
      </details>
      <LessonFlow
        steps={steps}
        persistenceKey={LOSS_GUIDE_MODULE_ID}
        persistenceVersion={LOSS_GUIDE_PROGRESS_VERSION}
      />
    </ModuleShell>
  );
}
