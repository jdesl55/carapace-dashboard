import { cn } from '../../lib/utils';

interface StatusBadgeProps {
  status: 'pass' | 'block' | 'warn' | string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_STYLES: Record<string, string> = {
  pass: 'text-carapace-green bg-[rgba(34,197,94,0.1)]',
  block: 'text-carapace-red-status bg-carapace-red-dim',
  warn: 'text-carapace-yellow bg-[rgba(234,179,8,0.1)]',
  HEALTHY: 'text-carapace-green bg-[rgba(34,197,94,0.1)]',
  WARNING: 'text-carapace-yellow bg-[rgba(234,179,8,0.1)]',
  ALERT: 'text-carapace-red-status bg-carapace-red-dim',
};

const SIZE_STYLES: Record<string, string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-3 py-1',
};

export default function StatusBadge({
  status,
  label,
  size = 'md',
}: StatusBadgeProps) {
  const text = label || status.toUpperCase();
  return (
    <span
      className={cn(
        'font-mono font-medium rounded-md inline-flex items-center',
        STATUS_STYLES[status] || STATUS_STYLES.pass,
        SIZE_STYLES[size]
      )}
    >
      {text}
    </span>
  );
}
