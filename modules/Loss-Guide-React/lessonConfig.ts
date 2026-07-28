export const LOSS_GUIDE_MODULE_ID = 'loss-guide-react';
export const LOSS_GUIDE_PROGRESS_VERSION = 'v3';

export const lossGuideStateKey = (key: string) => `loss-guide-v3:${key}`;

export const lossGuideLessonPlan = {
  moduleType: 'teaching',
  difficulty: 'intermediate',
  audience: '具备高数、线代与概率基础的计算机专业本科生',
  optional: true,
  durationMinutes: {
    core: 45,
    extension: 15,
  },
  stages: [
    {
      id: 'number-line',
      title: '量化一次预测偏差',
      durationMinutes: 4,
      teacherPrompt: '距离减半时，绝对误差与平方误差分别怎样变化？',
    },
    {
      id: 'calculation',
      title: '定义单样本损失',
      durationMinutes: 5,
      teacherPrompt: '平方为什么会让大误差获得更高权重？',
    },
    {
      id: 'dataset-reduction',
      title: '从样本到数据集',
      durationMinutes: 6,
      teacherPrompt: '为什么不能直接平均有符号误差？',
    },
    {
      id: 'outlier-experiment',
      title: '离群点敏感性实验',
      durationMinutes: 8,
      teacherPrompt: '损失数值的变化会怎样传递到模型更新？',
    },
    {
      id: 'gradient',
      title: '梯度与优化信号',
      durationMinutes: 7,
      teacherPrompt: '不可导是否意味着无法使用梯度方法优化？',
    },
    {
      id: 'parameter-update',
      title: '从预测梯度到参数更新',
      durationMinutes: 7,
      teacherPrompt: '模型为什么更新参数，而不是直接更新预测值？',
    },
    {
      id: 'robust-loss',
      title: 'Huber 稳健折中',
      durationMinutes: 5,
      teacherPrompt: '怎样限制极端误差的梯度，同时保留零点附近的平滑性？',
    },
    {
      id: 'loss-choice',
      title: '依据任务选择损失',
      durationMinutes: 3,
      teacherPrompt: '选择损失时，我们实际在表达哪些数据假设？',
    },
  ],
  extension: {
    id: 'probability-extension',
    title: '概率建模解释',
    durationMinutes: 15,
    teacherPrompt: '不同噪声假设为什么会导出不同损失函数？',
  },
} as const;
