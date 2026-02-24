import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const CONFIG_PATH = path.join(os.homedir(), '.carapace', 'config.json');
const DB_PATH = path.join(os.homedir(), '.carapace', 'logs.db');

// ---------- Config endpoints ----------

app.get('/api/config', (_req, res) => {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return res.json({ exists: false });
    }
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(raw);
    return res.json({ exists: true, config });
  } catch (err) {
    console.error('Error reading config:', err);
    return res.status(500).json({ error: 'Failed to read config' });
  }
});

app.put('/api/config', (req, res) => {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(req.body, null, 2));
    return res.json({ success: true });
  } catch (err) {
    console.error('Error writing config:', err);
    return res.status(500).json({ error: 'Failed to write config' });
  }
});

// ---------- Logs endpoints ----------

function openDb(): Database.Database {
  return new Database(DB_PATH, { readonly: true });
}

app.get('/api/logs', (req, res) => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return res.json({ actions: [], total: 0 });
    }

    const db = openDb();
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const verdict = req.query.verdict as string | undefined;
    const tier = req.query.tier ? parseInt(req.query.tier as string) : undefined;
    const search = req.query.search as string | undefined;
    const since = req.query.since as string | undefined;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (verdict && verdict !== 'all') {
      conditions.push('verdict = ?');
      params.push(verdict);
    }
    if (tier !== undefined) {
      conditions.push('tier = ?');
      params.push(tier);
    }
    if (search) {
      conditions.push(
        '(action_type LIKE ? OR target LIKE ? OR description LIKE ?)'
      );
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (since) {
      conditions.push('timestamp >= ?');
      params.push(since);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db
      .prepare(`SELECT COUNT(*) as total FROM actions ${where}`)
      .get(...params) as { total: number };

    const actions = db
      .prepare(
        `SELECT * FROM actions ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    db.close();
    return res.json({ actions, total: countRow.total });
  } catch (err) {
    console.error('Error querying logs:', err);
    return res.status(500).json({ error: 'Failed to query logs' });
  }
});

app.get('/api/logs/stats', (_req, res) => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return res.json({
        totalActions: 0,
        sessionActions: 0,
        verifiedCount: 0,
        unverifiedCount: 0,
        blockedCount: 0,
        unverifiedTier1Count: 0,
        tierBreakdown: { t1: 0, t2: 0, t3: 0 },
        dailySpend: 0,
      });
    }

    const db = openDb();

    const totalActions = (
      db.prepare('SELECT COUNT(*) as c FROM actions').get() as { c: number }
    ).c;

    const verifiedCount = (
      db
        .prepare('SELECT COUNT(*) as c FROM actions WHERE key_was_valid = 1')
        .get() as { c: number }
    ).c;

    const blockedCount = (
      db
        .prepare("SELECT COUNT(*) as c FROM actions WHERE verdict = 'block'")
        .get() as { c: number }
    ).c;

    const unverifiedTier1Count = (
      db
        .prepare(
          'SELECT COUNT(*) as c FROM actions WHERE key_was_valid = 0 AND tier = 1'
        )
        .get() as { c: number }
    ).c;

    const t1 = (
      db
        .prepare('SELECT COUNT(*) as c FROM actions WHERE tier = 1')
        .get() as { c: number }
    ).c;
    const t2 = (
      db
        .prepare('SELECT COUNT(*) as c FROM actions WHERE tier = 2')
        .get() as { c: number }
    ).c;
    const t3 = (
      db
        .prepare('SELECT COUNT(*) as c FROM actions WHERE tier = 3')
        .get() as { c: number }
    ).c;

    const dailySpend = (
      db
        .prepare(
          "SELECT COALESCE(SUM(amount), 0) as s FROM actions WHERE date(timestamp) = date('now')"
        )
        .get() as { s: number }
    ).s;

    db.close();

    return res.json({
      totalActions,
      sessionActions: totalActions,
      verifiedCount,
      unverifiedCount: totalActions - verifiedCount,
      blockedCount,
      unverifiedTier1Count,
      tierBreakdown: { t1, t2, t3 },
      dailySpend,
    });
  } catch (err) {
    console.error('Error querying stats:', err);
    return res.status(500).json({ error: 'Failed to query stats' });
  }
});

// ---------- Reviews endpoints ----------

app.get('/api/reviews', (req, res) => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return res.json({ reviews: [], total: 0 });
    }

    const db = openDb();
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const countRow = db
      .prepare('SELECT COUNT(*) as total FROM reviews')
      .get() as { total: number };

    const rows = db
      .prepare('SELECT * FROM reviews ORDER BY timestamp DESC LIMIT ? OFFSET ?')
      .all(limit, offset) as any[];

    db.close();

    const reviews = rows.map((row) => ({
      ...row,
      highlights: JSON.parse(row.highlights),
      insights: JSON.parse(row.insights),
    }));

    return res.json({ reviews, total: countRow.total });
  } catch (err: any) {
    if (err.message && err.message.includes('no such table')) {
      return res.json({ reviews: [], total: 0 });
    }
    console.error('Error querying reviews:', err);
    return res.status(500).json({ error: 'Failed to query reviews' });
  }
});

app.get('/api/reviews/trends', (req, res) => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return res.json({
        daily_scores: [],
        averages: { overall: 0, alignment: 0, security: 0 },
        trend_direction: 'stable',
        best_day: null,
        worst_day: null,
      });
    }

    const db = openDb();
    const days = parseInt(req.query.days as string) || 30;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString();

    const rows = db
      .prepare('SELECT * FROM reviews WHERE timestamp >= ? ORDER BY timestamp ASC')
      .all(cutoffStr) as any[];

    db.close();

    // Group by date and calculate daily averages
    const byDate: Record<string, { overall: number[]; alignment: number[]; security: number[] }> = {};
    for (const row of rows) {
      const date = row.timestamp.split('T')[0];
      if (!byDate[date]) {
        byDate[date] = { overall: [], alignment: [], security: [] };
      }
      byDate[date].overall.push(row.overall_score);
      byDate[date].alignment.push(row.goal_alignment_score);
      byDate[date].security.push(row.security_compliance_score);
    }

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const daily_scores = Object.entries(byDate).map(([date, scores]) => ({
      date,
      overall: Math.round(avg(scores.overall) * 100) / 100,
      alignment: Math.round(avg(scores.alignment) * 100) / 100,
      security: Math.round(avg(scores.security) * 100) / 100,
    }));

    // Overall averages across all reviews
    const allOverall = rows.map((r) => r.overall_score);
    const allAlignment = rows.map((r) => r.goal_alignment_score);
    const allSecurity = rows.map((r) => r.security_compliance_score);

    const averages = {
      overall: Math.round(avg(allOverall) * 100) / 100,
      alignment: Math.round(avg(allAlignment) * 100) / 100,
      security: Math.round(avg(allSecurity) * 100) / 100,
    };

    // Trend direction: compare last 7 days vs previous 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const recentScores = rows
      .filter((r) => new Date(r.timestamp) >= sevenDaysAgo)
      .map((r) => r.overall_score);
    const previousScores = rows
      .filter((r) => new Date(r.timestamp) >= fourteenDaysAgo && new Date(r.timestamp) < sevenDaysAgo)
      .map((r) => r.overall_score);

    const recentAvg = avg(recentScores);
    const previousAvg = avg(previousScores);
    const diff = recentAvg - previousAvg;

    let trend_direction: string;
    if (previousScores.length === 0 || recentScores.length === 0) {
      trend_direction = 'stable';
    } else if (diff > 5) {
      trend_direction = 'improving';
    } else if (diff < -5) {
      trend_direction = 'declining';
    } else {
      trend_direction = 'stable';
    }

    // Best and worst days
    let best_day: { date: string; score: number } | null = null;
    let worst_day: { date: string; score: number } | null = null;

    for (const entry of daily_scores) {
      if (!best_day || entry.overall > best_day.score) {
        best_day = { date: entry.date, score: entry.overall };
      }
      if (!worst_day || entry.overall < worst_day.score) {
        worst_day = { date: entry.date, score: entry.overall };
      }
    }

    return res.json({ daily_scores, averages, trend_direction, best_day, worst_day });
  } catch (err: any) {
    if (err.message && err.message.includes('no such table')) {
      return res.json({
        daily_scores: [],
        averages: { overall: 0, alignment: 0, security: 0 },
        trend_direction: 'stable',
        best_day: null,
        worst_day: null,
      });
    }
    console.error('Error querying review trends:', err);
    return res.status(500).json({ error: 'Failed to query review trends' });
  }
});

// ---------- Insights endpoint ----------

app.get('/api/insights', (_req, res) => {
  try {
    const insightsPath = path.join(os.homedir(), '.carapace', 'insights.md');
    if (!fs.existsSync(insightsPath)) {
      return res.json({ exists: false, content: '' });
    }
    const content = fs.readFileSync(insightsPath, 'utf-8');
    return res.json({ exists: true, content });
  } catch (err) {
    console.error('Error reading insights:', err);
    return res.status(500).json({ error: 'Failed to read insights' });
  }
});

app.listen(PORT, () => {
  console.log(`Carapace API server running on http://localhost:${PORT}`);
});
