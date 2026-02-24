import { useState, useEffect, useCallback } from 'react';
import { Check, X, ChevronDown, ChevronRight, Search, Eye, EyeOff } from 'lucide-react';
import Card from '../components/ui/Card';
import StatusBadge from '../components/ui/StatusBadge';
import ActionIcon from '../components/ActionIcon';
import { getLogs } from '../lib/api';
import {
  formatRelativeTime,
  formatCurrency,
  truncate,
  formatActionType,
  cn,
} from '../lib/utils';
import type { ActionLog } from '../lib/types';

type VerdictFilter = 'all' | 'pass' | 'block' | 'warn';
type TierFilter = 0 | 1 | 2 | 3;
type TimeFilter = 'hour' | 'day' | 'week' | 'all';

const PAGE_SIZE = 50;

function getTimeSince(filter: TimeFilter): string | undefined {
  if (filter === 'all') return undefined;
  const now = Date.now();
  const ms = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
  };
  return new Date(now - ms[filter]).toISOString();
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200',
        active
          ? 'bg-carapace-bg-raised border-carapace-border-light text-carapace-text-primary'
          : 'border-carapace-border text-carapace-text-dim hover:text-carapace-text-secondary hover:border-carapace-border-light'
      )}
    >
      {children}
    </button>
  );
}

function ExpandedDetail({ action }: { action: ActionLog }) {
  const [showKey, setShowKey] = useState(false);
  const maskedKey = 'sk-carapace-••••••••••••••••';
  const fakeKey = 'sk-carapace-a7f3b2c1d9e8f0a1';

  return (
    <tr className="bg-carapace-bg-raised">
      <td colSpan={8} className="px-6 py-5">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <span className="text-carapace-text-dim text-xs uppercase tracking-[0.05em]">
              Description
            </span>
            <p className="mt-1 text-sm text-carapace-text-primary leading-relaxed">
              {action.description}
            </p>
          </div>
          <div>
            <span className="text-carapace-text-dim text-xs uppercase tracking-[0.05em]">
              Reason
            </span>
            <p className="mt-1 text-sm text-carapace-text-primary leading-relaxed">
              {action.reason || 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-carapace-text-dim text-xs uppercase tracking-[0.05em]">
              Verification Key
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-xs text-carapace-text-secondary">
                {showKey ? fakeKey : maskedKey}
              </span>
              <button
                onClick={() => setShowKey(!showKey)}
                className="text-carapace-text-dim hover:text-carapace-text-secondary transition-colors"
              >
                {showKey ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
          <div>
            <span className="text-carapace-text-dim text-xs uppercase tracking-[0.05em]">
              Exact Timestamp
            </span>
            <p className="mt-1 font-mono text-xs text-carapace-text-secondary">
              {new Date(action.timestamp).toISOString()}
            </p>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function ActivityLog() {
  const [actions, setActions] = useState<ActionLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>(0);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await getLogs({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      verdict: verdictFilter === 'all' ? undefined : verdictFilter,
      tier: tierFilter || undefined,
      search: search || undefined,
      since: getTimeSince(timeFilter),
    });
    setActions(result.actions);
    setTotal(result.total);
    setLoading(false);
  }, [page, verdictFilter, tierFilter, search, timeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [search, verdictFilter, tierFilter, timeFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <h1>Activity Log</h1>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-carapace-text-dim" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actions, targets, descriptions..."
            className="w-full bg-carapace-bg-input border border-carapace-border rounded-lg pl-9 pr-3 py-2 text-sm text-carapace-text-primary placeholder:text-carapace-text-dim input-focus-glow"
          />
        </div>

        <div className="flex gap-1.5">
          {(['all', 'pass', 'block', 'warn'] as VerdictFilter[]).map((v) => (
            <PillButton
              key={v}
              active={verdictFilter === v}
              onClick={() => setVerdictFilter(v)}
            >
              {v === 'all' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
            </PillButton>
          ))}
        </div>

        <div className="flex gap-1.5">
          {([0, 1, 2, 3] as TierFilter[]).map((t) => (
            <PillButton
              key={t}
              active={tierFilter === t}
              onClick={() => setTierFilter(t)}
            >
              {t === 0 ? 'All' : `T${t}`}
            </PillButton>
          ))}
        </div>

        <div className="flex gap-1.5">
          {(
            [
              ['hour', 'Last hour'],
              ['day', 'Last 24h'],
              ['week', 'Last 7 days'],
              ['all', 'All time'],
            ] as [TimeFilter, string][]
          ).map(([key, label]) => (
            <PillButton
              key={key}
              active={timeFilter === key}
              onClick={() => setTimeFilter(key)}
            >
              {label}
            </PillButton>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-12 bg-carapace-bg-surface rounded-lg animate-pulse-slow"
            />
          ))}
        </div>
      ) : actions.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-carapace-text-secondary">
            No activity recorded yet. Your agent's actions will appear here once
            it starts using Carapace.
          </p>
        </Card>
      ) : (
        <>
          <div className="border border-carapace-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-carapace-bg-surface border-b border-carapace-border">
                  {[
                    'Time',
                    'Action',
                    'Target',
                    'Description',
                    'Verdict',
                    'Verified',
                    'Tier',
                    'Amount',
                  ].map((h) => (
                    <th
                      key={h}
                      className={cn(
                        'px-4 py-3 text-xs font-medium uppercase tracking-[0.05em] text-carapace-text-secondary',
                        h === 'Verified' ? 'text-center' : 'text-left'
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => (
                  <>
                    <tr
                      key={action.id}
                      onClick={() =>
                        setExpandedRow(
                          expandedRow === action.id ? null : action.id
                        )
                      }
                      className="group cursor-pointer transition-colors duration-200 hover:bg-carapace-bg-raised border-b border-carapace-border/50 last:border-b-0"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-carapace-text-secondary whitespace-nowrap">
                        <span title={new Date(action.timestamp).toISOString()}>
                          {formatRelativeTime(action.timestamp)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ActionIcon
                            actionType={action.action_type}
                            className="w-3.5 h-3.5 text-carapace-text-dim"
                          />
                          <span className="text-sm whitespace-nowrap">
                            {formatActionType(action.action_type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-carapace-text-secondary max-w-[180px]">
                        <span title={action.target}>
                          {truncate(action.target, 30)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-carapace-text-secondary max-w-[200px]">
                        <div className="flex items-center gap-1">
                          <span>{truncate(action.description, 40)}</span>
                          {expandedRow === action.id ? (
                            <ChevronDown className="w-3 h-3 text-carapace-text-dim flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-carapace-text-dim flex-shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={action.verdict} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {action.key_was_valid ? (
                          <Check className="w-4 h-4 text-carapace-green inline-block" />
                        ) : (
                          <X className="w-4 h-4 text-carapace-text-dim inline-block" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-carapace-text-secondary">
                        {action.tier === 0 ? <span className="text-carapace-text-dim">&mdash;</span> : `T${action.tier}`}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-carapace-text-secondary">
                        {action.amount > 0
                          ? formatCurrency(action.amount)
                          : '-'}
                      </td>
                    </tr>
                    {expandedRow === action.id && (
                      <ExpandedDetail
                        key={`detail-${action.id}`}
                        action={action}
                      />
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-carapace-text-dim">
              {total} total action{total !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-carapace-border rounded-lg text-carapace-text-secondary hover:bg-carapace-bg-raised disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              >
                Previous
              </button>
              <span className="text-carapace-text-secondary font-mono text-xs">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-carapace-border rounded-lg text-carapace-text-secondary hover:bg-carapace-bg-raised disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
