/**
 * OCC Live - Main Union Asset Configuration (Part 4)
 * Production-ready zone configs with interaction anchors, collision,
 * lighting, NPC anchors, and audio zones for all imported Meshy assets.
 * 
 * Positions/scales are initial estimates — adjust via config without
 * touching gameplay code.
 */

import type { EnhancedAssetEntry } from '../types/pipeline.ts';
import type { LazyRiverConfig, TemporaryOutfitConfig, PropDefinition } from '../types/pipeline.ts';

// ─── Main Union Environment Assets ──────────────────────────────────────────

export const mainUnionAssets: EnhancedAssetEntry[] = [
  // ─── Architecture ────────────────────────────────────────────────────
  {
    id: 'main_stage',
    file: '/assets/world/main-union/architecture/main-stage.glb',
    category: 'architecture',
    position: [0, 0, -30],
    rotation: [0, 0, 0],
    scale: [2, 2, 2],
    enabled: true,
    zoneId: 'main_stage',
    collision: { type: 'solid', shape: 'box', size: [18, 6, 12], offset: [0, 3, 0] },
    interactionAnchors: [
      { id: 'stage_dance_01', type: 'dance', position: [-3, 0, 5], rotation: [0, 0, 0], exitPosition: [-3, 0, 8], promptPosition: [-3, 1.5, 5], prompt: 'Dance', occupied: false, occupiedBy: null },
      { id: 'stage_dance_02', type: 'dance', position: [3, 0, 5], rotation: [0, 0, 0], exitPosition: [3, 0, 8], promptPosition: [3, 1.5, 5], prompt: 'Dance', occupied: false, occupiedBy: null },
    ],
    lod: null,
    lighting: { preset: 'festival', intensity: 1.5, color: 0x9c27b0, radius: 20, castShadow: true },
    npcAnchors: [
      { id: 'stage_crowd_01', type: 'standing', position: [-2, 0, 6], rotation: [0, 3.14, 0] },
      { id: 'stage_crowd_02', type: 'standing', position: [2, 0, 7], rotation: [0, 3.14, 0] },
      { id: 'stage_crowd_03', type: 'standing', position: [0, 0, 8], rotation: [0, 3.14, 0] },
    ],
    audioZone: 'main_stage_music',
    spawnPoints: ['main_stage_spawn'],
    multiplayerSync: true,
  },
  {
    id: 'cafe',
    file: '/assets/world/main-union/architecture/cafe.glb',
    category: 'architecture',
    position: [-25, 0, -10],
    rotation: [0, 0.3, 0],
    scale: [1.8, 1.8, 1.8],
    enabled: true,
    zoneId: 'cafe_terrace',
    collision: { type: 'solid', shape: 'box', size: [12, 4, 10], offset: [0, 2, 0] },
    interactionAnchors: [
      { id: 'cafe_seat_01', type: 'sit', position: [-2, 0, 3], rotation: [0, 0, 0], exitPosition: [-2, 0, 5], promptPosition: [-2, 1.5, 3], prompt: 'Sit', occupied: false, occupiedBy: null },
      { id: 'cafe_seat_02', type: 'sit', position: [0, 0, 3], rotation: [0, 0, 0], exitPosition: [0, 0, 5], promptPosition: [0, 1.5, 3], prompt: 'Sit', occupied: false, occupiedBy: null },
      { id: 'cafe_seat_03', type: 'sit', position: [2, 0, 3], rotation: [0, 0, 0], exitPosition: [2, 0, 5], promptPosition: [2, 1.5, 3], prompt: 'Sit', occupied: false, occupiedBy: null },
      { id: 'cafe_drink_01', type: 'drink', position: [-1, 1, 1], rotation: [0, 0, 0], exitPosition: [-1, 0, 3], promptPosition: [-1, 1.8, 1], prompt: 'Grab a drink', occupied: false, occupiedBy: null },
    ],
    lod: null,
    lighting: { preset: 'warm', intensity: 0.8, color: 0xffa040, radius: 12, castShadow: false },
    npcAnchors: [
      { id: 'cafe_barista', type: 'barista', position: [0, 0, -1], rotation: [0, 3.14, 0] },
      { id: 'cafe_standing', type: 'standing', position: [3, 0, 2], rotation: [0, -0.5, 0] },
    ],
    audioZone: 'cafe_music',
    spawnPoints: ['cafe_spawn'],
    multiplayerSync: true,
  },

  // ─── Furniture ───────────────────────────────────────────────────────
  {
    id: 'beanbag_lounge',
    file: '/assets/world/main-union/furniture/beanbag-lounge.glb',
    category: 'furniture',
    position: [-15, 0, 5],
    rotation: [0, 0, 0],
    scale: [1.5, 1.5, 1.5],
    enabled: true,
    zoneId: 'beanbag_lawn',
    collision: null,
    interactionAnchors: [
      { id: 'beanbag_01', type: 'sit', position: [-2, 0, 0], rotation: [0, 0.3, 0], exitPosition: [-2, 0, 2], promptPosition: [-2, 1, 0], prompt: 'Sit', occupied: false, occupiedBy: null },
      { id: 'beanbag_02', type: 'sit', position: [0, 0, 1], rotation: [0, -0.2, 0], exitPosition: [0, 0, 3], promptPosition: [0, 1, 1], prompt: 'Sit', occupied: false, occupiedBy: null },
      { id: 'beanbag_03', type: 'sit', position: [2, 0, 0], rotation: [0, -0.5, 0], exitPosition: [2, 0, 2], promptPosition: [2, 1, 0], prompt: 'Sit', occupied: false, occupiedBy: null },
      { id: 'beanbag_04', type: 'sit', position: [1, 0, -1.5], rotation: [0, 0.8, 0], exitPosition: [1, 0, 0.5], promptPosition: [1, 1, -1.5], prompt: 'Sit', occupied: false, occupiedBy: null },
    ],
    lod: null,
    lighting: null,
    npcAnchors: [
      { id: 'beanbag_npc_01', type: 'sitting', position: [-1, 0, -1], rotation: [0, 0.5, 0] },
    ],
    audioZone: null,
    spawnPoints: [],
    multiplayerSync: true,
  },
  {
    id: 'firepit',
    file: '/assets/world/main-union/furniture/firepit.glb',
    category: 'furniture',
    position: [20, 0, 10],
    rotation: [0, 0, 0],
    scale: [1.8, 1.8, 1.8],
    enabled: true,
    zoneId: 'firepit_lounge',
    collision: { type: 'solid', shape: 'sphere', size: [2, 2, 2], offset: [0, 0.5, 0] },
    interactionAnchors: [
      { id: 'firepit_seat_01', type: 'roast_marshmallow', position: [-2.5, 0, 0], rotation: [0, 1.57, 0], exitPosition: [-3.5, 0, 0], promptPosition: [-2.5, 1.5, 0], prompt: 'Sit & Roast Marshmallow', occupied: false, occupiedBy: null },
      { id: 'firepit_seat_02', type: 'roast_marshmallow', position: [2.5, 0, 0], rotation: [0, -1.57, 0], exitPosition: [3.5, 0, 0], promptPosition: [2.5, 1.5, 0], prompt: 'Sit & Roast Marshmallow', occupied: false, occupiedBy: null },
      { id: 'firepit_seat_03', type: 'roast_marshmallow', position: [0, 0, -2.5], rotation: [0, 0, 0], exitPosition: [0, 0, -3.5], promptPosition: [0, 1.5, -2.5], prompt: 'Sit & Roast Marshmallow', occupied: false, occupiedBy: null },
      { id: 'firepit_seat_04', type: 'roast_marshmallow', position: [0, 0, 2.5], rotation: [0, 3.14, 0], exitPosition: [0, 0, 3.5], promptPosition: [0, 1.5, 2.5], prompt: 'Sit & Roast Marshmallow', occupied: false, occupiedBy: null },
    ],
    lod: null,
    lighting: { preset: 'warm', intensity: 1.2, color: 0xff6600, radius: 8, castShadow: true },
    npcAnchors: [
      { id: 'firepit_npc_01', type: 'sitting', position: [1.8, 0, 1.8], rotation: [0, -2.35, 0] },
    ],
    audioZone: 'firepit_ambience',
    spawnPoints: [],
    multiplayerSync: true,
  },

  // ─── Recreation ──────────────────────────────────────────────────────
  {
    id: 'ball_pit',
    file: '/assets/world/main-union/recreation/ball-pit.glb',
    category: 'recreation',
    position: [25, 0, -10],
    rotation: [0, 0, 0],
    scale: [2, 2, 2],
    enabled: true,
    zoneId: 'ball_pit',
    collision: { type: 'solid', shape: 'box', size: [10, 3, 10], offset: [0, 1.5, 0] },
    interactionAnchors: [
      { id: 'ball_pit_enter', type: 'enter', position: [0, 0, 5], rotation: [0, 0, 0], exitPosition: [0, 0, 7], promptPosition: [0, 2, 5], prompt: 'Jump In!', occupied: false, occupiedBy: null },
    ],
    lod: null,
    lighting: null,
    npcAnchors: [],
    audioZone: null,
    spawnPoints: [],
    multiplayerSync: true,
  },
  {
    id: 'swing_area',
    file: '/assets/world/main-union/recreation/swing.glb',
    category: 'recreation',
    position: [-20, 0, -20],
    rotation: [0, 0, 0],
    scale: [1.5, 1.5, 1.5],
    enabled: true,
    zoneId: 'swing_zone',
    collision: { type: 'solid', shape: 'box', size: [6, 4, 4], offset: [0, 2, 0] },
    interactionAnchors: [
      { id: 'swing_seat_01', type: 'swing', position: [-1.5, 0.5, 0], rotation: [0, 0, 0], exitPosition: [-1.5, 0, 2], promptPosition: [-1.5, 2, 0], prompt: 'Swing', occupied: false, occupiedBy: null },
      { id: 'swing_seat_02', type: 'swing', position: [1.5, 0.5, 0], rotation: [0, 0, 0], exitPosition: [1.5, 0, 2], promptPosition: [1.5, 2, 0], prompt: 'Swing', occupied: false, occupiedBy: null },
    ],
    lod: null,
    lighting: null,
    npcAnchors: [],
    audioZone: null,
    spawnPoints: [],
    multiplayerSync: true,
  },

  // ─── Activities ──────────────────────────────────────────────────────
  {
    id: 'cornhole',
    file: '/assets/world/main-union/activities/cornhole.glb',
    category: 'recreation',
    position: [12, 0, 8],
    rotation: [0, 0.4, 0],
    scale: [1.2, 1.2, 1.2],
    enabled: true,
    zoneId: 'main_plaza',
    collision: null,
    interactionAnchors: [
      { id: 'cornhole_play', type: 'play', position: [0, 0, 2], rotation: [0, 0, 0], exitPosition: [0, 0, 4], promptPosition: [0, 1.5, 2], prompt: 'Play Cornhole', occupied: false, occupiedBy: null },
    ],
    lod: null,
    lighting: null,
    npcAnchors: [],
    audioZone: null,
    spawnPoints: [],
    multiplayerSync: true,
  },
  {
    id: 'frisbee_area',
    file: '/assets/world/main-union/activities/frisbee.glb',
    category: 'recreation',
    position: [8, 0, -5],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    enabled: true,
    zoneId: 'main_plaza',
    collision: null,
    interactionAnchors: [
      { id: 'frisbee_play', type: 'play', position: [0, 0, 0], rotation: [0, 0, 0], exitPosition: [0, 0, 3], promptPosition: [0, 1.5, 0], prompt: 'Play Frisbee', occupied: false, occupiedBy: null },
    ],
    lod: null,
    lighting: null,
    npcAnchors: [],
    audioZone: null,
    spawnPoints: [],
    multiplayerSync: true,
  },
  {
    id: 'photo_booth',
    file: '/assets/world/main-union/activities/photo-booth.glb',
    category: 'recreation',
    position: [-8, 0, -18],
    rotation: [0, 0.5, 0],
    scale: [1.5, 1.5, 1.5],
    enabled: true,
    zoneId: 'main_plaza',
    collision: { type: 'solid', shape: 'box', size: [3, 3, 3], offset: [0, 1.5, 0] },
    interactionAnchors: [
      { id: 'photo_booth_enter', type: 'enter', position: [0, 0, 2], rotation: [0, 0, 0], exitPosition: [0, 0, 3.5], promptPosition: [0, 2, 2], prompt: 'Enter Photo Booth', occupied: false, occupiedBy: null },
    ],
    lod: null,
    lighting: { preset: 'neon', intensity: 0.6, color: 0xff69b4, radius: 5, castShadow: false },
    npcAnchors: [],
    audioZone: null,
    spawnPoints: [],
    multiplayerSync: true,
  },
  {
    id: 'dance_challenge',
    file: '/assets/world/main-union/activities/dance-challenge.glb',
    category: 'recreation',
    position: [5, 0, -20],
    rotation: [0, 0, 0],
    scale: [1.5, 1.5, 1.5],
    enabled: true,
    zoneId: 'main_stage',
    collision: null,
    interactionAnchors: [
      { id: 'dance_spot_01', type: 'dance', position: [-1, 0, 0], rotation: [0, 0, 0], exitPosition: [-1, 0, 2], promptPosition: [-1, 1.5, 0], prompt: 'Dance', occupied: false, occupiedBy: null },
      { id: 'dance_spot_02', type: 'dance', position: [1, 0, 0], rotation: [0, 0, 0], exitPosition: [1, 0, 2], promptPosition: [1, 1.5, 0], prompt: 'Dance', occupied: false, occupiedBy: null },
    ],
    lod: null,
    lighting: { preset: 'neon', intensity: 1.0, color: 0x7c4dff, radius: 8, castShadow: false },
    npcAnchors: [
      { id: 'dance_npc_01', type: 'standing', position: [0, 0, 3], rotation: [0, 3.14, 0] },
    ],
    audioZone: 'main_stage_music',
    spawnPoints: [],
    multiplayerSync: true,
  },
  {
    id: 'scavenger_map',
    file: '/assets/world/main-union/activities/scavenger-map.glb',
    category: 'props',
    position: [-5, 0, 8],
    rotation: [0, -0.3, 0],
    scale: [1.2, 1.2, 1.2],
    enabled: true,
    zoneId: 'main_plaza',
    collision: null,
    interactionAnchors: [],
    lod: null,
    lighting: null,
    npcAnchors: [],
    audioZone: null,
    spawnPoints: [],
    multiplayerSync: false,
  },

  // ─── Water (Lazy River overview asset) ───────────────────────────────
  {
    id: 'lazy_river_main',
    file: '/assets/world/main-union/water/lazy-river.glb',
    category: 'water',
    position: [0, -0.5, 20],
    rotation: [0, 0, 0],
    scale: [2, 2, 2],
    enabled: true,
    zoneId: 'river_lounge',
    collision: null,
    interactionAnchors: [
      { id: 'river_enter_01', type: 'enter', position: [8, 0, -5], rotation: [0, 0, 0], exitPosition: [10, 0, -5], promptPosition: [8, 1.5, -5], prompt: 'Enter Lazy River', occupied: false, occupiedBy: null },
      { id: 'river_exit_01', type: 'exit', position: [-8, 0, -5], rotation: [0, 0, 0], exitPosition: [-10, 0, -5], promptPosition: [-8, 1.5, -5], prompt: 'Exit', occupied: false, occupiedBy: null },
    ],
    lod: null,
    lighting: null,
    npcAnchors: [],
    audioZone: 'river_ambience',
    spawnPoints: ['river_spawn'],
    multiplayerSync: true,
  },

  // ─── Portals ─────────────────────────────────────────────────────────
  {
    id: 'portal_skyline',
    file: '/assets/world/main-union/portals/portal-skyline.glb',
    category: 'portals',
    position: [-30, 0, -35],
    rotation: [0, 0.5, 0],
    scale: [2, 2, 2],
    enabled: true,
    zoneId: 'portal_skyline',
    collision: { type: 'solid', shape: 'box', size: [5, 6, 2], offset: [0, 3, 0] },
    interactionAnchors: [
      { id: 'portal_skyline_enter', type: 'portal', position: [0, 0, 1.5], rotation: [0, 0, 0], exitPosition: [0, 0, 3], promptPosition: [0, 3, 1.5], prompt: 'Enter Skyline', occupied: false, occupiedBy: null },
    ],
    lod: null,
    lighting: { preset: 'neon', intensity: 0.8, color: 0x7c4dff, radius: 6, castShadow: false },
    npcAnchors: [],
    audioZone: null,
    spawnPoints: ['skyline_portal_spawn'],
    multiplayerSync: false,
  },
];

// ─── Lazy River Route Configuration ─────────────────────────────────────────

export const lazyRiverConfig: LazyRiverConfig = {
  segments: [
    { id: 'seg_01', type: 'straight', file: '/assets/world/main-union/water/river-segment-01.glb', position: [15, -0.5, 25], rotation: [0, 0, 0], scale: [1.5, 1.5, 1.5] },
    { id: 'seg_02', type: 'corner', file: '/assets/world/main-union/water/river-segment-02.glb', position: [25, -0.5, 25], rotation: [0, -1.57, 0], scale: [1.5, 1.5, 1.5] },
    { id: 'seg_03', type: 'curve', file: '/assets/world/main-union/water/river-segment-03.glb', position: [25, -0.5, 15], rotation: [0, 3.14, 0], scale: [1.5, 1.5, 1.5] },
    { id: 'seg_04', type: 'entry_exit', file: '/assets/world/main-union/water/river-segment-04.glb', position: [8, -0.5, 15], rotation: [0, 1.57, 0], scale: [1.5, 1.5, 1.5] },
  ],
  waypoints: [
    [8, -0.5, 15],
    [15, -0.5, 15],
    [20, -0.5, 17],
    [25, -0.5, 20],
    [27, -0.5, 25],
    [25, -0.5, 30],
    [20, -0.5, 33],
    [15, -0.5, 35],
    [10, -0.5, 35],
    [5, -0.5, 33],
    [0, -0.5, 30],
    [-5, -0.5, 28],
    [-10, -0.5, 25],
    [-12, -0.5, 20],
    [-10, -0.5, 17],
    [-5, -0.5, 15],
    [0, -0.5, 14],
    [5, -0.5, 14],
  ],
  loop: true,
  floatSpeed: 2.5,
  width: 4,
  entryPoints: [[8, -0.5, 15]],
  exitPoints: [[-5, -0.5, 15]],
  audioZone: 'river_ambience',
  wetsuitAsset: '/assets/avatars/wetsuit/wetsuit.glb',
};

// ─── Wetsuit Outfit Config ───────────────────────────────────────────────────

export const wetsuitConfig: TemporaryOutfitConfig = {
  id: 'wetsuit',
  file: '/assets/avatars/wetsuit/wetsuit.glb',
  activity: 'lazy_river',
  preserveSlots: ['face', 'hair', 'accessories'],
  hideSlots: ['top', 'bottom', 'shoes'],
};

// ─── Prop Definitions ────────────────────────────────────────────────────────

export const propDefinitions: PropDefinition[] = [
  { id: 'marshmallow_stick', file: '/assets/world/main-union/props/marshmallow-stick.glb', attachPoint: 'hand_right', offset: [0.05, 0, -0.3], rotation: [-0.6, 0, 0], scale: [1, 1, 1] },
  { id: 'coffee_cup', file: '/assets/world/main-union/props/coffee-cup.glb', attachPoint: 'hand_right', offset: [0, 0, 0], rotation: [0, 0, 0], scale: [0.5, 0.5, 0.5] },
  { id: 'frisbee', file: '/assets/world/main-union/activities/frisbee.glb', attachPoint: 'hand_right', offset: [0, 0, -0.15], rotation: [1.57, 0, 0], scale: [0.3, 0.3, 0.3] },
];
