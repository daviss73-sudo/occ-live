/**
 * OCC Live - Asset Pipeline Types (Part 4)
 * Enhanced asset definitions with collision, interaction anchors,
 * LOD, lighting zones, NPC anchors, audio zones, and prop attachments.
 */

import type { Vec3 } from './index.ts';

// ─── Collision ───────────────────────────────────────────────────────────────

export type CollisionType = 'solid' | 'walkable' | 'none';

export interface CollisionConfig {
  type: CollisionType;
  shape: 'box' | 'sphere' | 'capsule' | 'mesh';
  size: Vec3;         // Bounding size (width, height, depth)
  offset: Vec3;       // Offset from asset origin
}

// ─── Interaction Anchors ─────────────────────────────────────────────────────

export interface InteractionAnchor {
  id: string;
  type: string;            // sit, roast_marshmallow, swing, drink, etc.
  position: Vec3;          // Relative to asset origin
  rotation: Vec3;
  exitPosition: Vec3;      // Where player goes when exiting
  promptPosition: Vec3;    // Where the [E] prompt appears
  prompt: string;          // Text shown to player
  occupied: boolean;       // Runtime state
  occupiedBy: string | null;
}

// ─── LOD (Level of Detail) ───────────────────────────────────────────────────

export interface LODLevel {
  distance: number;     // Camera distance threshold
  file: string | null;  // Alternate GLB for this distance (null = hide)
}

export interface LODConfig {
  enabled: boolean;
  levels: LODLevel[];
}

// ─── Lighting Zone ───────────────────────────────────────────────────────────

export type LightingPreset = 'warm' | 'sunset' | 'neon' | 'festival' | 'indoor' | 'cool' | 'neutral';

export interface LightingZoneConfig {
  preset: LightingPreset;
  intensity: number;
  color: number;       // Hex color
  radius: number;
  castShadow: boolean;
}

// ─── NPC Anchors ─────────────────────────────────────────────────────────────

export type NPCAnchorType = 'standing' | 'sitting' | 'walking_route' | 'queue' | 'barista' | 'idle';

export interface NPCAnchor {
  id: string;
  type: NPCAnchorType;
  position: Vec3;
  rotation: Vec3;
  walkRoute?: Vec3[];   // For walking_route type
}

// ─── Prop Attachment Points ──────────────────────────────────────────────────

export type AttachmentPoint = 'hand_left' | 'hand_right' | 'head' | 'back' | 'hip';

export interface PropDefinition {
  id: string;
  file: string;
  attachPoint: AttachmentPoint;
  offset: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

// ─── Enhanced Asset Entry (Part 4) ───────────────────────────────────────────

export interface EnhancedAssetEntry {
  id: string;
  file: string;
  category: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  enabled: boolean;
  zoneId: string | null;

  // Part 4 enhancements
  collision: CollisionConfig | null;
  interactionAnchors: InteractionAnchor[];
  lod: LODConfig | null;
  lighting: LightingZoneConfig | null;
  npcAnchors: NPCAnchor[];
  audioZone: string | null;
  spawnPoints: string[];
  multiplayerSync: boolean;
}

// ─── Lazy River Route ────────────────────────────────────────────────────────

export type RiverSegmentType = 'straight' | 'corner' | 'curve' | 'entry_exit';

export interface RiverSegmentConfig {
  id: string;
  type: RiverSegmentType;
  file: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export interface LazyRiverConfig {
  segments: RiverSegmentConfig[];
  waypoints: Vec3[];
  loop: boolean;
  floatSpeed: number;
  width: number;
  entryPoints: Vec3[];
  exitPoints: Vec3[];
  audioZone: string;
  wetsuitAsset: string;
}

// ─── Avatar Variation System ─────────────────────────────────────────────────

export interface AVSColorPalette {
  id: string;
  hex: number;
}

export interface AVSVariation {
  sessionId: string;
  avatarId: string;
  topColor: number;
  bottomColor: number;
  shoesColor: number;
}

export interface AVSConfig {
  enabled: boolean;
  palette: AVSColorPalette[];
  variationPriority: ('top' | 'bottom' | 'shoes' | 'hat' | 'backpack' | 'jacket')[];
}

// ─── Avatar Selection ────────────────────────────────────────────────────────

export interface AvatarModelEntry {
  id: string;
  file: string;
  thumbnail: string | null;  // Path to preview image (generated or provided)
  mobility: 'walking' | 'wheelchair';
  tags: string[];            // For filtering (e.g. 'young', 'older', 'hijab')
}

// ─── Temporary Outfit ────────────────────────────────────────────────────────

export interface TemporaryOutfitConfig {
  id: string;
  file: string;
  activity: string;          // 'lazy_river', etc.
  preserveSlots: string[];   // Which avatar slots to preserve (e.g. 'head', 'face')
  hideSlots: string[];       // Which slots to hide (e.g. 'top', 'bottom', 'shoes')
}
