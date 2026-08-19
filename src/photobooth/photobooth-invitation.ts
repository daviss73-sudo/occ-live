/**
 * OCC Live - Photobooth Invitation System
 * Manages voluntary group photo invitations. When the front player
 * chooses "Invite Others," eligible waiting players each receive an
 * individual invitation they can accept or decline.
 *
 * Core rules:
 * - No player is automatically added to someone else's photo
 * - Each invited player independently chooses JOIN or STAY IN LINE
 * - Declining keeps the player in their original queue position
 * - Invitations have a configurable timeout (default 15s)
 * - Players without photography consent are never invited
 * - Maximum group size enforced (default 6)
 */

import type {
  PhotoInvitation,
  PhotoboothConfig,
  QueueEntry,
} from './photobooth-types.ts';

export class PhotoboothInvitationSystem {
  private config: PhotoboothConfig;
  private activeInvitations: Map<string, PhotoInvitation> = new Map();
  private initiatorSessionId: string | null = null;
  private acceptedCount: number = 0;
  private onInvitationSent: ((invitation: PhotoInvitation) => void) | null = null;
  private onInvitationResolved: ((invitation: PhotoInvitation) => void) | null = null;
  private onAllResolved: ((accepted: string[]) => void) | null = null;
  private timeoutTimers: Map<string, number> = new Map();

  constructor(config: PhotoboothConfig) {
    this.config = config;
  }

  // ─── Sending Invitations ───────────────────────────────────────────────

  /**
   * Send invitations to all eligible waiting players.
   * Only players with photography consent are invited.
   */
  sendInvitations(initiatorSessionId: string, eligiblePlayers: QueueEntry[]): number {
    this.reset();
    this.initiatorSessionId = initiatorSessionId;
    this.acceptedCount = 1; // Initiator counts as first participant

    const maxInvites = this.config.maxGroupSize - 1;
    const toInvite = eligiblePlayers
      .filter(p => p.hasPhotographyConsent)
      .slice(0, maxInvites);

    for (const player of toInvite) {
      const invitation: PhotoInvitation = {
        id: `invite_${initiatorSessionId}_${player.sessionId}_${Date.now()}`,
        initiatorSessionId,
        invitedSessionId: player.sessionId,
        response: 'pending',
        sentAt: Date.now(),
        expiresAt: Date.now() + this.config.invitationTimeoutSeconds * 1000,
        hasConsent: player.hasPhotographyConsent,
      };

      this.activeInvitations.set(player.sessionId, invitation);
      this.onInvitationSent?.(invitation);

      const timer = window.setTimeout(() => {
        this.handleTimeout(player.sessionId);
      }, this.config.invitationTimeoutSeconds * 1000);
      this.timeoutTimers.set(player.sessionId, timer);
    }

    return toInvite.length;
  }

  // ─── Responding ────────────────────────────────────────────────────────

  /** Player accepts. Returns false if group full or invalid. */
  acceptInvitation(sessionId: string): boolean {
    const invitation = this.activeInvitations.get(sessionId);
    if (!invitation || invitation.response !== 'pending') return false;

    if (this.acceptedCount >= this.config.maxGroupSize) {
      invitation.response = 'declined';
      this.clearTimer(sessionId);
      this.onInvitationResolved?.(invitation);
      this.checkAllResolved();
      return false;
    }

    invitation.response = 'accepted';
    this.acceptedCount++;
    this.clearTimer(sessionId);
    this.onInvitationResolved?.(invitation);
    this.checkAllResolved();
    return true;
  }

  /** Player declines. They remain in their queue position. */
  declineInvitation(sessionId: string): void {
    const invitation = this.activeInvitations.get(sessionId);
    if (!invitation || invitation.response !== 'pending') return;

    invitation.response = 'declined';
    this.clearTimer(sessionId);
    this.onInvitationResolved?.(invitation);
    this.checkAllResolved();
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  getInvitation(sessionId: string): PhotoInvitation | null {
    return this.activeInvitations.get(sessionId) ?? null;
  }

  hasPendingInvitation(sessionId: string): boolean {
    const inv = this.activeInvitations.get(sessionId);
    return inv?.response === 'pending';
  }

  getAcceptedParticipants(): string[] {
    const accepted: string[] = [];
    if (this.initiatorSessionId) accepted.push(this.initiatorSessionId);
    for (const inv of this.activeInvitations.values()) {
      if (inv.response === 'accepted') accepted.push(inv.invitedSessionId);
    }
    return accepted;
  }

  getParticipantCount(): number { return this.acceptedCount; }
  isGroupFull(): boolean { return this.acceptedCount >= this.config.maxGroupSize; }

  areAllResolved(): boolean {
    for (const inv of this.activeInvitations.values()) {
      if (inv.response === 'pending') return false;
    }
    return true;
  }

  getPendingCount(): number {
    let count = 0;
    for (const inv of this.activeInvitations.values()) {
      if (inv.response === 'pending') count++;
    }
    return count;
  }

  getTimeRemaining(sessionId: string): number {
    const inv = this.activeInvitations.get(sessionId);
    if (!inv || inv.response !== 'pending') return 0;
    return Math.max(0, Math.ceil((inv.expiresAt - Date.now()) / 1000));
  }

  getInitiator(): string | null { return this.initiatorSessionId; }

  // ─── Callbacks ─────────────────────────────────────────────────────────

  setOnInvitationSent(cb: (inv: PhotoInvitation) => void): void { this.onInvitationSent = cb; }
  setOnInvitationResolved(cb: (inv: PhotoInvitation) => void): void { this.onInvitationResolved = cb; }
  setOnAllResolved(cb: (accepted: string[]) => void): void { this.onAllResolved = cb; }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  reset(): void {
    for (const timer of this.timeoutTimers.values()) clearTimeout(timer);
    this.timeoutTimers.clear();
    this.activeInvitations.clear();
    this.initiatorSessionId = null;
    this.acceptedCount = 0;
  }

  handleDisconnect(sessionId: string): void {
    const inv = this.activeInvitations.get(sessionId);
    if (inv && inv.response === 'pending') {
      inv.response = 'declined';
      this.clearTimer(sessionId);
      this.onInvitationResolved?.(inv);
      this.checkAllResolved();
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private handleTimeout(sessionId: string): void {
    const inv = this.activeInvitations.get(sessionId);
    if (!inv || inv.response !== 'pending') return;
    inv.response = 'timeout';
    this.timeoutTimers.delete(sessionId);
    this.onInvitationResolved?.(inv);
    this.checkAllResolved();
  }

  private checkAllResolved(): void {
    if (this.areAllResolved()) {
      this.onAllResolved?.(this.getAcceptedParticipants());
    }
  }

  private clearTimer(sessionId: string): void {
    const timer = this.timeoutTimers.get(sessionId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timeoutTimers.delete(sessionId);
    }
  }
}
