/**
 * OCC Live - Availability Scheduler (Part 10)
 * Unified scheduler for content packs, seasonal layers, districts, and activities.
 * Supports future-date activation without removing assets from the project.
 *
 * Design:
 * - Periodically checks all schedulable items against current time
 * - Districts, content packs, and seasonal layers activate/deactivate on schedule
 * - Closed content remains in the project but is inaccessible to normal players
 * - Developer preview mode allows testing scheduled content before release
 * - No attendance identity information collected
 * - Timezone-aware (uses UTC for all scheduling)
 */

import type { ContentPackConfig, SeasonalLayerConfig, DistrictConfig } from '../types/index.ts';
import type { ContentPackManager } from './content-pack-manager.ts';
import type { SeasonalLayerManager } from './seasonal-layer.ts';

// ─── Scheduled Item ──────────────────────────────────────────────────────────

export type SchedulableItemType = 'content_pack' | 'seasonal_layer' | 'district' | 'activity';

export interface ScheduledItem {
  id: string;
  type: SchedulableItemType;
  name: string;
  activatesAt: string | null; // ISO date
  deactivatesAt: string | null; // ISO date
  enabled: boolean;
  isActive: boolean;
}

// ─── Developer Preview ───────────────────────────────────────────────────────

export interface PreviewSession {
  itemId: string;
  type: SchedulableItemType;
  startedAt: number;
  /** Original scheduled state before preview override */
  wasActive: boolean;
}

// ─── Callbacks ───────────────────────────────────────────────────────────────

export interface AvailabilitySchedulerCallbacks {
  /** Called when a district should be opened by schedule */
  onDistrictScheduleOpen?: (districtId: string) => void;
  /** Called when a district should be closed by schedule */
  onDistrictScheduleClose?: (districtId: string) => void;
  /** Called when an activity should be enabled/disabled by schedule */
  onActivityScheduleChange?: (activityId: string, enabled: boolean) => void;
  /** Called to log schedule events (non-identifying) */
  onScheduleEvent?: (message: string) => void;
}

// ─── Availability Scheduler ──────────────────────────────────────────────────

export class AvailabilityScheduler {
  private contentPackManager: ContentPackManager | null = null;
  private seasonalLayerManager: SeasonalLayerManager | null = null;
  private callbacks: AvailabilitySchedulerCallbacks = {};

  private districtConfigs: DistrictConfig[] = [];
  private checkIntervalMs: number = 30000; // 30 seconds
  private intervalId: number | null = null;
  private isRunning: boolean = false;

  // Developer preview
  private devMode: boolean = false;
  private activePreviews: Map<string, PreviewSession> = new Map();

  // ─── Configuration ─────────────────────────────────────────────────────

  setContentPackManager(manager: ContentPackManager): void {
    this.contentPackManager = manager;
  }

  setSeasonalLayerManager(manager: SeasonalLayerManager): void {
    this.seasonalLayerManager = manager;
  }

  setCallbacks(callbacks: AvailabilitySchedulerCallbacks): void {
    this.callbacks = callbacks;
  }

  setDistrictConfigs(configs: DistrictConfig[]): void {
    this.districtConfigs = configs;
  }

  setCheckInterval(ms: number): void {
    this.checkIntervalMs = Math.max(5000, ms); // Minimum 5 seconds
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  /** Start the scheduler polling loop */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run immediately
    this.checkAll();

    // Then poll periodically
    this.intervalId = window.setInterval(() => {
      this.checkAll();
    }, this.checkIntervalMs);

    console.log(`[Scheduler] Started (interval: ${this.checkIntervalMs}ms)`);
  }

  /** Stop the scheduler */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  /** Force an immediate check cycle */
  forceCheck(): void {
    this.checkAll();
  }

  // ─── Developer Preview Mode ────────────────────────────────────────────

  /** Enable developer preview mode */
  enableDevMode(): void {
    this.devMode = true;
    this.contentPackManager?.setDevPreviewMode(true);
    console.log('[Scheduler] Developer preview mode enabled');
  }

  /** Disable developer preview mode and end all previews */
  disableDevMode(): void {
    this.endAllPreviews();
    this.devMode = false;
    this.contentPackManager?.setDevPreviewMode(false);
    console.log('[Scheduler] Developer preview mode disabled');
  }

  isDevMode(): boolean {
    return this.devMode;
  }

  /**
   * Preview a scheduled item (makes it active regardless of schedule).
   * Only available in dev mode.
   */
  startPreview(itemId: string, type: SchedulableItemType): boolean {
    if (!this.devMode) {
      console.warn('[Scheduler] Preview requires dev mode');
      return false;
    }

    if (this.activePreviews.has(itemId)) return true; // Already previewing

    const wasActive = this.isItemCurrentlyActive(itemId, type);

    switch (type) {
      case 'content_pack':
        if (!this.contentPackManager?.previewPack(itemId)) return false;
        break;
      case 'seasonal_layer':
        if (!this.seasonalLayerManager?.activateLayer(itemId)) return false;
        break;
      case 'district':
        this.callbacks.onDistrictScheduleOpen?.(itemId);
        break;
      case 'activity':
        this.callbacks.onActivityScheduleChange?.(itemId, true);
        break;
    }

    this.activePreviews.set(itemId, {
      itemId,
      type,
      startedAt: Date.now(),
      wasActive,
    });

    this.callbacks.onScheduleEvent?.(`Preview started: ${itemId} (${type})`);
    return true;
  }

  /**
   * End a preview (restores original scheduled state).
   */
  endPreview(itemId: string): boolean {
    const preview = this.activePreviews.get(itemId);
    if (!preview) return false;

    // Restore to original state
    if (!preview.wasActive) {
      switch (preview.type) {
        case 'content_pack':
          this.contentPackManager?.endPreview(itemId);
          break;
        case 'seasonal_layer':
          this.seasonalLayerManager?.deactivateLayer(itemId);
          break;
        case 'district':
          this.callbacks.onDistrictScheduleClose?.(itemId);
          break;
        case 'activity':
          this.callbacks.onActivityScheduleChange?.(itemId, false);
          break;
      }
    }

    this.activePreviews.delete(itemId);
    this.callbacks.onScheduleEvent?.(`Preview ended: ${itemId}`);
    return true;
  }

  /** End all active previews */
  endAllPreviews(): void {
    for (const itemId of Array.from(this.activePreviews.keys())) {
      this.endPreview(itemId);
    }
  }

  /** Get all active preview sessions */
  getActivePreviews(): PreviewSession[] {
    return Array.from(this.activePreviews.values());
  }

  /** Is this item currently being previewed? */
  isPreviewing(itemId: string): boolean {
    return this.activePreviews.has(itemId);
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get all scheduled items across all systems */
  getAllScheduledItems(): ScheduledItem[] {
    const items: ScheduledItem[] = [];

    // Content packs
    if (this.contentPackManager) {
      for (const pack of this.contentPackManager.getAllPacks()) {
        items.push({
          id: pack.config.id,
          type: 'content_pack',
          name: pack.config.name,
          activatesAt: pack.config.activatesAt,
          deactivatesAt: pack.config.deactivatesAt,
          enabled: pack.config.enabled,
          isActive: pack.state === 'active',
        });
      }
    }

    // Seasonal layers
    if (this.seasonalLayerManager) {
      for (const layer of this.seasonalLayerManager.getActiveLayers()) {
        items.push({
          id: layer.config.id,
          type: 'seasonal_layer',
          name: layer.config.name,
          activatesAt: layer.config.activatesAt,
          deactivatesAt: layer.config.deactivatesAt,
          enabled: layer.config.enabled,
          isActive: layer.state === 'active',
        });
      }
    }

    // Districts with availability
    for (const district of this.districtConfigs) {
      if (district.availability) {
        items.push({
          id: district.id,
          type: 'district',
          name: district.name,
          activatesAt: district.availability.opensAt,
          deactivatesAt: district.availability.closesAt,
          enabled: district.enabled ?? true,
          isActive: district.status === 'OPEN',
        });
      }
    }

    return items;
  }

  /** Get upcoming scheduled items (not yet active) */
  getUpcomingItems(): ScheduledItem[] {
    const now = Date.now();
    return this.getAllScheduledItems().filter(item => {
      if (item.isActive) return false;
      if (!item.activatesAt) return false;
      return new Date(item.activatesAt).getTime() > now;
    });
  }

  /** Get items that will expire soon (within given hours) */
  getExpiringSoon(withinHours: number = 24): ScheduledItem[] {
    const now = Date.now();
    const threshold = now + withinHours * 60 * 60 * 1000;
    return this.getAllScheduledItems().filter(item => {
      if (!item.isActive) return false;
      if (!item.deactivatesAt) return false;
      const expires = new Date(item.deactivatesAt).getTime();
      return expires > now && expires < threshold;
    });
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private checkAll(): void {
    // Skip items that are being previewed
    const previewIds = new Set(this.activePreviews.keys());

    // Check content packs
    if (this.contentPackManager) {
      this.contentPackManager.checkSchedules();
    }

    // Check seasonal layers
    if (this.seasonalLayerManager) {
      this.seasonalLayerManager.checkSchedules();
    }

    // Check district availability
    const now = Date.now();
    for (const district of this.districtConfigs) {
      if (previewIds.has(district.id)) continue;
      if (!district.availability) continue;
      if (!(district.enabled ?? true)) continue;

      const shouldBeOpen = this.shouldDistrictBeOpen(district, now);
      const isCurrentlyOpen = district.status === 'OPEN';

      if (shouldBeOpen && !isCurrentlyOpen) {
        this.callbacks.onDistrictScheduleOpen?.(district.id);
        this.callbacks.onScheduleEvent?.(`District opened by schedule: ${district.name}`);
      } else if (!shouldBeOpen && isCurrentlyOpen) {
        this.callbacks.onDistrictScheduleClose?.(district.id);
        this.callbacks.onScheduleEvent?.(`District closed by schedule: ${district.name}`);
      }
    }
  }

  private shouldDistrictBeOpen(district: DistrictConfig, now: number): boolean {
    const avail = district.availability;
    if (!avail) return district.status === 'OPEN';

    // Check date window
    if (avail.opensAt) {
      const opens = new Date(avail.opensAt).getTime();
      if (now < opens) return false;
    }
    if (avail.closesAt) {
      const closes = new Date(avail.closesAt).getTime();
      if (now > closes) return false;
    }

    // Check schedule type
    if (avail.schedule === 'always') return true;
    if (avail.schedule === 'event_only') return false;

    const dayOfWeek = new Date(now).getDay(); // 0=Sun, 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (avail.schedule === 'weekdays') return !isWeekend;
    if (avail.schedule === 'weekends') return isWeekend;

    if (avail.schedule === 'custom' && avail.customHours) {
      return this.isWithinCustomHours(avail.customHours, now);
    }

    return true;
  }

  private isWithinCustomHours(hoursStr: string, now: number): boolean {
    // Parse "HH:MM-HH:MM" format
    const match = hoursStr.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
    if (!match) return true;

    const startHour = parseInt(match[1], 10);
    const startMin = parseInt(match[2], 10);
    const endHour = parseInt(match[3], 10);
    const endMin = parseInt(match[4], 10);

    const date = new Date(now);
    const currentMinutes = date.getHours() * 60 + date.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Wraps midnight (e.g., 22:00-02:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }

  private isItemCurrentlyActive(itemId: string, type: SchedulableItemType): boolean {
    switch (type) {
      case 'content_pack':
        return this.contentPackManager?.getPack(itemId)?.state === 'active';
      case 'seasonal_layer':
        return this.seasonalLayerManager?.getLayer(itemId)?.state === 'active';
      case 'district':
        return this.districtConfigs.find(d => d.id === itemId)?.status === 'OPEN';
      default:
        return false;
    }
  }

  dispose(): void {
    this.stop();
    this.endAllPreviews();
    this.activePreviews.clear();
  }
}
