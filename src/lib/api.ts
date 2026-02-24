import type { CarapaceConfig, ActionLog, LogStats } from './types';

export async function getConfig(): Promise<{
  exists: boolean;
  config?: CarapaceConfig;
}> {
  const res = await fetch('/api/config');
  return res.json();
}

export async function saveConfig(config: CarapaceConfig): Promise<void> {
  await fetch('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
}

export interface LogsQuery {
  limit?: number;
  offset?: number;
  verdict?: string;
  tier?: number;
  search?: string;
  since?: string;
}

export async function getLogs(
  query: LogsQuery = {}
): Promise<{ actions: ActionLog[]; total: number }> {
  const params = new URLSearchParams();
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.offset !== undefined) params.set('offset', String(query.offset));
  if (query.verdict) params.set('verdict', query.verdict);
  if (query.tier !== undefined) params.set('tier', String(query.tier));
  if (query.search) params.set('search', query.search);
  if (query.since) params.set('since', query.since);

  const res = await fetch(`/api/logs?${params.toString()}`);
  return res.json();
}

export async function getLogStats(): Promise<LogStats> {
  const res = await fetch('/api/logs/stats');
  return res.json();
}

export async function getReviews(limit = 20, offset = 0): Promise<{ reviews: any[]; total: number }> {
  const res = await fetch(`/api/reviews?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
}

export async function getReviewTrends(days = 30): Promise<any> {
  const res = await fetch(`/api/reviews/trends?days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch trends');
  return res.json();
}

export async function getInsights(): Promise<{ exists: boolean; content: string }> {
  const res = await fetch('/api/insights');
  if (!res.ok) throw new Error('Failed to fetch insights');
  return res.json();
}
