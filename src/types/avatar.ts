/**
 * OCC Live - Avatar & Player Presence Type Definitions (Part 2)
 * Data-driven avatar configuration, animation states, presence,
 * and anonymous session types.
 */

import type { Vec3 } from './index.ts';

// ─── Avatar Configuration ────────────────────────────────────────────────────

export type MobilityType = 'walking' | 'wheelchair';

export interface AvatarConfig {
  body: string;
  skin: string;
  eyes: string;
  mouth: string;
  hair: string;
  top: string;
  bottom: string;
  shoes: string;
  accessories: string[];
  scale: Vec3;
  mobility: MobilityType;
}

export type AvatarSlot =
  | 'body'
  | 'skin'
  | 'eyes'
  | 'mouth'
  | 'hair'
  | 'top'
  | 'bottom'
  | 'shoes'
  | 'accessories';

export interface AvatarSlotAsset {
  id: string;
  slot: AvatarSlot;
  file: string | null; // null = use placeholder geometry
  label: string;       // Internal label (not displayed to user)
}

// ─── Avatar Asset Registry ───────────────────────────────────────────────────

export interface AvatarAssetManifest {
  bodies: AvatarSlotAsset[];
  skins: AvatarSlotAsset[];
  eyes: AvatarSlotAsset[];
  mouths: AvatarSlotAsset[];
  hairs: AvatarSlotAsset[];
  tops: AvatarSlotAsset[];
  bottoms: AvatarSlotAsset[];
  shoes: AvatarSlotAsset[];
  accessories: AvatarSlotAsset[];
}

// ─── Animation System ────────────────────────────────────────────────────────

export type AnimationState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'roll'
  | 'roll_fast'
  | 'jump'
  | 'fall'
  | 'land';

export type SocialAnimation =
  | 'sit'
  | 'dance'
  | 'swing'
  | 'float'
  | 'play'
  | 'wave'
  | 'cheer'
  | 'drink'
  | 'enter'
  | 'roast_marshmallow'
  | 'celebrate'
  | 'laugh'
  | 'point'
  | 'clap'
  | 'thumbsup'
  | 'shrug'
  | 'bow'
  | 'meditate';

export type EmoteType =
  | 'wave'
  | 'dance'
  | 'cheer'
  | 'laugh'
  | 'celebrate'
  | 'point'
  | 'sit'
  | 'clap'
  | 'thumbsup'
  | 'shrug'
  | 'bow'
  | 'meditate';

export interface AnimationClipConfig {
  id: string;
  state: AnimationState | SocialAnimation | EmoteType;
  file: string | null;     // null = use procedural animation
  loop: boolean;
  speed: number;
  blendDuration: number;   // Transition time in seconds
  priority: number;        // Higher priority overrides lower
}

export interface AnimationTransition {
  from: AnimationState;
  to: AnimationState;
  condition: string; // Evaluated at runtime
}

// ─── Player Presence ─────────────────────────────────────────────────────────

export type PresenceState =
  | 'ONLINE'
  | 'IDLE'
  | 'MOVING'
  | 'INTERACTING'
  | 'AWAY'
  | 'LEFT';

export interface PlayerSession {
  sessionId: string;       // Ephemeral, randomly generated, non-persistent
  createdAt: number;       // Timestamp
  avatarConfig: AvatarConfig;
  presenceState: PresenceState;
  currentZone: string | null;
  lastActivity: number;    // Timestamp of last input
}

export interface RemotePlayerState {
  sessionId: string;
  avatarConfig: AvatarConfig;
  position: Vec3;
  rotation: Vec3;
  animationState: AnimationState;
  presenceState: PresenceState;
}

// ─── Player Movement State (for animation integration) ───────────────────────

export interface PlayerMovementState {
  isMoving: boolean;
  isRunning: boolean;
  isRolling: boolean;
  isGrounded: boolean;
  isJumping: boolean;
  isFalling: boolean;
  velocity: Vec3;
  speed: number;
}
