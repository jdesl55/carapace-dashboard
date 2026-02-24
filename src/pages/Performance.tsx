import { useState, useEffect } from 'react';
import { Lightbulb, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Card from '../components/ui/Card';
import { getReviews, getReviewTrends, getInsights } from '../lib/api';
import { formatRelativeTime, formatActionType, cn } from '../lib/utils';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Review {
  id: number;
  timestamp: string;
  session_id: string;
  overall_grade: string;
  overall_score: number;
  goal_alignment_score: number;
  security_compliance_score: number;
  constraint_adherence_score: number;
  total_actions: number;
  verified_actions: number;
  blocked_actions: number;
  highlights: {
    best_actions: Array<{ action_type: string; target: string; description: string }>;
    drift_moments: Array<{ action_type: string; target: string; description: string }>;
    blocked_actions: Array<{ action_type: string; target: string; reason: string }>;
    unverified_risks: Array<{ action_type: string; target: string; description: string }>;
  };
  insights: string[];
}

interface TrendsData {
  daily_scores: Array<{ date: string; overall: number; alignment: number; security: number }>;
  averages: { overall: number; alignment: number; security: number };
  trend_direction: string;
  best_day: { date: string; score: number } | null;
  worst_day: { date: string; score: number } | null;
}

// ─────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────

function gradeColor(grade: string): string {
  if (grade === 'A' || grade === 'B') return 'text-carapace-green';
  if (grade === 'C') return 'text-carapace-yellow';
  return 'text-carapace-red';
}

function gradeBgColor(grade: string): string {
  if (grade === 'A' || grade === 'B') return 'bg-carapace-green';
  if (grade === 'C') return 'bg-carapace-yellow';
  return 'bg-carapace-red';
}

function scoreBarColor(score: number): string {
  if (score >= 80) return 'bg-carapace-green';
  if (score >= 60) return 'bg-carapace-yellow';
  return 'bg-carapace-red';
}

function ringStrokeColor(score: number): string {
  if (score >= 80) return '#22C55E';
  if (score >= 70) return '#EAB308';
  return '#DC2626';
}

const PAGE_SIZE = 20;

// ─────────────────────────────────────────────
// Grade Circle SVG
// ─────────────────────────────────────────────

function GradeCircle({ grade, score }: { grade: string; score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const strokeColor = ringStrokeColor(score);

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#2A2A32"
          strokeWidth="8"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeDashoffset={circumference * 0.25}
          className="transition-all duration-500"
        />
        <text
          x="70"
          y="78"
          textAnchor="middle"
          className="font-mono font-bold"
          fill="#E8E8EC"
          fontSize="42"
        >
          {grade}
        </text>
      </svg>
      <span className="text-carapace-text-secondary text-sm font-mono mt-1">
        Overall: {score}/100
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Score Bar
// ─────────────────────────────────────────────

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-carapace-text-secondary text-sm w-44 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-2.5 bg-carapace-bg-raised rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${scoreBarColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="font-mono text-sm text-carapace-text-primary w-10 text-right">
        {score}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Highlight Section
// ─────────────────────────────────────────────

function Dot({ color }: { color: string }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 mt-1.5 ${color}`}
    />
  );
}

function HighlightSection({
  title,
  dotColor,
  items,
  emptyText,
  renderItem,
}: {
  title: string;
  dotColor: string;
  items: any[];
  emptyText: string;
  renderItem: (item: any, i: number) => React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-[0.05em] text-carapace-text-secondary mb-2">
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-sm text-carapace-text-dim">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-carapace-text-primary">
              <Dot color={dotColor} />
              {renderItem(item, i)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Custom Recharts Tooltip
// ─────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-carapace-bg-surface border border-carapace-border rounded-lg p-3 text-xs">
      <p className="font-mono text-carapace-text-secondary mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function Performance() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [insightsContent, setInsightsContent] = useState<{ exists: boolean; content: string }>({
    exists: false,
    content: '',
  });
  const [activeTab, setActiveTab] = useState<'history' | 'trends'>('history');
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [reviewsRes, trendsRes, insightsRes] = await Promise.all([
          getReviews(PAGE_SIZE, 0).catch(() => ({ reviews: [], total: 0 })),
          getReviewTrends(30).catch(() => ({
            daily_scores: [],
            averages: { overall: 0, alignment: 0, security: 0 },
            trend_direction: 'stable',
            best_day: null,
            worst_day: null,
          })),
          getInsights().catch(() => ({ exists: false, content: '' })),
        ]);
        setReviews(reviewsRes.reviews);
        setTotal(reviewsRes.total);
        setTrends(trendsRes);
        setInsightsContent(insightsRes);
      } catch {
        // All individual catches above handle failures — this is a safety net
      }
      setLoading(false);
    }
    load();
  }, []);

  // Paginated review loads
  useEffect(() => {
    if (page === 1) return; // already loaded in initial
    async function loadPage() {
      try {
        const res = await getReviews(PAGE_SIZE, (page - 1) * PAGE_SIZE);
        setReviews(res.reviews);
        setTotal(res.total);
      } catch {
        // Keep existing data on pagination failure
      }
    }
    loadPage();
  }, [page]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-6">
        <h1>Performance</h1>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 bg-carapace-bg-surface rounded-xl animate-pulse-slow"
          />
        ))}
      </div>
    );
  }

  // ── Empty state ──
  if (reviews.length === 0 && total === 0) {
    return (
      <div className="space-y-6">
        <h1>Performance</h1>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-lg text-center">
            <p className="text-carapace-text-secondary leading-relaxed">
              No session reviews yet. Your agent will generate reviews at the end
              of each session using the carapace_review tool.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const latest = reviews[0];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-8">
      <h1>Performance</h1>

      {/* ── Latest Review Card ── */}
      <Card>
        <h3 className="mb-5">Latest Review</h3>
        <div className="flex items-start gap-10">
          {/* Left: Grade circle */}
          <GradeCircle grade={latest.overall_grade} score={latest.overall_score} />

          {/* Right: Score bars + action summary */}
          <div className="flex-1 space-y-4">
            <ScoreBar label="Goal Alignment" score={latest.goal_alignment_score} />
            <ScoreBar label="Security Compliance" score={latest.security_compliance_score} />
            <ScoreBar label="Constraint Adherence" score={latest.constraint_adherence_score} />

            <p className="text-carapace-text-secondary font-mono text-sm pt-1">
              {latest.total_actions} total actions &middot;{' '}
              {latest.verified_actions} verified &middot;{' '}
              {latest.blocked_actions} blocked
            </p>
          </div>
        </div>
      </Card>

      {/* ── Highlights + Insights ── */}
      <div className="grid grid-cols-2 gap-6">
        {/* Card 1: Highlights */}
        <Card>
          <h3 className="mb-5">Highlights</h3>
          <div className="space-y-5">
            <HighlightSection
              title="Best Actions"
              dotColor="bg-carapace-green"
              items={(latest.highlights?.best_actions ?? []).slice(0, 3)}
              emptyText="No standout actions"
              renderItem={(item) => (
                <span>
                  <span className="text-carapace-text-secondary">
                    {formatActionType(item.action_type)}
                  </span>{' '}
                  &mdash; {item.description}
                </span>
              )}
            />
            <HighlightSection
              title="Drift Moments"
              dotColor="bg-carapace-yellow"
              items={(latest.highlights?.drift_moments ?? []).slice(0, 3)}
              emptyText="No drift detected"
              renderItem={(item) => (
                <span>
                  <span className="text-carapace-text-secondary">
                    {formatActionType(item.action_type)}
                  </span>{' '}
                  &mdash; {item.description}
                </span>
              )}
            />
            <HighlightSection
              title="Blocked Actions"
              dotColor="bg-carapace-red"
              items={latest.highlights?.blocked_actions ?? []}
              emptyText="No actions blocked"
              renderItem={(item) => (
                <span>
                  <span className="text-carapace-text-secondary">
                    {formatActionType(item.action_type)}
                  </span>{' '}
                  &mdash; {item.reason}
                </span>
              )}
            />
            <HighlightSection
              title="Unverified Risks"
              dotColor="bg-carapace-red"
              items={latest.highlights?.unverified_risks ?? []}
              emptyText="All sensitive actions verified"
              renderItem={(item) => (
                <span>
                  <span className="text-carapace-text-secondary">
                    {formatActionType(item.action_type)}
                  </span>{' '}
                  &mdash; {item.description}
                </span>
              )}
            />
          </div>
        </Card>

        {/* Card 2: Insights & Learnings */}
        <Card>
          <h3 className="mb-5">Insights &amp; Learnings</h3>
          {latest.insights.length > 0 ? (
            <ul className="space-y-3">
              {latest.insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-carapace-text-primary">
                  <Lightbulb className="w-4 h-4 text-carapace-yellow shrink-0 mt-0.5" />
                  {insight}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-carapace-text-dim">No insights for this session.</p>
          )}

          <div className="border-t border-carapace-border mt-5 pt-5">
            <h4 className="text-xs font-medium uppercase tracking-[0.05em] text-carapace-text-secondary mb-3">
              Insights File
            </h4>
            {insightsContent.exists ? (
              <div className="bg-carapace-bg-deep font-mono text-sm text-carapace-text-secondary p-4 rounded-lg max-h-48 overflow-auto">
                {insightsContent.content
                  .split('\n')
                  .slice(0, 10)
                  .map((line, i) => (
                    <div key={i}>{line || '\u00A0'}</div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-carapace-text-dim">No insights file yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* ── History / Trends Tabs ── */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200',
              activeTab === 'history'
                ? 'bg-carapace-red text-white'
                : 'bg-carapace-bg-raised text-carapace-text-secondary hover:text-carapace-text-primary'
            )}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200',
              activeTab === 'trends'
                ? 'bg-carapace-red text-white'
                : 'bg-carapace-bg-raised text-carapace-text-secondary hover:text-carapace-text-primary'
            )}
          >
            Trends
          </button>
        </div>

        {/* ── History Tab ── */}
        {activeTab === 'history' && (
          <>
            <div className="border border-carapace-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-carapace-bg-surface border-b border-carapace-border">
                    {['Date', 'Grade', 'Overall', 'Alignment', 'Security', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.05em] text-carapace-text-secondary"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-carapace-border/50 last:border-b-0 hover:bg-carapace-bg-raised transition-colors duration-200"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-carapace-text-secondary">
                        <span title={new Date(r.timestamp).toISOString()}>
                          {formatRelativeTime(r.timestamp)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center w-7 h-7 rounded-md font-mono font-bold text-sm',
                            gradeBgColor(r.overall_grade) + '/20',
                            gradeColor(r.overall_grade)
                          )}
                        >
                          {r.overall_grade}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-carapace-text-primary">
                        {r.overall_score}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-carapace-text-primary">
                        {r.goal_alignment_score}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-carapace-text-primary">
                        {r.security_compliance_score}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-carapace-text-secondary">
                        {r.total_actions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-sm mt-4">
              <span className="text-carapace-text-dim">
                {total} review{total !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border border-carapace-border rounded-lg text-carapace-text-secondary hover:bg-carapace-bg-raised disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <span className="text-carapace-text-secondary font-mono text-xs">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm border border-carapace-border rounded-lg text-carapace-text-secondary hover:bg-carapace-bg-raised disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Trends Tab ── */}
        {activeTab === 'trends' && trends && (
          <div className="space-y-6">
            {/* Chart */}
            <Card>
              <h3 className="mb-4">Score Trends (Last 30 Days)</h3>
              {trends.daily_scores.length === 0 ? (
                <p className="text-carapace-text-dim text-sm py-8 text-center">
                  Not enough data to show trends yet.
                </p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends.daily_scores}>
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#5A5A66', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                        stroke="#2A2A32"
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: '#5A5A66', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                        stroke="#2A2A32"
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="overall"
                        name="Overall"
                        stroke="#E8E8EC"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#E8E8EC' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="alignment"
                        name="Alignment"
                        stroke="#22C55E"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#22C55E' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="security"
                        name="Security"
                        stroke="#DC2626"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#DC2626' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Metric cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <p className="text-xs font-medium uppercase tracking-[0.05em] text-carapace-text-secondary mb-3">
                  Average Score
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold font-mono">
                    {trends.averages.overall}
                  </span>
                  {trends.trend_direction === 'improving' && (
                    <TrendingUp className="w-5 h-5 text-carapace-green" />
                  )}
                  {trends.trend_direction === 'declining' && (
                    <TrendingDown className="w-5 h-5 text-carapace-red" />
                  )}
                  {trends.trend_direction === 'stable' && (
                    <Minus className="w-5 h-5 text-carapace-text-dim" />
                  )}
                </div>
                <p className="text-xs text-carapace-text-dim mt-1 capitalize">
                  {trends.trend_direction}
                </p>
              </Card>

              <Card>
                <p className="text-xs font-medium uppercase tracking-[0.05em] text-carapace-text-secondary mb-3">
                  Best Session
                </p>
                {trends.best_day ? (
                  <>
                    <p className="text-3xl font-bold font-mono text-carapace-green">
                      {trends.best_day.score}
                    </p>
                    <p className="text-xs text-carapace-text-dim font-mono mt-1">
                      {trends.best_day.date}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-carapace-text-dim">No data</p>
                )}
              </Card>

              <Card>
                <p className="text-xs font-medium uppercase tracking-[0.05em] text-carapace-text-secondary mb-3">
                  Worst Session
                </p>
                {trends.worst_day ? (
                  <>
                    <p className="text-3xl font-bold font-mono text-carapace-red">
                      {trends.worst_day.score}
                    </p>
                    <p className="text-xs text-carapace-text-dim font-mono mt-1">
                      {trends.worst_day.date}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-carapace-text-dim">No data</p>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
