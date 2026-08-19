/**
 * OCC Live - Event Sync (Part 7)
 * Multiplayer event state synchronization. Ensures all connected
 * clients see the same event state. New players joining during an
 * active event receive the current state immediately.
 *
 * Design:
 * - Serializable EventSyncState broadcast to all clients
 * - On connect: server sends current event state with welcome message
 * - On state change: broadcast to all connected clients
 * - Client-side: applies received state via EventManager
 */

import type { EventSyncState } from './event-types.ts';
import type { EventManager } from './event-manager.ts';

// ─── Sync Message Types ──────────────────────────────────────────────────────

export interface EventSyncMessage {
  type: 'event_state_update';
  state: EventSyncState;
  timestamp: number;
}

// ─── Event Sync System ───────────────────────────────────────────────────────

export class EventSyncSystem {
  private eventManager: EventManager;
  private lastBroadcastState: string = '';
  private onBroadcast: ((message: EventSyncMessage) => void) | null = null;

  constructor(eventManager: EventManager) {
    this.eventManager = eventManager;
  }

  /** Set the broadcast callback (wires to network manager) */
  setOnBroadcast(callback: (message: EventSyncMessage) => void): void {
    this.onBroadcast = callback;
  }

  /**
   * Check if the event state has changed and broadcast if so.
   * Call periodically (e.g. every few seconds) or on state transitions.
   */
  checkAndBroadcast(): void {
    const state = this.eventManager.getSyncState();
    const serialized = JSON.stringify(state);

    if (serialized !== this.lastBroadcastState) {
      this.lastBroadcastState = serialized;
      this.broadcast(state);
    }
  }

  /**
   * Apply a received sync state from the server/another client.
   * Used when a new player joins during an active event.
   */
  applyReceivedState(message: EventSyncMessage): void {
    const state = message.state;

    if (state.activeEventId && state.state === 'active') {
      // There's an active event we need to sync to
      this.eventManager.applySyncState(state);
      console.log(`[EventSync] Applied remote event state: ${state.eventName} (${state.state})`);
    } else if (!state.activeEventId && this.eventManager.isEventActive()) {
      // Remote says no event but we have one — force end
      this.eventManager.forceEnd();
      console.log(`[EventSync] Remote indicates no active event — ending local`);
    }
  }

  /** Get the current sync state for sending to new connections */
  getCurrentState(): EventSyncState {
    return this.eventManager.getSyncState();
  }

  /** Create a sync message from current state */
  createSyncMessage(): EventSyncMessage {
    return {
      type: 'event_state_update',
      state: this.eventManager.getSyncState(),
      timestamp: Date.now(),
    };
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private broadcast(state: EventSyncState): void {
    if (this.onBroadcast) {
      this.onBroadcast({
        type: 'event_state_update',
        state,
        timestamp: Date.now(),
      });
    }
  }
}
