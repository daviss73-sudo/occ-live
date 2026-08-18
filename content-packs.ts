/**
 * OCC Live - Content Pack & Seasonal Layer Configurations (Part 10)
 * Sample content packs and seasonal themes for OCC Live.
 * These can be enabled/disabled without rewriting core systems.
 *
 * Content packs are reusable bundles that can be associated with
 * multiple events or seasons.
 */

import type { ContentPackConfig, SeasonalLayerConfig } from '../types/index.ts';

// ─── Content Packs ───────────────────────────────────────────────────────────

export const contentPacks: ContentPackConfig[] = [
  {
    id: 'pack_welcome_week',
    name: 'Welcome Week',
    description: 'First-week decorations and celebratory music for new students.',
    activatesAt: null, // Manually activated
    deactivatesAt: null,
    targetLocations: ['main_union', 'main_plaza', 'main_stage'],
    decorations: [
      { id: 'welcome_banner_01', type: 'props', file: '/assets/content/welcome/banner-main.glb', position: [0, 5, -10], rotation: [0, 0, 0], scale: [2, 2, 2], enabled: true },
      { id: 'welcome_balloons_01', type: 'props', file: '/assets/content/welcome/balloons-cluster.glb', position: [-5, 0, -5], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
      { id: 'welcome_balloons_02', type: 'props', file: '/assets/content/welcome/balloons-cluster.glb', position: [5, 0, -5], rotation: [0, 0.5, 0], scale: [1, 1, 1], enabled: true },
      { id: 'welcome_confetti', type: 'props', file: '/assets/content/welcome/confetti-pile.glb', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
    ],
    musicPresets: [
      { zoneId: 'main_plaza', playlist: 'welcome_celebration', volume: 0.6 },
      { zoneId: 'main_stage', playlist: 'welcome_party_mix', volume: 0.7 },
    ],
    lightingPresets: [],
    npcPresets: [],
    activityOverrides: [],
    enabled: true,
  },
  {
    id: 'pack_study_break',
    name: 'Study Break Vibes',
    description: 'Relaxation-themed content for midterm/finals periods.',
    activatesAt: null,
    deactivatesAt: null,
    targetLocations: ['main_union', 'beanbag_lawn', 'cafe_terrace'],
    decorations: [
      { id: 'study_lanterns', type: 'lighting', file: '/assets/content/study-break/paper-lanterns.glb', position: [-15, 3, 5], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
      { id: 'study_cushions', type: 'furniture', file: '/assets/content/study-break/floor-cushions.glb', position: [-14, 0, 6], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
    ],
    musicPresets: [
      { zoneId: 'main_plaza', playlist: 'lofi_study_beats', volume: 0.4 },
      { zoneId: 'beanbag_lawn', playlist: 'ambient_rain', volume: 0.35 },
    ],
    lightingPresets: [],
    npcPresets: [],
    activityOverrides: [],
    enabled: true,
  },
  {
    id: 'pack_concert_night',
    name: 'Concert Night',
    description: 'Stage setup and lighting for live performance events.',
    activatesAt: null,
    deactivatesAt: null,
    targetLocations: ['main_stage'],
    decorations: [
      { id: 'concert_speakers_l', type: 'props', file: '/assets/content/concert/speaker-stack.glb', position: [-8, 0, -30], rotation: [0, 0.3, 0], scale: [1.5, 1.5, 1.5], enabled: true },
      { id: 'concert_speakers_r', type: 'props', file: '/assets/content/concert/speaker-stack.glb', position: [8, 0, -30], rotation: [0, -0.3, 0], scale: [1.5, 1.5, 1.5], enabled: true },
      { id: 'concert_lights', type: 'lighting', file: '/assets/content/concert/stage-lights.glb', position: [0, 6, -28], rotation: [0, 0, 0], scale: [2, 2, 2], enabled: true },
    ],
    musicPresets: [
      { zoneId: 'main_stage', playlist: 'live_concert_warmup', volume: 0.8 },
    ],
    lightingPresets: [
      {
        zoneId: 'main_stage',
        preset: {
          ambientColor: 0x110033,
          ambientIntensity: 0.2,
          directionalColor: 0xff00cc,
          directionalIntensity: 1.5,
          directionalPosition: [0, 10, -25],
          fogColor: 0x0a0020,
          fogNear: 10,
          fogFar: 60,
          skyTopColor: 0x000011,
          skyBottomColor: 0x110022,
        },
      },
    ],
    npcPresets: [],
    activityOverrides: [],
    enabled: true,
  },
];

// ─── Seasonal Layers ─────────────────────────────────────────────────────────

export const seasonalLayers: SeasonalLayerConfig[] = [
  {
    id: 'season_fall_2026',
    theme: 'fall_kickoff',
    name: 'Fall Kickoff 2026',
    activatesAt: '2026-09-01T00:00:00Z',
    deactivatesAt: '2026-09-21T00:00:00Z',
    decorations: [
      { id: 'fall_leaves_01', type: 'props', file: '/assets/seasonal/fall/leaf-pile.glb', position: [-8, 0, 3], rotation: [0, 0.5, 0], scale: [1, 1, 1], enabled: true },
      { id: 'fall_leaves_02', type: 'props', file: '/assets/seasonal/fall/leaf-pile.glb', position: [6, 0, 8], rotation: [0, 1.2, 0], scale: [0.8, 0.8, 0.8], enabled: true },
      { id: 'fall_pumpkins', type: 'props', file: '/assets/seasonal/fall/pumpkin-cluster.glb', position: [-5, 0, -3], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
      { id: 'fall_banner', type: 'signage', file: '/assets/seasonal/fall/welcome-back-banner.glb', position: [0, 4, 2], rotation: [0, 0, 0], scale: [1.5, 1.5, 1.5], enabled: true },
    ],
    lightingOverride: {
      ambientColor: 0xffcc88,
      ambientIntensity: 0.55,
      fogColor: 0x2a1500,
    },
    musicOverride: [
      { zoneId: 'main_plaza', playlist: 'fall_acoustic' },
    ],
    effects: ['falling_leaves'],
    enabled: true,
  },
  {
    id: 'season_winter_2026',
    theme: 'winter',
    name: 'Winter 2026',
    activatesAt: '2026-12-01T00:00:00Z',
    deactivatesAt: '2027-01-15T00:00:00Z',
    decorations: [
      { id: 'winter_snow_ground', type: 'props', file: '/assets/seasonal/winter/snow-ground.glb', position: [0, 0.01, 0], rotation: [0, 0, 0], scale: [3, 1, 3], enabled: true },
      { id: 'winter_lights_01', type: 'lighting', file: '/assets/seasonal/winter/string-lights-warm.glb', position: [-10, 3, -5], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
      { id: 'winter_lights_02', type: 'lighting', file: '/assets/seasonal/winter/string-lights-warm.glb', position: [8, 3, -8], rotation: [0, 0.8, 0], scale: [1, 1, 1], enabled: true },
      { id: 'winter_tree', type: 'props', file: '/assets/seasonal/winter/holiday-tree.glb', position: [0, 0, -8], rotation: [0, 0, 0], scale: [1.5, 1.5, 1.5], enabled: true },
    ],
    lightingOverride: {
      ambientColor: 0x8899cc,
      ambientIntensity: 0.45,
      fogColor: 0x1a2040,
      skyTopColor: 0x0a1030,
      skyBottomColor: 0x334466,
    },
    musicOverride: [
      { zoneId: 'main_plaza', playlist: 'winter_lofi' },
      { zoneId: 'firepit_lounge', playlist: 'cozy_fireplace' },
    ],
    effects: ['snowfall', 'breath_vapor'],
    enabled: true,
  },
  {
    id: 'season_spring_2027',
    theme: 'spring_kickoff',
    name: 'Spring Kickoff 2027',
    activatesAt: '2027-01-20T00:00:00Z',
    deactivatesAt: '2027-02-10T00:00:00Z',
    decorations: [
      { id: 'spring_flowers_01', type: 'props', file: '/assets/seasonal/spring/flower-bed.glb', position: [-6, 0, 4], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
      { id: 'spring_flowers_02', type: 'props', file: '/assets/seasonal/spring/flower-bed.glb', position: [7, 0, 2], rotation: [0, 1.0, 0], scale: [0.9, 0.9, 0.9], enabled: true },
      { id: 'spring_butterflies', type: 'props', file: '/assets/seasonal/spring/butterfly-cluster.glb', position: [0, 2, 0], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
      { id: 'spring_banner', type: 'signage', file: '/assets/seasonal/spring/spring-welcome.glb', position: [0, 4, 3], rotation: [0, 0, 0], scale: [1.5, 1.5, 1.5], enabled: true },
    ],
    lightingOverride: {
      ambientColor: 0xccffcc,
      ambientIntensity: 0.6,
      directionalColor: 0xffffaa,
      skyBottomColor: 0x88ccff,
    },
    musicOverride: [
      { zoneId: 'main_plaza', playlist: 'spring_upbeat' },
    ],
    effects: ['petal_drift', 'butterflies'],
    enabled: true,
  },
  {
    id: 'season_summer_2027',
    theme: 'summer',
    name: 'Summer 2027',
    activatesAt: '2027-06-01T00:00:00Z',
    deactivatesAt: '2027-08-20T00:00:00Z',
    decorations: [
      { id: 'summer_palm', type: 'props', file: '/assets/seasonal/summer/palm-tree.glb', position: [8, 0, 5], rotation: [0, 0, 0], scale: [1.2, 1.2, 1.2], enabled: true },
      { id: 'summer_beach_ball', type: 'props', file: '/assets/seasonal/summer/beach-balls.glb', position: [3, 0, 8], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
      { id: 'summer_tiki_lights', type: 'lighting', file: '/assets/seasonal/summer/tiki-torches.glb', position: [-5, 0, 10], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
    ],
    lightingOverride: {
      ambientColor: 0xffffff,
      ambientIntensity: 0.7,
      directionalColor: 0xffeedd,
      directionalIntensity: 2.0,
      skyTopColor: 0x4488ff,
      skyBottomColor: 0xffcc88,
    },
    musicOverride: [
      { zoneId: 'main_plaza', playlist: 'summer_vibes' },
      { zoneId: 'river_lounge', playlist: 'tropical_beats' },
    ],
    effects: ['sun_rays', 'fireflies_evening'],
    enabled: true,
  },
];
