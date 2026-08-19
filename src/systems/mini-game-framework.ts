/**
 * OCC Live - Mini-Game Framework (Part 6)
 * Reusable base framework for mini-games within activity zones.
 * Provides a state machine, player registration, zone binding,
 * and scoring placeholder. Individual games extend this base.
 *
 * Design:
 * - State machine: idle → waiting → playing → complete → idle
 * - Player registration with max player limit
 * - Zone-bound: games activate within their designated area
 * - Multiplayer-aware: state synced across clients
 * - Timer support for timed challenges
 * - No games implemented beyond framework in Part 6
 * - Future games added by extending MiniGameBase
 */

import type { Vec3 } from '../types/index.ts';

// ─── Mini-Game Types ─────────────────────────────────────────────────────────

export type MiniGameState = 'idle' | 'waiting' | 'playing' | 'complete';

export interface MiniGameConfig {
  id: string;
  name: string;
  description: string;
  position: Vec3;
  radius: number;
  maxPlayers: number;
  minPlayers: number;
  /** Duration in seconds (0 = no time limit) */
  duration: number;
  /** Cooldown between games in seconds */
  cooldown: number;
  /** Zone this game belongs to */
  zoneId: string;
  enabled: boolean;
}

export interface MiniGamePlayer {
  sessionId: string;
  joinedAt: number;
  score: number;
  isReady: boolean;
}

// ─── Mini-Game Sync State ────────────────────────────────────────────────────

export interface MiniGameSyncState {
  gameId: string;
  state: MiniGameState;
  players: Array<{ sessionId: string; score: number }>;
  timeRemaining: number;
}

// ─── Mini-Game Base Class ────────────────────────────────────────────────────

export class MiniGameBase {
  protected config: MiniGameConfig;
  protected state: MiniGameState = 'idle';
  protected players: Map<string, MiniGamePlayer> = new Map();
  protected timeRemaining: number = 0;
  protected cooldownTimer: number = 0;
  protected onStateChange: ((gameId: string, state: MiniGameState) => void) | null = null;

  constructor(config: MiniGameConfig) {
    this.config = config;
  }

  // ─── State Machine ─────────────────────────────────────────────────────

  /** Get current game state */
  getState(): MiniGameState {
    return this.state;
  }

  /** Get the config */
  getConfig(): MiniGameConfig {
    return this.config;
  }

  /** Transition to a new state */
  protected transition(newState: MiniGameState): void {
    const prev = this.state;
    this.state = newState;

    switch (newState) {
      case 'idle':
        this.onEnterIdle();
        break;
      case 'waiting':
        this.onEnterWaiting();
        break;
      case 'playing':
        this.onEnterPlaying();
        break;
      case 'complete':
        this.onEnterComplete();
        break;
    }

    this.onStateChange?.(this.config.id, newState);
  }

  // ─── Player Management ─────────────────────────────────────────────────

  /** A player joins the game */
  joinGame(sessionId: string): boolean {
    if (this.state !== 'idle' && this.state !== 'waiting') return false;
    if (this.players.size >= this.config.maxPlayers) return false;
    if (this.players.has(sessionId)) return false;

    this.players.set(sessionId, {
      sessionId,
      joinedAt: Date.now(),
      score: 0,
      isReady: false,
    });

    // Move to waiting state if first player
    if (this.state === 'idle') {
      this.transition('waiting');
    }

    // Auto-start if min players reached and all ready
    this.checkAutoStart();

    return true;
  }

  /** A player leaves the game */
  leaveGame(sessionId: string): void {
    this.players.delete(sessionId);

    // If no players left, return to idle
    if (this.players.size === 0 && this.state !== 'idle') {
      this.transition('idle');
    }
  }

  /** Mark a player as ready */
  setReady(sessionId: string, ready: boolean): void {
    const player = this.players.get(sessionId);
    if (player) {
      player.isReady = ready;
      this.checkAutoStart();
    }
  }

  /** Get all current players */
  getPlayers(): MiniGamePlayer[] {
    return Array.from(this.players.values());
  }

  /** Get player count */
  getPlayerCount(): number {
    return this.players.size;
  }

  /** Is a player in this game? */
  hasPlayer(sessionId: string): boolean {
    return this.players.has(sessionId);
  }

  // ─── Game Control ──────────────────────────────────────────────────────

  /** Force start the game (dev mode or when conditions met) */
  start(): boolean {
    if (this.state !== 'waiting') return false;
    if (this.players.size < this.config.minPlayers) return false;
    this.transition('playing');
    return true;
  }

  /** End the game */
  end(): void {
    if (this.state !== 'playing') return;
    this.transition('complete');

    // Start cooldown before returning to idle
    this.cooldownTimer = this.config.cooldown;
  }

  /** Reset the game to idle */
  reset(): void {
    this.players.clear();
    this.timeRemaining = 0;
    this.cooldownTimer = 0;
    this.transition('idle');
  }

  // ─── Update ────────────────────────────────────────────────────────────

  /** Update the game — call each frame */
  update(dt: number): void {
    switch (this.state) {
      case 'playing':
        this.updatePlaying(dt);
        break;
      case 'complete':
        this.updateComplete(dt);
        break;
    }
  }

  // ─── Scoring ───────────────────────────────────────────────────────────

  /** Add score to a player */
  addScore(sessionId: string, points: number): void {
    const player = this.players.get(sessionId);
    if (player) {
      player.score += points;
    }
  }

  /** Get the leader (highest score) */
  getLeader(): MiniGamePlayer | null {
    let leader: MiniGamePlayer | null = null;
    for (const player of this.players.values()) {
      if (!leader || player.score > leader.score) {
        leader = player;
      }
    }
    return leader;
  }

  // ─── Sync ──────────────────────────────────────────────────────────────

  /** Get sync state for multiplayer */
  getSyncState(): MiniGameSyncState {
    return {
      gameId: this.config.id,
      state: this.state,
      players: Array.from(this.players.values()).map(p => ({
        sessionId: p.sessionId,
        score: p.score,
      })),
      timeRemaining: this.timeRemaining,
    };
  }

  /** Apply sync state from remote */
  applySyncState(syncState: MiniGameSyncState): void {
    this.state = syncState.state;
    this.timeRemaining = syncState.timeRemaining;

    for (const sp of syncState.players) {
      const existing = this.players.get(sp.sessionId);
      if (existing) {
        existing.score = sp.score;
      } else {
        this.players.set(sp.sessionId, {
          sessionId: sp.sessionId,
          joinedAt: Date.now(),
          score: sp.score,
          isReady: true,
        });
      }
    }
  }

  /** Set state change callback */
  setOnStateChange(callback: (gameId: string, state: MiniGameState) => void): void {
    this.onStateChange = callback;
  }

  // ─── Protected: Override Points ────────────────────────────────────────

  /** Called when entering idle state — override in subclass */
  protected onEnterIdle(): void {}

  /** Called when entering waiting state — override in subclass */
  protected onEnterWaiting(): void {}

  /** Called when entering playing state — override in subclass */
  protected onEnterPlaying(): void {
    if (this.config.duration > 0) {
      this.timeRemaining = this.config.duration;
    }
  }

  /** Called when entering complete state — override in subclass */
  protected onEnterComplete(): void {}

  /** Called each frame during playing state — override in subclass */
  protected updatePlaying(dt: number): void {
    // Timer countdown
    if (this.config.duration > 0 && this.timeRemaining > 0) {
      this.timeRemaining -= dt;
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.end();
      }
    }
  }

  /** Called each frame during complete state */
  private updateComplete(dt: number): void {
    this.cooldownTimer -= dt;
    if (this.cooldownTimer <= 0) {
      this.reset();
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private checkAutoStart(): void {
    if (this.state !== 'waiting') return;
    if (this.players.size < this.config.minPlayers) return;

    const allReady = Array.from(this.players.values()).every(p => p.isReady);
    if (allReady) {
      this.start();
    }
  }
}

// ─── Mini-Game Registry ──────────────────────────────────────────────────────

export class MiniGameRegistry {
  private games: Map<string, MiniGameBase> = new Map();

  /** Register a mini-game */
  register(game: MiniGameBase): void {
    this.games.set(game.getConfig().id, game);
  }

  /** Get a game by ID */
  get(id: string): MiniGameBase | undefined {
    return this.games.get(id);
  }

  /** Get all registered games */
  getAll(): MiniGameBase[] {
    return Array.from(this.games.values());
  }

  /** Get games in a specific zone */
  getByZone(zoneId: string): MiniGameBase[] {
    return Array.from(this.games.values()).filter(g => g.getConfig().zoneId === zoneId);
  }

  /** Update all games */
  update(dt: number): void {
    for (const game of this.games.values()) {
      game.update(dt);
    }
  }

  /** Remove a player from all games (disconnect) */
  removePlayer(sessionId: string): void {
    for (const game of this.games.values()) {
      if (game.hasPlayer(sessionId)) {
        game.leaveGame(sessionId);
      }
    }
  }

  /** Get all sync states */
  getAllSyncStates(): MiniGameSyncState[] {
    return Array.from(this.games.values()).map(g => g.getSyncState());
  }
}
