import { LessonFlow, ModuleShell, type LessonFlowStep } from '../shared/react';
import './hyperparameter-module.css';
import { HyperparameterOverviewBlock } from './blocks/HyperparameterOverviewBlock';
import { GridSearchSimulationBlock } from './blocks/GridSearchSimulationBlock';
import { RandomSearchSimulationBlock } from './blocks/RandomSearchSimulationBlock';
import { HyperparameterLessonFooter } from './blocks/HyperparameterLessonFooter';

const steps: LessonFlowStep[] = [
  { id: 'overview', render: ({ complete }) => <HyperparameterOverviewBlock onComplete={complete} /> },
  { id: 'grid-search', revealMode: 'cue', render: ({ complete }) => <GridSearchSimulationBlock onComplete={complete} /> },
  { id: 'random-search', revealMode: 'cue', render: ({ complete }) => <RandomSearchSimulationBlock onComplete={complete} /> },
  { id: 'ending', revealMode: 'cue', completesLesson: true, render: () => <HyperparameterLessonFooter /> },
];

export function HyperparameterPage() {
  return (
    <ModuleShell
      title="超参数与超参数搜索"
      subtitle="理解常见超参数，并学习怎样比较和选择训练方案。"
      shellClassName="hp-shell edu-shell--scaled"
    >
      <LessonFlow steps={steps} persistenceKey="hyperparameter-module-v3" />
    </ModuleShell>
  );
}
