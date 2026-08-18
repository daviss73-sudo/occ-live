/**
 * OCC Live - Event Manager (Part 7)
 * Core event orchestration system. Manages the complete event lifecycle,
 * applies/removes event layers over the persistent Main Union, and
 * coordinates all sub-systems (music, lighting, NPCs, decorations).
 *
 * Design:
 * - Central coordinator: all event actions go through here
 * - State machine with timed transitions (starting → active → ending → ended)
 * - Players already in the world transition smoothly
 * - New players joining during an event see current state immediately
 * - Does not permanently modify the Main Union
 * - Anonymous: no PII collected at any point
 */

import type {
  EventConfig,
  EventState,
  EventSyncState,
  EventTransitionCallbacks,
  LightingPresetName,
  StageMode,
} from './event-types.ts';
import { EventScheduler } from './event-scheduler.ts';

// ─── Sub-System Interfaces ───────────────────────────────────────────────────
// These are the interfaces the EventManager uses to control sub-systems.
// Each sub-system implements its own logic; the manager just orchestrates.

export interface EventMusicController {
  applyEventMusic(config: EventConfig): void;
  removeEventMusic(fadeOutDuration: number): void;
  isEventMusicActive(): boolean;
}

export interface EventLightingController {
  applyPreset(preset: LightingPresetName, transitionDuration: number, custom?: any): void;
  restoreNormal(transitionDuration: number): void;
  getCurrentPreset(): LightingPresetName;
}

export interface EventDecorationController {
  applyDecorations(config: EventConfig): void;
  removeDecorations(): void;
  hasActiveDecorations(): boolean;
}

export interface EventNPCController {
  applyEventBehavior(config: EventConfig): void;
  restoreNormalBehavior(): void;
}

export interface EventStageController {
  setStageMode(mode: StageMode): void;
  getStageMode(): StageMode;
}

export interface EventActivityController {
  applyOverrides(config: EventConfig): void;
  removeOverrides(): void;
}

export interface EventNotificationController {
  showEventNotification(event: EventConfig): void;
  hideEventNotification(): void;
  updateKiosk(event: EventConfig | null): void;
}

export interface EventAnalyticsController {
  onEventStart(event: EventConfig): void;
  onEventEnd(event: EventConfig): void;
  onPlayerJoinDuringEvent(sessionId: string): void;
  onPlayerLeaveDuringEvent(sessionId: string): void;
  recordConcurrentCount(count: number): void;
}

// ─── Event Manager ───────────────────────────────────────────────────────────

export class EventManager {
  private scheduler: EventScheduler;
  private activeEvent: EventConfig | null = null;
  private currentState: EventState = 'ended';
  private stateElapsed: number = 0;
  private transitionTimer: number = 0;
  private callbacks: EventTransitionCallbacks = {};

  // Sub-system controllers (wired from main.ts)
  private musicController: EventMusicController | null = null;
  private lightingController: EventLightingController | null = null;
  private decorationController: EventDecorationController | null = null;
  private npcController: EventNPCController | null = null;
  private stageController: EventStageController | null = null;
  private activityController: EventActivityController | null = null;
  private notificationController: EventNotificationController | null = null;
  private analyticsController: EventAnalyticsController | null = null;

  constructor() {
    this.scheduler = new EventScheduler({
      onEventShouldStart: (event) => this.startEvent(event),
      onEventShouldEnd: (event) => this.endEvent(event),
    });
  }

  // ─── Sub-System Wiring ─────────────────────────────────────────────────

  /** Wire all sub-system controllers */
  wireControllers(controllers: {
    music?: EventMusicController;
    lighting?: EventLightingController;
    decorations?: EventDecorationController;
    npcs?: EventNPCController;
    stage?: EventStageController;
    activities?: EventActivityController;
    notifications?: EventNotificationController;
    analytics?: EventAnalyticsController;
  }): void {
    if (controllers.music) this.musicController = controllers.music;
    if (controllers.lighting) this.lightingController = controllers.lighting;
    if (controllers.decorations) this.decorationController = controllers.decorations;
    if (controllers.npcs) this.npcController = controllers.npcs;
    if (controllers.stage) this.stageController = controllers.stage;
    if (controllers.activities) this.activityController = controllers.activities;
    if (controllers.notifications) this.notificationController = controllers.notifications;
    if (controllers.analytics) this.analyticsController = controllers.analytics;
  }

  /** Set transition callbacks */
  setCallbacks(callbacks: EventTransitionCallbacks): void {
    this.callbacks = callbacks;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  /** Initialize the event manager and start the scheduler */
  initialize(events: EventConfig[]): void {
    this.scheduler.registerAll(events);
    this.scheduler.start();
    console.log(`[EventManager] Initialized with ${events.length} events`);
  }

  /** Update loop — call each frame */
  update(dt: number): void {
    this.stateElapsed += dt;

    switch (this.currentState) {
      case 'starting':
        this.transitionTimer -= dt;
        if (this.transitionTimer <= 0) {
          this.transitionTo('active');
        }
        break;

      case 'ending':
        this.transitionTimer -= dt;
        if (this.transitionTimer <= 0) {
          this.transitionTo('ended');
        }
        break;
    }
  }

  /** Shut down the event manager */
  dispose(): void {
    this.scheduler.stop();
    if (this.activeEvent) {
      this.forceEndImmediate();
    }
  }

  // ─── Event Control ─────────────────────────────────────────────────────

  /** Start an event (called by scheduler or manually) */
  startEvent(event: EventConfig): void {
    if (this.activeEvent) {
      // End the current event first
      this.forceEndImmediate();
    }

    this.activeEvent = event;
    this.transitionTo('starting');
    this.transitionTimer = event.startTransitionDuration;

    // Apply layers during starting phase
    this.applyEventLayers(event);

    this.scheduler.setEventState(event.id, 'starting');
    this.callbacks.onEventStarting?.(event);

    console.log(`[EventManager] Event starting: ${event.name}`);
  }

  /** End an event (called by scheduler or manually) */
  endEvent(event: EventConfig): void {
    if (!this.activeEvent || this.activeEvent.id !== event.id) return;

    this.transitionTo('ending');
    this.transitionTimer = event.endTransitionDuration;

    // Begin removing layers during ending phase
    this.removeEventLayers(event);

    this.scheduler.setEventState(event.id, 'ending');
    this.callbacks.onEventEnding?.(event);

    console.log(`[EventManager] Event ending: ${event.name}`);
  }

  /** Cancel an event (removes immediately) */
  cancelEvent(eventId: string): void {
    if (this.activeEvent?.id === eventId) {
      this.forceEndImmediate();
      this.scheduler.setEventState(eventId, 'cancelled');
      this.callbacks.onEventCancelled?.(this.activeEvent!);
    }
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get the currently active event */
  getActiveEvent(): EventConfig | null {
    return this.activeEvent;
  }

  /** Get the current event state */
  getState(): EventState {
    return this.currentState;
  }

  /** Is an event currently active (including starting/ending transitions)? */
  isEventActive(): boolean {
    return this.currentState === 'active' || this.currentState === 'starting' || this.currentState === 'ending';
  }

  /** Get the scheduler instance (for registration, queries) */
  getScheduler(): EventScheduler {
    return this.scheduler;
  }

  /** Get sync state for multiplayer */
  getSyncState(): EventSyncState {
    return {
      activeEventId: this.activeEvent?.id ?? null,
      state: this.currentState,
      stateElapsed: this.stateElapsed,
      eventName: this.activeEvent?.name ?? null,
      eventType: this.activeEvent?.type ?? null,
      lightingPreset: this.lightingController?.getCurrentPreset() ?? 'normal',
      stageMode: (this.stageController?.getStageMode() as StageMode) ?? 'inactive',
      musicPlaylistId: this.activeEvent?.music.playlistId ?? null,
    };
  }

  /** Apply sync state from remote (for late-joining players) */
  applySyncState(syncState: EventSyncState): void {
    if (syncState.activeEventId && syncState.state === 'active') {
      // Find the event config and activate it immediately (skip transition)
      const events = this.scheduler.getAllEvents();
      const event = events.find(e => e.id === syncState.activeEventId);
      if (event) {
        this.activeEvent = event;
        this.currentState = 'active';
        this.stateElapsed = syncState.stateElapsed;
        this.applyEventLayers(event);
      }
    }
  }

  // ─── Developer Controls ────────────────────────────────────────────────

  /** Preview an event immediately (ignores schedule) */
  previewEvent(eventId: string): boolean {
    return this.scheduler.forceStart(eventId);
  }

  /** Force end the current event */
  forceEnd(): boolean {
    if (!this.activeEvent) return false;
    this.endEvent(this.activeEvent);
    return true;
  }

  /** Get debug info */
  getDebugInfo(): {
    state: EventState;
    activeEvent: string | null;
    elapsed: number;
    transitionTimer: number;
    scheduledEvents: number;
  } {
    return {
      state: this.currentState,
      activeEvent: this.activeEvent?.name ?? null,
      elapsed: Math.round(this.stateElapsed),
      transitionTimer: Math.round(this.transitionTimer * 10) / 10,
      scheduledEvents: this.scheduler.getAllEvents().length,
    };
  }

  /** Notify that a player joined during an active event */
  notifyPlayerJoined(sessionId: string): void {
    if (this.isEventActive() && this.activeEvent) {
      this.analyticsController?.onPlayerJoinDuringEvent(sessionId);
      this.notificationController?.showEventNotification(this.activeEvent);
    }
  }

  /** Notify that a player left during an active event */
  notifyPlayerLeft(sessionId: string): void {
    if (this.isEventActive()) {
      this.analyticsController?.onPlayerLeaveDuringEvent(sessionId);
    }
  }

  // ─── Private: State Transitions ────────────────────────────────────────

  private transitionTo(state: EventState): void {
    this.currentState = state;
    this.stateElapsed = 0;

    switch (state) {
      case 'active':
        this.callbacks.onEventActive?.(this.activeEvent!);
        this.analyticsController?.onEventStart(this.activeEvent!);
        this.notificationController?.updateKiosk(this.activeEvent);
        break;

      case 'ended':
        this.analyticsController?.onEventEnd(this.activeEvent!);
        this.notificationController?.updateKiosk(null);
        this.notificationController?.hideEventNotification();
        this.activeEvent = null;
        break;
    }

    if (this.activeEvent) {
      this.scheduler.setEventState(this.activeEvent.id, state);
    }
  }

  // ─── Private: Layer Application ────────────────────────────────────────

  private applyEventLayers(event: EventConfig): void {
    // Music
    this.musicController?.applyEventMusic(event);

    // Lighting
    this.lightingController?.applyPreset(
      event.lighting.preset,
      event.lighting.transitionDuration,
      event.lighting.custom
    );

    // Stage
    this.stageController?.setStageMode(event.stage.mode);

    // NPCs
    this.npcController?.applyEventBehavior(event);

    // Decorations
    this.decorationController?.applyDecorations(event);

    // Activities
    this.activityController?.applyOverrides(event);

    // Notification
    this.notificationController?.showEventNotification(event);
  }

  private removeEventLayers(event: EventConfig): void {
    // Music (fade out)
    this.musicController?.removeEventMusic(event.music.fadeOutDuration);

    // Lighting (transition back)
    this.lightingController?.restoreNormal(event.lighting.transitionDuration);

    // Stage
    this.stageController?.setStageMode('inactive');

    // NPCs
    this.npcController?.restoreNormalBehavior();

    // Decorations
    this.decorationController?.removeDecorations();

    // Activities
    this.activityController?.removeOverrides();
  }

  private forceEndImmediate(): void {
    if (!this.activeEvent) return;

    this.removeEventLayers(this.activeEvent);
    this.currentState = 'ended';
    this.stateElapsed = 0;
    this.analyticsController?.onEventEnd(this.activeEvent);
    this.notificationController?.updateKiosk(null);
    this.notificationController?.hideEventNotification();

    this.scheduler.setEventState(this.activeEvent.id, 'ended');
    this.callbacks.onEventEnded?.(this.activeEvent);
    this.activeEvent = null;
  }
}
