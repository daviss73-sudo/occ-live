/**
 * OCC Live - Photobooth Session Manager
 * Central state machine orchestrating the entire photobooth lifecycle:
 * idle → queue → choice → solo/group → poses → countdown → capture → preview → reset
 *
 * Coordinates queue, invitations, pose selection, and capture.
 * Ensures fair access (front player gets priority), safe (consent verified),
 * and anonymous (no PII collected or displayed).
 */

import type {
  PhotoboothState,
  PhotoModeChoice,
  PhotoboothConfig,
  PhotoboothCallbacks,
  GroupPhotoSession,
  PhotoCaptureResult,
} from './photobooth-types.ts';
import { PhotoboothQueue } from './photobooth-queue.ts';
import { PhotoboothInvitationSystem } from './photobooth-invitation.ts';

export class PhotoboothSession {
  private config: PhotoboothConfig;
  private state: PhotoboothState = 'idle';
  private queue: PhotoboothQueue;
  private invitations: PhotoboothInvitationSystem;
  private callbacks: PhotoboothCallbacks = {};

  private activeSessionId: string | null = null;
  private chosenMode: PhotoModeChoice | null = null;
  private groupSession: GroupPhotoSession | null = null;
  private selectedPoseId: string | null = null;
  private countdownRemaining: number = 0;
  private countdownTimer: number | null = null;
  private lastCaptureResult: PhotoCaptureResult | null = null;
  private previewTimer: number | null = null;

  constructor(config: PhotoboothConfig) {
    this.config = config;
    this.queue = new PhotoboothQueue(config);
    this.invitations = new PhotoboothInvitationSystem(config);

    this.invitations.setOnAllResolved((accepted) => {
      this.onGroupFormed(accepted);
    });
    this.queue.setOnQueueChanged(() => {
      this.onQueueChanged();
    });
  }

  // ─── Player Actions ────────────────────────────────────────────────────

  /** Player joins queue. Returns position or null if full/no consent. */
  joinQueue(sessionId: string, hasPhotographyConsent: boolean): number | null {
    if (!this.config.enabled) return null;
    if (!hasPhotographyConsent) return null;

    const position = this.queue.join(sessionId, hasPhotographyConsent);
    if (position === null) return null;

    if (this.state === 'idle') this.transitionTo('queue_active');
    if (this.queue.isFront(sessionId) && this.state === 'queue_active') {
      this.presentChoice(sessionId);
    }

    this.callbacks.onQueueJoined?.(sessionId, position);
    return position;
  }

  /** Player leaves queue voluntarily */
  leaveQueue(sessionId: string): void {
    const wasFront = this.queue.isFront(sessionId);
    this.queue.leave(sessionId);
    this.callbacks.onQueueLeft?.(sessionId);

    if (wasFront && (this.state === 'choice_presented' || this.state === 'group_inviting')) {
      this.resetSession();
      this.advanceQueue();
    }
    if (this.queue.isEmpty() && this.state === 'queue_active') {
      this.transitionTo('idle');
    }
  }

  /** Front player chooses solo or group */
  makeChoice(sessionId: string, choice: PhotoModeChoice): void {
    if (this.state !== 'choice_presented') return;
    if (!this.queue.isFront(sessionId)) return;

    this.chosenMode = choice;
    this.activeSessionId = sessionId;

    if (choice === 'solo') {
      this.startSoloSession(sessionId);
    } else {
      this.startGroupInvitations(sessionId);
    }
  }

  /** Invited player responds */
  respondToInvitation(sessionId: string, accept: boolean): void {
    if (this.state !== 'group_inviting' && this.state !== 'group_forming') return;
    if (accept) {
      this.invitations.acceptInvitation(sessionId);
    } else {
      this.invitations.declineInvitation(sessionId);
    }
  }

  /** Participant selects a pose (initiator only for now) */
  selectPose(sessionId: string, poseId: string): void {
    if (this.state !== 'pose_selecting') return;
    if (sessionId !== this.activeSessionId) return;

    this.selectedPoseId = poseId;
    if (this.groupSession) this.groupSession.selectedPose = poseId;
    this.callbacks.onPoseSelected?.(poseId);
    this.startCountdown();
  }

  /** Store capture result (called by capture system after countdown ends) */
  setCaptureResult(result: PhotoCaptureResult): void {
    this.lastCaptureResult = result;
    this.transitionTo('preview');
    this.callbacks.onPhotoCaptured?.(result);

    if (this.config.previewDurationSeconds > 0) {
      this.previewTimer = window.setTimeout(() => {
        if (this.state === 'preview') this.completeSession();
      }, this.config.previewDurationSeconds * 1000);
    }
  }

  /** Player dismisses preview */
  dismissPreview(_sessionId: string): void {
    if (this.state === 'preview') this.completeSession();
  }

  /** Get capture result for download */
  getCaptureResult(): PhotoCaptureResult | null {
    return this.lastCaptureResult;
  }

  // ─── State Queries ─────────────────────────────────────────────────────

  getState(): PhotoboothState { return this.state; }
  getQueue(): PhotoboothQueue { return this.queue; }
  getInvitations(): PhotoboothInvitationSystem { return this.invitations; }
  getConfig(): PhotoboothConfig { return this.config; }
  getGroupSession(): GroupPhotoSession | null { return this.groupSession; }
  getChosenMode(): PhotoModeChoice | null { return this.chosenMode; }
  getSelectedPose(): string | null { return this.selectedPoseId; }
  getCountdownRemaining(): number { return this.countdownRemaining; }

  getParticipants(): string[] {
    if (this.chosenMode === 'solo' && this.activeSessionId) return [this.activeSessionId];
    return this.groupSession?.participants ?? [];
  }

  isParticipant(sessionId: string): boolean {
    return this.getParticipants().includes(sessionId);
  }

  isInUse(): boolean {
    return this.state !== 'idle' && this.state !== 'queue_active';
  }

  // ─── Callbacks ─────────────────────────────────────────────────────────

  setCallbacks(callbacks: PhotoboothCallbacks): void { this.callbacks = callbacks; }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  handleDisconnect(sessionId: string): void {
    this.queue.removeDisconnected(sessionId);
    this.invitations.handleDisconnect(sessionId);

    if (this.isParticipant(sessionId) && (this.state === 'countdown' || this.state === 'captured')) {
      this.abortSession();
    }
    if (sessionId === this.activeSessionId && this.state === 'choice_presented') {
      this.resetSession();
      this.advanceQueue();
    }
  }

  fullReset(): void {
    this.resetSession();
    this.queue.clear();
    this.transitionTo('idle');
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private transitionTo(state: PhotoboothState): void { this.state = state; }

  private presentChoice(sessionId: string): void {
    this.activeSessionId = sessionId;
    this.transitionTo('choice_presented');
    this.callbacks.onChoicePresented?.(sessionId);
  }

  private startSoloSession(sessionId: string): void {
    this.transitionTo('solo_active');
    this.queue.advance();
    this.callbacks.onSoloStarted?.(sessionId);
    this.transitionTo('pose_selecting');
  }

  private startGroupInvitations(sessionId: string): void {
    this.transitionTo('group_inviting');
    const eligible = this.queue.getEligibleForInvitation();
    const sentCount = this.invitations.sendInvitations(sessionId, eligible);
    this.callbacks.onGroupInvitationsSent?.(sessionId, sentCount);

    if (sentCount === 0) this.onGroupFormed([sessionId]);
  }

  private onGroupFormed(accepted: string[]): void {
    if (this.activeSessionId) this.queue.advance();
    for (const id of accepted) {
      if (id !== this.activeSessionId) this.queue.leave(id);
    }

    this.groupSession = {
      initiatorSessionId: this.activeSessionId!,
      participants: accepted,
      invitations: [],
      selectedPose: null,
      isLocked: false,
      maxParticipants: this.config.maxGroupSize,
    };

    this.transitionTo('pose_selecting');
    this.callbacks.onGroupFormed?.(accepted);
  }

  private startCountdown(): void {
    this.transitionTo('countdown');
    this.countdownRemaining = this.config.countdownSeconds;
    if (this.groupSession) this.groupSession.isLocked = true;
    this.callbacks.onCountdownStarted?.(this.countdownRemaining);

    this.countdownTimer = window.setInterval(() => {
      this.countdownRemaining--;
      if (this.countdownRemaining <= 0) {
        this.clearCountdownTimer();
        this.transitionTo('captured');
      }
    }, 1000);
  }

  private completeSession(): void {
    this.clearPreviewTimer();
    this.resetSession();
    this.callbacks.onSessionComplete?.();
    this.advanceQueue();
  }

  private abortSession(): void {
    this.clearCountdownTimer();
    this.clearPreviewTimer();
    this.resetSession();
    this.advanceQueue();
  }

  private resetSession(): void {
    this.activeSessionId = null;
    this.chosenMode = null;
    this.groupSession = null;
    this.selectedPoseId = null;
    this.countdownRemaining = 0;
    this.lastCaptureResult = null;
    this.invitations.reset();
    this.clearCountdownTimer();
    this.clearPreviewTimer();
  }

  private advanceQueue(): void {
    if (this.queue.isEmpty()) {
      this.transitionTo('idle');
    } else {
      this.transitionTo('queue_active');
      const front = this.queue.getFront();
      if (front) this.presentChoice(front.sessionId);
    }
  }

  private onQueueChanged(): void {
    if (this.state === 'idle' && !this.queue.isEmpty()) {
      this.transitionTo('queue_active');
      const front = this.queue.getFront();
      if (front) this.presentChoice(front.sessionId);
    }
  }

  private clearCountdownTimer(): void {
    if (this.countdownTimer !== null) { clearInterval(this.countdownTimer); this.countdownTimer = null; }
  }
  private clearPreviewTimer(): void {
    if (this.previewTimer !== null) { clearTimeout(this.previewTimer); this.previewTimer = null; }
  }
}
