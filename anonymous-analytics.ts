/**
 * OCC Live - Anonymous Analytics System
 * Collects aggregate usage metrics without identifying individual users.
 *
 * Privacy rules (from occ-live-security.md):
 * - No names, nicknames, usernames, emails, student IDs, or school info
 * - No IP collection by OCC Live application logic
 * - No persistent user profiles or social graphs
 * - Session identifiers are ephemeral, randomly generated, non-persistent
 * - Analytics do not attach personal identity to session metrics
 * - No external analytics services (Google Analytics, Mixpanel, etc.)
 *
 * What IS collected (all anonymous, aggregate):
 * - Anonymous session counts (daily/weekly/monthly visitors)
 * - Session duration
 * - Peak concurrent users
 * - Entry/exit times (time-of-day, not tied to identity)
 * - Spaces visited (zone counts, not per-user paths)
 * - Time spent per space (aggregate averages)
 * - Activities used (counts)
 * - Event attendance (counts only)
 * - Event duration
 * - District transitions (counts)
 * - Avatar selections (which avatars are popular, not who chose them)
 * - Photobooth usage (session counts, group vs solo ratio)
 * - Lazy River usage (entry counts)
 * - Technical errors/disconnects (counts and categories)
 *
 * Data is stored in memory during the session and can be flushed
 * to the server for aggregate reporting. The server stores only
 * aggregate totals — never individual session trails.
 */

// ─── Analytics Event Types ───────────────────────────────────────────────────

export type AnalyticsEventType =
  | 'session_start'
  | 'session_end'
  | 'zone_enter'
  | 'zone_exit'
  | 'activity_start'
  | 'activity_end'
  | 'event_join'
  | 'event_leave'
  | 'district_enter'
  | 'district_exit'
  | 'avatar_selected'
  | 'photobooth_solo'
  | 'photobooth_group'
  | 'photobooth_queue_join'
  | 'lazy_river_enter'
  | 'lazy_river_exit'
  | 'emote_used'
  | 'error_occurred'
  | 'disconnect';

// ─── Analytics Event ─────────────────────────────────────────────────────────

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  /** Timestamp (epoch ms) */
  timestamp: number;
  /** Non-identifying metadata */
  metadata: Record<string, string | number | boolean>;
}

// ─── Session Metrics (collected per session, flushed as aggregate) ────────────

export interface SessionMetrics {
  /** Session start time (epoch ms) */
  startTime: number;
  /** Session end time (epoch ms, 0 if still active) */
  endTime: number;
  /** Total duration in seconds */
  durationSeconds: number;
  /** Zones visited (zone ID → time spent in seconds) */
  zonesVisited: Map<string, number>;
  /** Activities used (activity ID → usage count) */
  activitiesUsed: Map<string, number>;
  /** Districts entered (district ID → entry count) */
  districtsEntered: Map<string, number>;
  /** Emotes used (emote ID → count) */
  emotesUsed: Map<string, number>;
  /** Avatar ID selected */
  avatarSelected: string | null;
  /** Photobooth: solo photos taken */
  photoboothSolo: number;
  /** Photobooth: group photos taken */
  photoboothGroup: number;
  /** Lazy River entries */
  lazyRiverEntries: number;
  /** Errors encountered (category → count) */
  errors: Map<string, number>;
  /** Number of disconnects */
  disconnects: number;
  /** Events attended (event ID → duration seconds) */
  eventsAttended: Map<string, number>;
}

// ─── Aggregate Snapshot (what gets sent to server) ───────────────────────────

export interface AggregateSnapshot {
  /** Time window start */
  periodStart: number;
  /** Time window end */
  periodEnd: number;
  /** Total sessions in this period */
  totalSessions: number;
  /** Peak concurrent users observed */
  peakConcurrent: number;
  /** Average session duration (seconds) */
  avgSessionDuration: number;
  /** Zone visit counts */
  zoneVisitCounts: Record<string, number>;
  /** Average time per zone (seconds) */
  avgTimePerZone: Record<string, number>;
  /** Activity usage counts */
  activityCounts: Record<string, number>;
  /** District transition counts */
  districtTransitionCounts: Record<string, number>;
  /** Avatar selection counts */
  avatarSelectionCounts: Record<string, number>;
  /** Photobooth usage */
  photoboothStats: { solo: number; group: number; totalSessions: number };
  /** Lazy River entries */
  lazyRiverEntries: number;
  /** Event attendance counts */
  eventAttendanceCounts: Record<string, number>;
  /** Error counts by category */
  errorCounts: Record<string, number>;
  /** Total disconnects */
  totalDisconnects: number;
  /** Hourly entry distribution (hour 0-23 → count) */
  entryByHour: Record<number, number>;
  /** Hourly exit distribution (hour 0-23 → count) */
  exitByHour: Record<number, number>;
}

// ─── Callbacks ───────────────────────────────────────────────────────────────

export interface AnalyticsCallbacks {
  /** Called when aggregate data is ready to flush to server */
  onFlush?: (snapshot: AggregateSnapshot) => void;
  /** Called on peak concurrent update */
  onPeakUpdate?: (peak: number) => void;
}

// ─── Anonymous Analytics System ──────────────────────────────────────────────

export class AnonymousAnalytics {
  private enabled: boolean = true;
  private callbacks: AnalyticsCallbacks = {};

  // Current session metrics
  private session: SessionMetrics;
  private currentZone: string | null = null;
  private zoneEnteredAt: number = 0;
  private currentEvent: string | null = null;
  private eventEnteredAt: number = 0;

  // Aggregate tracking (across all sessions observed locally)
  private peakConcurrent: number = 0;
  private currentConcurrent: number = 0;
  private eventLog: AnalyticsEvent[] = [];
  private maxEventLog: number = 500; // Keep last 500 events in memory

  // Flush timing
  private flushIntervalMs: number = 300000; // 5 minutes
  private flushTimer: number | null = null;
  private lastFlushTime: number = 0;

  constructor() {
    this.session = this.createEmptySession();
  }

  // ─── Configuration ─────────────────────────────────────────────────────

  setCallbacks(callbacks: AnalyticsCallbacks): void {
    this.callbacks = callbacks;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setFlushInterval(ms: number): void {
    this.flushIntervalMs = Math.max(30000, ms); // Minimum 30 seconds
  }

  // ─── Session Lifecycle ─────────────────────────────────────────────────

  /** Call when a player session begins */
  startSession(avatarId: string | null): void {
    if (!this.enabled) return;

    this.session = this.createEmptySession();
    this.session.startTime = Date.now();
    this.session.avatarSelected = avatarId;

    this.recordEvent('session_start', {
      hour: new Date().getHours(),
    });

    // Start periodic flush
    this.startFlushTimer();
  }

  /** Call when a player session ends */
  endSession(): void {
    if (!this.enabled) return;

    this.session.endTime = Date.now();
    this.session.durationSeconds = Math.round(
      (this.session.endTime - this.session.startTime) / 1000
    );

    // Close any open zone tracking
    if (this.currentZone) {
      this.exitZone(this.currentZone);
    }

    // Close any open event tracking
    if (this.currentEvent) {
      this.leaveEvent(this.currentEvent);
    }

    this.recordEvent('session_end', {
      hour: new Date().getHours(),
      durationSeconds: this.session.durationSeconds,
    });

    // Final flush
    this.flush();
    this.stopFlushTimer();
  }

  // ─── Zone Tracking ─────────────────────────────────────────────────────

  /** Call when player enters a zone */
  enterZone(zoneId: string): void {
    if (!this.enabled) return;

    // Exit previous zone first
    if (this.currentZone && this.currentZone !== zoneId) {
      this.exitZone(this.currentZone);
    }

    this.currentZone = zoneId;
    this.zoneEnteredAt = Date.now();

    const count = this.session.zonesVisited.get(zoneId) ?? 0;
    this.session.zonesVisited.set(zoneId, count); // Will add time on exit

    this.recordEvent('zone_enter', { zoneId });
  }

  /** Call when player exits a zone */
  exitZone(zoneId: string): void {
    if (!this.enabled) return;
    if (this.currentZone !== zoneId) return;

    const timeSpent = Math.round((Date.now() - this.zoneEnteredAt) / 1000);
    const existing = this.session.zonesVisited.get(zoneId) ?? 0;
    this.session.zonesVisited.set(zoneId, existing + timeSpent);

    this.recordEvent('zone_exit', { zoneId, timeSpentSeconds: timeSpent });

    this.currentZone = null;
    this.zoneEnteredAt = 0;
  }

  // ─── Activity Tracking ─────────────────────────────────────────────────

  /** Call when player starts an activity */
  startActivity(activityId: string): void {
    if (!this.enabled) return;

    const count = this.session.activitiesUsed.get(activityId) ?? 0;
    this.session.activitiesUsed.set(activityId, count + 1);

    this.recordEvent('activity_start', { activityId });
  }

  /** Call when player ends an activity */
  endActivity(activityId: string): void {
    if (!this.enabled) return;
    this.recordEvent('activity_end', { activityId });
  }

  // ─── District Tracking ─────────────────────────────────────────────────

  /** Call when player enters a district */
  enterDistrict(districtId: string): void {
    if (!this.enabled) return;

    const count = this.session.districtsEntered.get(districtId) ?? 0;
    this.session.districtsEntered.set(districtId, count + 1);

    this.recordEvent('district_enter', { districtId });
  }

  /** Call when player exits a district */
  exitDistrict(districtId: string): void {
    if (!this.enabled) return;
    this.recordEvent('district_exit', { districtId });
  }

  // ─── Event Attendance ──────────────────────────────────────────────────

  /** Call when player joins an event */
  joinEvent(eventId: string): void {
    if (!this.enabled) return;

    this.currentEvent = eventId;
    this.eventEnteredAt = Date.now();

    this.recordEvent('event_join', { eventId });
  }

  /** Call when player leaves an event */
  leaveEvent(eventId: string): void {
    if (!this.enabled) return;
    if (this.currentEvent !== eventId) return;

    const duration = Math.round((Date.now() - this.eventEnteredAt) / 1000);
    const existing = this.session.eventsAttended.get(eventId) ?? 0;
    this.session.eventsAttended.set(eventId, existing + duration);

    this.recordEvent('event_leave', { eventId, durationSeconds: duration });

    this.currentEvent = null;
    this.eventEnteredAt = 0;
  }

  // ─── Feature Usage ─────────────────────────────────────────────────────

  /** Call when avatar is selected */
  trackAvatarSelection(avatarId: string): void {
    if (!this.enabled) return;
    this.session.avatarSelected = avatarId;
    this.recordEvent('avatar_selected', { avatarId });
  }

  /** Call when photobooth session completes */
  trackPhotoboothUsage(mode: 'solo' | 'group'): void {
    if (!this.enabled) return;
    if (mode === 'solo') this.session.photoboothSolo++;
    else this.session.photoboothGroup++;
    this.recordEvent(mode === 'solo' ? 'photobooth_solo' : 'photobooth_group', {});
  }

  /** Call when photobooth queue is joined */
  trackPhotoboothQueueJoin(): void {
    if (!this.enabled) return;
    this.recordEvent('photobooth_queue_join', {});
  }

  /** Call when player enters lazy river */
  trackLazyRiverEntry(): void {
    if (!this.enabled) return;
    this.session.lazyRiverEntries++;
    this.recordEvent('lazy_river_enter', {});
  }

  /** Call when player exits lazy river */
  trackLazyRiverExit(): void {
    if (!this.enabled) return;
    this.recordEvent('lazy_river_exit', {});
  }

  /** Call when emote is used */
  trackEmote(emoteId: string): void {
    if (!this.enabled) return;
    const count = this.session.emotesUsed.get(emoteId) ?? 0;
    this.session.emotesUsed.set(emoteId, count + 1);
    this.recordEvent('emote_used', { emoteId });
  }

  // ─── Error/Disconnect Tracking ─────────────────────────────────────────

  /** Call when a technical error occurs */
  trackError(category: string): void {
    if (!this.enabled) return;
    const count = this.session.errors.get(category) ?? 0;
    this.session.errors.set(category, count + 1);
    this.recordEvent('error_occurred', { category });
  }

  /** Call when a disconnect occurs */
  trackDisconnect(): void {
    if (!this.enabled) return;
    this.session.disconnects++;
    this.recordEvent('disconnect', {});
  }

  // ─── Concurrent User Tracking ──────────────────────────────────────────

  /** Update the current concurrent user count (from server) */
  updateConcurrentUsers(count: number): void {
    this.currentConcurrent = count;
    if (count > this.peakConcurrent) {
      this.peakConcurrent = count;
      this.callbacks.onPeakUpdate?.(count);
    }
  }

  getPeakConcurrent(): number { return this.peakConcurrent; }
  getCurrentConcurrent(): number { return this.currentConcurrent; }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get current session metrics */
  getSessionMetrics(): SessionMetrics {
    // Update duration to current
    if (this.session.startTime > 0 && this.session.endTime === 0) {
      this.session.durationSeconds = Math.round((Date.now() - this.session.startTime) / 1000);
    }
    return this.session;
  }

  /** Get recent event log (for debugging, non-identifying) */
  getRecentEvents(): AnalyticsEvent[] {
    return [...this.eventLog];
  }

  /** Get the current aggregate snapshot */
  getSnapshot(): AggregateSnapshot {
    return this.buildSnapshot();
  }

  // ─── Flush ─────────────────────────────────────────────────────────────

  /** Manually trigger a flush of aggregate data */
  flush(): void {
    const snapshot = this.buildSnapshot();
    this.callbacks.onFlush?.(snapshot);
    this.lastFlushTime = Date.now();

    // Persist to localStorage for admin dashboard access
    try {
      const existing = localStorage.getItem('occ_live_analytics');
      const existingData = existing ? JSON.parse(existing) : null;
      const merged = this.mergeForDashboard(existingData, snapshot);
      localStorage.setItem('occ_live_analytics', JSON.stringify(merged));
    } catch {
      // localStorage may be unavailable — non-critical
    }
  }

  /** Merge a snapshot into the persisted dashboard data */
  private mergeForDashboard(existing: any, snapshot: AggregateSnapshot): any {
    if (!existing) {
      return {
        currentConcurrent: this.currentConcurrent,
        peakConcurrent: this.peakConcurrent,
        totalSessions: snapshot.totalSessions,
        todaySessions: snapshot.totalSessions,
        avgSessionDuration: snapshot.avgSessionDuration,
        totalErrors: snapshot.totalDisconnects,
        totalDisconnects: snapshot.totalDisconnects,
        districtTransitionCounts: snapshot.districtTransitionCounts,
        activityCounts: snapshot.activityCounts,
        avatarSelectionCounts: snapshot.avatarSelectionCounts,
        zoneVisitCounts: snapshot.zoneVisitCounts,
        avgTimePerZone: snapshot.avgTimePerZone,
        photoboothStats: snapshot.photoboothStats,
        lazyRiverEntries: snapshot.lazyRiverEntries,
        emotesCounts: {},
        eventAttendanceCounts: snapshot.eventAttendanceCounts,
        errorCounts: snapshot.errorCounts,
        entryByHour: snapshot.entryByHour,
        exitByHour: snapshot.exitByHour,
        lastUpdated: Date.now(),
      };
    }

    // Merge counts
    const mergeCounts = (a: Record<string, number>, b: Record<string, number>) => {
      const result = { ...(a || {}) };
      for (const [key, value] of Object.entries(b || {})) {
        result[key] = (result[key] || 0) + (value as number);
      }
      return result;
    };

    return {
      currentConcurrent: this.currentConcurrent,
      peakConcurrent: Math.max(existing.peakConcurrent || 0, this.peakConcurrent),
      totalSessions: (existing.totalSessions || 0) + snapshot.totalSessions,
      todaySessions: (existing.todaySessions || 0) + snapshot.totalSessions,
      avgSessionDuration: snapshot.avgSessionDuration || existing.avgSessionDuration,
      totalErrors: (existing.totalErrors || 0) + Object.values(snapshot.errorCounts || {}).reduce((a: number, b: any) => a + b, 0),
      totalDisconnects: (existing.totalDisconnects || 0) + snapshot.totalDisconnects,
      districtTransitionCounts: mergeCounts(existing.districtTransitionCounts, snapshot.districtTransitionCounts),
      activityCounts: mergeCounts(existing.activityCounts, snapshot.activityCounts),
      avatarSelectionCounts: mergeCounts(existing.avatarSelectionCounts, snapshot.avatarSelectionCounts),
      zoneVisitCounts: mergeCounts(existing.zoneVisitCounts, snapshot.zoneVisitCounts),
      avgTimePerZone: snapshot.avgTimePerZone || existing.avgTimePerZone,
      photoboothStats: {
        solo: (existing.photoboothStats?.solo || 0) + (snapshot.photoboothStats?.solo || 0),
        group: (existing.photoboothStats?.group || 0) + (snapshot.photoboothStats?.group || 0),
        totalSessions: (existing.photoboothStats?.totalSessions || 0) + (snapshot.photoboothStats?.totalSessions || 0),
      },
      lazyRiverEntries: (existing.lazyRiverEntries || 0) + snapshot.lazyRiverEntries,
      emotesCounts: existing.emotesCounts || {},
      eventAttendanceCounts: mergeCounts(existing.eventAttendanceCounts, snapshot.eventAttendanceCounts),
      errorCounts: mergeCounts(existing.errorCounts, snapshot.errorCounts),
      entryByHour: mergeCounts(existing.entryByHour, snapshot.entryByHour),
      exitByHour: mergeCounts(existing.exitByHour, snapshot.exitByHour),
      lastUpdated: Date.now(),
    };
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  dispose(): void {
    this.stopFlushTimer();
    if (this.session.startTime > 0 && this.session.endTime === 0) {
      this.endSession();
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private createEmptySession(): SessionMetrics {
    return {
      startTime: 0,
      endTime: 0,
      durationSeconds: 0,
      zonesVisited: new Map(),
      activitiesUsed: new Map(),
      districtsEntered: new Map(),
      emotesUsed: new Map(),
      avatarSelected: null,
      photoboothSolo: 0,
      photoboothGroup: 0,
      lazyRiverEntries: 0,
      errors: new Map(),
      disconnects: 0,
      eventsAttended: new Map(),
    };
  }

  private recordEvent(type: AnalyticsEventType, metadata: Record<string, string | number | boolean>): void {
    const event: AnalyticsEvent = {
      type,
      timestamp: Date.now(),
      metadata,
    };

    this.eventLog.push(event);
    if (this.eventLog.length > this.maxEventLog) {
      this.eventLog.shift();
    }
  }

  private buildSnapshot(): AggregateSnapshot {
    const now = Date.now();

    // Convert Maps to Records for serialization
    const zoneVisitCounts: Record<string, number> = {};
    const avgTimePerZone: Record<string, number> = {};
    for (const [zone, time] of this.session.zonesVisited) {
      zoneVisitCounts[zone] = (zoneVisitCounts[zone] ?? 0) + 1;
      avgTimePerZone[zone] = time; // Single session = actual time
    }

    const activityCounts: Record<string, number> = {};
    for (const [activity, count] of this.session.activitiesUsed) {
      activityCounts[activity] = count;
    }

    const districtTransitionCounts: Record<string, number> = {};
    for (const [district, count] of this.session.districtsEntered) {
      districtTransitionCounts[district] = count;
    }

    const avatarSelectionCounts: Record<string, number> = {};
    if (this.session.avatarSelected) {
      avatarSelectionCounts[this.session.avatarSelected] = 1;
    }

    const eventAttendanceCounts: Record<string, number> = {};
    for (const [eventId, duration] of this.session.eventsAttended) {
      eventAttendanceCounts[eventId] = duration;
    }

    const errorCounts: Record<string, number> = {};
    for (const [category, count] of this.session.errors) {
      errorCounts[category] = count;
    }

    // Entry/exit by hour
    const entryByHour: Record<number, number> = {};
    const exitByHour: Record<number, number> = {};
    for (const event of this.eventLog) {
      const hour = new Date(event.timestamp).getHours();
      if (event.type === 'session_start') {
        entryByHour[hour] = (entryByHour[hour] ?? 0) + 1;
      }
      if (event.type === 'session_end') {
        exitByHour[hour] = (exitByHour[hour] ?? 0) + 1;
      }
    }

    return {
      periodStart: this.lastFlushTime || this.session.startTime,
      periodEnd: now,
      totalSessions: 1, // This client = 1 session; server aggregates
      peakConcurrent: this.peakConcurrent,
      avgSessionDuration: this.session.durationSeconds || Math.round((now - this.session.startTime) / 1000),
      zoneVisitCounts,
      avgTimePerZone,
      activityCounts,
      districtTransitionCounts,
      avatarSelectionCounts,
      photoboothStats: {
        solo: this.session.photoboothSolo,
        group: this.session.photoboothGroup,
        totalSessions: this.session.photoboothSolo + this.session.photoboothGroup,
      },
      lazyRiverEntries: this.session.lazyRiverEntries,
      eventAttendanceCounts,
      errorCounts,
      totalDisconnects: this.session.disconnects,
      entryByHour,
      exitByHour,
    };
  }

  private startFlushTimer(): void {
    this.stopFlushTimer();
    this.lastFlushTime = Date.now();
    this.flushTimer = window.setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
