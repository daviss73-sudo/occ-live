/**
 * OCC Live - World Configuration
 * Data-driven world definition. All positions, assets, zones, and behaviors
 * are configured here rather than hard-coded into gameplay logic.
 */

import type { WorldConfig } from '../types/index.ts';

export const worldConfig: WorldConfig = {
  state: 'EVENING',

  // ─── Camera ──────────────────────────────────────────────────────────────
  camera: {
    distance: 8,
    height: 4,
    smoothing: 0.08,
    rotationSpeed: 0.003,
    minDistance: 3,
    maxDistance: 15,
    minPolarAngle: 0.3,
    maxPolarAngle: 1.4,
  },

  // ─── Player ──────────────────────────────────────────────────────────────
  player: {
    walkSpeed: 4,
    runSpeed: 8,
    jumpForce: 8,
    gravity: 20,
    height: 1.8,
    radius: 0.4,
  },

  // ─── Districts (Part 8: Full configs in src/config/district-configs.ts) ──
  // Main Union remains here; expansion districts are loaded from district-configs.ts
  districts: [
    { id: 'main_union', name: 'Main Union', status: 'OPEN', sceneAsset: null, spawnPoint: 'main_union_spawn', musicPlaylist: 'main_union_ambient', enabled: true },
    { id: 'skyline', name: 'Skyline', status: 'OPEN', sceneAsset: '/assets/world/skyline/skyline-scene.glb', spawnPoint: 'skyline_spawn', musicPlaylist: 'skyline_sunset_jazz', lazyLoad: true, enabled: true },
    { id: 'pulse', name: 'Pulse', status: 'OPEN', sceneAsset: '/assets/world/pulse/pulse-scene.glb', spawnPoint: 'pulse_spawn', musicPlaylist: 'pulse_edm', lazyLoad: true, enabled: true },
    { id: 'arcade', name: 'Arcade', status: 'OPEN', sceneAsset: '/assets/world/arcade/arcade-scene.glb', spawnPoint: 'arcade_spawn', musicPlaylist: 'retro_chiptune', lazyLoad: true, enabled: true },
    { id: 'throwback_80s_90s', name: '80s/90s Throwback', status: 'OPEN', sceneAsset: '/assets/world/throwback/throwback-scene.glb', spawnPoint: 'throwback_spawn', musicPlaylist: 'retro_80s_90s_mix', lazyLoad: true, enabled: true },
    { id: 'mystique', name: 'Mystique', status: 'OPEN', sceneAsset: '/assets/world/mystique/mystique-scene.glb', spawnPoint: 'mystique_spawn', musicPlaylist: 'mystique_ambient_pad', lazyLoad: true, enabled: true },
  ],

  // ─── Assets (placeholders until Meshy .glb imports) ──────────────────────
  assets: [
     assets: [
    { id: 'main_stage', type: 'architecture', file: 'https://pub-c8d7825ef99c46e28cb31aee23b53d38.r2.dev/main%20stage.gltf', position: [0, 0, -30], rotation: [0, 0, 0], scale: [15, 15, 15], zoneId: 'main_stage', enabled: true },
    { id: 'cafe', type: 'architecture', file: 'https://pub-c8d7825ef99c46e28cb31aee23b53d38.r2.dev/cafe.gltf', position: [-25, 0, -10], rotation: [0, 0, 0], scale: [15, 15, 15], zoneId: 'cafe_terrace', enabled: true },
    { id: 'beanbag_lawn', type: 'furniture', file: '/assets/world/main-union/furniture/beanbag-lawn.glb', position: [-15, 0, 5], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'beanbag_lawn', enabled: false },
    { id: 'swing_set', type: 'recreation', file: 'https://pub-c8d7825ef99c46e28cb31aee23b53d38.r2.dev/swing.gltf', position: [-20, 0, -20], rotation: [0, 0, 0], scale: [15, 15, 15], zoneId: 'swing_zone', enabled: true },
    { id: 'ball_pit', type: 'recreation', file: 'https://pub-c8d7825ef99c46e28cb31aee23b53d38.r2.dev/ball%20pit.gltf', position: [25, 0, -10], rotation: [0, 0, 0], scale: [15, 15, 15], zoneId: 'ball_pit', enabled: true },
    { id: 'river', type: 'water', file: 'https://pub-c8d7825ef99c46e28cb31aee23b53d38.r2.dev/lazy%20river%20segment%201.gltf', position: [0, -0.5, 15], rotation: [0, 0, 0], scale: [15, 15, 15], zoneId: 'river_lounge', enabled: true },
    { id: 'firepit', type: 'furniture', file: 'https://pub-c8d7825ef99c46e28cb31aee23b53d38.r2.dev/fire%20pit.gltf', position: [20, 0, 10], rotation: [0, 0, 0], scale: [15, 15, 15], zoneId: 'firepit_lounge', enabled: true },
    { id: 'photobooth', type: 'recreation', file: 'https://pub-c8d7825ef99c46e28cb31aee23b53d38.r2.dev/photo%20booth.gltf', position: [12, 0, -5], rotation: [0, 0, 0], scale: [15, 15, 15], zoneId: 'main_plaza', enabled: true },
    { id: 'portal_skyline', type: 'portals', file: '/assets/world/main-union/portals/portal-skyline.glb', position: [-30, 0, -35], rotation: [0, 0.5, 0], scale: [1, 1, 1], zoneId: 'portal_skyline', enabled: false },
    { id: 'portal_pulse', type: 'portals', file: '/assets/world/main-union/portals/portal-pulse.glb', position: [30, 0, -35], rotation: [0, -0.5, 0], scale: [1, 1, 1], zoneId: 'portal_pulse', enabled: false },
    { id: 'wayfinding_sign', type: 'signage', file: '/assets/world/main-union/signage/wayfinding-sign.glb', position: [-10, 0, 10], rotation: [0, 0.3, 0], scale: [1, 1, 1], enabled: false },
  ],

  ],

  // ─── Zones ───────────────────────────────────────────────────────────────
  zones: [
    { id: 'main_plaza', displayName: 'Main Plaza', type: 'plaza', position: [0, 0, 0], rotation: [0, 0, 0], radius: 20, interactionType: 'none', musicZone: 'main_plaza_music', spawnPoint: 'main_plaza_spawn', enabled: true, districtId: 'main_union' },
    { id: 'main_stage', displayName: 'Main Stage', type: 'stage', position: [0, 0, -30], rotation: [0, 0, 0], radius: 15, interactionType: 'dance', musicZone: 'main_stage_music', spawnPoint: 'main_stage_spawn', enabled: true, districtId: 'main_union' },
    { id: 'cafe_terrace', displayName: 'Café Terrace', type: 'cafe', position: [-25, 0, -10], rotation: [0, 0, 0], radius: 10, interactionType: 'sit', musicZone: 'cafe_music', spawnPoint: 'cafe_spawn', enabled: true, districtId: 'main_union' },
    { id: 'beanbag_lawn', displayName: 'Beanbag Lawn', type: 'relaxation', position: [-15, 0, 5], rotation: [0, 0, 0], radius: 8, interactionType: 'sit', musicZone: null, spawnPoint: null, enabled: true, districtId: 'main_union' },
    { id: 'swing_zone', displayName: 'Swing Zone', type: 'recreation', position: [-20, 0, -20], rotation: [0, 0, 0], radius: 6, interactionType: 'swing', musicZone: null, spawnPoint: null, enabled: true, districtId: 'main_union' },
    { id: 'ball_pit', displayName: 'Ball Pit', type: 'recreation', position: [25, 0, -10], rotation: [0, 0, 0], radius: 8, interactionType: 'enter', musicZone: null, spawnPoint: null, enabled: true, districtId: 'main_union' },
    { id: 'river_lounge', displayName: 'River Lounge', type: 'water', position: [0, -0.5, 15], rotation: [0, 0, 0], radius: 25, interactionType: 'float', musicZone: 'river_ambience', spawnPoint: 'river_spawn', enabled: true, districtId: 'main_union' },
    { id: 'firepit_lounge', displayName: 'Firepit', type: 'lounge', position: [20, 0, 10], rotation: [0, 0, 0], radius: 7, interactionType: 'sit', musicZone: 'firepit_ambience', spawnPoint: null, enabled: true, districtId: 'main_union' },
    { id: 'portal_skyline', displayName: 'Skyline Portal', type: 'portal', position: [-30, 0, -35], rotation: [0, 0, 0], radius: 4, interactionType: 'portal', musicZone: null, spawnPoint: null, enabled: true, districtId: 'skyline' },
    { id: 'portal_pulse', displayName: 'Pulse Portal', type: 'portal', position: [30, 0, -35], rotation: [0, 0, 0], radius: 4, interactionType: 'portal', musicZone: null, spawnPoint: null, enabled: true, districtId: 'pulse' },
    { id: 'portal_arcade', displayName: 'Arcade Portal', type: 'portal', position: [0, 0, 30], rotation: [0, 0, 0], radius: 4, interactionType: 'portal', musicZone: null, spawnPoint: null, enabled: true, districtId: 'arcade' },
    { id: 'portal_throwback', displayName: '80s/90s Throwback Portal', type: 'portal', position: [15, 0, 28], rotation: [0, 0, 0], radius: 4, interactionType: 'portal', musicZone: null, spawnPoint: null, enabled: true, districtId: 'throwback_80s_90s' },
    { id: 'portal_secret', displayName: 'Mystique Portal', type: 'portal', position: [-15, 0, 28], rotation: [0, 0, 0], radius: 4, interactionType: 'portal', musicZone: null, spawnPoint: null, enabled: true, districtId: 'mystique' },
  ],

  // ─── Spawn Points ────────────────────────────────────────────────────────
  spawnPoints: [
    { id: 'main_union_spawn', position: [0, 0, 5], rotation: [0, 0, 0], zoneId: 'main_plaza', active: true },
    { id: 'main_plaza_spawn', position: [3, 0, 3], rotation: [0, 0, 0], zoneId: 'main_plaza', active: true },
    { id: 'main_stage_spawn', position: [0, 0, -25], rotation: [0, 0, 0], zoneId: 'main_stage', active: false },
    { id: 'cafe_spawn', position: [-22, 0, -8], rotation: [0, 0, 0], zoneId: 'cafe_terrace', active: false },
    { id: 'river_spawn', position: [5, -0.5, 15], rotation: [0, 0, 0], zoneId: 'river_lounge', active: false },
    { id: 'pulse_portal_spawn', position: [30, 0, -33], rotation: [0, 3.14, 0], zoneId: 'portal_pulse', active: false },
    { id: 'skyline_portal_spawn', position: [-30, 0, -33], rotation: [0, 3.14, 0], zoneId: 'portal_skyline', active: false },
    { id: 'arcade_portal_spawn', position: [0, 0, 28], rotation: [0, 3.14, 0], zoneId: 'portal_arcade', active: false },
    { id: 'throwback_portal_spawn', position: [15, 0, 26], rotation: [0, 3.14, 0], zoneId: 'portal_throwback', active: false },
    { id: 'secret_portal_spawn', position: [-15, 0, 26], rotation: [0, 3.14, 0], zoneId: 'portal_secret', active: false },
  ],

  // ─── Interactions (Part 6 Expanded) ─────────────────────────────────────
  interactions: [
    // Beanbag Lawn
    { id: 'beanbag_01', interactionType: 'sit', prompt: 'Sit', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [-14, 0, 4], zoneId: 'beanbag_lawn', enabled: true },
    { id: 'beanbag_02', interactionType: 'sit', prompt: 'Sit', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [-16, 0, 6], zoneId: 'beanbag_lawn', enabled: true },
    { id: 'beanbag_03', interactionType: 'sit', prompt: 'Sit', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [-13, 0, 7], zoneId: 'beanbag_lawn', enabled: true },
    { id: 'beanbag_04', interactionType: 'sit', prompt: 'Sit', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [-17, 0, 3], zoneId: 'beanbag_lawn', enabled: true },
    // Café Terrace
    { id: 'cafe_seat_01', interactionType: 'sit', prompt: 'Sit', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [-24, 0, -9], zoneId: 'cafe_terrace', enabled: true },
    { id: 'cafe_seat_02', interactionType: 'sit', prompt: 'Sit', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [-26, 0, -8], zoneId: 'cafe_terrace', enabled: true },
    { id: 'cafe_seat_03', interactionType: 'sit', prompt: 'Sit', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [-23, 0, -12], zoneId: 'cafe_terrace', enabled: true },
    { id: 'cafe_drink_01', interactionType: 'drink', prompt: 'Grab a drink', radius: 2, animation: 'drink', sound: null, cooldown: 5, position: [-26, 0, -10], zoneId: 'cafe_terrace', enabled: true },
    { id: 'cafe_drink_02', interactionType: 'drink', prompt: 'Grab a drink', radius: 2, animation: 'drink', sound: null, cooldown: 5, position: [-24, 0, -13], zoneId: 'cafe_terrace', enabled: true },
    // Swing Zone (Part 6: multiple swings)
    { id: 'swing_01', interactionType: 'swing', prompt: 'Swing', radius: 2, animation: 'swing', sound: null, cooldown: 0, position: [-21, 0, -20], zoneId: 'swing_zone', enabled: true },
    { id: 'swing_02', interactionType: 'swing', prompt: 'Swing', radius: 2, animation: 'swing', sound: null, cooldown: 0, position: [-19, 0, -20], zoneId: 'swing_zone', enabled: true },
    { id: 'swing_03', interactionType: 'swing', prompt: 'Swing', radius: 2, animation: 'swing', sound: null, cooldown: 0, position: [-20, 0, -22], zoneId: 'swing_zone', enabled: true },
    // Ball Pit
    { id: 'ball_pit_enter', interactionType: 'enter', prompt: 'Jump In!', radius: 3, animation: 'jump', sound: null, cooldown: 0, position: [25, 0, -7], zoneId: 'ball_pit', enabled: true },
    { id: 'ball_pit_exit', interactionType: 'exit', prompt: 'Climb Out', radius: 3, animation: null, sound: null, cooldown: 0, position: [25, 0, -13], zoneId: 'ball_pit', enabled: true },
    // Firepit
    { id: 'firepit_sit_01', interactionType: 'roast_marshmallow', prompt: 'Sit & Roast Marshmallow', radius: 2, animation: 'roast_marshmallow', sound: null, cooldown: 0, position: [19, 0, 9], zoneId: 'firepit_lounge', enabled: true },
    { id: 'firepit_sit_02', interactionType: 'roast_marshmallow', prompt: 'Sit & Roast Marshmallow', radius: 2, animation: 'roast_marshmallow', sound: null, cooldown: 0, position: [21, 0, 11], zoneId: 'firepit_lounge', enabled: true },
    { id: 'firepit_sit_03', interactionType: 'sit', prompt: 'Sit by Fire', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [22, 0, 9], zoneId: 'firepit_lounge', enabled: true },
    // Lazy River
    { id: 'river_enter', interactionType: 'enter', prompt: 'Enter River', radius: 3, animation: 'float', sound: null, cooldown: 0, position: [5, 0, 12], zoneId: 'river_lounge', enabled: true },
    // Main Stage (Part 6: dance area)
    { id: 'stage_dance', interactionType: 'dance', prompt: 'Dance', radius: 5, animation: 'dance', sound: null, cooldown: 0, position: [0, 0, -28], zoneId: 'main_stage', enabled: true },
    { id: 'stage_dance_left', interactionType: 'dance', prompt: 'Dance', radius: 4, animation: 'dance', sound: null, cooldown: 0, position: [-5, 0, -26], zoneId: 'main_stage', enabled: true },
    { id: 'stage_dance_right', interactionType: 'dance', prompt: 'Dance', radius: 4, animation: 'dance', sound: null, cooldown: 0, position: [5, 0, -26], zoneId: 'main_stage', enabled: true },
    // Information Kiosk (Part 6)
    { id: 'info_kiosk', interactionType: 'enter', prompt: 'Information', radius: 2.5, animation: null, sound: null, cooldown: 0, position: [-8, 0, 8], zoneId: 'main_plaza', enabled: true },
    // Photobooth
    { id: 'photobooth_main', interactionType: 'enter', prompt: 'Photobooth', radius: 3, animation: null, sound: null, cooldown: 0, position: [12, 0, -5], zoneId: 'main_plaza', enabled: true },
  ],

  // ─── NPCs (Part 6 Expanded) ──────────────────────────────────────────────
  npcs: [
    // Plaza — walkers, explorers, idlers
    { id: 'npc_plaza_01', displayName: null, position: [3, 0, -2], behavior: 'idle', zoneId: 'main_plaza', walkRadius: 5, walkSpeed: 1.5, enabled: true },
    { id: 'npc_plaza_02', displayName: null, position: [-4, 0, 1], behavior: 'walk', zoneId: 'main_plaza', walkRadius: 8, walkSpeed: 1.2, enabled: true },
    { id: 'npc_plaza_03', displayName: null, position: [6, 0, -5], behavior: 'walk', zoneId: 'main_plaza', walkRadius: 6, walkSpeed: 1.0, enabled: true },
    { id: 'npc_plaza_04', displayName: null, position: [-2, 0, -4], behavior: 'explore', zoneId: 'main_plaza', walkRadius: 15, walkSpeed: 1.3, enabled: true },
    { id: 'npc_plaza_05', displayName: null, position: [8, 0, 2], behavior: 'walk', zoneId: 'main_plaza', walkRadius: 10, walkSpeed: 1.1, enabled: true },
    // Main Stage — dancers, gatherers
    { id: 'npc_stage_01', displayName: null, position: [-3, 0, -28], behavior: 'dance', zoneId: 'main_stage', walkRadius: 3, walkSpeed: 0, enabled: true },
    { id: 'npc_stage_02', displayName: null, position: [2, 0, -27], behavior: 'dance', zoneId: 'main_stage', walkRadius: 3, walkSpeed: 0, enabled: true },
    { id: 'npc_stage_03', displayName: null, position: [-5, 0, -26], behavior: 'dance', zoneId: 'main_stage', walkRadius: 4, walkSpeed: 0, enabled: true },
    { id: 'npc_stage_04', displayName: null, position: [4, 0, -25], behavior: 'gather', zoneId: 'main_stage', walkRadius: 5, walkSpeed: 0.5, enabled: true },
    { id: 'npc_stage_05', displayName: null, position: [0, 0, -24], behavior: 'gather', zoneId: 'main_stage', walkRadius: 6, walkSpeed: 0.4, enabled: true },
    // Café — sitters, drinkers
    { id: 'npc_cafe_01', displayName: null, position: [-24, 0, -11], behavior: 'sit', zoneId: 'cafe_terrace', walkRadius: 0, walkSpeed: 0, enabled: true },
    { id: 'npc_cafe_02', displayName: null, position: [-26, 0, -9], behavior: 'sit', zoneId: 'cafe_terrace', walkRadius: 0, walkSpeed: 0, enabled: true },
    { id: 'npc_cafe_03', displayName: null, position: [-23, 0, -12], behavior: 'idle', zoneId: 'cafe_terrace', walkRadius: 3, walkSpeed: 0.8, enabled: true },
    // Beanbag Lawn — relaxing
    { id: 'npc_beanbag_01', displayName: null, position: [-15, 0, 5], behavior: 'sit', zoneId: 'beanbag_lawn', walkRadius: 0, walkSpeed: 0, enabled: true },
    { id: 'npc_beanbag_02', displayName: null, position: [-14, 0, 7], behavior: 'sit', zoneId: 'beanbag_lawn', walkRadius: 0, walkSpeed: 0, enabled: true },
    // Firepit — sitters, gatherers
    { id: 'npc_firepit_01', displayName: null, position: [21, 0, 11], behavior: 'sit', zoneId: 'firepit_lounge', walkRadius: 0, walkSpeed: 0, enabled: true },
    { id: 'npc_firepit_02', displayName: null, position: [19, 0, 10], behavior: 'sit', zoneId: 'firepit_lounge', walkRadius: 0, walkSpeed: 0, enabled: true },
    { id: 'npc_firepit_03', displayName: null, position: [20, 0, 12], behavior: 'gather', zoneId: 'firepit_lounge', walkRadius: 3, walkSpeed: 0.3, enabled: true },
    // River — idle observers
    { id: 'npc_river_01', displayName: null, position: [0, -0.3, 16], behavior: 'idle', zoneId: 'river_lounge', walkRadius: 0, walkSpeed: 0, enabled: true },
    { id: 'npc_river_02', displayName: null, position: [3, -0.3, 18], behavior: 'idle', zoneId: 'river_lounge', walkRadius: 4, walkSpeed: 0.6, enabled: true },
    // Ball Pit — players
    { id: 'npc_ballpit_01', displayName: null, position: [24, 0, -10], behavior: 'play', zoneId: 'ball_pit', walkRadius: 4, walkSpeed: 1.0, enabled: true },
    { id: 'npc_ballpit_02', displayName: null, position: [26, 0, -11], behavior: 'play', zoneId: 'ball_pit', walkRadius: 3, walkSpeed: 0.8, enabled: true },
    // Swing Zone — idle nearby
    { id: 'npc_swing_01', displayName: null, position: [-19, 0, -19], behavior: 'idle', zoneId: 'swing_zone', walkRadius: 2, walkSpeed: 0.5, enabled: true },
    // Explorers — wander between zones
    { id: 'npc_explorer_01', displayName: null, position: [0, 0, 0], behavior: 'explore', zoneId: 'main_plaza', walkRadius: 25, walkSpeed: 1.4, enabled: true },
    { id: 'npc_explorer_02', displayName: null, position: [10, 0, -5], behavior: 'explore', zoneId: 'main_plaza', walkRadius: 20, walkSpeed: 1.2, enabled: true },
  ],

  // ─── NPC Population Scaling (Part 6 Updated) ────────────────────────────
  npcPopulation: [
    { playerRange: [0, 0], npcCount: 20 },
    { playerRange: [1, 5], npcCount: 15 },
    { playerRange: [6, 15], npcCount: 10 },
    { playerRange: [16, 30], npcCount: 6 },
    { playerRange: [31, 60], npcCount: 3 },
    { playerRange: [61, 9999], npcCount: 1 },
  ],

  // ─── Audio Zones (Part 6 Expanded) ─────────────────────────────────────
  audioZones: [
    { id: 'main_plaza_music', zoneId: 'main_plaza', playlist: 'main_union_ambient', ambience: null, volume: 0.5, radius: 20, position: [0, 0, 0] },
    { id: 'main_stage_music', zoneId: 'main_stage', playlist: 'stage_playlist', ambience: null, volume: 0.7, radius: 15, position: [0, 0, -30] },
    { id: 'cafe_music', zoneId: 'cafe_terrace', playlist: 'cafe_chill', ambience: 'cafe_chatter', volume: 0.4, radius: 10, position: [-25, 0, -10] },
    { id: 'river_ambience', zoneId: 'river_lounge', playlist: 'poolside_chill', ambience: 'water_flowing', volume: 0.6, radius: 25, position: [0, -0.5, 15] },
    { id: 'firepit_ambience', zoneId: 'firepit_lounge', playlist: null, ambience: 'fire_crackling', volume: 0.5, radius: 7, position: [20, 0, 10] },
    { id: 'ball_pit_ambience', zoneId: 'ball_pit', playlist: null, ambience: 'playful_ambience', volume: 0.35, radius: 8, position: [25, 0, -10] },
    { id: 'swing_ambience', zoneId: 'swing_zone', playlist: null, ambience: 'outdoor_birds', volume: 0.25, radius: 6, position: [-20, 0, -20] },
    { id: 'beanbag_ambience', zoneId: 'beanbag_lawn', playlist: 'lofi_beats', ambience: null, volume: 0.3, radius: 8, position: [-15, 0, 5] },
  ],

  // ─── Wayfinding ──────────────────────────────────────────────────────────
  wayfinding: [
    { id: 'sign_main_stage', label: 'Main Stage', destination: 'main_stage', order: 1 },
    { id: 'sign_cafe', label: 'Café Terrace', destination: 'cafe_terrace', order: 2 },
    { id: 'sign_beanbag', label: 'Beanbag Lawn', destination: 'beanbag_lawn', order: 3 },
    { id: 'sign_river', label: 'River Lounge', destination: 'river_lounge', order: 4 },
    { id: 'sign_firepit', label: 'Firepit', destination: 'firepit_lounge', order: 5 },
    { id: 'sign_swing', label: 'Swing Zone', destination: 'swing_zone', order: 6 },
    { id: 'sign_ball_pit', label: 'Ball Pit', destination: 'ball_pit', order: 7 },
    { id: 'sign_portals', label: 'Portals', destination: 'portal_skyline', order: 8 },
  ],

  // ─── River Paths ─────────────────────────────────────────────────────────
  riverPaths: [
    {
      id: 'main_river',
      entryPoint: [5, -0.5, 12],
      exitPoint: [-5, -0.5, 20],
      pathPoints: [
        [5, -0.5, 12],
        [10, -0.5, 15],
        [12, -0.5, 20],
        [8, -0.5, 25],
        [0, -0.5, 27],
        [-8, -0.5, 25],
        [-12, -0.5, 20],
        [-10, -0.5, 15],
        [-5, -0.5, 12],
      ],
      speed: 2,
      width: 4,
    },
  ],
};
