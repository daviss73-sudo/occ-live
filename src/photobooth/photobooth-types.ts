/**
 * OCC Live - Photobooth System Type Definitions
 * Complete type system for the queue-based photobooth with solo/group
 * selection, voluntary invitation system, consent verification,
 * pre-approved pose library, and local-only photo capture.
 *
 * Core design principles:
 * - No player is automatically included in another's photo
 * - Three distinct states: waiting, solo photo, invited to group
 * - Being in queue ≠ consent to appear in someone else's photo
 * - Players must actively choose to join
 * - Photography consent and physical-contact consent are separate
 * - Photos are local-only (no Firebase, no server upload, no PII)
 * - Applies universally to all photobooths in OCC Live
 */

import type { Vec3 } from '../types/index.ts';

// ─── Photobooth State Machine ────────────────────────────────────────────────

export type PhotoboothState =
  | 'idle'              // No one using the booth
  | 'queue_active'     // Players in queue, waiting
  | 'choice_presented' // Front player choosing solo or group
  | 'solo_active'      // Solo photo session in progress
  | 'group_inviting'   // Invitations being sent to waiting players
  | 'group_forming'    // Responses being collected
  | 'pose_selecting'   // Participants choosing an approved pose
  | 'countdown'        // 3-2-1 countdown (locked — no changes)
  | 'captured'         // Photo just taken, brief hold
  | 'preview'          // Participants viewing/downloading the photo
  | 'resetting';       // Cleaning up, next player advancing

// ─── Queue ───────────────────────────────────────────────────────────────────

export interface QueueEntry {
  /** Player session ID */
  sessionId: string;
  /** Position in queue (1-based) */
  position: number;
  /** Timestamp of when they joined the queue */
  joinedAt: number;
  /** Whether this player has photography consent */
  hasPhotographyConsent: boolean;
}

// ─── Photo Mode Choice ───────────────────────────────────────────────────────

export type PhotoModeChoice = 'solo' | 'group';

// ─── Invitation ──────────────────────────────────────────────────────────────

export type InvitationResponse = 'pending' | 'accepted' | 'declined' | 'timeout';

export interface PhotoInvitation {
  /** Unique invitation ID */
  id: string;
  /** Session ID of the player who initiated (front of queue) */
  initiatorSessionId: string;
  /** Session ID of the invited player */
  invitedSessionId: string;
  /** Current response state */
  response: InvitationResponse;
  /** When the invitation was sent */
  sentAt: number;
  /** When the invitation expires */
  expiresAt: number;
  /** Whether the invited player has photography consent */
  hasConsent: boolean;
}

// ─── Group Photo Session ─────────────────────────────────────────────────────

export interface GroupPhotoSession {
  /** Session ID of the initiator (first player) */
  initiatorSessionId: string;
  /** All confirmed participants (includes initiator) */
  participants: string[];
  /** Active invitations */
  invitations: PhotoInvitation[];
  /** Selected pose (null until chosen) */
  selectedPose: string | null;
  /** Whether the group is locked (during countdown) */
  isLocked: boolean;
  /** Maximum participants for this session */
  maxParticipants: number;
}

// ─── Pose System ─────────────────────────────────────────────────────────────

export interface PoseSlot {
  /** Slot index (0-based) */
  index: number;
  /** Position offset relative to photobooth center */
  position: Vec3;
  /** Rotation (euler angles) */
  rotation: Vec3;
  /** Animation state to apply */
  animation: string;
  /** Scale/depth factor */
  scale: Vec3;
  /** Whether this slot involves physical contact with another slot */
  requiresContactConsent: boolean;
  /** Which other slot(s) this slot has contact with (empty = none) */
  contactWithSlots: number[];
}

export interface PoseDefinition {
  /** Unique pose ID */
  id: string;
  /** Display name shown to players */
  name: string;
  /** Minimum number of participants required */
  minParticipants: number;
  /** Maximum number of participants supported */
  maxParticipants: number;
  /** Slot definitions for each participant position */
  slots: PoseSlot[];
  /** Whether any slot in this pose requires physical-contact consent */
  requiresContactConsent: boolean;
  /** Category for UI organization */
  category: 'classic' | 'fun' | 'themed' | 'dramatic';
  /** Description shown in pose picker */
  description: string;
}

// ─── Photo Capture ───────────────────────────────────────────────────────────

export interface PhotoCaptureResult {
  /** Unique capture ID (local only, no server association) */
  captureId: string;
  /** Image data URL (base64 PNG) */
  imageDataUrl: string;
  /** Timestamp of capture */
  capturedAt: number;
  /** Number of participants */
  participantCount: number;
  /** Pose used */
  poseId: string;
  /** Photobooth ID where it was taken */
  photoboothId: string;
}

// ─── Photobooth Configuration ────────────────────────────────────────────────

export interface PhotoboothConfig {
  /** Unique photobooth ID */
  id: string;
  /** Position in the world */
  position: Vec3;
  /** Rotation of the booth */
  rotation: Vec3;
  /** Interaction radius for [E] to join queue */
  interactionRadius: number;
  /** Maximum queue length */
  maxQueueLength: number;
  /** Maximum participants in a group photo */
  maxGroupSize: number;
  /** Invitation timeout in seconds */
  invitationTimeoutSeconds: number;
  /** Countdown duration in seconds */
  countdownSeconds: number;
  /** Preview duration before auto-dismiss (seconds, 0 = manual only) */
  previewDurationSeconds: number;
  /** Camera position for photo capture (relative to booth center) */
  cameraPosition: Vec3;
  /** Camera look-at target (relative to booth center) */
  cameraTarget: Vec3;
  /** Zone ID this photobooth belongs to */
  zoneId: string;
  /** Whether this photobooth is currently enabled */
  enabled: boolean;
}

// ─── Consent Types (photobooth-specific) ─────────────────────────────────────

export interface PhotoboothConsentState {
  /** Player session ID */
  sessionId: string;
  /** Has general photography consent (from initial consent screen) */
  hasPhotographyConsent: boolean;
  /** Has physical-contact consent (separate from photography) */
  hasContactConsent: boolean;
}

// ─── Sync State (for multiplayer) ────────────────────────────────────────────

export interface PhotoboothSyncState {
  /** Photobooth ID */
  boothId: string;
  /** Current state */
  state: PhotoboothState;
  /** Queue entries (session IDs and positions) */
  queue: Array<{ sessionId: string; position: number }>;
  /** Active session info (if any) */
  activeSession: {
    initiator: string;
    mode: PhotoModeChoice | null;
    participants: string[];
    selectedPose: string | null;
    countdownRemaining: number;
  } | null;
}

// ─── UI Display Messages ─────────────────────────────────────────────────────

export interface QueuePositionMessage {
  position: number;
  totalAhead: number;
  message: string; // e.g. "You're next!" or "You're #3 in line."
}

// ─── Photobooth Event Callbacks ──────────────────────────────────────────────

export interface PhotoboothCallbacks {
  onQueueJoined?: (sessionId: string, position: number) => void;
  onQueueLeft?: (sessionId: string) => void;
  onQueueAdvanced?: (sessionId: string, newPosition: number) => void;
  onChoicePresented?: (sessionId: string) => void;
  onSoloStarted?: (sessionId: string) => void;
  onGroupInvitationsSent?: (initiator: string, invitedCount: number) => void;
  onInvitationReceived?: (invitation: PhotoInvitation) => void;
  onInvitationResponded?: (invitation: PhotoInvitation) => void;
  onGroupFormed?: (participants: string[]) => void;
  onPoseSelected?: (poseId: string) => void;
  onCountdownStarted?: (seconds: number) => void;
  onPhotoCaptured?: (result: PhotoCaptureResult) => void;
  onSessionComplete?: () => void;
}
