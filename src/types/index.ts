/**
 * OCC Live - Core Type Definitions
 * All types are data-driven to support configurable world assembly.
 */

// ─── Spatial Types ───────────────────────────────────────────────────────────

export type Vec3 = [number, number, number];

// ─── World State ─────────────────────────────────────────────────────────────

export type WorldState = 'DAY' | 'EVENING' | 'NIGHT' | 'EVENT';

// ─── District System ─────────────────────────────────────────────────────────

export type DistrictStatus = 'OPEN' | 'CLOSED' | 'COMING_SOON' | 'EVENT_ONLY';

export interface DistrictLightingPreset {
  ambientColor: number;
  ambientIntensity: number;
  directionalColor: number;
  directionalIntensity: number;
  directionalPosition: Vec3;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  skyTopColor: number;
  skyBottomColor: number;
}

export interface DistrictNPCPreset {
  /** NPC configs specific to this district */
  npcs: NPCConfig[];
  /** Population scaling for this district */
  population: NPCPopulationConfig[];
  /** Zone-specific NPC attraction weights */
  zoneAttractions?: Array<{ zoneId: string; weight: number }>;
}

export interface DistrictAvailability {
  /** ISO date string for when the district opens (null = always available when OPEN) */
  opensAt: string | null;
  /** ISO date string for when the district closes (null = no scheduled close) */
  closesAt: string | null;
  /** Recurring schedule (e.g., 'weekdays', 'weekends', 'always') */
  schedule: 'always' | 'weekdays' | 'weekends' | 'event_only' | 'custom';
  /** Custom hours if schedule is 'custom' (24h format, e.g. '09:00-17:00') */
  customHours: string | null;
}

export interface DistrictConfig {
  id: string;
  name: string;
  status: DistrictStatus;
  sceneAsset: string | null;
  spawnPoint: string | null;
  musicPlaylist: string | null;
  /** Full district configuration (Part 8 expansion) */
  description?: string;
  /** Lighting preset for this district */
  lighting?: DistrictLightingPreset | null;
  /** NPC configuration for this district */
  npcPreset?: DistrictNPCPreset | null;
  /** Activity areas within this district */
  activityAreas?: string[];
  /** Audio zones within this district */
  audioZones?: AudioZoneConfig[];
  /** Assets to load for this district */
  assets?: AssetEntry[];
  /** Zones within this district */
  zones?: ZoneConfig[];
  /** Interactions within this district */
  interactions?: InteractionConfig[];
  /** Spawn points within this district */
  spawnPoints?: SpawnPointConfig[];
  /** Availability scheduling */
  availability?: DistrictAvailability | null;
  /** Whether assets should be preloaded or loaded on entry */
  lazyLoad?: boolean;
  /** Return portal position (how to get back to Main Union) */
  returnPortalPosition?: Vec3 | null;
  /** Wayfinding entries for this district */
  wayfinding?: WayfindingEntry[];
  /** Whether this district is enabled (can be toggled without status change) */
  enabled?: boolean;
}

// ─── Asset Registry ──────────────────────────────────────────────────────────

export type AssetCategory =
  | 'architecture'
  | 'landscaping'
  | 'recreation'
  | 'furniture'
  | 'water'
  | 'lighting'
  | 'signage'
  | 'portals'
  | 'props';

export interface AssetEntry {
  id: string;
  type: AssetCategory;
  file: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  zoneId?: string;
  enabled: boolean;
}

// ─── Zone System ─────────────────────────────────────────────────────────────

export type ZoneType =
  | 'plaza'
  | 'stage'
  | 'cafe'
  | 'relaxation'
  | 'recreation'
  | 'water'
  | 'lounge'
  | 'portal'
  | 'activity';

export type InteractionType =
  | 'none'
  | 'sit'
  | 'stand'
  | 'dance'
  | 'swing'
  | 'enter'
  | 'exit'
  | 'jump'
  | 'play'
  | 'float'
  | 'drink'
  | 'emote'
  | 'portal'
  | 'roast_marshmallow';

export interface ZoneConfig {
  id: string;
  displayName: string;
  type: ZoneType;
  position: Vec3;
  rotation: Vec3;
  radius: number;
  interactionType: InteractionType;
  musicZone: string | null;
  spawnPoint: string | null;
  enabled: boolean;
  districtId: string | null;
}

// ─── Spawn Points ────────────────────────────────────────────────────────────

export interface SpawnPointConfig {
  id: string;
  position: Vec3;
  rotation: Vec3;
  zoneId: string | null;
  active: boolean;
}

// ─── Interaction Framework ───────────────────────────────────────────────────

export interface InteractionConfig {
  id: string;
  interactionType: InteractionType;
  prompt: string;
  radius: number;
  animation: string | null;
  sound: string | null;
  cooldown: number;
  position: Vec3;
  zoneId: string;
  enabled: boolean;
}

// ─── NPC System ──────────────────────────────────────────────────────────────

export type NPCBehavior = 'idle' | 'walk' | 'sit' | 'dance' | 'gather' | 'play' | 'explore';

export interface NPCConfig {
  id: string;
  displayName: string | null;
  position: Vec3;
  behavior: NPCBehavior;
  zoneId: string;
  walkRadius: number;
  walkSpeed: number;
  enabled: boolean;
}

export interface NPCPopulationConfig {
  playerRange: [number, number];
  npcCount: number;
}

// ─── Audio Zones ─────────────────────────────────────────────────────────────

export interface AudioZoneConfig {
  id: string;
  zoneId: string;
  playlist: string | null;
  ambience: string | null;
  volume: number;
  radius: number;
  position: Vec3;
}

// ─── Wayfinding / Signage ────────────────────────────────────────────────────

export interface WayfindingEntry {
  id: string;
  label: string;
  destination: string;
  order: number;
}

// ─── Event Hooks ─────────────────────────────────────────────────────────────

export type WorldEventType =
  | 'eventStarted'
  | 'eventEnded'
  | 'lightingChanged'
  | 'musicChanged'
  | 'npcPopulationChanged'
  | 'stageActivated'
  | 'districtOpened';

export interface WorldEvent {
  type: WorldEventType;
  payload: Record<string, unknown>;
  timestamp: number;
}

export type WorldEventListener = (event: WorldEvent) => void;

// ─── Camera Configuration ────────────────────────────────────────────────────

export interface CameraConfig {
  distance: number;
  height: number;
  smoothing: number;
  rotationSpeed: number;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
}

// ─── Player Configuration ────────────────────────────────────────────────────

export interface PlayerConfig {
  walkSpeed: number;
  runSpeed: number;
  jumpForce: number;
  gravity: number;
  height: number;
  radius: number;
}

// ─── River / Path System ─────────────────────────────────────────────────────

export interface RiverPathConfig {
  id: string;
  entryPoint: Vec3;
  exitPoint: Vec3;
  pathPoints: Vec3[];
  speed: number;
  width: number;
}

// ─── Content Pack System (Part 10) ───────────────────────────────────────────

export interface ContentPackConfig {
  id: string;
  name: string;
  description: string;
  /** ISO date string for activation */
  activatesAt: string | null;
  /** ISO date string for deactivation */
  deactivatesAt: string | null;
  /** Which districts/zones this pack targets */
  targetLocations: string[];
  /** Decoration overrides */
  decorations: AssetEntry[];
  /** Music preset overrides */
  musicPresets: Array<{ zoneId: string; playlist: string; volume: number }>;
  /** Lighting preset overrides */
  lightingPresets: Array<{ zoneId: string; preset: DistrictLightingPreset }>;
  /** NPC behavior overrides */
  npcPresets: Array<{ zoneId: string; npcs: NPCConfig[] }>;
  /** Activity overrides (enable/disable) */
  activityOverrides: Array<{ areaId: string; enabled: boolean }>;
  /** Whether this content pack is enabled */
  enabled: boolean;
}

export type SeasonalTheme =
  | 'fall_kickoff'
  | 'spring_kickoff'
  | 'winter'
  | 'spring'
  | 'summer'
  | 'special';

export interface SeasonalLayerConfig {
  id: string;
  theme: SeasonalTheme;
  name: string;
  /** ISO date string for activation */
  activatesAt: string | null;
  /** ISO date string for deactivation */
  deactivatesAt: string | null;
  /** Decoration assets to overlay */
  decorations: AssetEntry[];
  /** Lighting modifications (per zone or global) */
  lightingOverride: Partial<DistrictLightingPreset> | null;
  /** Music overlay (zone → playlist mapping) */
  musicOverride: Array<{ zoneId: string; playlist: string }>;
  /** Effects to apply (e.g., particles, fog adjustments) */
  effects: string[];
  /** Whether this layer is active */
  enabled: boolean;
}

// ─── Shared Activity System (Part 9) ────────────────────────────────────────

export type SharedActivityType =
  | 'dance_floor'
  | 'sitting_area'
  | 'firepit'
  | 'lazy_river'
  | 'ball_pit'
  | 'mini_game'
  | 'photobooth'
  | 'custom';

export interface SharedActivityConfig {
  id: string;
  type: SharedActivityType;
  /** Maximum participants (0 = unlimited) */
  maxParticipants: number;
  /** Zone this activity belongs to */
  zoneId: string;
  /** Whether participants can leave at any time */
  freeExit: boolean;
  /** Whether joining requires an explicit action (vs. proximity) */
  requiresExplicitJoin: boolean;
  /** Whether this activity involves physical contact between players */
  requiresContactConsent: boolean;
  /** Available animations for this activity */
  animations: string[];
  /** Position of the activity */
  position: Vec3;
  /** Whether this is currently enabled */
  enabled: boolean;
}

// ─── Performance & Load Testing (Part 11) ────────────────────────────────────

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  textureMemory: number;
  geometryMemory: number;
  activeRemotePlayers: number;
  activeNPCs: number;
  loadedAssets: number;
  networkLatency: number;
  networkBandwidth: number;
}

export interface LoadScenario {
  id: string;
  name: string;
  playerCount: number;
  npcCount: number;
  activeDistricts: string[];
  activeActivities: string[];
  description: string;
}

// ─── Accessibility (Part 12) ─────────────────────────────────────────────────

export interface AccessibilityConfig {
  /** Reduce non-essential motion/particle effects */
  reducedMotion: boolean;
  /** High contrast mode for UI */
  highContrast: boolean;
  /** Scale factor for UI text */
  textScale: number;
  /** Show text alternatives for icon-only prompts */
  showTextAlternatives: boolean;
  /** Disable flashing/strobing effects */
  disableFlashing: boolean;
  /** Master audio volume (0-1) */
  masterVolume: number;
  /** Music volume (0-1) */
  musicVolume: number;
  /** Effects volume (0-1) */
  effectsVolume: number;
  /** Ambience volume (0-1) */
  ambienceVolume: number;
}

// ─── World Configuration (top-level) ─────────────────────────────────────────

export interface WorldConfig {
  state: WorldState;
  districts: DistrictConfig[];
  assets: AssetEntry[];
  zones: ZoneConfig[];
  spawnPoints: SpawnPointConfig[];
  interactions: InteractionConfig[];
  npcs: NPCConfig[];
  npcPopulation: NPCPopulationConfig[];
  audioZones: AudioZoneConfig[];
  wayfinding: WayfindingEntry[];
  riverPaths: RiverPathConfig[];
  camera: CameraConfig;
  player: PlayerConfig;
  /** Content packs (Part 10) */
  contentPacks?: ContentPackConfig[];
  /** Seasonal layers (Part 10) */
  seasonalLayers?: SeasonalLayerConfig[];
  /** Shared activities (Part 9) */
  sharedActivities?: SharedActivityConfig[];
  /** Accessibility settings (Part 12) */
  accessibility?: AccessibilityConfig;
}
