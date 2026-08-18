/**
 * OCC Live - Activity Area Definitions (Part 6)
 * Data-driven configuration for all Main Union activity areas.
 * New areas can be added here without modifying system code.
 */

import type { ActivityAreaConfig } from '../systems/activity-area-system.ts';
import type { NPCZoneAttraction } from '../systems/npc-system.ts';
import type { SwingSystemConfig } from '../systems/swing-system.ts';
import type { StageConfig } from '../systems/stage-event-system.ts';
import type { MusicZoneConfig, MusicPlaylist, AmbienceConfig } from '../systems/music-system.ts';

// ─── Activity Areas ──────────────────────────────────────────────────────────

export const activityAreas: ActivityAreaConfig[] = [
  {
    id: 'main_stage_area',
    displayName: 'Main Stage',
    description: 'The primary gathering point for events and dancing.',
    activityType: 'performance',
    position: [0, 0, -30],
    radius: 15,
    state: 'open',
    interactionTypes: ['dance'],
    zoneIds: ['main_stage'],
    audioZoneId: 'main_stage_music',
    npcAnchors: [[-3, 0, -28], [2, 0, -27], [-5, 0, -26], [4, 0, -25]],
    maxOccupancy: 40,
    seatingPositions: [],
    spawnPoints: [[0, 0, -25]],
    enabled: true,
    schedule: null,
  },
  {
    id: 'cafe_area',
    displayName: 'Café Terrace',
    description: 'Relax with a virtual drink and watch the world go by.',
    activityType: 'food_drink',
    position: [-25, 0, -10],
    radius: 10,
    state: 'open',
    interactionTypes: ['sit', 'drink'],
    zoneIds: ['cafe_terrace'],
    audioZoneId: 'cafe_music',
    npcAnchors: [[-24, 0, -11], [-26, 0, -9], [-23, 0, -12]],
    maxOccupancy: 15,
    seatingPositions: [[-24, 0, -9], [-26, 0, -8], [-23, 0, -12]],
    spawnPoints: [[-22, 0, -8]],
    enabled: true,
    schedule: null,
  },
  {
    id: 'beanbag_area',
    displayName: 'Beanbag Lawn',
    description: 'Chill on a beanbag and listen to music.',
    activityType: 'relaxation',
    position: [-15, 0, 5],
    radius: 8,
    state: 'open',
    interactionTypes: ['sit'],
    zoneIds: ['beanbag_lawn'],
    audioZoneId: 'beanbag_ambience',
    npcAnchors: [[-15, 0, 5], [-14, 0, 7]],
    maxOccupancy: 12,
    seatingPositions: [[-14, 0, 4], [-16, 0, 6], [-13, 0, 7], [-17, 0, 3]],
    spawnPoints: [[-12, 0, 5]],
    enabled: true,
    schedule: null,
  },
  {
    id: 'ball_pit_area',
    displayName: 'Ball Pit',
    description: 'Jump in and play!',
    activityType: 'recreation',
    position: [25, 0, -10],
    radius: 8,
    state: 'open',
    interactionTypes: ['enter', 'exit', 'play'],
    zoneIds: ['ball_pit'],
    audioZoneId: 'ball_pit_ambience',
    npcAnchors: [[24, 0, -10], [26, 0, -11]],
    maxOccupancy: 10,
    seatingPositions: [],
    spawnPoints: [[25, 0, -7]],
    enabled: true,
    schedule: null,
  },
  {
    id: 'swing_area',
    displayName: 'Swing Zone',
    description: 'Take a swing and relax.',
    activityType: 'recreation',
    position: [-20, 0, -20],
    radius: 6,
    state: 'open',
    interactionTypes: ['swing'],
    zoneIds: ['swing_zone'],
    audioZoneId: 'swing_ambience',
    npcAnchors: [[-19, 0, -19]],
    maxOccupancy: 6,
    seatingPositions: [],
    spawnPoints: [[-20, 0, -17]],
    enabled: true,
    schedule: null,
  },
  {
    id: 'river_area',
    displayName: 'Lazy River',
    description: 'Float along the river in a wetsuit.',
    activityType: 'water',
    position: [0, -0.5, 15],
    radius: 25,
    state: 'open',
    interactionTypes: ['enter', 'float'],
    zoneIds: ['river_lounge'],
    audioZoneId: 'river_ambience',
    npcAnchors: [[0, -0.3, 16], [3, -0.3, 18]],
    maxOccupancy: 20,
    seatingPositions: [],
    spawnPoints: [[5, 0, 12]],
    enabled: true,
    schedule: null,
  },
  {
    id: 'firepit_area',
    displayName: 'Firepit',
    description: 'Sit by the fire and roast marshmallows.',
    activityType: 'social',
    position: [20, 0, 10],
    radius: 7,
    state: 'open',
    interactionTypes: ['sit', 'roast_marshmallow'],
    zoneIds: ['firepit_lounge'],
    audioZoneId: 'firepit_ambience',
    npcAnchors: [[21, 0, 11], [19, 0, 10]],
    maxOccupancy: 8,
    seatingPositions: [[19, 0, 9], [21, 0, 11], [22, 0, 9]],
    spawnPoints: [[18, 0, 8]],
    enabled: true,
    schedule: null,
  },
  {
    id: 'kiosk_area',
    displayName: 'Information Kiosk',
    description: 'Find out about OCC Live activities and events.',
    activityType: 'information',
    position: [-8, 0, 8],
    radius: 3,
    state: 'open',
    interactionTypes: ['enter'],
    zoneIds: ['main_plaza'],
    audioZoneId: null,
    npcAnchors: [],
    maxOccupancy: 3,
    seatingPositions: [],
    spawnPoints: [],
    enabled: true,
    schedule: null,
  },
];

// ─── NPC Zone Attractions (for dynamic NPC distribution) ─────────────────────

export const npcZoneAttractions: NPCZoneAttraction[] = [
  { zoneId: 'main_stage', position: [0, 0, -28], radius: 12, weight: 0.3, maxNPCs: 6, behaviors: ['dancing', 'gathering', 'idle'] },
  { zoneId: 'cafe_terrace', position: [-25, 0, -10], radius: 8, weight: 0.2, maxNPCs: 4, behaviors: ['sitting', 'drinking', 'idle'] },
  { zoneId: 'beanbag_lawn', position: [-15, 0, 5], radius: 6, weight: 0.15, maxNPCs: 3, behaviors: ['sitting', 'idle'] },
  { zoneId: 'firepit_lounge', position: [20, 0, 10], radius: 5, weight: 0.15, maxNPCs: 3, behaviors: ['sitting', 'gathering', 'idle'] },
  { zoneId: 'ball_pit', position: [25, 0, -10], radius: 6, weight: 0.1, maxNPCs: 2, behaviors: ['playing', 'idle'] },
  { zoneId: 'river_lounge', position: [0, 0, 15], radius: 10, weight: 0.05, maxNPCs: 2, behaviors: ['idle', 'walking'] },
  { zoneId: 'main_plaza', position: [0, 0, 0], radius: 15, weight: 0.05, maxNPCs: 4, behaviors: ['walking', 'idle', 'exploring'] },
];

// ─── Swing Configuration ─────────────────────────────────────────────────────

export const swingConfig: SwingSystemConfig = {
  swings: [
    { id: 'swing_1', position: [-21, 0, -20], rotation: [0, 0, 0], seatHeight: 0.5, amplitude: 0.5, speed: 0.6, chainLength: 2.5 },
    { id: 'swing_2', position: [-19, 0, -20], rotation: [0, 0, 0], seatHeight: 0.5, amplitude: 0.45, speed: 0.55, chainLength: 2.5 },
    { id: 'swing_3', position: [-20, 0, -22], rotation: [0, 0.4, 0], seatHeight: 0.5, amplitude: 0.4, speed: 0.65, chainLength: 2.5 },
  ],
  zoneCenter: [-20, 0, -20],
  zoneRadius: 6,
};

// ─── Stage Configuration ─────────────────────────────────────────────────────

export const stageConfig: StageConfig = {
  position: [0, 0, -30],
  radius: 15,
  danceRadius: 12,
  defaultLights: [
    { id: 'stage_front', color: 0x7c4dff, intensity: 0.8, position: [0, 5, -25], type: 'spot', animated: false, animationSpeed: 1 },
    { id: 'stage_left', color: 0xff4488, intensity: 0.5, position: [-6, 4, -30], type: 'point', animated: true, animationSpeed: 0.8 },
    { id: 'stage_right', color: 0x44bbff, intensity: 0.5, position: [6, 4, -30], type: 'point', animated: true, animationSpeed: 1.2 },
    { id: 'stage_back', color: 0xffaa00, intensity: 0.3, position: [0, 6, -35], type: 'point', animated: true, animationSpeed: 0.6 },
  ],
  defaultEffects: [
    { id: 'stage_strobe', type: 'strobe', enabled: false, intensity: 0.5 },
    { id: 'stage_particles', type: 'particles', enabled: false, intensity: 0.3 },
  ],
  events: [
    {
      id: 'opening_night',
      name: 'Opening Night',
      description: 'Welcome to OCC Live! Dance party at the Main Stage.',
      playlistId: 'stage_playlist',
      lights: [
        { id: 'event_spot_1', color: 0xff00ff, intensity: 1.5, position: [0, 8, -28], type: 'spot', animated: true, animationSpeed: 2.0 },
        { id: 'event_spot_2', color: 0x00ffff, intensity: 1.2, position: [-4, 6, -32], type: 'point', animated: true, animationSpeed: 1.5 },
      ],
      effects: [
        { id: 'event_strobe', type: 'strobe', enabled: true, intensity: 0.7 },
      ],
      npcDancerCount: 8,
      duration: 0, // Indefinite until manually ended
    },
  ],
};

// ─── Music Playlists ─────────────────────────────────────────────────────────

export const musicPlaylists: MusicPlaylist[] = [
  {
    id: 'main_union_ambient',
    name: 'Main Union Ambient',
    tracks: [
      { id: 'ambient_01', file: '/assets/audio/music/ambient_01.mp3', title: 'Ambient Track 1', duration: 180, loop: false, volume: 0.5 },
      { id: 'ambient_02', file: '/assets/audio/music/ambient_02.mp3', title: 'Ambient Track 2', duration: 200, loop: false, volume: 0.5 },
      { id: 'ambient_03', file: '/assets/audio/music/ambient_03.mp3', title: 'Ambient Track 3', duration: 160, loop: false, volume: 0.5 },
    ],
    shuffle: true,
    loop: true,
  },
  {
    id: 'stage_playlist',
    name: 'Stage Music',
    tracks: [
      { id: 'stage_01', file: '/assets/audio/music/stage_01.mp3', title: 'Stage Track 1', duration: 210, loop: false, volume: 0.7 },
      { id: 'stage_02', file: '/assets/audio/music/stage_02.mp3', title: 'Stage Track 2', duration: 195, loop: false, volume: 0.7 },
    ],
    shuffle: true,
    loop: true,
  },
  {
    id: 'cafe_chill',
    name: 'Café Chill',
    tracks: [
      { id: 'cafe_01', file: '/assets/audio/music/cafe_01.mp3', title: 'Café Track 1', duration: 240, loop: false, volume: 0.4 },
      { id: 'cafe_02', file: '/assets/audio/music/cafe_02.mp3', title: 'Café Track 2', duration: 220, loop: false, volume: 0.4 },
    ],
    shuffle: true,
    loop: true,
  },
  {
    id: 'poolside_chill',
    name: 'Poolside Chill',
    tracks: [
      { id: 'pool_01', file: '/assets/audio/music/poolside_01.mp3', title: 'Poolside Track 1', duration: 200, loop: false, volume: 0.4 },
    ],
    shuffle: false,
    loop: true,
  },
  {
    id: 'lofi_beats',
    name: 'Lo-Fi Beats',
    tracks: [
      { id: 'lofi_01', file: '/assets/audio/music/lofi_01.mp3', title: 'Lo-Fi Track 1', duration: 300, loop: false, volume: 0.35 },
    ],
    shuffle: false,
    loop: true,
  },
];

// ─── Ambience Configs ────────────────────────────────────────────────────────

export const ambienceConfigs: AmbienceConfig[] = [
  { id: 'water_flowing', file: '/assets/audio/ambience/water_flowing.mp3', volume: 0.5, loop: true, fadeInDuration: 2, fadeOutDuration: 1.5 },
  { id: 'fire_crackling', file: '/assets/audio/ambience/fire_crackling.mp3', volume: 0.45, loop: true, fadeInDuration: 1.5, fadeOutDuration: 1 },
  { id: 'cafe_chatter', file: '/assets/audio/ambience/cafe_chatter.mp3', volume: 0.25, loop: true, fadeInDuration: 2, fadeOutDuration: 2 },
  { id: 'playful_ambience', file: '/assets/audio/ambience/playful.mp3', volume: 0.3, loop: true, fadeInDuration: 1, fadeOutDuration: 1 },
  { id: 'outdoor_birds', file: '/assets/audio/ambience/outdoor_birds.mp3', volume: 0.2, loop: true, fadeInDuration: 3, fadeOutDuration: 2 },
];

// ─── Music Zone Configs ──────────────────────────────────────────────────────

export const musicZoneConfigs: MusicZoneConfig[] = [
  { id: 'zone_plaza', areaId: 'main_plaza', position: [0, 0, 0], radius: 20, playlistId: 'main_union_ambient', ambienceId: null, volume: 0.5, priority: 1 },
  { id: 'zone_stage', areaId: 'main_stage_area', position: [0, 0, -30], radius: 15, playlistId: 'stage_playlist', ambienceId: null, volume: 0.7, priority: 3 },
  { id: 'zone_cafe', areaId: 'cafe_area', position: [-25, 0, -10], radius: 10, playlistId: 'cafe_chill', ambienceId: 'cafe_chatter', volume: 0.4, priority: 2 },
  { id: 'zone_river', areaId: 'river_area', position: [0, -0.5, 15], radius: 25, playlistId: 'poolside_chill', ambienceId: 'water_flowing', volume: 0.5, priority: 2 },
  { id: 'zone_firepit', areaId: 'firepit_area', position: [20, 0, 10], radius: 7, playlistId: null, ambienceId: 'fire_crackling', volume: 0.45, priority: 2 },
  { id: 'zone_ballpit', areaId: 'ball_pit_area', position: [25, 0, -10], radius: 8, playlistId: null, ambienceId: 'playful_ambience', volume: 0.35, priority: 2 },
  { id: 'zone_beanbag', areaId: 'beanbag_area', position: [-15, 0, 5], radius: 8, playlistId: 'lofi_beats', ambienceId: null, volume: 0.3, priority: 2 },
  { id: 'zone_swing', areaId: 'swing_area', position: [-20, 0, -20], radius: 6, playlistId: null, ambienceId: 'outdoor_birds', volume: 0.25, priority: 1 },
];
