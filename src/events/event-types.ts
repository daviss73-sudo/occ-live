/**
 * OCC Live - Event System Type Definitions (Part 7)
 * Complete type system for the configuration-driven event framework.
 * Events are temporary layers over the persistent Main Union —
 * they modify music, lighting, NPCs, decorations, and activities
 * without permanently changing the environment.
 *
 * Design principles:
 * - All configuration, no hard-coded events
 * - Anonymous: no names, IDs, emails, or PII collected
 * - Events start/end without disconnecting players
 * - Multiple events can reuse templates
 * - Architecture supports future district targeting
 */

import type { Vec3 } from '../types/index.ts';

// ─── Event State Machine ─────────────────────────────────────────────────────

export type EventState =
  | 'scheduled'   // Defined but not yet active
  | 'starting'    // Transition into event mode (fade music, change lighting)
  | 'active'      // Event is fully running
  | 'ending'      // Transition back to normal (fade out, remove decorations)
  | 'ended'       // Event complete, normal mode restored
  | 'cancelled';  // Event was cancelled before or during execution

// ─── Event Types ─────────────────────────────────────────────────────────────

export type EventType =
  | 'semester_kickoff'
  | 'music_event'
  | 'social_event'
  | 'seasonal_event'
  | 'special_event';

// ─── Scheduling ──────────────────────────────────────────────────────────────

export interface EventSchedule {
  /** ISO 8601 date string for start (e.g. '2026-09-01T19:00:00') */
  startTime: string;
  /** ISO 8601 date string for end */
  endTime: string;
  /** IANA time zone (e.g. 'America/Los_Angeles') */
  timeZone: string;
  /** Recurrence rule (future — not processed in V1) */
  recurrence: EventRecurrence | null;
}

export interface EventRecurrence {
  /** Recurrence pattern */
  pattern: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  /** Days of week for weekly (0=Sun, 6=Sat) */
  daysOfWeek: number[] | null;
  /** Day of month for monthly */
  dayOfMonth: number | null;
  /** End date for recurrence (null = indefinite) */
  until: string | null;
  /** Maximum occurrences (null = unlimited) */
  maxOccurrences: number | null;
}

// ─── Music Configuration ─────────────────────────────────────────────────────

export interface EventMusicConfig {
  /** Playlist ID to play during the event (from music system) */
  playlistId: string;
  /** Volume multiplier (0-1) */
  volume: number;
  /** Crossfade duration in seconds when transitioning to event music */
  fadeInDuration: number;
  /** Crossfade duration in seconds when transitioning back to normal */
  fadeOutDuration: number;
  /** Optional per-area overrides (area ID → playlist ID) */
  areaOverrides: Record<string, string>;
  /** Optional ambience override */
  ambienceId: string | null;
}

// ─── Lighting Configuration ──────────────────────────────────────────────────

export type LightingPresetName =
  | 'normal'
  | 'kickoff'
  | 'dance'
  | 'festival'
  | 'chill'
  | 'throwback'
  | 'rave'
  | 'custom';

export interface EventLightingConfig {
  /** Named preset to apply */
  preset: LightingPresetName;
  /** Transition duration in seconds */
  transitionDuration: number;
  /** Custom overrides (used when preset is 'custom') */
  custom: LightingCustomConfig | null;
}

export interface LightingCustomConfig {
  /** Ambient light color (hex) */
  ambientColor: number;
  /** Ambient light intensity */
  ambientIntensity: number;
  /** Fog color (hex) */
  fogColor: number;
  /** Fog near/far */
  fogNear: number;
  fogFar: number;
  /** Stage spot colors */
  spotColors: number[];
  /** Stage spot intensity */
  spotIntensity: number;
  /** Whether lights animate (color cycling) */
  animated: boolean;
  /** Animation speed multiplier */
  animationSpeed: number;
}

// ─── Stage Configuration ─────────────────────────────────────────────────────

export type StageMode = 'inactive' | 'active' | 'performance' | 'dj' | 'special';

export interface EventStageConfig {
  /** Stage mode to activate */
  mode: StageMode;
  /** Whether stage lighting animates */
  animatedLighting: boolean;
  /** NPC performer count on/near stage */
  npcPerformers: number;
  /** Dance area radius (0 = default) */
  danceAreaRadius: number;
  /** Visual effects enabled */
  effects: string[];
}

// ─── NPC Behavior Override ────────────────────────────────────────────────────

export interface EventNPCConfig {
  /** Density multiplier during event (e.g. 1.5 = 50% more NPCs) */
  densityMultiplier: number;
  /** Percentage of NPCs that should gravitate to stage (0-1) */
  stageAttraction: number;
  /** Percentage of NPCs that should dance (0-1) */
  dancerPercentage: number;
  /** Behaviors to add during event */
  additionalBehaviors: string[];
  /** Whether to spawn extra "crowd" NPCs near stage */
  spawnCrowdNPCs: boolean;
  /** Extra crowd NPC count */
  crowdNPCCount: number;
}

// ─── Decoration Layer ────────────────────────────────────────────────────────

export interface EventDecoration {
  id: string;
  type: 'banner' | 'balloon' | 'stage_deco' | 'prop' | 'signage' | 'lighting' | 'effect';
  /** Asset file path (GLB or null for procedural) */
  file: string | null;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  /** Color tint (hex, null = no tint) */
  color: number | null;
  /** Animated decoration */
  animated: boolean;
}

export interface EventDecorationLayer {
  id: string;
  decorations: EventDecoration[];
}

// ─── Activity Override ────────────────────────────────────────────────────────

export interface EventActivityOverride {
  /** Activity area ID */
  areaId: string;
  /** Override enabled state (true = force on, false = force off, null = no change) */
  enabled: boolean | null;
  /** Custom interaction overrides */
  interactionOverrides: Record<string, boolean>;
}

// ─── District Targeting (future) ─────────────────────────────────────────────

export type EventTargetLocation = 'main_union' | 'skyline' | 'pulse' | 'arcade' | 'throwback' | 'mystique';

// ─── Analytics Hooks (infrastructure only, no dashboard) ─────────────────────

export interface EventAnalyticsHookPoints {
  /** Track when a player enters during an active event */
  onPlayerEnterDuringEvent: boolean;
  /** Track when a player leaves during an active event */
  onPlayerLeaveDuringEvent: boolean;
  /** Track concurrent participant count periodically */
  trackConcurrentCount: boolean;
  /** Interval for concurrent count tracking (seconds) */
  concurrentCountInterval: number;
  /** Track activity utilization during event */
  trackActivityUtilization: boolean;
}

// ─── Full Event Configuration ────────────────────────────────────────────────

export interface EventConfig {
  /** Unique event identifier */
  id: string;
  /** Display name (shown in kiosk / notifications, NOT a username) */
  name: string;
  /** Event type */
  type: EventType;
  /** Description (for kiosk display) */
  description: string;
  /** Target location (only 'main_union' functional in Part 7) */
  targetLocation: EventTargetLocation;
  /** Schedule */
  schedule: EventSchedule;
  /** Whether this event is enabled */
  enabled: boolean;

  // ─── Layered Overrides ─────────────────────────────────────────────────

  /** Music configuration for this event */
  music: EventMusicConfig;
  /** Lighting configuration */
  lighting: EventLightingConfig;
  /** Stage configuration */
  stage: EventStageConfig;
  /** NPC behavior overrides */
  npcs: EventNPCConfig;
  /** Decoration layer */
  decorations: EventDecorationLayer;
  /** Activity overrides (which areas to enable/disable) */
  activityOverrides: EventActivityOverride[];
  /** Analytics hooks */
  analytics: EventAnalyticsHookPoints;

  // ─── Transition Timing ─────────────────────────────────────────────────

  /** Duration of the 'starting' transition phase (seconds) */
  startTransitionDuration: number;
  /** Duration of the 'ending' transition phase (seconds) */
  endTransitionDuration: number;
}

// ─── Event Template ──────────────────────────────────────────────────────────

/**
 * A template is a partial EventConfig that provides defaults.
 * Individual events are created by merging a template with
 * event-specific overrides (name, schedule, custom decorations, etc).
 */
export interface EventTemplate {
  id: string;
  name: string;
  type: EventType;
  description: string;
  /** Default overrides (everything except id, name, schedule) */
  defaults: Omit<EventConfig, 'id' | 'name' | 'schedule' | 'enabled' | 'type' | 'description' | 'targetLocation'>;
}

// ─── Event Sync State (for multiplayer) ──────────────────────────────────────

export interface EventSyncState {
  /** Currently active event ID (null = no event) */
  activeEventId: string | null;
  /** Current event state */
  state: EventState;
  /** Time elapsed in current state (seconds) */
  stateElapsed: number;
  /** Event name (for display on join) */
  eventName: string | null;
  /** Event type */
  eventType: EventType | null;
  /** Lighting preset currently applied */
  lightingPreset: LightingPresetName;
  /** Stage mode currently active */
  stageMode: StageMode;
  /** Music playlist currently playing */
  musicPlaylistId: string | null;
}

// ─── Event Transition Callback ───────────────────────────────────────────────

export interface EventTransitionCallbacks {
  onEventScheduled?: (event: EventConfig) => void;
  onEventStarting?: (event: EventConfig) => void;
  onEventActive?: (event: EventConfig) => void;
  onEventEnding?: (event: EventConfig) => void;
  onEventEnded?: (event: EventConfig) => void;
  onEventCancelled?: (event: EventConfig) => void;
}
