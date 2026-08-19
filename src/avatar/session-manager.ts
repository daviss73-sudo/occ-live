/**
 * OCC Live - Session & Presence Manager (Part 2)
 * Manages anonymous ephemeral sessions. No names, no accounts,
 * no persistent identifiers. Session is randomly generated,
 * non-user-facing, and expires when the browser tab closes.
 */

import type { PlayerSession, PresenceState, RemotePlayerState } from '../types/avatar.ts';
import type { AvatarConfig } from '../types/avatar.ts';

/** Generate a random ephemeral session ID (not user-facing) */
function generateSessionId(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export class SessionManager {
  private session: PlayerSession;
  private remotePlayers: Map<string, RemotePlayerState> = new Map();
  private idleTimeout: number = 120; // seconds before IDLE
  private awayTimeout: number = 300; // seconds before AWAY
  private onPresenceChange: ((state: PresenceState) => void) | null = null;

  constructor(avatarConfig: AvatarConfig) {
    this.session = {
      sessionId: generateSessionId(),
      createdAt: Date.now(),
      avatarConfig: { ...avatarConfig, accessories: [...avatarConfig.accessories] },
      presenceState: 'ONLINE',
      currentZone: null,
      lastActivity: Date.now(),
    };
  }

  /** Get the current session (non-user-facing) */
  getSession(): PlayerSession {
    return { ...this.session };
  }

  /** Get session ID (ephemeral, internal only) */
  getSessionId(): string {
    return this.session.sessionId;
  }

  /** Get current presence state */
  getPresenceState(): PresenceState {
    return this.session.presenceState;
  }

  /** Update presence state */
  setPresenceState(state: PresenceState): void {
    if (state !== this.session.presenceState) {
      this.session.presenceState = state;
      if (this.onPresenceChange) {
        this.onPresenceChange(state);
      }
    }
  }

  /** Record activity (resets idle/away timers) */
  recordActivity(): void {
    this.session.lastActivity = Date.now();
    if (this.session.presenceState === 'IDLE' ||
        this.session.presenceState === 'AWAY') {
      this.setPresenceState('ONLINE');
    }
  }

  /** Record that player is moving */
  recordMoving(): void {
    this.recordActivity();
    this.setPresenceState('MOVING');
  }

  /** Record that player is interacting */
  recordInteracting(): void {
    this.recordActivity();
    this.setPresenceState('INTERACTING');
  }

  /** Update current zone */
  setCurrentZone(zoneId: string | null): void {
    this.session.currentZone = zoneId;
  }

  /** Update avatar config on session */
  updateAvatarConfig(config: AvatarConfig): void {
    this.session.avatarConfig = { ...config, accessories: [...config.accessories] };
  }

  /** Check idle/away status — call periodically */
  updatePresenceTimers(): void {
    const now = Date.now();
    const elapsed = (now - this.session.lastActivity) / 1000;

    if (this.session.presenceState === 'LEFT') return;

    if (elapsed >= this.awayTimeout) {
      this.setPresenceState('AWAY');
    } else if (elapsed >= this.idleTimeout) {
      if (this.session.presenceState !== 'INTERACTING') {
        this.setPresenceState('IDLE');
      }
    }
  }

  /** End session */
  endSession(): void {
    this.setPresenceState('LEFT');
  }

  /** Set presence change callback */
  onPresenceStateChange(callback: (state: PresenceState) => void): void {
    this.onPresenceChange = callback;
  }

  // ─── Remote Players (architecture for future multiplayer) ──────────────

  /** Register a remote player */
  addRemotePlayer(state: RemotePlayerState): void {
    this.remotePlayers.set(state.sessionId, state);
  }

  /** Update a remote player's state */
  updateRemotePlayer(state: RemotePlayerState): void {
    this.remotePlayers.set(state.sessionId, state);
  }

  /** Remove a remote player */
  removeRemotePlayer(sessionId: string): void {
    this.remotePlayers.delete(sessionId);
  }

  /** Get all remote players */
  getRemotePlayers(): RemotePlayerState[] {
    return Array.from(this.remotePlayers.values());
  }

  /** Get count of all players (local + remote) */
  getTotalPlayerCount(): number {
    return 1 + this.remotePlayers.size;
  }
}
