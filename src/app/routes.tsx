import { ContentBlock, ModuleShell } from '../../modules/shared/react';
import { DatasetReductionBlock } from '../../modules/Loss-Guide-React/blocks/DatasetReductionBlock';
import { GradientBlock } from '../../modules/Loss-Guide-React/blocks/GradientBlock';
import { LossCalculationBlock } from '../../modules/Loss-Guide-React/blocks/LossCalculationBlock';
import { LossChoiceBlock } from '../../modules/Loss-Guide-React/blocks/LossChoiceBlock';
import { NumberLineBlock } from '../../modules/Loss-Guide-React/blocks/NumberLineBlock';
import { OutlierExperimentBlock } from '../../modules/Loss-Guide-React/blocks/OutlierExperimentBlock';
import { ProbabilityExtensionBlock } from '../../modules/Loss-Guide-React/blocks/ProbabilityExtensionBlock';
import { ResourcesBlock } from '../../modules/Loss-Guide-React/blocks/ResourcesBlock';
import { BlockPreview } from './BlockPreview';
import { UiKitPage } from '../../modules/shared/react/routing/UiKitPage';
import { AppLink, type AppRoute } from './Router';
import { migratedModules } from './modules';

function HomePage() {
  return (
    <ModuleShell title="Intuitive Deep Learning" subtitle="已完成 React 迁移的教学模块">
      <ContentBlock title="模块目录" subtitle="每个条目都是可独立进入、调试和继续迭代的 React 教学模块。">
        <div className="app-module-catalog">
          {migratedModules.map((module) => <AppLink key={module.id} className="app-module-card" to={module.path}>
            <span className="edu-badge">{module.badge}</span>
            <strong>{module.title}</strong>
            <span>{module.description}</span>
            <em>进入模块 →</em>
          </AppLink>)}
        </div>
        <p className="app-infrastructure-link">开发与样式预览：<AppLink to="/shared/ui-kit">Shared UI Kit</AppLink></p>
      </ContentBlock>
    </ModuleShell>
  );
}

function NumberLinePreview() {
  return <BlockPreview title="数轴距离">{({ complete }) => <NumberLineBlock onComplete={complete} />}</BlockPreview>;
}

function CalculationPreview() {
  return <BlockPreview title="损失计算">{({ complete }) => <LossCalculationBlock onComplete={complete} />}</BlockPreview>;
}

function GradientPreview() {
  return <BlockPreview title="MAE 与 MSE 梯度">{({ complete }) => <GradientBlock onComplete={complete} />}</BlockPreview>;
}

function DatasetReductionPreview() {
  return <BlockPreview title="数据集 reduction">{({ complete }) => <DatasetReductionBlock onComplete={complete} />}</BlockPreview>;
}

function OutlierExperimentPreview() {
  return <BlockPreview title="离群点实验">{({ complete }) => <OutlierExperimentBlock onComplete={complete} />}</BlockPreview>;
}

function LossChoicePreview() {
  return <BlockPreview title="损失函数选择">{({ complete }) => <LossChoiceBlock onComplete={complete} />}</BlockPreview>;
}

function ProbabilityExtensionPreview() {
  return <BlockPreview title="概率解释拓展">{({ complete }) => <ProbabilityExtensionBlock onComplete={complete} />}</BlockPreview>;
}

function ResourcesPreview() {
  return <BlockPreview title="推荐资源">{() => <ResourcesBlock />}</BlockPreview>;
}

export const appRoutes: AppRoute[] = [
  { path: '/', element: <HomePage /> },
  { path: '/shared/ui-kit', element: <UiKitPage /> },
  ...migratedModules.map(({ path, element }) => ({ path, element })),
  { path: '/dev/blocks/loss-guide-react/number-line', element: <NumberLinePreview /> },
  { path: '/dev/blocks/loss-guide-react/calculation', element: <CalculationPreview /> },
  { path: '/dev/blocks/loss-guide-react/dataset-reduction', element: <DatasetReductionPreview /> },
  { path: '/dev/blocks/loss-guide-react/outlier-experiment', element: <OutlierExperimentPreview /> },
  { path: '/dev/blocks/loss-guide-react/gradient', element: <GradientPreview /> },
  { path: '/dev/blocks/loss-guide-react/loss-choice', element: <LossChoicePreview /> },
  { path: '/dev/blocks/loss-guide-react/probability-extension', element: <ProbabilityExtensionPreview /> },
  { path: '/dev/blocks/loss-guide-react/resources', element: <ResourcesPreview /> },
];
