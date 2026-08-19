/**
 * OCC Live - Shared Activity Configurations (Part 9)
 * Defines all multi-player compatible activities in OCC Live.
 *
 * Rules:
 * - Players must explicitly join (no auto-join on proximity)
 * - Players can always leave (freeExit: true)
 * - Contact activities require consent verification
 * - No one is forced into an activity
 */

import type { SharedActivityConfig } from '../types/index.ts';

export const sharedActivityConfigs: SharedActivityConfig[] = [
  // ─── Main Union Shared Activities ──────────────────────────────────────

  {
    id: 'shared_dance_main_stage',
    type: 'dance_floor',
    maxParticipants: 0, // Unlimited
    zoneId: 'main_stage',
    freeExit: true,
    requiresExplicitJoin: false, // Dance is proximity-triggered
    requiresContactConsent: false,
    animations: ['dance', 'cheer', 'wave', 'celebrate'],
    position: [0, 0, -28],
    enabled: true,
  },
  {
    id: 'shared_firepit',
    type: 'firepit',
    maxParticipants: 6,
    zoneId: 'firepit_lounge',
    freeExit: true,
    requiresExplicitJoin: true,
    requiresContactConsent: false,
    animations: ['sit', 'roast_marshmallow', 'idle'],
    position: [20, 0, 10],
    enabled: true,
  },
  {
    id: 'shared_beanbag_lawn',
    type: 'sitting_area',
    maxParticipants: 8,
    zoneId: 'beanbag_lawn',
    freeExit: true,
    requiresExplicitJoin: true,
    requiresContactConsent: false,
    animations: ['sit', 'idle', 'wave'],
    position: [-15, 0, 5],
    enabled: true,
  },
  {
    id: 'shared_cafe_terrace',
    type: 'sitting_area',
    maxParticipants: 6,
    zoneId: 'cafe_terrace',
    freeExit: true,
    requiresExplicitJoin: true,
    requiresContactConsent: false,
    animations: ['sit', 'drink', 'idle', 'wave'],
    position: [-25, 0, -10],
    enabled: true,
  },
  {
    id: 'shared_lazy_river',
    type: 'lazy_river',
    maxParticipants: 20,
    zoneId: 'river_lounge',
    freeExit: true,
    requiresExplicitJoin: true,
    requiresContactConsent: false,
    animations: ['float', 'wave', 'cheer'],
    position: [0, -0.5, 15],
    enabled: true,
  },
  {
    id: 'shared_ball_pit',
    type: 'ball_pit',
    maxParticipants: 10,
    zoneId: 'ball_pit',
    freeExit: true,
    requiresExplicitJoin: true,
    requiresContactConsent: false,
    animations: ['play', 'jump', 'cheer', 'wave'],
    position: [25, 0, -10],
    enabled: true,
  },
  {
    id: 'shared_photobooth_main',
    type: 'photobooth',
    maxParticipants: 6,
    zoneId: 'main_plaza',
    freeExit: true,
    requiresExplicitJoin: true,
    requiresContactConsent: false,
    animations: ['idle', 'wave', 'cheer', 'celebrate'],
    position: [12, 0, -5],
    enabled: true,
  },

  // ─── Skyline District Shared Activities ────────────────────────────────

  {
    id: 'shared_skyline_dance',
    type: 'dance_floor',
    maxParticipants: 0,
    zoneId: 'skyline_dance',
    freeExit: true,
    requiresExplicitJoin: false,
    requiresContactConsent: false,
    animations: ['dance', 'cheer', 'wave'],
    position: [8, 0, 10],
    enabled: true,
  },
  {
    id: 'shared_skyline_lounge',
    type: 'sitting_area',
    maxParticipants: 6,
    zoneId: 'skyline_lounge',
    freeExit: true,
    requiresExplicitJoin: true,
    requiresContactConsent: false,
    animations: ['sit', 'idle', 'wave'],
    position: [-12, 0, -8],
    enabled: true,
  },

  // ─── Pulse District Shared Activities ──────────────────────────────────

  {
    id: 'shared_pulse_main_dance',
    type: 'dance_floor',
    maxParticipants: 0,
    zoneId: 'pulse_main_floor',
    freeExit: true,
    requiresExplicitJoin: false,
    requiresContactConsent: false,
    animations: ['dance', 'cheer', 'celebrate', 'wave'],
    position: [0, 0, 0],
    enabled: true,
  },
  {
    id: 'shared_pulse_side_dance',
    type: 'dance_floor',
    maxParticipants: 0,
    zoneId: 'pulse_side_floor',
    freeExit: true,
    requiresExplicitJoin: false,
    requiresContactConsent: false,
    animations: ['dance', 'cheer'],
    position: [12, 0, 10],
    enabled: true,
  },
  {
    id: 'shared_pulse_vip',
    type: 'sitting_area',
    maxParticipants: 4,
    zoneId: 'pulse_vip',
    freeExit: true,
    requiresExplicitJoin: true,
    requiresContactConsent: false,
    animations: ['sit', 'idle', 'dance'],
    position: [-15, 1, -10],
    enabled: true,
  },

  // ─── Arcade District Shared Activities ─────────────────────────────────

  {
    id: 'shared_arcade_multiplayer',
    type: 'mini_game',
    maxParticipants: 4,
    zoneId: 'arcade_multiplayer',
    freeExit: true,
    requiresExplicitJoin: true,
    requiresContactConsent: false,
    animations: ['play', 'idle', 'cheer', 'celebrate'],
    position: [10, 0, -5],
    enabled: true,
  },
  {
    id: 'shared_arcade_lounge',
    type: 'sitting_area',
    maxParticipants: 6,
    zoneId: 'arcade_lounge',
    freeExit: true,
    requiresExplicitJoin: true,
    requiresContactConsent: false,
    animations: ['sit', 'idle', 'wave'],
    position: [0, 0, 12],
    enabled: true,
  },

  // ─── Throwback District Shared Activities ──────────────────────────────

  {
    id: 'shared_throwback_roller_rink',
    type: 'dance_floor',
    maxParticipants: 0,
    zoneId: 'throwback_roller_rink',
    freeExit: true,
    requiresExplicitJoin: false,
    requiresContactConsent: false,
    animations: ['dance', 'cheer', 'wave'],
    position: [0, 0, -15],
    enabled: true,
  },
  {
    id: 'shared_throwback_diner',
    type: 'sitting_area',
    maxParticipants: 6,
    zoneId: 'throwback_diner',
    freeExit: true,
    requiresExplicitJoin: true,
    requiresContactConsent: false,
    animations: ['sit', 'drink', 'idle', 'wave'],
    position: [-15, 0, 5],
    enabled: true,
  },
  {
    id: 'shared_throwback_photobooth',
    type: 'photobooth',
    maxParticipants: 6,
    zoneId: 'throwback_photobooth',
    freeExit: true,
    requiresExplicitJoin: true,
    requiresContactConsent: false,
    animations: ['idle', 'wave', 'cheer', 'celebrate'],
    position: [14, 0, 5],
    enabled: true,
  },

  // ─── Mystique District Shared Activities ───────────────────────────────

  {
    id: 'shared_mystique_garden',
    type: 'sitting_area',
    maxParticipants: 4,
    zoneId: 'mystique_floating_garden',
    freeExit: true,
    requiresExplicitJoin: true,
    requiresContactConsent: false,
    animations: ['sit', 'meditate', 'idle'],
    position: [10, 3, -12],
    enabled: true,
  },
  {
    id: 'shared_mystique_mirror_pool',
    type: 'custom',
    maxParticipants: 6,
    zoneId: 'mystique_mirror_pool',
    freeExit: true,
    requiresExplicitJoin: true,
    requiresContactConsent: false,
    animations: ['sit', 'meditate', 'idle'],
    position: [0, -0.5, -25],
    enabled: true,
  },
];

/**
 * Get shared activities for a specific zone
 */
export function getActivitiesForZone(zoneId: string): SharedActivityConfig[] {
  return sharedActivityConfigs.filter(a => a.zoneId === zoneId);
}

/**
 * Get shared activities for a specific district (by zone prefix)
 */
export function getActivitiesForDistrict(districtId: string): SharedActivityConfig[] {
  return sharedActivityConfigs.filter(a => a.zoneId.startsWith(districtId));
}
