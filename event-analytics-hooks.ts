/**
 * OCC Live - Event Analytics Hooks (Part 7)
 * Infrastructure-only anonymous analytics hooks.
 * Provides hook points for future analytics without building a dashboard.
 *
 * Tracks (anonymously):
 * - Concurrent participant count over time
 * - Event duration
 * - Unique session count (not identity — just count)
 * - Activity utilization during events
 *
 * NEVER collects:
 * - Names, nicknames, usernames
 * - Student IDs, email addresses
 * - IP addresses
 * - Blackboard identities
 * - Individual student profiles
 * - Any personally identifiable information
 */

import type { EventConfig, EventAnalyticsHookPoints } from './event-types.ts';
import type { EventAnalyticsController } from './event-manager.ts';

// ─── Anonymous Metric Entry ──────────────────────────────────────────────────

interface MetricSnapshot {
  timestamp: number;
  concurrentCount: number;
  activitiesInUse: string[];
}

interface EventMetrics {
  eventId: string;
  eventName: string;
  startTime: number;
  endTime: number | null;
  peakConcurrent: number;
  uniqueSessionCount: number;
  snapshots: MetricSnapshot[];
}

// ─── Event Analytics Hooks ───────────────────────────────────────────────────

export class EventAnalyticsHooksImpl implements EventAnalyticsController {
  private currentMetrics: EventMetrics | null = null;
  private sessionsSeen: Set<string> = new Set();
  private currentConcurrent: number = 0;
  private hookConfig: EventAnalyticsHookPoints | null = null;
  private snapshotInterval: number | null = null;
  private metricsHistory: EventMetrics[] = [];

  /** Called when an event starts */
  onEventStart(event: EventConfig): void {
    this.hookConfig = event.analytics;
    this.sessionsSeen.clear();
    this.currentConcurrent = 0;

    this.currentMetrics = {
      eventId: event.id,
      eventName: event.name,
      startTime: Date.now(),
      endTime: null,
      peakConcurrent: 0,
      uniqueSessionCount: 0,
      snapshots: [],
    };

    // Start periodic concurrent count tracking
    if (this.hookConfig.trackConcurrentCount) {
      this.snapshotInterval = window.setInterval(() => {
        this.takeSnapshot();
      }, (this.hookConfig.concurrentCountInterval ?? 30) * 1000);
    }

    console.log(`[EventAnalytics] Started tracking: ${event.name}`);
  }

  /** Called when an event ends */
  onEventEnd(_event: EventConfig): void {
    if (this.currentMetrics) {
      this.currentMetrics.endTime = Date.now();
      this.currentMetrics.uniqueSessionCount = this.sessionsSeen.size;
      this.metricsHistory.push(this.currentMetrics);

      console.log(`[EventAnalytics] Event ended. Peak: ${this.currentMetrics.peakConcurrent}, Unique sessions: ${this.currentMetrics.uniqueSessionCount}`);
    }

    if (this.snapshotInterval !== null) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }

    this.currentMetrics = null;
    this.hookConfig = null;
  }

  /** Called when a player enters during an active event */
  onPlayerJoinDuringEvent(sessionId: string): void {
    if (!this.hookConfig?.onPlayerEnterDuringEvent) return;

    this.sessionsSeen.add(sessionId);
    this.currentConcurrent++;

    if (this.currentMetrics && this.currentConcurrent > this.currentMetrics.peakConcurrent) {
      this.currentMetrics.peakConcurrent = this.currentConcurrent;
    }
  }

  /** Called when a player leaves during an active event */
  onPlayerLeaveDuringEvent(_sessionId: string): void {
    if (!this.hookConfig?.onPlayerLeaveDuringEvent) return;

    this.currentConcurrent = Math.max(0, this.currentConcurrent - 1);
  }

  /** Record the current concurrent count */
  recordConcurrentCount(count: number): void {
    this.currentConcurrent = count;
    if (this.currentMetrics && count > this.currentMetrics.peakConcurrent) {
      this.currentMetrics.peakConcurrent = count;
    }
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get current metrics (if event active) */
  getCurrentMetrics(): EventMetrics | null {
    return this.currentMetrics;
  }

  /** Get metrics history */
  getHistory(): EventMetrics[] {
    return [...this.metricsHistory];
  }

  /** Get current concurrent count */
  getConcurrentCount(): number {
    return this.currentConcurrent;
  }

  /** Clear history */
  clearHistory(): void {
    this.metricsHistory = [];
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private takeSnapshot(): void {
    if (!this.currentMetrics) return;

    this.currentMetrics.snapshots.push({
      timestamp: Date.now(),
      concurrentCount: this.currentConcurrent,
      activitiesInUse: [], // Would be populated by activity system integration
    });
  }
}
