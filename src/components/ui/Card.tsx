import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  redBorder?: boolean;
}

export default function Card({
  children,
  className,
  interactive,
  redBorder,
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-carapace-bg-surface border border-carapace-border rounded-xl p-6',
        interactive &&
          'transition-all duration-300 hover:border-carapace-border-light cursor-pointer',
        redBorder && 'border-l-2 border-l-carapace-red-dim',
        className
      )}
    >
      {children}
    </div>
  );
}
