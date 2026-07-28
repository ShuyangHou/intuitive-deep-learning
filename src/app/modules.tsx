import type { ReactNode } from 'react';
import { DatasetSplitPage } from '../../modules/Dataset-Split-Module/DatasetSplitPage';
import { FormulaTooltipPage } from '../../modules/Formula-Tooltip-React/FormulaTooltipPage';
import { HyperparameterPage } from '../../modules/Hyperparameter-Module/HyperparameterPage';
import { LossGuidePage } from '../../modules/Loss-Guide-React/LossGuidePage';
import { MiscPage } from '../../modules/MISC_Module/MiscPage';

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
  {
    id: 'formula-tooltip-react',
    title: 'LaTeX 公式拆解演示',
    description: '用 MathLive 渲染训练目标函数，并为每个公式片段提供悬浮解释。',
    path: '/modules/formula-tooltip-react',
    badge: '公式实验模块',
    element: <FormulaTooltipPage />,
  },
];
