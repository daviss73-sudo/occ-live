/**
 * OCC Live - Dance-Off Anonymous Leaderboard
 * Stores and retrieves high scores for the Dance-Off rhythm game.
 * Completely anonymous — no names, IDs, or identifying information.
 *
 * Storage:
 * - Uses localStorage for persistence across sessions
 * - Scores are stored as anonymous entries with score + metadata only
 * - No session IDs, no timestamps tied to identity
 * - Maximum 50 entries retained (oldest low scores pruned)
 *
 * Privacy:
 * - No player names or nicknames
 * - No session ID association
 * - No IP or device fingerprinting
 * - Leaderboard shows rank + score + max combo only
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  score: number;
  maxCombo: number;
  perfects: number;
  goods: number;
  misses: number;
  accuracy: number; // 0-100
  /** Timestamp for sorting ties (not displayed, not identifying) */
  timestamp: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'occ_live_danceoff_leaderboard';
const MAX_ENTRIES = 50;

// ─── Dance-Off Leaderboard ───────────────────────────────────────────────────

export class DanceOffLeaderboard {
  private entries: LeaderboardEntry[] = [];

  constructor() {
    this.load();
  }

  // ─── Score Submission ──────────────────────────────────────────────────

  /**
   * Submit a score to the leaderboard.
   * Returns the rank (1-based) or null if it didn't make the board.
   */
  submitScore(score: number, maxCombo: number, perfects: number, goods: number, misses: number): number | null {
    const total = perfects + goods + misses;
    const accuracy = total > 0 ? Math.round(((perfects + goods) / total) * 100) : 0;

    const entry: LeaderboardEntry = {
      score,
      maxCombo,
      perfects,
      goods,
      misses,
      accuracy,
      timestamp: Date.now(),
    };

    this.entries.push(entry);

    // Sort descending by score, then by timestamp (earlier = higher rank for ties)
    this.entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timestamp - b.timestamp;
    });

    // Prune to max entries
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(0, MAX_ENTRIES);
    }

    // Save
    this.save();

    // Return rank (or null if pruned off)
    const rank = this.entries.findIndex(e => e === entry);
    return rank >= 0 ? rank + 1 : null;
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get top N scores */
  getTopScores(count: number = 10): LeaderboardEntry[] {
    return this.entries.slice(0, count);
  }

  /** Get all entries */
  getAllEntries(): LeaderboardEntry[] {
    return [...this.entries];
  }

  /** Get the highest score ever recorded */
  getHighScore(): number {
    return this.entries.length > 0 ? this.entries[0].score : 0;
  }

  /** Get total number of entries */
  getEntryCount(): number {
    return this.entries.length;
  }

  /** Get the rank a given score would achieve (without submitting) */
  peekRank(score: number): number {
    let rank = 1;
    for (const entry of this.entries) {
      if (score > entry.score) break;
      rank++;
    }
    return rank;
  }

  /** Is this score a new high score? */
  isHighScore(score: number): boolean {
    return this.entries.length === 0 || score > this.entries[0].score;
  }

  /** Would this score make the leaderboard? */
  wouldMakeBoard(score: number): boolean {
    if (this.entries.length < MAX_ENTRIES) return true;
    const lowest = this.entries[this.entries.length - 1];
    return score > lowest.score;
  }

  // ─── Stats ─────────────────────────────────────────────────────────────

  /** Get aggregate stats across all plays */
  getStats(): {
    totalPlays: number;
    highScore: number;
    avgScore: number;
    bestCombo: number;
    avgAccuracy: number;
  } {
    if (this.entries.length === 0) {
      return { totalPlays: 0, highScore: 0, avgScore: 0, bestCombo: 0, avgAccuracy: 0 };
    }

    const totalPlays = this.entries.length;
    const highScore = this.entries[0].score;
    const avgScore = Math.round(this.entries.reduce((sum, e) => sum + e.score, 0) / totalPlays);
    const bestCombo = Math.max(...this.entries.map(e => e.maxCombo));
    const avgAccuracy = Math.round(this.entries.reduce((sum, e) => sum + e.accuracy, 0) / totalPlays);

    return { totalPlays, highScore, avgScore, bestCombo, avgAccuracy };
  }

  // ─── Management ────────────────────────────────────────────────────────

  /** Clear all scores */
  clearAll(): void {
    this.entries = [];
    this.save();
  }

  // ─── Persistence ───────────────────────────────────────────────────────

  private save(): void {
    try {
      const data = JSON.stringify(this.entries);
      localStorage.setItem(STORAGE_KEY, data);
    } catch {
      // localStorage unavailable — scores won't persist but game still works
    }
  }

  private load(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          this.entries = parsed;
          // Re-sort in case of corruption
          this.entries.sort((a, b) => b.score - a.score);
        }
      }
    } catch {
      this.entries = [];
    }
  }
}
