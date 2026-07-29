import type { ReactNode } from 'react';
import { DatasetSplitPage } from '../../modules/Dataset-Split-Module/DatasetSplitPage';
import { HyperparameterPage } from '../../modules/Hyperparameter-Module/HyperparameterPage';
import { LossGuidePage } from '../../modules/Loss-Guide-React/LossGuidePage';
import { MiscPage } from '../../modules/MISC_Module/MiscPage';
import { FittingPage } from '../../modules/Fitting_Module/FittingPage';
import { AdaptiveLearningRatePage } from '../../modules/Adaptive-Learning-Rate-Module/AdaptiveLearningRatePage';

/** 已完成 React 迁移、可作为独立教学页面进入的模块。 */
export interface MigratedModule {
  id: string;
  title: string;
  description: string;
  path: string;
  badge: string;
  element: ReactNode;
}

export const migratedModules: MigratedModule[] = [
  {
    id: 'adaptive-learning-rate-module',
    title: '从 SGD 到自适应学习率',
    description: '理解 SGD 的标准更新形式，以及 AdaGrad、Adam 如何根据梯度历史调整步长。',
    path: '/modules/adaptive-learning-rate',
    badge: '互动教学模块',
    element: <AdaptiveLearningRatePage />,
  },
  {
    id: 'fitting-module',
    title: '拟合与泛化',
    description: '从训练与验证曲线判断欠拟合和过拟合。',
    path: '/modules/fitting-module',
    badge: '互动教学模块',
    element: <FittingPage />,
  },
  {
    id: 'misc-module',
    title: '训练中的计数单位',
    description: '理解 Batch、Step 与 Epoch 如何共同描述训练进度。',
    path: '/modules/misc-module',
    badge: '基础概念模块',
    element: <MiscPage />,
  },
  {
    id: 'dataset-split-module',
    title: '数据集划分',
    description: '理解训练集、验证集与测试集的职责和完整使用流程。',
    path: '/modules/dataset-split-module',
    badge: '互动教学模块',
    element: <DatasetSplitPage />,
  },
  {
    id: 'hyperparameter-module',
    title: '超参数与超参数搜索',
    description: '区分参数与超参数，理解常见超参数对训练的影响。',
    path: '/modules/hyperparameter-module',
    badge: '互动教学模块',
    element: <HyperparameterPage />,
  },
  {
    id: 'loss-guide-react',
    title: '损失函数导览',
    description: '从预测误差、损失计算到 L1／L2 梯度的交互式学习流程。',
    path: '/modules/loss-guide-react',
    badge: 'React 迁移版',
    element: <LossGuidePage />,
  },
];
