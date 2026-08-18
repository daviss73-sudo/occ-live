/**
 * OCC Live - District Configurations (Part 8)
 * Full configurations for all five planned districts.
 * Each district is an extension of OCC Live, not a separate application.
 *
 * Districts:
 * 1. Skyline — Rooftop lounge with city views, sunset vibes
 * 2. Pulse — High-energy dance/music district
 * 3. Arcade — Retro gaming, neon, mini-games
 * 4. 80s/90s Throwback — Retro nostalgia zone
 * 5. Mystique — Mysterious, surreal exploration space
 *
 * Design rules:
 * - Players retain avatar, clothing variation, and anonymous session
 * - Each district supports configurable music, NPC, activities, lighting
 * - Districts can be disabled or opened on a configured date
 * - Players always have a clear route back to Main Union
 * - Assets are lazy-loaded on entry
 * - No identifying information is requested or displayed
 */

import type {
  DistrictConfig,
  AssetEntry,
  ZoneConfig,
  InteractionConfig,
  SpawnPointConfig,
  AudioZoneConfig,
  NPCConfig,
  NPCPopulationConfig,
  WayfindingEntry,
  DistrictLightingPreset,
} from '../types/index.ts';

// ─── Lighting Presets ────────────────────────────────────────────────────────

const SKYLINE_LIGHTING: DistrictLightingPreset = {
  ambientColor: 0xffd4a0,
  ambientIntensity: 0.5,
  directionalColor: 0xff8c40,
  directionalIntensity: 1.8,
  directionalPosition: [-20, 15, -5],
  fogColor: 0x1a1040,
  fogNear: 40,
  fogFar: 120,
  skyTopColor: 0x0d0020,
  skyBottomColor: 0xff6b35,
};

const PULSE_LIGHTING: DistrictLightingPreset = {
  ambientColor: 0x220044,
  ambientIntensity: 0.3,
  directionalColor: 0xff00ff,
  directionalIntensity: 0.8,
  directionalPosition: [0, 20, 0],
  fogColor: 0x110022,
  fogNear: 20,
  fogFar: 80,
  skyTopColor: 0x000011,
  skyBottomColor: 0x220044,
};

const ARCADE_LIGHTING: DistrictLightingPreset = {
  ambientColor: 0x001133,
  ambientIntensity: 0.4,
  directionalColor: 0x00ffcc,
  directionalIntensity: 0.6,
  directionalPosition: [10, 15, 10],
  fogColor: 0x000a1a,
  fogNear: 30,
  fogFar: 90,
  skyTopColor: 0x000511,
  skyBottomColor: 0x001a33,
};

const THROWBACK_LIGHTING: DistrictLightingPreset = {
  ambientColor: 0xffcc88,
  ambientIntensity: 0.6,
  directionalColor: 0xffaa44,
  directionalIntensity: 1.2,
  directionalPosition: [-15, 20, 10],
  fogColor: 0x2a1a0a,
  fogNear: 50,
  fogFar: 130,
  skyTopColor: 0x1a0a2e,
  skyBottomColor: 0xff8844,
};

const MYSTIQUE_LIGHTING: DistrictLightingPreset = {
  ambientColor: 0x223355,
  ambientIntensity: 0.35,
  directionalColor: 0x8866ff,
  directionalIntensity: 0.7,
  directionalPosition: [0, 25, -10],
  fogColor: 0x0a0a20,
  fogNear: 15,
  fogFar: 70,
  skyTopColor: 0x050510,
  skyBottomColor: 0x221144,
};

// ─── District: Skyline ───────────────────────────────────────────────────────
// Rooftop lounge above the city. Golden hour sunset, chill vibes,
// seating areas with views, ambient jazz/lo-fi, observation deck.

const skylineZones: ZoneConfig[] = [
  { id: 'skyline_terrace', displayName: 'Rooftop Terrace', type: 'plaza', position: [0, 0, 0], rotation: [0, 0, 0], radius: 18, interactionType: 'none', musicZone: 'skyline_ambient', spawnPoint: 'skyline_spawn', enabled: true, districtId: 'skyline' },
  { id: 'skyline_lounge', displayName: 'Sky Lounge', type: 'lounge', position: [-12, 0, -8], rotation: [0, 0, 0], radius: 8, interactionType: 'sit', musicZone: 'skyline_lounge_music', spawnPoint: null, enabled: true, districtId: 'skyline' },
  { id: 'skyline_bar', displayName: 'Sunset Bar', type: 'cafe', position: [10, 0, -5], rotation: [0, 0, 0], radius: 6, interactionType: 'drink', musicZone: 'skyline_bar_music', spawnPoint: null, enabled: true, districtId: 'skyline' },
  { id: 'skyline_observation', displayName: 'Observation Deck', type: 'relaxation', position: [0, 2, -18], rotation: [0, 0, 0], radius: 10, interactionType: 'none', musicZone: null, spawnPoint: null, enabled: true, districtId: 'skyline' },
  { id: 'skyline_dance', displayName: 'Rooftop Dance Floor', type: 'stage', position: [8, 0, 10], rotation: [0, 0, 0], radius: 7, interactionType: 'dance', musicZone: 'skyline_dance_music', spawnPoint: null, enabled: true, districtId: 'skyline' },
];

const skylineInteractions: InteractionConfig[] = [
  { id: 'skyline_seat_01', interactionType: 'sit', prompt: 'Sit', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [-13, 0, -7], zoneId: 'skyline_lounge', enabled: true },
  { id: 'skyline_seat_02', interactionType: 'sit', prompt: 'Sit', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [-11, 0, -9], zoneId: 'skyline_lounge', enabled: true },
  { id: 'skyline_seat_03', interactionType: 'sit', prompt: 'Sit', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [-14, 0, -6], zoneId: 'skyline_lounge', enabled: true },
  { id: 'skyline_drink_01', interactionType: 'drink', prompt: 'Grab a drink', radius: 2, animation: 'drink', sound: null, cooldown: 5, position: [10, 0, -4], zoneId: 'skyline_bar', enabled: true },
  { id: 'skyline_drink_02', interactionType: 'drink', prompt: 'Grab a drink', radius: 2, animation: 'drink', sound: null, cooldown: 5, position: [11, 0, -6], zoneId: 'skyline_bar', enabled: true },
  { id: 'skyline_dance_01', interactionType: 'dance', prompt: 'Dance', radius: 4, animation: 'dance', sound: null, cooldown: 0, position: [8, 0, 10], zoneId: 'skyline_dance', enabled: true },
  { id: 'skyline_observation_seat', interactionType: 'sit', prompt: 'Enjoy the view', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [0, 2, -16], zoneId: 'skyline_observation', enabled: true },
];

const skylineNPCs: NPCConfig[] = [
  { id: 'skyline_npc_01', displayName: null, position: [-10, 0, -7], behavior: 'sit', zoneId: 'skyline_lounge', walkRadius: 0, walkSpeed: 0, enabled: true },
  { id: 'skyline_npc_02', displayName: null, position: [9, 0, -5], behavior: 'idle', zoneId: 'skyline_bar', walkRadius: 3, walkSpeed: 0.8, enabled: true },
  { id: 'skyline_npc_03', displayName: null, position: [7, 0, 9], behavior: 'dance', zoneId: 'skyline_dance', walkRadius: 3, walkSpeed: 0, enabled: true },
  { id: 'skyline_npc_04', displayName: null, position: [2, 2, -17], behavior: 'idle', zoneId: 'skyline_observation', walkRadius: 4, walkSpeed: 0.5, enabled: true },
  { id: 'skyline_npc_05', displayName: null, position: [-5, 0, 3], behavior: 'walk', zoneId: 'skyline_terrace', walkRadius: 10, walkSpeed: 1.2, enabled: true },
  { id: 'skyline_npc_06', displayName: null, position: [4, 0, -2], behavior: 'explore', zoneId: 'skyline_terrace', walkRadius: 12, walkSpeed: 1.0, enabled: true },
];

const skylineAudioZones: AudioZoneConfig[] = [
  { id: 'skyline_ambient', zoneId: 'skyline_terrace', playlist: 'skyline_sunset_jazz', ambience: 'city_distant', volume: 0.5, radius: 18, position: [0, 0, 0] },
  { id: 'skyline_lounge_music', zoneId: 'skyline_lounge', playlist: 'lofi_beats', ambience: null, volume: 0.4, radius: 8, position: [-12, 0, -8] },
  { id: 'skyline_bar_music', zoneId: 'skyline_bar', playlist: 'cocktail_jazz', ambience: 'glasses_clinking', volume: 0.45, radius: 6, position: [10, 0, -5] },
  { id: 'skyline_dance_music', zoneId: 'skyline_dance', playlist: 'rooftop_house', ambience: null, volume: 0.65, radius: 7, position: [8, 0, 10] },
];

const skylineAssets: AssetEntry[] = [
  { id: 'skyline_terrace_floor', type: 'architecture', file: '/assets/world/skyline/architecture/terrace-floor.glb', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'skyline_terrace', enabled: true },
  { id: 'skyline_railing', type: 'architecture', file: '/assets/world/skyline/architecture/railing.glb', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
  { id: 'skyline_lounge_furniture', type: 'furniture', file: '/assets/world/skyline/furniture/lounge-seating.glb', position: [-12, 0, -8], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'skyline_lounge', enabled: true },
  { id: 'skyline_bar_counter', type: 'furniture', file: '/assets/world/skyline/furniture/bar-counter.glb', position: [10, 0, -5], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'skyline_bar', enabled: true },
  { id: 'skyline_dance_floor', type: 'recreation', file: '/assets/world/skyline/recreation/dance-floor.glb', position: [8, 0, 10], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'skyline_dance', enabled: true },
  { id: 'skyline_observation_platform', type: 'architecture', file: '/assets/world/skyline/architecture/observation-deck.glb', position: [0, 2, -18], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'skyline_observation', enabled: true },
  { id: 'skyline_city_backdrop', type: 'props', file: '/assets/world/skyline/props/city-skyline.glb', position: [0, -10, -50], rotation: [0, 0, 0], scale: [3, 3, 3], enabled: true },
  { id: 'skyline_string_lights', type: 'lighting', file: '/assets/world/skyline/lighting/string-lights.glb', position: [0, 4, 0], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
];

const skylineSpawnPoints: SpawnPointConfig[] = [
  { id: 'skyline_spawn', position: [0, 0, 12], rotation: [0, 3.14, 0], zoneId: 'skyline_terrace', active: true },
  { id: 'skyline_lounge_spawn', position: [-10, 0, -6], rotation: [0, 0.5, 0], zoneId: 'skyline_lounge', active: false },
];

const skylineWayfinding: WayfindingEntry[] = [
  { id: 'skyline_sign_lounge', label: 'Sky Lounge', destination: 'skyline_lounge', order: 1 },
  { id: 'skyline_sign_bar', label: 'Sunset Bar', destination: 'skyline_bar', order: 2 },
  { id: 'skyline_sign_dance', label: 'Rooftop Dance', destination: 'skyline_dance', order: 3 },
  { id: 'skyline_sign_observation', label: 'Observation Deck', destination: 'skyline_observation', order: 4 },
  { id: 'skyline_sign_return', label: 'Main Union', destination: 'main_union', order: 5 },
];

// ─── District: Pulse ─────────────────────────────────────────────────────────
// High-energy nightclub/music district. Deep purple/magenta lighting,
// multiple dance floors, DJ booth, VIP area, laser effects.

const pulseZones: ZoneConfig[] = [
  { id: 'pulse_main_floor', displayName: 'Main Floor', type: 'stage', position: [0, 0, 0], rotation: [0, 0, 0], radius: 20, interactionType: 'dance', musicZone: 'pulse_main_music', spawnPoint: 'pulse_spawn', enabled: true, districtId: 'pulse' },
  { id: 'pulse_dj_booth', displayName: 'DJ Booth', type: 'stage', position: [0, 2, -15], rotation: [0, 0, 0], radius: 6, interactionType: 'none', musicZone: 'pulse_dj_music', spawnPoint: null, enabled: true, districtId: 'pulse' },
  { id: 'pulse_vip', displayName: 'VIP Lounge', type: 'lounge', position: [-15, 1, -10], rotation: [0, 0, 0], radius: 8, interactionType: 'sit', musicZone: 'pulse_vip_music', spawnPoint: null, enabled: true, districtId: 'pulse' },
  { id: 'pulse_bar', displayName: 'Neon Bar', type: 'cafe', position: [14, 0, -8], rotation: [0, 0, 0], radius: 6, interactionType: 'drink', musicZone: null, spawnPoint: null, enabled: true, districtId: 'pulse' },
  { id: 'pulse_side_floor', displayName: 'Side Room', type: 'stage', position: [12, 0, 10], rotation: [0, 0, 0], radius: 8, interactionType: 'dance', musicZone: 'pulse_side_music', spawnPoint: null, enabled: true, districtId: 'pulse' },
];

const pulseInteractions: InteractionConfig[] = [
  { id: 'pulse_dance_01', interactionType: 'dance', prompt: 'Dance', radius: 5, animation: 'dance', sound: null, cooldown: 0, position: [0, 0, 0], zoneId: 'pulse_main_floor', enabled: true },
  { id: 'pulse_dance_02', interactionType: 'dance', prompt: 'Dance', radius: 4, animation: 'dance', sound: null, cooldown: 0, position: [-6, 0, 4], zoneId: 'pulse_main_floor', enabled: true },
  { id: 'pulse_dance_03', interactionType: 'dance', prompt: 'Dance', radius: 4, animation: 'dance', sound: null, cooldown: 0, position: [6, 0, 4], zoneId: 'pulse_main_floor', enabled: true },
  { id: 'pulse_side_dance', interactionType: 'dance', prompt: 'Dance', radius: 4, animation: 'dance', sound: null, cooldown: 0, position: [12, 0, 10], zoneId: 'pulse_side_floor', enabled: true },
  { id: 'pulse_vip_seat_01', interactionType: 'sit', prompt: 'Sit', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [-16, 1, -9], zoneId: 'pulse_vip', enabled: true },
  { id: 'pulse_vip_seat_02', interactionType: 'sit', prompt: 'Sit', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [-14, 1, -11], zoneId: 'pulse_vip', enabled: true },
  { id: 'pulse_drink_01', interactionType: 'drink', prompt: 'Get a drink', radius: 2, animation: 'drink', sound: null, cooldown: 5, position: [14, 0, -7], zoneId: 'pulse_bar', enabled: true },
  { id: 'pulse_drink_02', interactionType: 'drink', prompt: 'Get a drink', radius: 2, animation: 'drink', sound: null, cooldown: 5, position: [15, 0, -9], zoneId: 'pulse_bar', enabled: true },
];

const pulseNPCs: NPCConfig[] = [
  { id: 'pulse_npc_01', displayName: null, position: [-3, 0, 2], behavior: 'dance', zoneId: 'pulse_main_floor', walkRadius: 4, walkSpeed: 0, enabled: true },
  { id: 'pulse_npc_02', displayName: null, position: [4, 0, -3], behavior: 'dance', zoneId: 'pulse_main_floor', walkRadius: 4, walkSpeed: 0, enabled: true },
  { id: 'pulse_npc_03', displayName: null, position: [-7, 0, 5], behavior: 'dance', zoneId: 'pulse_main_floor', walkRadius: 3, walkSpeed: 0, enabled: true },
  { id: 'pulse_npc_04', displayName: null, position: [2, 0, 6], behavior: 'dance', zoneId: 'pulse_main_floor', walkRadius: 5, walkSpeed: 0, enabled: true },
  { id: 'pulse_npc_05', displayName: null, position: [-15, 1, -9], behavior: 'sit', zoneId: 'pulse_vip', walkRadius: 0, walkSpeed: 0, enabled: true },
  { id: 'pulse_npc_06', displayName: null, position: [13, 0, -8], behavior: 'idle', zoneId: 'pulse_bar', walkRadius: 3, walkSpeed: 0.6, enabled: true },
  { id: 'pulse_npc_07', displayName: null, position: [11, 0, 9], behavior: 'dance', zoneId: 'pulse_side_floor', walkRadius: 3, walkSpeed: 0, enabled: true },
  { id: 'pulse_npc_08', displayName: null, position: [0, 0, -5], behavior: 'gather', zoneId: 'pulse_main_floor', walkRadius: 8, walkSpeed: 0.5, enabled: true },
];

const pulseAudioZones: AudioZoneConfig[] = [
  { id: 'pulse_main_music', zoneId: 'pulse_main_floor', playlist: 'pulse_edm', ambience: 'crowd_energy', volume: 0.8, radius: 20, position: [0, 0, 0] },
  { id: 'pulse_dj_music', zoneId: 'pulse_dj_booth', playlist: 'pulse_edm', ambience: null, volume: 0.9, radius: 6, position: [0, 2, -15] },
  { id: 'pulse_vip_music', zoneId: 'pulse_vip', playlist: 'pulse_chill', ambience: null, volume: 0.5, radius: 8, position: [-15, 1, -10] },
  { id: 'pulse_side_music', zoneId: 'pulse_side_floor', playlist: 'pulse_house', ambience: null, volume: 0.7, radius: 8, position: [12, 0, 10] },
];

const pulseAssets: AssetEntry[] = [
  { id: 'pulse_main_floor_geo', type: 'architecture', file: '/assets/world/pulse/architecture/main-floor.glb', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'pulse_main_floor', enabled: true },
  { id: 'pulse_dj_booth_geo', type: 'architecture', file: '/assets/world/pulse/architecture/dj-booth.glb', position: [0, 2, -15], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'pulse_dj_booth', enabled: true },
  { id: 'pulse_vip_area', type: 'furniture', file: '/assets/world/pulse/furniture/vip-seating.glb', position: [-15, 1, -10], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'pulse_vip', enabled: true },
  { id: 'pulse_bar_counter', type: 'furniture', file: '/assets/world/pulse/furniture/neon-bar.glb', position: [14, 0, -8], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'pulse_bar', enabled: true },
  { id: 'pulse_laser_rig', type: 'lighting', file: '/assets/world/pulse/lighting/laser-rig.glb', position: [0, 6, -10], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
  { id: 'pulse_neon_walls', type: 'lighting', file: '/assets/world/pulse/lighting/neon-walls.glb', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
  { id: 'pulse_speakers', type: 'props', file: '/assets/world/pulse/props/speakers.glb', position: [0, 3, -14], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
];

const pulseSpawnPoints: SpawnPointConfig[] = [
  { id: 'pulse_spawn', position: [0, 0, 15], rotation: [0, 3.14, 0], zoneId: 'pulse_main_floor', active: true },
];

// ─── District: Arcade ────────────────────────────────────────────────────────
// Retro gaming district. Neon green/cyan lighting, arcade cabinets,
// mini-games, prize corner, multiplayer game tables.

const arcadeZones: ZoneConfig[] = [
  { id: 'arcade_floor', displayName: 'Arcade Floor', type: 'plaza', position: [0, 0, 0], rotation: [0, 0, 0], radius: 22, interactionType: 'none', musicZone: 'arcade_ambient', spawnPoint: 'arcade_spawn', enabled: true, districtId: 'arcade' },
  { id: 'arcade_cabinets', displayName: 'Classic Cabinets', type: 'recreation', position: [-10, 0, -8], rotation: [0, 0, 0], radius: 8, interactionType: 'play', musicZone: null, spawnPoint: null, enabled: true, districtId: 'arcade' },
  { id: 'arcade_multiplayer', displayName: 'Multiplayer Zone', type: 'recreation', position: [10, 0, -5], rotation: [0, 0, 0], radius: 8, interactionType: 'play', musicZone: null, spawnPoint: null, enabled: true, districtId: 'arcade' },
  { id: 'arcade_lounge', displayName: 'Gamer Lounge', type: 'lounge', position: [0, 0, 12], rotation: [0, 0, 0], radius: 7, interactionType: 'sit', musicZone: 'arcade_lounge_music', spawnPoint: null, enabled: true, districtId: 'arcade' },
  { id: 'arcade_snack_bar', displayName: 'Snack Bar', type: 'cafe', position: [-12, 0, 8], rotation: [0, 0, 0], radius: 5, interactionType: 'drink', musicZone: null, spawnPoint: null, enabled: true, districtId: 'arcade' },
];

const arcadeInteractions: InteractionConfig[] = [
  { id: 'arcade_cabinet_01', interactionType: 'play', prompt: 'Play', radius: 2, animation: 'idle', sound: null, cooldown: 0, position: [-12, 0, -7], zoneId: 'arcade_cabinets', enabled: true },
  { id: 'arcade_cabinet_02', interactionType: 'play', prompt: 'Play', radius: 2, animation: 'idle', sound: null, cooldown: 0, position: [-10, 0, -9], zoneId: 'arcade_cabinets', enabled: true },
  { id: 'arcade_cabinet_03', interactionType: 'play', prompt: 'Play', radius: 2, animation: 'idle', sound: null, cooldown: 0, position: [-8, 0, -7], zoneId: 'arcade_cabinets', enabled: true },
  { id: 'arcade_mp_table_01', interactionType: 'play', prompt: 'Join Game', radius: 2.5, animation: 'idle', sound: null, cooldown: 0, position: [9, 0, -4], zoneId: 'arcade_multiplayer', enabled: true },
  { id: 'arcade_mp_table_02', interactionType: 'play', prompt: 'Join Game', radius: 2.5, animation: 'idle', sound: null, cooldown: 0, position: [11, 0, -6], zoneId: 'arcade_multiplayer', enabled: true },
  { id: 'arcade_lounge_seat_01', interactionType: 'sit', prompt: 'Sit', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [-1, 0, 11], zoneId: 'arcade_lounge', enabled: true },
  { id: 'arcade_lounge_seat_02', interactionType: 'sit', prompt: 'Sit', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [1, 0, 13], zoneId: 'arcade_lounge', enabled: true },
  { id: 'arcade_snack_01', interactionType: 'drink', prompt: 'Grab a snack', radius: 2, animation: 'drink', sound: null, cooldown: 5, position: [-12, 0, 8], zoneId: 'arcade_snack_bar', enabled: true },
];

const arcadeNPCs: NPCConfig[] = [
  { id: 'arcade_npc_01', displayName: null, position: [-11, 0, -8], behavior: 'idle', zoneId: 'arcade_cabinets', walkRadius: 2, walkSpeed: 0.3, enabled: true },
  { id: 'arcade_npc_02', displayName: null, position: [-9, 0, -7], behavior: 'play', zoneId: 'arcade_cabinets', walkRadius: 3, walkSpeed: 0.5, enabled: true },
  { id: 'arcade_npc_03', displayName: null, position: [10, 0, -5], behavior: 'idle', zoneId: 'arcade_multiplayer', walkRadius: 3, walkSpeed: 0.4, enabled: true },
  { id: 'arcade_npc_04', displayName: null, position: [0, 0, 12], behavior: 'sit', zoneId: 'arcade_lounge', walkRadius: 0, walkSpeed: 0, enabled: true },
  { id: 'arcade_npc_05', displayName: null, position: [5, 0, 3], behavior: 'walk', zoneId: 'arcade_floor', walkRadius: 10, walkSpeed: 1.0, enabled: true },
  { id: 'arcade_npc_06', displayName: null, position: [-5, 0, 5], behavior: 'explore', zoneId: 'arcade_floor', walkRadius: 15, walkSpeed: 1.2, enabled: true },
];

const arcadeAudioZones: AudioZoneConfig[] = [
  { id: 'arcade_ambient', zoneId: 'arcade_floor', playlist: 'retro_chiptune', ambience: 'arcade_sfx', volume: 0.55, radius: 22, position: [0, 0, 0] },
  { id: 'arcade_lounge_music', zoneId: 'arcade_lounge', playlist: 'synthwave_chill', ambience: null, volume: 0.4, radius: 7, position: [0, 0, 12] },
];

const arcadeAssets: AssetEntry[] = [
  { id: 'arcade_floor_geo', type: 'architecture', file: '/assets/world/arcade/architecture/floor.glb', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'arcade_floor', enabled: true },
  { id: 'arcade_cabinets_row', type: 'recreation', file: '/assets/world/arcade/recreation/cabinet-row.glb', position: [-10, 0, -8], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'arcade_cabinets', enabled: true },
  { id: 'arcade_mp_tables', type: 'recreation', file: '/assets/world/arcade/recreation/game-tables.glb', position: [10, 0, -5], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'arcade_multiplayer', enabled: true },
  { id: 'arcade_neon_signs', type: 'lighting', file: '/assets/world/arcade/lighting/neon-signs.glb', position: [0, 3, 0], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
  { id: 'arcade_lounge_furniture', type: 'furniture', file: '/assets/world/arcade/furniture/gaming-couches.glb', position: [0, 0, 12], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'arcade_lounge', enabled: true },
  { id: 'arcade_snack_counter', type: 'furniture', file: '/assets/world/arcade/furniture/snack-counter.glb', position: [-12, 0, 8], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'arcade_snack_bar', enabled: true },
  { id: 'arcade_carpet', type: 'props', file: '/assets/world/arcade/props/retro-carpet.glb', position: [0, -0.01, 0], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
];

const arcadeSpawnPoints: SpawnPointConfig[] = [
  { id: 'arcade_spawn', position: [0, 0, 18], rotation: [0, 3.14, 0], zoneId: 'arcade_floor', active: true },
];

// ─── District: 80s/90s Throwback ─────────────────────────────────────────────
// Nostalgia zone. Warm amber/orange lighting, roller rink,
// photo booth with vintage backdrops, jukebox, diner seating.

const throwbackZones: ZoneConfig[] = [
  { id: 'throwback_main', displayName: 'Throwback Square', type: 'plaza', position: [0, 0, 0], rotation: [0, 0, 0], radius: 20, interactionType: 'none', musicZone: 'throwback_ambient', spawnPoint: 'throwback_spawn', enabled: true, districtId: 'throwback_80s_90s' },
  { id: 'throwback_roller_rink', displayName: 'Roller Rink', type: 'recreation', position: [0, 0, -15], rotation: [0, 0, 0], radius: 12, interactionType: 'dance', musicZone: 'throwback_rink_music', spawnPoint: null, enabled: true, districtId: 'throwback_80s_90s' },
  { id: 'throwback_diner', displayName: 'Retro Diner', type: 'cafe', position: [-15, 0, 5], rotation: [0, 0, 0], radius: 8, interactionType: 'sit', musicZone: 'throwback_diner_music', spawnPoint: null, enabled: true, districtId: 'throwback_80s_90s' },
  { id: 'throwback_photobooth', displayName: 'Vintage Photobooth', type: 'activity', position: [14, 0, 5], rotation: [0, 0, 0], radius: 4, interactionType: 'enter', musicZone: null, spawnPoint: null, enabled: true, districtId: 'throwback_80s_90s' },
  { id: 'throwback_jukebox', displayName: 'Jukebox Corner', type: 'lounge', position: [10, 0, -5], rotation: [0, 0, 0], radius: 5, interactionType: 'none', musicZone: 'throwback_jukebox_music', spawnPoint: null, enabled: true, districtId: 'throwback_80s_90s' },
];

const throwbackInteractions: InteractionConfig[] = [
  { id: 'throwback_skate_01', interactionType: 'dance', prompt: 'Skate', radius: 5, animation: 'dance', sound: null, cooldown: 0, position: [0, 0, -15], zoneId: 'throwback_roller_rink', enabled: true },
  { id: 'throwback_skate_02', interactionType: 'dance', prompt: 'Skate', radius: 4, animation: 'dance', sound: null, cooldown: 0, position: [-4, 0, -13], zoneId: 'throwback_roller_rink', enabled: true },
  { id: 'throwback_diner_seat_01', interactionType: 'sit', prompt: 'Sit at booth', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [-16, 0, 4], zoneId: 'throwback_diner', enabled: true },
  { id: 'throwback_diner_seat_02', interactionType: 'sit', prompt: 'Sit at booth', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [-14, 0, 6], zoneId: 'throwback_diner', enabled: true },
  { id: 'throwback_diner_drink', interactionType: 'drink', prompt: 'Order a milkshake', radius: 2, animation: 'drink', sound: null, cooldown: 5, position: [-15, 0, 7], zoneId: 'throwback_diner', enabled: true },
  { id: 'throwback_photobooth_enter', interactionType: 'enter', prompt: 'Photobooth', radius: 3, animation: null, sound: null, cooldown: 0, position: [14, 0, 5], zoneId: 'throwback_photobooth', enabled: true },
];

const throwbackNPCs: NPCConfig[] = [
  { id: 'throwback_npc_01', displayName: null, position: [-2, 0, -14], behavior: 'dance', zoneId: 'throwback_roller_rink', walkRadius: 6, walkSpeed: 0, enabled: true },
  { id: 'throwback_npc_02', displayName: null, position: [3, 0, -16], behavior: 'dance', zoneId: 'throwback_roller_rink', walkRadius: 5, walkSpeed: 0, enabled: true },
  { id: 'throwback_npc_03', displayName: null, position: [-15, 0, 5], behavior: 'sit', zoneId: 'throwback_diner', walkRadius: 0, walkSpeed: 0, enabled: true },
  { id: 'throwback_npc_04', displayName: null, position: [-13, 0, 6], behavior: 'idle', zoneId: 'throwback_diner', walkRadius: 3, walkSpeed: 0.5, enabled: true },
  { id: 'throwback_npc_05', displayName: null, position: [5, 0, 2], behavior: 'walk', zoneId: 'throwback_main', walkRadius: 12, walkSpeed: 1.1, enabled: true },
  { id: 'throwback_npc_06', displayName: null, position: [9, 0, -4], behavior: 'idle', zoneId: 'throwback_jukebox', walkRadius: 2, walkSpeed: 0.3, enabled: true },
];

const throwbackAudioZones: AudioZoneConfig[] = [
  { id: 'throwback_ambient', zoneId: 'throwback_main', playlist: 'retro_80s_90s_mix', ambience: null, volume: 0.5, radius: 20, position: [0, 0, 0] },
  { id: 'throwback_rink_music', zoneId: 'throwback_roller_rink', playlist: 'roller_rink_hits', ambience: 'skate_wheels', volume: 0.65, radius: 12, position: [0, 0, -15] },
  { id: 'throwback_diner_music', zoneId: 'throwback_diner', playlist: 'diner_jukebox', ambience: 'diner_chatter', volume: 0.4, radius: 8, position: [-15, 0, 5] },
  { id: 'throwback_jukebox_music', zoneId: 'throwback_jukebox', playlist: 'retro_80s_90s_mix', ambience: null, volume: 0.55, radius: 5, position: [10, 0, -5] },
];

const throwbackAssets: AssetEntry[] = [
  { id: 'throwback_square_geo', type: 'architecture', file: '/assets/world/throwback/architecture/square.glb', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'throwback_main', enabled: true },
  { id: 'throwback_rink_geo', type: 'recreation', file: '/assets/world/throwback/recreation/roller-rink.glb', position: [0, 0, -15], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'throwback_roller_rink', enabled: true },
  { id: 'throwback_diner_geo', type: 'architecture', file: '/assets/world/throwback/architecture/retro-diner.glb', position: [-15, 0, 5], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'throwback_diner', enabled: true },
  { id: 'throwback_photobooth_geo', type: 'recreation', file: '/assets/world/throwback/recreation/vintage-photobooth.glb', position: [14, 0, 5], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'throwback_photobooth', enabled: true },
  { id: 'throwback_jukebox_geo', type: 'props', file: '/assets/world/throwback/props/jukebox.glb', position: [10, 0, -5], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'throwback_jukebox', enabled: true },
  { id: 'throwback_neon_signs', type: 'lighting', file: '/assets/world/throwback/lighting/retro-neon.glb', position: [0, 4, 0], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
  { id: 'throwback_disco_ball', type: 'lighting', file: '/assets/world/throwback/lighting/disco-ball.glb', position: [0, 5, -15], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
];

const throwbackSpawnPoints: SpawnPointConfig[] = [
  { id: 'throwback_spawn', position: [0, 0, 16], rotation: [0, 3.14, 0], zoneId: 'throwback_main', active: true },
];

// ─── District: Mystique ──────────────────────────────────────────────────────
// Mysterious, surreal exploration space. Deep purple/indigo lighting,
// floating platforms, crystal caves, ambient whispers, hidden paths.

const mystiqueZones: ZoneConfig[] = [
  { id: 'mystique_entrance', displayName: 'Mystic Gateway', type: 'plaza', position: [0, 0, 0], rotation: [0, 0, 0], radius: 12, interactionType: 'none', musicZone: 'mystique_ambient', spawnPoint: 'mystique_spawn', enabled: true, districtId: 'mystique' },
  { id: 'mystique_crystal_cave', displayName: 'Crystal Cave', type: 'relaxation', position: [-12, -2, -15], rotation: [0, 0, 0], radius: 10, interactionType: 'none', musicZone: 'mystique_cave_music', spawnPoint: null, enabled: true, districtId: 'mystique' },
  { id: 'mystique_floating_garden', displayName: 'Floating Garden', type: 'relaxation', position: [10, 3, -12], rotation: [0, 0, 0], radius: 8, interactionType: 'sit', musicZone: 'mystique_garden_music', spawnPoint: null, enabled: true, districtId: 'mystique' },
  { id: 'mystique_mirror_pool', displayName: 'Mirror Pool', type: 'water', position: [0, -0.5, -25], rotation: [0, 0, 0], radius: 8, interactionType: 'none', musicZone: 'mystique_pool_music', spawnPoint: null, enabled: true, districtId: 'mystique' },
  { id: 'mystique_observatory', displayName: 'Star Observatory', type: 'relaxation', position: [0, 8, -35], rotation: [0, 0, 0], radius: 6, interactionType: 'sit', musicZone: 'mystique_observatory_music', spawnPoint: null, enabled: true, districtId: 'mystique' },
];

const mystiqueInteractions: InteractionConfig[] = [
  { id: 'mystique_sit_crystal', interactionType: 'sit', prompt: 'Sit on crystal', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [-10, -2, -14], zoneId: 'mystique_crystal_cave', enabled: true },
  { id: 'mystique_sit_garden_01', interactionType: 'sit', prompt: 'Rest', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [9, 3, -11], zoneId: 'mystique_floating_garden', enabled: true },
  { id: 'mystique_sit_garden_02', interactionType: 'sit', prompt: 'Rest', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [11, 3, -13], zoneId: 'mystique_floating_garden', enabled: true },
  { id: 'mystique_observatory_seat', interactionType: 'sit', prompt: 'Stargaze', radius: 2, animation: 'sit', sound: null, cooldown: 0, position: [0, 8, -34], zoneId: 'mystique_observatory', enabled: true },
  { id: 'mystique_emote_spot', interactionType: 'emote', prompt: 'Meditate', radius: 3, animation: 'sit', sound: null, cooldown: 0, position: [0, -0.3, -24], zoneId: 'mystique_mirror_pool', enabled: true },
];

const mystiqueNPCs: NPCConfig[] = [
  { id: 'mystique_npc_01', displayName: null, position: [-3, 0, -3], behavior: 'walk', zoneId: 'mystique_entrance', walkRadius: 8, walkSpeed: 0.7, enabled: true },
  { id: 'mystique_npc_02', displayName: null, position: [-11, -2, -16], behavior: 'idle', zoneId: 'mystique_crystal_cave', walkRadius: 4, walkSpeed: 0.4, enabled: true },
  { id: 'mystique_npc_03', displayName: null, position: [10, 3, -11], behavior: 'sit', zoneId: 'mystique_floating_garden', walkRadius: 0, walkSpeed: 0, enabled: true },
  { id: 'mystique_npc_04', displayName: null, position: [2, -0.3, -24], behavior: 'idle', zoneId: 'mystique_mirror_pool', walkRadius: 3, walkSpeed: 0.3, enabled: true },
  { id: 'mystique_npc_05', displayName: null, position: [0, 0, -10], behavior: 'explore', zoneId: 'mystique_entrance', walkRadius: 20, walkSpeed: 0.9, enabled: true },
];

const mystiqueAudioZones: AudioZoneConfig[] = [
  { id: 'mystique_ambient', zoneId: 'mystique_entrance', playlist: 'mystique_ambient_pad', ambience: 'wind_whispers', volume: 0.45, radius: 12, position: [0, 0, 0] },
  { id: 'mystique_cave_music', zoneId: 'mystique_crystal_cave', playlist: 'crystal_resonance', ambience: 'cave_drips', volume: 0.5, radius: 10, position: [-12, -2, -15] },
  { id: 'mystique_garden_music', zoneId: 'mystique_floating_garden', playlist: 'ethereal_garden', ambience: 'gentle_chimes', volume: 0.4, radius: 8, position: [10, 3, -12] },
  { id: 'mystique_pool_music', zoneId: 'mystique_mirror_pool', playlist: 'deep_reflection', ambience: 'water_surface', volume: 0.45, radius: 8, position: [0, -0.5, -25] },
  { id: 'mystique_observatory_music', zoneId: 'mystique_observatory', playlist: 'cosmic_drift', ambience: 'star_ambience', volume: 0.35, radius: 6, position: [0, 8, -35] },
];

const mystiqueAssets: AssetEntry[] = [
  { id: 'mystique_gateway_geo', type: 'architecture', file: '/assets/world/mystique/architecture/gateway.glb', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'mystique_entrance', enabled: true },
  { id: 'mystique_crystal_cave_geo', type: 'architecture', file: '/assets/world/mystique/architecture/crystal-cave.glb', position: [-12, -2, -15], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'mystique_crystal_cave', enabled: true },
  { id: 'mystique_floating_platforms', type: 'architecture', file: '/assets/world/mystique/architecture/floating-platforms.glb', position: [10, 3, -12], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'mystique_floating_garden', enabled: true },
  { id: 'mystique_mirror_pool_geo', type: 'water', file: '/assets/world/mystique/water/mirror-pool.glb', position: [0, -0.5, -25], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'mystique_mirror_pool', enabled: true },
  { id: 'mystique_observatory_geo', type: 'architecture', file: '/assets/world/mystique/architecture/observatory.glb', position: [0, 8, -35], rotation: [0, 0, 0], scale: [1, 1, 1], zoneId: 'mystique_observatory', enabled: true },
  { id: 'mystique_crystals', type: 'props', file: '/assets/world/mystique/props/crystals.glb', position: [-10, -1, -12], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
  { id: 'mystique_floating_rocks', type: 'props', file: '/assets/world/mystique/props/floating-rocks.glb', position: [5, 4, -20], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
  { id: 'mystique_bioluminescence', type: 'lighting', file: '/assets/world/mystique/lighting/bioluminescence.glb', position: [0, 0, -15], rotation: [0, 0, 0], scale: [1, 1, 1], enabled: true },
];

const mystiqueSpawnPoints: SpawnPointConfig[] = [
  { id: 'mystique_spawn', position: [0, 0, 8], rotation: [0, 3.14, 0], zoneId: 'mystique_entrance', active: true },
];

// ─── NPC Population Scaling (per district) ───────────────────────────────────

const districtNPCPopulation: NPCPopulationConfig[] = [
  { playerRange: [0, 0], npcCount: 8 },
  { playerRange: [1, 3], npcCount: 6 },
  { playerRange: [4, 10], npcCount: 4 },
  { playerRange: [11, 20], npcCount: 2 },
  { playerRange: [21, 9999], npcCount: 1 },
];

// ─── Full District Configs ───────────────────────────────────────────────────

export const DISTRICT_SKYLINE: DistrictConfig = {
  id: 'skyline',
  name: 'Skyline',
  status: 'OPEN',
  description: 'Rooftop lounge with sunset city views, jazz, and chill vibes.',
  sceneAsset: '/assets/world/skyline/skyline-scene.glb',
  spawnPoint: 'skyline_spawn',
  musicPlaylist: 'skyline_sunset_jazz',
  lighting: SKYLINE_LIGHTING,
  npcPreset: { npcs: skylineNPCs, population: districtNPCPopulation },
  activityAreas: ['skyline_lounge', 'skyline_bar', 'skyline_dance'],
  audioZones: skylineAudioZones,
  assets: skylineAssets,
  zones: skylineZones,
  interactions: skylineInteractions,
  spawnPoints: skylineSpawnPoints,
  availability: { opensAt: null, closesAt: null, schedule: 'always', customHours: null },
  lazyLoad: true,
  returnPortalPosition: [0, 0, 16],
  wayfinding: skylineWayfinding,
  enabled: true,
};

export const DISTRICT_PULSE: DistrictConfig = {
  id: 'pulse',
  name: 'Pulse',
  status: 'OPEN',
  description: 'High-energy nightclub with multiple dance floors and laser lights.',
  sceneAsset: '/assets/world/pulse/pulse-scene.glb',
  spawnPoint: 'pulse_spawn',
  musicPlaylist: 'pulse_edm',
  lighting: PULSE_LIGHTING,
  npcPreset: { npcs: pulseNPCs, population: districtNPCPopulation },
  activityAreas: ['pulse_main_floor', 'pulse_side_floor', 'pulse_vip'],
  audioZones: pulseAudioZones,
  assets: pulseAssets,
  zones: pulseZones,
  interactions: pulseInteractions,
  spawnPoints: pulseSpawnPoints,
  availability: { opensAt: null, closesAt: null, schedule: 'always', customHours: null },
  lazyLoad: true,
  returnPortalPosition: [0, 0, 20],
  wayfinding: [
    { id: 'pulse_sign_dj', label: 'DJ Booth', destination: 'pulse_dj_booth', order: 1 },
    { id: 'pulse_sign_vip', label: 'VIP Lounge', destination: 'pulse_vip', order: 2 },
    { id: 'pulse_sign_side', label: 'Side Room', destination: 'pulse_side_floor', order: 3 },
    { id: 'pulse_sign_return', label: 'Main Union', destination: 'main_union', order: 4 },
  ],
  enabled: true,
};

export const DISTRICT_ARCADE: DistrictConfig = {
  id: 'arcade',
  name: 'Arcade',
  status: 'OPEN',
  description: 'Retro gaming paradise with neon lights, cabinets, and multiplayer tables.',
  sceneAsset: '/assets/world/arcade/arcade-scene.glb',
  spawnPoint: 'arcade_spawn',
  musicPlaylist: 'retro_chiptune',
  lighting: ARCADE_LIGHTING,
  npcPreset: { npcs: arcadeNPCs, population: districtNPCPopulation },
  activityAreas: ['arcade_cabinets', 'arcade_multiplayer', 'arcade_lounge'],
  audioZones: arcadeAudioZones,
  assets: arcadeAssets,
  zones: arcadeZones,
  interactions: arcadeInteractions,
  spawnPoints: arcadeSpawnPoints,
  availability: { opensAt: null, closesAt: null, schedule: 'always', customHours: null },
  lazyLoad: true,
  returnPortalPosition: [0, 0, 22],
  wayfinding: [
    { id: 'arcade_sign_cabinets', label: 'Classic Cabinets', destination: 'arcade_cabinets', order: 1 },
    { id: 'arcade_sign_mp', label: 'Multiplayer Zone', destination: 'arcade_multiplayer', order: 2 },
    { id: 'arcade_sign_lounge', label: 'Gamer Lounge', destination: 'arcade_lounge', order: 3 },
    { id: 'arcade_sign_return', label: 'Main Union', destination: 'main_union', order: 4 },
  ],
  enabled: true,
};

export const DISTRICT_THROWBACK: DistrictConfig = {
  id: 'throwback_80s_90s',
  name: '80s/90s Throwback',
  status: 'OPEN',
  description: 'Nostalgia zone with roller rink, retro diner, and vintage photobooth.',
  sceneAsset: '/assets/world/throwback/throwback-scene.glb',
  spawnPoint: 'throwback_spawn',
  musicPlaylist: 'retro_80s_90s_mix',
  lighting: THROWBACK_LIGHTING,
  npcPreset: { npcs: throwbackNPCs, population: districtNPCPopulation },
  activityAreas: ['throwback_roller_rink', 'throwback_diner', 'throwback_photobooth'],
  audioZones: throwbackAudioZones,
  assets: throwbackAssets,
  zones: throwbackZones,
  interactions: throwbackInteractions,
  spawnPoints: throwbackSpawnPoints,
  availability: { opensAt: null, closesAt: null, schedule: 'always', customHours: null },
  lazyLoad: true,
  returnPortalPosition: [0, 0, 20],
  wayfinding: [
    { id: 'throwback_sign_rink', label: 'Roller Rink', destination: 'throwback_roller_rink', order: 1 },
    { id: 'throwback_sign_diner', label: 'Retro Diner', destination: 'throwback_diner', order: 2 },
    { id: 'throwback_sign_photo', label: 'Photobooth', destination: 'throwback_photobooth', order: 3 },
    { id: 'throwback_sign_return', label: 'Main Union', destination: 'main_union', order: 4 },
  ],
  enabled: true,
};

export const DISTRICT_MYSTIQUE: DistrictConfig = {
  id: 'mystique',
  name: 'Mystique',
  status: 'OPEN',
  description: 'Mysterious surreal space with crystals, floating gardens, and hidden paths.',
  sceneAsset: '/assets/world/mystique/mystique-scene.glb',
  spawnPoint: 'mystique_spawn',
  musicPlaylist: 'mystique_ambient_pad',
  lighting: MYSTIQUE_LIGHTING,
  npcPreset: { npcs: mystiqueNPCs, population: districtNPCPopulation },
  activityAreas: ['mystique_crystal_cave', 'mystique_floating_garden', 'mystique_observatory'],
  audioZones: mystiqueAudioZones,
  assets: mystiqueAssets,
  zones: mystiqueZones,
  interactions: mystiqueInteractions,
  spawnPoints: mystiqueSpawnPoints,
  availability: { opensAt: null, closesAt: null, schedule: 'always', customHours: null },
  lazyLoad: true,
  returnPortalPosition: [0, 0, 12],
  wayfinding: [
    { id: 'mystique_sign_cave', label: 'Crystal Cave', destination: 'mystique_crystal_cave', order: 1 },
    { id: 'mystique_sign_garden', label: 'Floating Garden', destination: 'mystique_floating_garden', order: 2 },
    { id: 'mystique_sign_pool', label: 'Mirror Pool', destination: 'mystique_mirror_pool', order: 3 },
    { id: 'mystique_sign_observatory', label: 'Observatory', destination: 'mystique_observatory', order: 4 },
    { id: 'mystique_sign_return', label: 'Main Union', destination: 'main_union', order: 5 },
  ],
  enabled: true,
};

// ─── All Districts Export ────────────────────────────────────────────────────

export const allDistrictConfigs: DistrictConfig[] = [
  DISTRICT_SKYLINE,
  DISTRICT_PULSE,
  DISTRICT_ARCADE,
  DISTRICT_THROWBACK,
  DISTRICT_MYSTIQUE,
];

/**
 * Get a full district config by ID.
 * Returns from the expanded configs (with all zones, assets, NPCs, etc.)
 */
export function getFullDistrictConfig(id: string): DistrictConfig | undefined {
  return allDistrictConfigs.find(d => d.id === id);
}

/**
 * Get all enabled districts.
 */
export function getEnabledDistricts(): DistrictConfig[] {
  return allDistrictConfigs.filter(d => d.enabled !== false);
}

/**
 * Get all districts that are currently open (status + availability).
 */
export function getOpenDistricts(): DistrictConfig[] {
  return allDistrictConfigs.filter(d => {
    if (d.enabled === false) return false;
    if (d.status !== 'OPEN') return false;
    if (d.availability?.opensAt) {
      const opens = new Date(d.availability.opensAt).getTime();
      if (Date.now() < opens) return false;
    }
    if (d.availability?.closesAt) {
      const closes = new Date(d.availability.closesAt).getTime();
      if (Date.now() > closes) return false;
    }
    return true;
  });
}
