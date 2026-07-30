import { LessonFooter } from '../../shared/react';

export function AdaptiveLearningRateLessonFooter() {
  return (
    <LessonFooter
      className="alr-block"
      title="你已经看懂优化器的演化主线"
      description="SGD 给出“沿负梯度更新”的骨架；AdaGrad 按历史梯度缩放每个参数；Adam 再用近期方向与尺度，让更新兼顾稳定和自适应。"
      back={{ href: '/', label: '返回模块目录' }}
    />
  );
}
