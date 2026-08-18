/**
 * OCC Live - World Event System
 * Provides hooks for future event-driven world modifications.
 * Events can modify lighting, music, NPC population, stage state,
 * and district access without rebuilding the environment.
 */

import type { WorldEvent, WorldEventType, WorldEventListener, WorldState } from '../types/index.ts';

export class WorldEventSystem {
  private listeners: Map<WorldEventType, WorldEventListener[]> = new Map();
  private eventLog: WorldEvent[] = [];
  private worldState: WorldState;

  constructor(initialState: WorldState) {
    this.worldState = initialState;
  }

  /** Subscribe to a world event type */
  on(type: WorldEventType, listener: WorldEventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  /** Unsubscribe from a world event type */
  off(type: WorldEventType, listener: WorldEventListener): void {
    const list = this.listeners.get(type);
    if (list) {
      const idx = list.indexOf(listener);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  /** Emit a world event */
  emit(type: WorldEventType, payload: Record<string, unknown> = {}): void {
    const event: WorldEvent = {
      type,
      payload,
      timestamp: Date.now(),
    };

    this.eventLog.push(event);
    const list = this.listeners.get(type);
    if (list) {
      for (const listener of list) {
        listener(event);
      }
    }
  }

  /** Get current world state */
  getWorldState(): WorldState {
    return this.worldState;
  }

  /** Change world state (triggers lightingChanged event) */
  setWorldState(state: WorldState): void {
    this.worldState = state;
    this.emit('lightingChanged', { state });
  }

  /** Get event history (for debugging / replay) */
  getEventLog(): WorldEvent[] {
    return [...this.eventLog];
  }

  /** Clear event log */
  clearLog(): void {
    this.eventLog = [];
  }
}
