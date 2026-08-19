/**
 * OCC Live - Event Templates (Part 7)
 * Reusable templates that provide default configurations for common
 * event types. Individual events are created by applying a template
 * and overriding specific fields (name, schedule, custom decorations).
 *
 * Templates:
 * - Semester Kickoff: Large gathering, welcome music, dance area
 * - Music Event: DJ/rave-style, dynamic lighting, high energy
 * - Social Event: Casual themed gathering
 * - Seasonal Event: Temporary visual/environmental changes
 */

import type { EventConfig, EventTemplate, EventSchedule } from './event-types.ts';

// ─── Semester Kickoff Template ───────────────────────────────────────────────

export const semesterKickoffTemplate: EventTemplate = {
  id: 'template_semester_kickoff',
  name: 'Semester Kickoff',
  type: 'semester_kickoff',
  description: 'Welcome gathering at the beginning of a semester with music, dancing, and activities.',
  defaults: {
    music: {
      playlistId: 'stage_playlist',
      volume: 0.8,
      fadeInDuration: 3,
      fadeOutDuration: 4,
      areaOverrides: {},
      ambienceId: null,
    },
    lighting: {
      preset: 'kickoff',
      transitionDuration: 5,
      custom: null,
    },
    stage: {
      mode: 'active',
      animatedLighting: true,
      npcPerformers: 3,
      danceAreaRadius: 14,
      effects: ['stage_particles'],
    },
    npcs: {
      densityMultiplier: 1.5,
      stageAttraction: 0.4,
      dancerPercentage: 0.5,
      additionalBehaviors: ['dance', 'gather'],
      spawnCrowdNPCs: true,
      crowdNPCCount: 8,
    },
    decorations: {
      id: 'kickoff_decorations',
      decorations: [
        { id: 'kickoff_banner_1', type: 'banner', file: null, position: [0, 4, -32], rotation: [0, 0, 0], scale: [2, 1.5, 1], color: 0x7c4dff, animated: true },
        { id: 'kickoff_banner_2', type: 'banner', file: null, position: [-8, 3.5, -28], rotation: [0, 0.3, 0], scale: [1.5, 1, 1], color: 0xff6b35, animated: true },
        { id: 'kickoff_banner_3', type: 'banner', file: null, position: [8, 3.5, -28], rotation: [0, -0.3, 0], scale: [1.5, 1, 1], color: 0x536dfe, animated: true },
        { id: 'kickoff_balloon_1', type: 'balloon', file: null, position: [-4, 3, -26], rotation: [0, 0, 0], scale: [1, 1, 1], color: 0xff4488, animated: true },
        { id: 'kickoff_balloon_2', type: 'balloon', file: null, position: [4, 3.2, -26], rotation: [0, 0, 0], scale: [1, 1, 1], color: 0x44aaff, animated: true },
        { id: 'kickoff_balloon_3', type: 'balloon', file: null, position: [0, 3.5, -24], rotation: [0, 0, 0], scale: [1.2, 1.2, 1.2], color: 0xffdd44, animated: true },
        { id: 'kickoff_light_1', type: 'lighting', file: null, position: [-6, 5, -30], rotation: [0, 0, 0], scale: [1, 1, 1], color: 0x7c4dff, animated: true },
        { id: 'kickoff_light_2', type: 'lighting', file: null, position: [6, 5, -30], rotation: [0, 0, 0], scale: [1, 1, 1], color: 0xff6b35, animated: true },
      ],
    },
    activityOverrides: [
      // All activities remain open during kickoff
    ],
    analytics: {
      onPlayerEnterDuringEvent: true,
      onPlayerLeaveDuringEvent: true,
      trackConcurrentCount: true,
      concurrentCountInterval: 30,
      trackActivityUtilization: true,
    },
    startTransitionDuration: 5,
    endTransitionDuration: 8,
  },
};

// ─── Music Event Template ────────────────────────────────────────────────────

export const musicEventTemplate: EventTemplate = {
  id: 'template_music_event',
  name: 'Music Event',
  type: 'music_event',
  description: 'High-energy music event with dynamic lighting and a dance floor.',
  defaults: {
    music: {
      playlistId: 'stage_playlist',
      volume: 0.9,
      fadeInDuration: 2,
      fadeOutDuration: 3,
      areaOverrides: {},
      ambienceId: null,
    },
    lighting: {
      preset: 'dance',
      transitionDuration: 3,
      custom: null,
    },
    stage: {
      mode: 'dj',
      animatedLighting: true,
      npcPerformers: 2,
      danceAreaRadius: 15,
      effects: ['stage_strobe', 'stage_particles'],
    },
    npcs: {
      densityMultiplier: 1.3,
      stageAttraction: 0.6,
      dancerPercentage: 0.7,
      additionalBehaviors: ['dance'],
      spawnCrowdNPCs: true,
      crowdNPCCount: 10,
    },
    decorations: {
      id: 'music_event_decorations',
      decorations: [
        { id: 'music_light_1', type: 'lighting', file: null, position: [-5, 6, -30], rotation: [0, 0, 0], scale: [1.5, 1.5, 1.5], color: 0xff00ff, animated: true },
        { id: 'music_light_2', type: 'lighting', file: null, position: [5, 6, -30], rotation: [0, 0, 0], scale: [1.5, 1.5, 1.5], color: 0x00ffff, animated: true },
        { id: 'music_light_3', type: 'lighting', file: null, position: [0, 7, -32], rotation: [0, 0, 0], scale: [2, 2, 2], color: 0xffff00, animated: true },
        { id: 'music_stage_deco_1', type: 'stage_deco', file: null, position: [-7, 0, -33], rotation: [0, 0.2, 0], scale: [1, 1, 1], color: 0x7c4dff, animated: false },
        { id: 'music_stage_deco_2', type: 'stage_deco', file: null, position: [7, 0, -33], rotation: [0, -0.2, 0], scale: [1, 1, 1], color: 0x536dfe, animated: false },
      ],
    },
    activityOverrides: [],
    analytics: {
      onPlayerEnterDuringEvent: true,
      onPlayerLeaveDuringEvent: true,
      trackConcurrentCount: true,
      concurrentCountInterval: 15,
      trackActivityUtilization: false,
    },
    startTransitionDuration: 3,
    endTransitionDuration: 5,
  },
};

// ─── Social Event Template ───────────────────────────────────────────────────

export const socialEventTemplate: EventTemplate = {
  id: 'template_social_event',
  name: 'Social Event',
  type: 'social_event',
  description: 'Casual themed social gathering with relaxed activities.',
  defaults: {
    music: {
      playlistId: 'cafe_chill',
      volume: 0.6,
      fadeInDuration: 4,
      fadeOutDuration: 4,
      areaOverrides: {},
      ambienceId: null,
    },
    lighting: {
      preset: 'chill',
      transitionDuration: 6,
      custom: null,
    },
    stage: {
      mode: 'active',
      animatedLighting: false,
      npcPerformers: 0,
      danceAreaRadius: 10,
      effects: [],
    },
    npcs: {
      densityMultiplier: 1.2,
      stageAttraction: 0.2,
      dancerPercentage: 0.2,
      additionalBehaviors: ['gather', 'sit'],
      spawnCrowdNPCs: false,
      crowdNPCCount: 0,
    },
    decorations: {
      id: 'social_decorations',
      decorations: [
        { id: 'social_banner_1', type: 'banner', file: null, position: [0, 3, -28], rotation: [0, 0, 0], scale: [1.5, 1, 1], color: 0x44ccaa, animated: true },
      ],
    },
    activityOverrides: [],
    analytics: {
      onPlayerEnterDuringEvent: true,
      onPlayerLeaveDuringEvent: true,
      trackConcurrentCount: true,
      concurrentCountInterval: 60,
      trackActivityUtilization: true,
    },
    startTransitionDuration: 6,
    endTransitionDuration: 8,
  },
};

// ─── Template Registry ───────────────────────────────────────────────────────

export const eventTemplates: EventTemplate[] = [
  semesterKickoffTemplate,
  musicEventTemplate,
  socialEventTemplate,
];

/** Get a template by ID */
export function getTemplateById(id: string): EventTemplate | undefined {
  return eventTemplates.find(t => t.id === id);
}

/** Get a template by event type */
export function getTemplateByType(type: string): EventTemplate | undefined {
  return eventTemplates.find(t => t.type === type);
}

/**
 * Create an event from a template.
 * Merges template defaults with event-specific overrides.
 */
export function createEventFromTemplate(
  template: EventTemplate,
  overrides: {
    id: string;
    name: string;
    description?: string;
    schedule: EventSchedule;
    targetLocation?: 'main_union';
    enabled?: boolean;
  }
): EventConfig {
  return {
    id: overrides.id,
    name: overrides.name,
    type: template.type,
    description: overrides.description ?? template.description,
    targetLocation: overrides.targetLocation ?? 'main_union',
    schedule: overrides.schedule,
    enabled: overrides.enabled ?? true,
    ...template.defaults,
  };
}
