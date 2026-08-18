/**
 * OCC Live - Network Manager (Part 3)
 * Client-side WebSocket connection management. Handles connect,
 * disconnect, reconnection, and message routing. Decoupled from
 * gameplay logic — communicates via callbacks.
 */

import type {
  MultiplayerConfig,
  ClientMessage,
  ServerMessage,
  SyncPlayerState,
  SeatState,
  InteractionSyncState,
} from '../types/multiplayer.ts';
import type { AvatarConfig } from '../types/avatar.ts';
import type { Vec3 } from '../types/index.ts';
import type { ConsentPreferences } from '../types/consent.ts';
import type { AnimationState, SocialAnimation, EmoteType } from '../types/avatar.ts';

export interface NetworkCallbacks {
  onConnected: (sessionId: string, players: SyncPlayerState[], seats: SeatState[]) => void;
  onPlayerJoined: (player: SyncPlayerState) => void;
  onPlayerLeft: (sessionId: string) => void;
  onPlayerState: (sessionId: string, position: Vec3, rotation: Vec3, animationState: string, interactionState: InteractionSyncState | null, activityState: string) => void;
  onWorldState: (players: SyncPlayerState[], seats: SeatState[], playerCount: number) => void;
  onSeatUpdate: (seat: SeatState) => void;
  onDisconnected: () => void;
  onError: (message: string) => void;
}

export class NetworkManager {
  private config: MultiplayerConfig;
  private ws: WebSocket | null = null;
  private callbacks: NetworkCallbacks;
  private sessionId: string | null = null;
  private connected: boolean = false;
  private reconnectTimer: number | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private lastSentState: string = '';
  private sendTimer: number | null = null;
  private pendingState: ClientMessage | null = null;

  private pendingJoin: { avatarConfig: AvatarConfig; consentPreferences: ConsentPreferences; spawnPosition: Vec3 } | null = null;

  constructor(config: MultiplayerConfig, callbacks: NetworkCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /** Connect to the multiplayer server */
  connect(): void {
    if (this.ws) {
      this.ws.close();
    }

    try {
      this.ws = new WebSocket(this.config.serverUrl);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        console.log('[Network] Connected to multiplayer server');

        // Auto-send pending join if queued
        if (this.pendingJoin) {
          this.join(this.pendingJoin.avatarConfig, this.pendingJoin.consentPreferences, this.pendingJoin.spawnPosition);
          this.pendingJoin = null;
        }
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data as string);
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.sessionId = null;
        this.callbacks.onDisconnected();
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // onclose will fire after onerror
      };
    } catch (e) {
      console.warn('[Network] Connection failed:', e);
      this.scheduleReconnect();
    }
  }

  /** Disconnect from the server */
  disconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.sendTimer !== null) {
      clearInterval(this.sendTimer);
      this.sendTimer = null;
    }
    if (this.ws) {
      this.send({ type: 'leave' });
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.sessionId = null;
  }

  /** Send join message after connecting */
  join(avatarConfig: AvatarConfig, consentPreferences: ConsentPreferences, spawnPosition: Vec3): void {
    if (!this.connected) {
      // Queue join for when connection opens
      this.pendingJoin = { avatarConfig, consentPreferences, spawnPosition };
      return;
    }

    this.send({
      type: 'join',
      avatarConfig,
      consentPreferences,
      spawnPosition,
    });

    // Start the rate-limited state sender
    if (this.sendTimer === null) {
      this.sendTimer = window.setInterval(() => {
        this.flushPendingState();
      }, this.config.syncRateMs);
    }
  }

  /** Queue a state update (rate-limited, only sends if changed) */
  sendStateUpdate(
    position: Vec3,
    rotation: Vec3,
    animationState: AnimationState | SocialAnimation | EmoteType,
    interactionState: InteractionSyncState | null
  ): void {
    // Only queue if something changed (delta compression)
    const stateKey = `${position[0].toFixed(2)},${position[1].toFixed(2)},${position[2].toFixed(2)},${rotation[1].toFixed(2)},${animationState},${interactionState?.interactionType ?? 'none'}`;

    if (stateKey === this.lastSentState) return;
    this.lastSentState = stateKey;

    this.pendingState = {
      type: 'state_update',
      position,
      rotation,
      animationState,
      interactionState,
    };
  }

  /** Claim a seat */
  claimSeat(seatId: string, zoneId: string, position: Vec3): void {
    this.send({
      type: 'seat_claim',
      seatId,
      zoneId,
      position,
    });
  }

  /** Release a seat */
  releaseSeat(seatId: string): void {
    this.send({
      type: 'seat_release',
      seatId,
    });
  }

  /** Get session ID */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /** Is connected? */
  isConnected(): boolean {
    return this.connected && this.sessionId !== null;
  }

  /** Get connection status string */
  getStatus(): string {
    if (this.connected && this.sessionId) return 'connected';
    if (this.connected) return 'connecting';
    if (this.reconnectAttempts > 0) return 'reconnecting';
    return 'disconnected';
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private send(msg: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private flushPendingState(): void {
    if (this.pendingState) {
      this.send(this.pendingState);
      this.pendingState = null;
    }
  }

  private handleMessage(data: string): void {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'welcome':
        this.sessionId = msg.sessionId;
        this.callbacks.onConnected(msg.sessionId, msg.players, msg.seats);
        break;

      case 'player_joined':
        this.callbacks.onPlayerJoined(msg.player);
        break;

      case 'player_left':
        this.callbacks.onPlayerLeft(msg.sessionId);
        break;

      case 'player_state':
        this.callbacks.onPlayerState(
          msg.sessionId,
          msg.position,
          msg.rotation,
          msg.animationState,
          msg.interactionState,
          msg.activityState
        );
        break;

      case 'world_state':
        this.callbacks.onWorldState(msg.players, msg.seats, msg.playerCount);
        break;

      case 'seat_update':
        this.callbacks.onSeatUpdate(msg.seat);
        break;

      case 'error':
        this.callbacks.onError(msg.message);
        console.warn('[Network] Server error:', msg.message);
        break;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[Network] Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;

    console.log(`[Network] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}
