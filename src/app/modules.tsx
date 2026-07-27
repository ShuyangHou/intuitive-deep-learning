import type { ReactNode } from 'react';
import { DatasetSplitPage } from '../../modules/Dataset-Split-Module/DatasetSplitPage';
import { HyperparameterPage } from '../../modules/Hyperparameter-Module/HyperparameterPage';
import { LossGuidePage } from '../../modules/Loss-Guide-React/LossGuidePage';
import { lossGuideLessonPlan } from '../../modules/Loss-Guide-React/lessonConfig';
import { MiscPage } from '../../modules/MISC_Module/MiscPage';

/** 已完成 React 迁移、可作为独立教学页面进入的模块。 */
export interface MigratedModule {
  id: string;
  title: string;
  description: string;
  path: string;
  badge: string;
  moduleType?: 'popular-science' | 'teaching';
  difficulty?: 'introductory' | 'intermediate' | 'advanced';
  audience?: string;
  durationMinutes?: {
    core: number;
    extension?: number;
  };
  optional?: boolean;
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
    title: '回归损失函数：从误差到选择',
    description: '从单样本误差、MAE/MSE reduction、离群点到梯度与概率假设的本科课堂模块。',
    path: '/modules/loss-guide-react',
    badge: '教材型 · 中等难度',
    moduleType: lossGuideLessonPlan.moduleType,
    difficulty: lossGuideLessonPlan.difficulty,
    audience: lossGuideLessonPlan.audience,
    durationMinutes: lossGuideLessonPlan.durationMinutes,
    optional: lossGuideLessonPlan.optional,
    element: <LossGuidePage />,
  },
];
