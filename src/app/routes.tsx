import { ContentBlock, ModuleShell } from '../../modules/shared/react';
import { DatasetReductionBlock } from '../../modules/Loss-Guide-React/blocks/DatasetReductionBlock';
import { GradientBlock } from '../../modules/Loss-Guide-React/blocks/GradientBlock';
import { LossCalculationBlock } from '../../modules/Loss-Guide-React/blocks/LossCalculationBlock';
import { LossChoiceBlock } from '../../modules/Loss-Guide-React/blocks/LossChoiceBlock';
import { NumberLineBlock } from '../../modules/Loss-Guide-React/blocks/NumberLineBlock';
import { OutlierExperimentBlock } from '../../modules/Loss-Guide-React/blocks/OutlierExperimentBlock';
import { ProbabilityExtensionBlock } from '../../modules/Loss-Guide-React/blocks/ProbabilityExtensionBlock';
import { ResourcesBlock } from '../../modules/Loss-Guide-React/blocks/ResourcesBlock';
import { DatasetLessonFooter } from '../../modules/Dataset-Split-Module/blocks/DatasetLessonFooter';
import { DatasetSplitProcessBlock } from '../../modules/Dataset-Split-Module/blocks/DatasetSplitProcessBlock';
import { HyperparameterOverviewBlock } from '../../modules/Hyperparameter-Module/blocks/HyperparameterOverviewBlock';
import { HyperparameterLessonFooter } from '../../modules/Hyperparameter-Module/blocks/HyperparameterLessonFooter';
import { GridSearchSimulationBlock } from '../../modules/Hyperparameter-Module/blocks/GridSearchSimulationBlock';
import { RandomSearchSimulationBlock } from '../../modules/Hyperparameter-Module/blocks/RandomSearchSimulationBlock';
import { BatchStepEpochBlock } from '../../modules/MISC_Module/blocks/BatchStepEpochBlock';
import { BlockPreview } from './BlockPreview';
import { UiKitPage } from '../../modules/shared/react/routing/UiKitPage';
import { AppLink, type AppRoute } from './Router';
import { migratedModules } from './modules';

const blockPreviews = [
  { id: 'misc-batch-step-epoch', group: '基础概念', title: 'Batch、Step 与 Epoch', description: '理解批次、参数更新次数与完整训练轮次。', path: '/dev/blocks/misc/batch-step-epoch' },
  { id: 'hyperparameter-overview', group: '超参数与超参数搜索', title: '超参数', description: '参数与超参数、常见超参数滑杆及单选题。', path: '/dev/blocks/hyperparameter/overview' },
  { id: 'hyperparameter-grid-search', group: '超参数与超参数搜索', title: '网格搜索', description: '运行学习率与权重衰减的二维网格搜索。', path: '/dev/blocks/hyperparameter/grid-search' },
  { id: 'hyperparameter-random-search', group: '超参数与超参数搜索', title: '随机搜索', description: '使用固定预算从连续分布中随机采样超参数。', path: '/dev/blocks/hyperparameter/random-search' },
  { id: 'hyperparameter-ending', group: '超参数与超参数搜索', title: '课程结尾', description: '超参数课程完成状态。', path: '/dev/blocks/hyperparameter/ending' },
  { id: 'dataset-process', group: '数据集划分', title: '数据集划分与训练流程', description: '数据比例划分、训练验证循环与最终测试。', path: '/dev/blocks/dataset-split/process' },
  { id: 'dataset-ending', group: '数据集划分', title: '课程结尾', description: '数据集课程完成状态。', path: '/dev/blocks/dataset-split/ending' },
  { id: 'loss-number-line', group: '损失函数导览', title: '数轴距离', description: '通过数轴理解预测与真实值之间的距离。', path: '/dev/blocks/loss-guide-react/number-line' },
  { id: 'loss-calculation', group: '损失函数导览', title: '损失计算', description: '独立调试损失计算教学块。', path: '/dev/blocks/loss-guide-react/calculation' },
  { id: 'loss-dataset-reduction', group: '损失函数导览', title: '数据集 reduction', description: '从单样本损失汇总为批次训练目标。', path: '/dev/blocks/loss-guide-react/dataset-reduction' },
  { id: 'loss-outlier-experiment', group: '损失函数导览', title: '离群点实验', description: '比较 MAE 与 MSE 对异常样本的敏感性。', path: '/dev/blocks/loss-guide-react/outlier-experiment' },
  { id: 'loss-gradient', group: '损失函数导览', title: 'L1 与 L2 梯度', description: '独立调试梯度比较教学块。', path: '/dev/blocks/loss-guide-react/gradient' },
  { id: 'loss-choice', group: '损失函数导览', title: '损失函数选择', description: '根据噪声结构与任务代价选择损失函数。', path: '/dev/blocks/loss-guide-react/loss-choice' },
  { id: 'loss-probability-extension', group: '损失函数导览', title: '概率解释拓展', description: '连接噪声分布、最大似然与损失函数。', path: '/dev/blocks/loss-guide-react/probability-extension' },
  { id: 'loss-resources', group: '损失函数导览', title: '推荐资源', description: '独立调试课程结尾与推荐资源。', path: '/dev/blocks/loss-guide-react/resources' },
];

function HomePage() {
  return (
    <ModuleShell title="Intuitive Deep Learning" subtitle="完整课程、子模块与共享 UI 的统一开发入口">
      <ContentBlock title="完整教学模块" subtitle="以完整 LessonFlow 运行课程，检查模块之间的渐进式披露。">
        <div className="app-module-catalog">
          {migratedModules.map((module) => <AppLink key={module.id} className="app-module-card" to={module.path}>
            <span className="edu-badge">{module.badge}</span>
            <strong>{module.title}</strong>
            <span>{module.description}</span>
            <em>进入模块 →</em>
          </AppLink>)}
        </div>
      </ContentBlock>
      <ContentBlock title="子模块调试" subtitle="绕过完整课程流程，单独进入、重置和调试每一个内容块。">
        <div className="app-block-catalog">
          {blockPreviews.map((block) => <AppLink key={block.id} className="app-block-card" to={block.path}>
            <span>{block.group}</span><strong>{block.title}</strong><p>{block.description}</p><em>单独调试 →</em>
          </AppLink>)}
        </div>
      </ContentBlock>
      <ContentBlock title="Shared UI Kit" subtitle="检查所有共享组件、流程控制、题型和课程结尾样式。">
        <AppLink className="app-ui-kit-card" to="/shared/ui-kit"><span className="edu-badge">设计系统</span><strong>打开 Shared UI Kit</strong><span>统一查看基础展示、控件、提示、流程控制、考试题型和课程结尾。</span><em>进入 UI Kit →</em></AppLink>
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

function DatasetHyperparametersPreview() {
  return <BlockPreview title="超参数">{({ complete }) => <HyperparameterOverviewBlock onComplete={complete} />}</BlockPreview>;
}

function HyperparameterEndingPreview() {
  return <BlockPreview title="课程结尾">{() => <HyperparameterLessonFooter />}</BlockPreview>;
}

function HyperparameterGridSearchPreview() {
  return <BlockPreview title="网格搜索">{({ complete }) => <GridSearchSimulationBlock onComplete={complete} />}</BlockPreview>;
}

function HyperparameterRandomSearchPreview() {
  return <BlockPreview title="随机搜索">{({ complete }) => <RandomSearchSimulationBlock onComplete={complete} />}</BlockPreview>;
}

function DatasetProcessPreview() {
  return <BlockPreview title="数据集划分与训练流程">{({ complete }) => <DatasetSplitProcessBlock onComplete={complete} />}</BlockPreview>;
}

function DatasetEndingPreview() {
  return <BlockPreview title="课程结尾">{() => <DatasetLessonFooter />}</BlockPreview>;
}

function BatchStepEpochPreview() {
  return <BlockPreview title="Batch、Step 与 Epoch">{({ complete }) => <BatchStepEpochBlock onComplete={complete} />}</BlockPreview>;
}

export const appRoutes: AppRoute[] = [
  { path: '/', element: <HomePage /> },
  { path: '/shared/ui-kit', element: <UiKitPage /> },
  ...migratedModules.map(({ path, element }) => ({ path, element })),
  { path: '/dev/blocks/misc/batch-step-epoch', element: <BatchStepEpochPreview /> },
  { path: '/dev/blocks/hyperparameter/overview', element: <DatasetHyperparametersPreview /> },
  { path: '/dev/blocks/hyperparameter/grid-search', element: <HyperparameterGridSearchPreview /> },
  { path: '/dev/blocks/hyperparameter/random-search', element: <HyperparameterRandomSearchPreview /> },
  { path: '/dev/blocks/hyperparameter/ending', element: <HyperparameterEndingPreview /> },
  { path: '/dev/blocks/dataset-split/process', element: <DatasetProcessPreview /> },
  { path: '/dev/blocks/dataset-split/ending', element: <DatasetEndingPreview /> },
  { path: '/dev/blocks/loss-guide-react/number-line', element: <NumberLinePreview /> },
  { path: '/dev/blocks/loss-guide-react/calculation', element: <CalculationPreview /> },
  { path: '/dev/blocks/loss-guide-react/dataset-reduction', element: <DatasetReductionPreview /> },
  { path: '/dev/blocks/loss-guide-react/outlier-experiment', element: <OutlierExperimentPreview /> },
  { path: '/dev/blocks/loss-guide-react/gradient', element: <GradientPreview /> },
  { path: '/dev/blocks/loss-guide-react/loss-choice', element: <LossChoicePreview /> },
  { path: '/dev/blocks/loss-guide-react/probability-extension', element: <ProbabilityExtensionPreview /> },
  { path: '/dev/blocks/loss-guide-react/resources', element: <ResourcesPreview /> },
];
