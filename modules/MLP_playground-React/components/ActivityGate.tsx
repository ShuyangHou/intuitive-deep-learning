import type { ReactNode } from 'react';
import { NoticeStrip } from '../../shared/react';

interface ActivityGateProps {
  hydrated: boolean;
  children: ReactNode;
}

export function ActivityGate({
  hydrated,
  children,
}: ActivityGateProps) {
  if (!hydrated) {
    return (
      <NoticeStrip tone="blue">
        正在从 Telemetry SQLite 恢复本内容状态…
      </NoticeStrip>
    );
  }

  return children;
}
