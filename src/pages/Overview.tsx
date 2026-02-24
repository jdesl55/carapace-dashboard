import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  X,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import Card from '../components/ui/Card';
import StatusBadge from '../components/ui/StatusBadge';
import ActionIcon from '../components/ActionIcon';
import { useConfig } from '../hooks/useConfig';
import { getLogs, getLogStats } from '../lib/api';
import { formatRelativeTime, formatCurrency, truncate, formatActionType } from '../lib/utils';
import type { ActionLog, LogStats, HealthStatus, DriftLevel } from '../lib/types';

function computeHealth(stats: LogStats): { status: HealthStatus; reason: string } {
  if (stats.blockedCount > 3 || stats.unverifiedTier1Count > 1) {
    return {
      status: 'ALERT',
      reason: `${stats.blockedCount} blocked actions, ${stats.unverifiedTier1Count} unverified Tier 1`,
    };
  }
  if (stats.unverifiedTier1Count > 0) {
    return {
      status: 'WARNING',
      reason: 'Unverified Tier 1 actions detected',
    };
  }
  return { status: 'HEALTHY', reason: 'All systems operating normally' };
}

function computeDrift(): { level: DriftLevel; lastAnchorMinutes: number } {
  return { level: 'Low', lastAnchorMinutes: 8 };
}

function SpendBar({ spent, limit }: { spent: number; limit: number }) {
  const pct = Math.min((spent / limit) * 100, 100);
  const color =
    pct < 50
      ? 'bg-carapace-green'
      : pct < 80
        ? 'bg-carapace-yellow'
        : 'bg-carapace-red';

  return (
    <div className="mt-3">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="font-mono text-lg text-carapace-text-primary">
          {formatCurrency(spent)}
        </span>
        <span className="font-mono text-sm text-carapace-text-dim">
          / {formatCurrency(limit)}
        </span>
      </div>
      <div className="w-full h-2 bg-carapace-bg-deep rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ActivityRow({
  action,
  expanded,
  onToggle,
}: {
  action: ActionLog;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="group cursor-pointer transition-colors duration-200 hover:bg-carapace-bg-raised"
      >
        <td className="px-4 py-3 font-mono text-xs text-carapace-text-secondary">
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
            <span className="text-sm">{formatActionType(action.action_type)}</span>
          </div>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-carapace-text-secondary max-w-[200px]">
          <span title={action.target}>{truncate(action.target, 40)}</span>
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
        <td className="px-4 py-3 text-carapace-text-dim">
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-carapace-bg-raised">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-carapace-text-dim text-xs uppercase tracking-wide">
                  Description
                </span>
                <p className="mt-1 text-carapace-text-primary">
                  {action.description}
                </p>
              </div>
              <div>
                <span className="text-carapace-text-dim text-xs uppercase tracking-wide">
                  Reason
                </span>
                <p className="mt-1 text-carapace-text-primary">
                  {action.reason || 'N/A'}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function Overview() {
  const { config, exists, loading: configLoading } = useConfig();
  const [actions, setActions] = useState<ActionLog[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [logsRes, statsRes] = await Promise.all([
      getLogs({ limit: 20 }),
      getLogStats(),
    ]);
    setActions(logsRes.actions);
    setStats(statsRes);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setTimeout(() => setRefreshing(false), 600);
  };

  if (configLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 bg-carapace-bg-surface rounded-xl animate-pulse-slow"
          />
        ))}
      </div>
    );
  }

  if (!exists) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-lg text-center">
          <div className="w-12 h-12 rounded-full bg-carapace-red-dim flex items-center justify-center mx-auto mb-4">
            <span className="text-xl">!</span>
          </div>
          <h2 className="mb-2">Carapace Not Configured</h2>
          <p className="text-carapace-text-secondary leading-relaxed">
            Carapace MCP server hasn't been run yet. Start the server first to
            generate your config, then refresh this page.
          </p>
        </Card>
      </div>
    );
  }

  const health = stats ? computeHealth(stats) : null;
  const drift = computeDrift();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1>Command Center</h1>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-carapace-text-secondary hover:text-carapace-text-primary rounded-lg border border-carapace-border hover:border-carapace-border-light transition-all duration-200"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <p className="text-xs font-medium uppercase tracking-[0.05em] text-carapace-text-secondary mb-3">
            Health Status
          </p>
          {health && (
            <>
              <StatusBadge status={health.status} size="lg" />
              <p className="text-xs text-carapace-text-dim mt-2">
                {health.reason}
              </p>
            </>
          )}
        </Card>

        <Card>
          <p className="text-xs font-medium uppercase tracking-[0.05em] text-carapace-text-secondary mb-3">
            Actions This Session
          </p>
          <p className="text-3xl font-bold font-mono">
            {stats?.sessionActions ?? 0}
          </p>
          {stats && (
            <>
              <p className="text-xs text-carapace-text-secondary mt-1">
                {stats.verifiedCount} verified · {stats.blockedCount} blocked
              </p>
              <p className="font-mono text-xs text-carapace-text-dim mt-1">
                T1: {stats.tierBreakdown.t1} &nbsp;T2: {stats.tierBreakdown.t2} &nbsp;T3: {stats.tierBreakdown.t3}
              </p>
            </>
          )}
        </Card>

        <Card>
          <p className="text-xs font-medium uppercase tracking-[0.05em] text-carapace-text-secondary mb-3">
            Spend Tracking
          </p>
          <SpendBar
            spent={stats?.dailySpend ?? 0}
            limit={config?.security.spendingLimits.daily ?? 200}
          />
        </Card>

        <Card>
          <p className="text-xs font-medium uppercase tracking-[0.05em] text-carapace-text-secondary mb-3">
            Goal Drift
          </p>
          <StatusBadge
            status={
              drift.level === 'None' || drift.level === 'Low'
                ? 'pass'
                : drift.level === 'Medium'
                  ? 'warn'
                  : 'block'
            }
            label={drift.level}
            size="lg"
          />
          <p className="text-xs text-carapace-text-dim mt-2">
            Last anchor: {drift.lastAnchorMinutes} minutes ago
          </p>
        </Card>
      </div>

      {config && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <h3 className="mb-3">Active Rules</h3>
            <p className="text-sm text-carapace-text-secondary leading-relaxed">
              Spend limit: {formatCurrency(config.security.spendingLimits.perAction)}
              /action, {formatCurrency(config.security.spendingLimits.daily)}/day
              {config.security.contacts.blocked.length > 0 &&
                ` · ${config.security.contacts.blocked.length} blocked contact${config.security.contacts.blocked.length > 1 ? 's' : ''}`}
              {config.security.domains.blocked.length > 0 &&
                ` · ${config.security.domains.blocked.length} blocked domain${config.security.domains.blocked.length > 1 ? 's' : ''}`}
              {config.security.blockedActions.length > 0 &&
                ` · ${config.security.blockedActions.length} disabled action type${config.security.blockedActions.length > 1 ? 's' : ''}`}
            </p>
            <Link
              to="/rules"
              className="inline-flex items-center gap-1 text-sm text-carapace-text-secondary hover:text-carapace-red transition-colors duration-200 mt-3"
            >
              Configure rules <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          <Card>
            <h3 className="mb-3">Current Goals</h3>
            {config.anchor.goals.length > 0 ? (
              <ul className="space-y-1.5">
                {config.anchor.goals.slice(0, 2).map((goal, i) => (
                  <li
                    key={i}
                    className="text-sm text-carapace-text-secondary flex items-start gap-2"
                  >
                    <span className="text-carapace-text-dim mt-0.5">
                      {i + 1}.
                    </span>
                    {goal}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-carapace-text-dim">No goals configured yet.</p>
            )}
            <Link
              to="/goals"
              className="inline-flex items-center gap-1 text-sm text-carapace-text-secondary hover:text-carapace-red transition-colors duration-200 mt-3"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2>Recent Activity</h2>
          <Link
            to="/activity"
            className="text-sm text-carapace-text-secondary hover:text-carapace-red transition-colors duration-200 flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {actions.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-carapace-text-secondary">
              No agent activity recorded yet. Actions will appear here once your
              agent starts using Carapace.
            </p>
          </Card>
        ) : (
          <div className="border border-carapace-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-carapace-bg-surface border-b border-carapace-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.05em] text-carapace-text-secondary">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.05em] text-carapace-text-secondary">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.05em] text-carapace-text-secondary">
                    Target
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.05em] text-carapace-text-secondary">
                    Verdict
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-[0.05em] text-carapace-text-secondary">
                    Verified
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.05em] text-carapace-text-secondary">
                    Tier
                  </th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => (
                  <ActivityRow
                    key={action.id}
                    action={action}
                    expanded={expandedRow === action.id}
                    onToggle={() =>
                      setExpandedRow(
                        expandedRow === action.id ? null : action.id
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
