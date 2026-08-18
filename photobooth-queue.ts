/**
 * OCC Live - Photobooth Queue System
 * Manages an orderly virtual queue for the photobooth.
 * Players are represented by avatar (session ID) only — no names,
 * nicknames, or identifying information displayed.
 *
 * Design:
 * - Fair FIFO ordering
 * - Position tracking with human-friendly messages
 * - Auto-cleanup on disconnect
 * - Players who decline group invitations keep their position
 * - Configurable max queue length
 */

import type { QueueEntry, QueuePositionMessage, PhotoboothConfig } from './photobooth-types.ts';

export class PhotoboothQueue {
  private queue: QueueEntry[] = [];
  private config: PhotoboothConfig;
  private onQueueChanged: (() => void) | null = null;

  constructor(config: PhotoboothConfig) {
    this.config = config;
  }

  // ─── Queue Operations ──────────────────────────────────────────────────

  /**
   * Add a player to the queue.
   * Returns the queue position (1-based), or null if queue is full.
   */
  join(sessionId: string, hasPhotographyConsent: boolean): number | null {
    if (this.isInQueue(sessionId)) {
      return this.getPosition(sessionId);
    }
    if (this.queue.length >= this.config.maxQueueLength) {
      return null;
    }

    const position = this.queue.length + 1;
    this.queue.push({
      sessionId,
      position,
      joinedAt: Date.now(),
      hasPhotographyConsent,
    });

    this.onQueueChanged?.();
    return position;
  }

  /**
   * Remove a player from the queue (left voluntarily or disconnected).
   * Reorders remaining players to fill the gap.
   */
  leave(sessionId: string): boolean {
    const index = this.queue.findIndex(e => e.sessionId === sessionId);
    if (index === -1) return false;

    this.queue.splice(index, 1);
    this.reindex();
    this.onQueueChanged?.();
    return true;
  }

  /**
   * Advance the queue: remove the front player (they've started their session).
   * Returns the new front player's session ID, or null if empty.
   */
  advance(): string | null {
    if (this.queue.length === 0) return null;

    this.queue.shift();
    this.reindex();
    this.onQueueChanged?.();

    return this.getFront()?.sessionId ?? null;
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get the player at the front of the queue */
  getFront(): QueueEntry | null {
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  /** Get a player's position (1-based), or null if not in queue */
  getPosition(sessionId: string): number | null {
    const entry = this.queue.find(e => e.sessionId === sessionId);
    return entry?.position ?? null;
  }

  /** Check if a player is in the queue */
  isInQueue(sessionId: string): boolean {
    return this.queue.some(e => e.sessionId === sessionId);
  }

  /** Is the given player at the front? */
  isFront(sessionId: string): boolean {
    return this.queue.length > 0 && this.queue[0].sessionId === sessionId;
  }

  /** Get the current queue length */
  getLength(): number {
    return this.queue.length;
  }

  /** Is the queue empty? */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /** Is the queue full? */
  isFull(): boolean {
    return this.queue.length >= this.config.maxQueueLength;
  }

  /** Get all queue entries */
  getAll(): QueueEntry[] {
    return [...this.queue];
  }

  /** Get waiting players who have photography consent (eligible for group invitations) */
  getEligibleForInvitation(): QueueEntry[] {
    if (this.queue.length <= 1) return [];
    return this.queue.slice(1).filter(e => e.hasPhotographyConsent);
  }

  /**
   * Get a human-friendly queue position message.
   * No identifying information about other players is included.
   */
  getPositionMessage(sessionId: string): QueuePositionMessage | null {
    const position = this.getPosition(sessionId);
    if (position === null) return null;

    const totalAhead = position - 1;
    let message: string;

    if (totalAhead === 0) {
      message = "You're next!";
    } else if (totalAhead === 1) {
      message = "1 player ahead of you.";
    } else {
      message = `You're #${position} in line. ${totalAhead} players ahead of you.`;
    }

    return { position, totalAhead, message };
  }

  // ─── Consent ───────────────────────────────────────────────────────────

  /** Check if a queued player has photography consent */
  hasConsent(sessionId: string): boolean {
    return this.queue.find(e => e.sessionId === sessionId)?.hasPhotographyConsent ?? false;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  /** Remove disconnected player */
  removeDisconnected(sessionId: string): void {
    this.leave(sessionId);
  }

  /** Clear all */
  clear(): void {
    this.queue = [];
    this.onQueueChanged?.();
  }

  /** Set callback for queue changes */
  setOnQueueChanged(callback: () => void): void {
    this.onQueueChanged = callback;
  }

  // ─── Sync ──────────────────────────────────────────────────────────────

  /** Get sync-friendly state */
  getSyncState(): Array<{ sessionId: string; position: number }> {
    return this.queue.map(e => ({ sessionId: e.sessionId, position: e.position }));
  }

  /** Apply sync state from remote */
  applySyncState(entries: Array<{ sessionId: string; position: number }>, consentLookup: (sessionId: string) => boolean): void {
    this.queue = entries.map(e => ({
      sessionId: e.sessionId,
      position: e.position,
      joinedAt: Date.now(),
      hasPhotographyConsent: consentLookup(e.sessionId),
    }));
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private reindex(): void {
    for (let i = 0; i < this.queue.length; i++) {
      this.queue[i].position = i + 1;
    }
  }
}
