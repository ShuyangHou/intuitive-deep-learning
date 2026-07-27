import type { ReactNode } from 'react';
import { LossGuidePage } from '../../modules/Loss-Guide-React/LossGuidePage';
import { lossGuideLessonPlan } from '../../modules/Loss-Guide-React/lessonConfig';

/** 已完成 React 迁移、可作为独立教学页面进入的模块。 */
export interface MigratedModule {
  id: string;
  title: string;
  description: string;
  path: string;
  badge: string;
  moduleType: 'popular-science' | 'teaching';
  difficulty: 'introductory' | 'intermediate' | 'advanced';
  audience: string;
  durationMinutes: {
    core: number;
    extension?: number;
  };
  optional: boolean;
  element: ReactNode;
}

export const migratedModules: MigratedModule[] = [
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
