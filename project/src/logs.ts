/**
 * LOG STORE
 * 
 * SQLite-based action logging for the monitoring dashboard.
 * 
 * Database location: ~/.carapace/logs.db
 * 
 * This module handles:
 *   - Creating and managing the SQLite database
 *   - Writing action log entries
 *   - Querying session statistics for the status tool
 *   - Log retention/cleanup
 * 
 * The monitoring dashboard reads directly from this database file
 * to render the action feed, security summary, and drift indicators.
 * 
 * We use better-sqlite3 for synchronous, fast, local-only access.
 * No network calls, no external dependencies beyond the npm package.
 */

import Database from "better-sqlite3";
import path from "path";
import os from "os";
import fs from "fs";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface LogEntry {
  timestamp: string;
  action_type: string;
  target: string;
  amount: number;
  description: string;
  verdict: string;
  reason: string;
  key_was_valid: boolean;
  tier?: number;
}

interface LogResult {
  id: number;
}

interface SessionStats {
  totalActions: number;
  verifiedActions: number;
  blockedActions: number;
  unverifiedTier1: number;
  tierBreakdown: { tier1: number; tier2: number; tier3: number };
  sessionStart: string;
}

// ─────────────────────────────────────────────
// LogStore class
// ─────────────────────────────────────────────

export class LogStore {
  private db: Database.Database | null = null;
  private dbPath: string;
  private sessionStart: string;

  constructor() {
    this.dbPath = path.join(os.homedir(), ".carapace", "logs.db");
    this.sessionStart = new Date().toISOString();
  }

  /**
   * Initialize the database. Creates the tables if they don't exist.
   */
  async initialize(): Promise<void> {
    // Ensure the directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);

    // Enable WAL mode for better concurrent read performance
    // (the dashboard can read while the server writes)
    this.db.pragma("journal_mode = WAL");

    // Create the actions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        session_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        target TEXT NOT NULL,
        amount REAL DEFAULT 0,
        description TEXT NOT NULL,
        verdict TEXT NOT NULL,
        reason TEXT DEFAULT '',
        key_was_valid INTEGER DEFAULT 0,
        tier INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Create indexes for common queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_actions_timestamp ON actions(timestamp);
      CREATE INDEX IF NOT EXISTS idx_actions_session ON actions(session_id);
      CREATE INDEX IF NOT EXISTS idx_actions_type ON actions(action_type);
      CREATE INDEX IF NOT EXISTS idx_actions_verdict ON actions(verdict);
      CREATE INDEX IF NOT EXISTS idx_actions_tier ON actions(tier);
    `);

    console.error(`[Carapace] Log database initialized at ${this.dbPath}`);
  }

  /**
   * Log an action to the database.
   */
  async logAction(entry: LogEntry): Promise<LogResult> {
    if (!this.db) {
      throw new Error("LogStore not initialized. Call initialize() first.");
    }

    const stmt = this.db.prepare(`
      INSERT INTO actions (timestamp, session_id, action_type, target, amount, 
                          description, verdict, reason, key_was_valid, tier)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      entry.timestamp,
      this.sessionStart, // Use session start time as session ID
      entry.action_type,
      entry.target,
      entry.amount,
      entry.description,
      entry.verdict,
      entry.reason,
      entry.key_was_valid ? 1 : 0,
      entry.tier ?? 0
    );

    return { id: result.lastInsertRowid as number };
  }

  /**
   * Get statistics for the current session (used by carapace_status).
   */
  async getSessionStats(): Promise<SessionStats> {
    if (!this.db) {
      return {
        totalActions: 0,
        verifiedActions: 0,
        blockedActions: 0,
        unverifiedTier1: 0,
        tierBreakdown: { tier1: 0, tier2: 0, tier3: 0 },
        sessionStart: this.sessionStart,
      };
    }

    // Total actions this session
    const total = this.db
      .prepare("SELECT COUNT(*) as count FROM actions WHERE session_id = ?")
      .get(this.sessionStart) as { count: number };

    // Verified actions (key was valid)
    const verified = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM actions WHERE session_id = ? AND key_was_valid = 1"
      )
      .get(this.sessionStart) as { count: number };

    // Blocked actions
    const blocked = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM actions WHERE session_id = ? AND verdict = 'block'"
      )
      .get(this.sessionStart) as { count: number };

    // Unverified Tier 1 actions (the scary ones)
    const unverifiedT1 = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM actions WHERE session_id = ? AND tier = 1 AND key_was_valid = 0"
      )
      .get(this.sessionStart) as { count: number };

    // Tier breakdown
    const tier1 = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM actions WHERE session_id = ? AND tier = 1"
      )
      .get(this.sessionStart) as { count: number };
    const tier2 = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM actions WHERE session_id = ? AND tier = 2"
      )
      .get(this.sessionStart) as { count: number };
    const tier3 = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM actions WHERE session_id = ? AND tier = 3"
      )
      .get(this.sessionStart) as { count: number };

    return {
      totalActions: total.count,
      verifiedActions: verified.count,
      blockedActions: blocked.count,
      unverifiedTier1: unverifiedT1.count,
      tierBreakdown: {
        tier1: tier1.count,
        tier2: tier2.count,
        tier3: tier3.count,
      },
      sessionStart: this.sessionStart,
    };
  }

  /**
   * Get recent actions for the monitoring dashboard (API endpoint).
   * This would be called by the dashboard's localhost API.
   */
  getRecentActions(limit: number = 50): any[] {
    if (!this.db) return [];

    return this.db
      .prepare(
        "SELECT * FROM actions ORDER BY timestamp DESC LIMIT ?"
      )
      .all(limit);
  }

  /**
   * Get actions within a time range (for dashboard filtering).
   */
  getActionsByTimeRange(start: string, end: string): any[] {
    if (!this.db) return [];

    return this.db
      .prepare(
        "SELECT * FROM actions WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC"
      )
      .all(start, end);
  }

  /**
   * Clean up old logs based on retention policy.
   */
  cleanupOldLogs(retentionDays: number = 30): number {
    if (!this.db) return 0;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const cutoffStr = cutoff.toISOString();

    const result = this.db
      .prepare("DELETE FROM actions WHERE timestamp < ?")
      .run(cutoffStr);

    return result.changes;
  }

  /**
   * Get the database file path (for status reporting).
   */
  getDbPath(): string {
    return this.dbPath;
  }
}
