import type { ReactNode } from 'react';
import { Typography } from '../../../shared/react/typography/Typography';

interface KnowledgePointProps {
  ariaLabel: string;
  title: string;
  children: ReactNode;
}

export function KnowledgePoint({ ariaLabel, title, children }: KnowledgePointProps) {
  return (
    <section className="lg-react-interaction-insight" aria-label={ariaLabel}>
      <Typography as="h3" variant="h3" tone="accent">{title}</Typography>
      <Typography variant="bodySmall">{children}</Typography>
    </section>
  );
}
