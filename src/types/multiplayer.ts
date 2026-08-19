/**
 * OCC Live - Multiplayer Type Definitions (Part 3)
 * Network protocol messages, remote player state, seating management,
 * and synchronization types for anonymous real-time presence.
 */

import type { Vec3 } from './index.ts';
import type { AvatarConfig, AnimationState, SocialAnimation, EmoteType, PresenceState } from './avatar.ts';
import type { ConsentPreferences } from './consent.ts';

// ─── Network Configuration ───────────────────────────────────────────────────

export interface MultiplayerConfig {
  serverUrl: string;
  maxPlayers: number;
  syncRateMs: number;          // How often to send position updates (ms)
  interpolationSpeed: number;  // Remote player lerp speed
  disconnectTimeoutMs: number; // Time before removing disconnected player
  idleTimeoutMs: number;       // Time before marking player IDLE
  afkTimeoutMs: number;        // Time before marking player AFK
  seatInactiveReleaseMs: number; // 10-minute seat release threshold
}

// ─── Player Activity State ───────────────────────────────────────────────────

export type ActivityState = 'ACTIVE' | 'IDLE' | 'AFK' | 'DISCONNECTED';

// ─── Synchronized Player State ───────────────────────────────────────────────

export interface SyncPlayerState {
  sessionId: string;
  position: Vec3;
  rotation: Vec3;
  animationState: AnimationState | SocialAnimation | EmoteType;
  presenceState: PresenceState;
  activityState: ActivityState;
  avatarConfig: AvatarConfig;
  consentPreferences: ConsentPreferences;
  interactionState: InteractionSyncState | null;
  timestamp: number;
}

export interface InteractionSyncState {
  interactionType: string;
  zoneId: string;
  isActive: boolean;
  props: string[];  // IDs of active props (e.g. 'roasting_stick')
}

// ─── Seat Management ─────────────────────────────────────────────────────────

export interface SeatState {
  seatId: string;
  zoneId: string;
  position: Vec3;
  occupiedBy: string | null;   // sessionId or null
  occupiedSince: number | null;
  lastActivity: number | null;
}

// ─── Network Messages (Client → Server) ─────────────────────────────────────

export type ClientMessage =
  | ClientJoinMessage
  | ClientStateUpdateMessage
  | ClientLeaveMessage
  | ClientSeatClaimMessage
  | ClientSeatReleaseMessage;

export interface ClientJoinMessage {
  type: 'join';
  avatarConfig: AvatarConfig;
  consentPreferences: ConsentPreferences;
  spawnPosition: Vec3;
}

export interface ClientStateUpdateMessage {
  type: 'state_update';
  position: Vec3;
  rotation: Vec3;
  animationState: AnimationState | SocialAnimation | EmoteType;
  interactionState: InteractionSyncState | null;
}

export interface ClientLeaveMessage {
  type: 'leave';
}

export interface ClientSeatClaimMessage {
  type: 'seat_claim';
  seatId: string;
  zoneId: string;
  position: Vec3;
}

export interface ClientSeatReleaseMessage {
  type: 'seat_release';
  seatId: string;
}

// ─── Network Messages (Server → Client) ─────────────────────────────────────

export type ServerMessage =
  | ServerWelcomeMessage
  | ServerPlayerJoinedMessage
  | ServerPlayerLeftMessage
  | ServerPlayerStateMessage
  | ServerWorldStateMessage
  | ServerSeatUpdateMessage
  | ServerErrorMessage;

export interface ServerWelcomeMessage {
  type: 'welcome';
  sessionId: string;
  players: SyncPlayerState[];
  seats: SeatState[];
}

export interface ServerPlayerJoinedMessage {
  type: 'player_joined';
  player: SyncPlayerState;
}

export interface ServerPlayerLeftMessage {
  type: 'player_left';
  sessionId: string;
}

export interface ServerPlayerStateMessage {
  type: 'player_state';
  sessionId: string;
  position: Vec3;
  rotation: Vec3;
  animationState: AnimationState | SocialAnimation | EmoteType;
  interactionState: InteractionSyncState | null;
  activityState: ActivityState;
}

export interface ServerWorldStateMessage {
  type: 'world_state';
  players: SyncPlayerState[];
  seats: SeatState[];
  playerCount: number;
}

export interface ServerSeatUpdateMessage {
  type: 'seat_update';
  seat: SeatState;
}

export interface ServerErrorMessage {
  type: 'error';
  message: string;
}
