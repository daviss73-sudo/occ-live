/**
 * OCC Live - Photobooth Multiplayer Sync
 * Synchronizes photobooth state across connected clients.
 * Other players see queue status, active session, posed avatars.
 */

import type { PhotoboothSyncState, PhotoModeChoice } from './photobooth-types.ts';
import type { PhotoboothSession } from './photobooth-session.ts';

export interface PhotoboothSyncMessage {
  type: 'photobooth_state';
  boothId: string;
  state: PhotoboothSyncState;
  timestamp: number;
}

export class PhotoboothSync {
  private session: PhotoboothSession;
  private boothId: string;
  private onBroadcast: ((msg: PhotoboothSyncMessage) => void) | null = null;
  private lastState: string = '';

  constructor(session: PhotoboothSession, boothId: string) {
    this.session = session;
    this.boothId = boothId;
  }

  setOnBroadcast(callback: (msg: PhotoboothSyncMessage) => void): void {
    this.onBroadcast = callback;
  }

  /** Check and broadcast if state changed */
  checkAndBroadcast(): void {
    const state = this.getSyncState();
    const serialized = JSON.stringify(state);
    if (serialized !== this.lastState) {
      this.lastState = serialized;
      this.onBroadcast?.({ type: 'photobooth_state', boothId: this.boothId, state, timestamp: Date.now() });
    }
  }

  getSyncState(): PhotoboothSyncState {
    const queue = this.session.getQueue();
    const participants = this.session.getParticipants();
    const mode = this.session.getChosenMode();

    return {
      boothId: this.boothId,
      state: this.session.getState(),
      queue: queue.getSyncState(),
      activeSession: this.session.isInUse() ? {
        initiator: participants[0] ?? '',
        mode: mode as PhotoModeChoice | null,
        participants,
        selectedPose: this.session.getSelectedPose(),
        countdownRemaining: this.session.getCountdownRemaining(),
      } : null,
    };
  }

  applyRemoteState(_state: PhotoboothSyncState): void {
    // Observers update their local view from server authority
  }
}
