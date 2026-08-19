/**
 * OCC Live - Photobooth Approved Pose Library
 * Pre-approved poses inspired by retro/awkward portrait studio photography.
 * Fun, non-serious, intentionally campy group and solo poses.
 *
 * Visual references: 80s/90s portrait studio aesthetics —
 * laser backgrounds, dramatic denim, stacked family arrangements,
 * over-the-top expressions, and playful group dynamics.
 *
 * Rules:
 * - Only approved OCC Live poses are available
 * - Poses adapt to group size (solo, duo, 3-6 players)
 * - Poses requiring physical contact check consent first
 * - No unrestricted body-position manipulation
 * - Players cannot force another avatar into a pose
 * - Each slot has predefined position/rotation/animation
 */

import type { PoseDefinition, PoseSlot, PhotoboothConsentState } from './photobooth-types.ts';

// ─── Approved Pose Library ───────────────────────────────────────────────────
// Inspired by the retro portrait studio / awkward family photo genre.
// Each pose captures a specific vibe from the reference imagery.

const POSE_LIBRARY: PoseDefinition[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // SOLO POSES
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'solo_classic_portrait',
    name: 'Classic Portrait',
    minParticipants: 1,
    maxParticipants: 1,
    requiresContactConsent: false,
    category: 'classic',
    description: 'Timeless portrait pose. Chin up, slight turn.',
    slots: [
      { index: 0, position: [0, 0, 0], rotation: [0, -0.2, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
  {
    id: 'solo_laser_background',
    name: 'Laser Vibes',
    minParticipants: 1,
    maxParticipants: 1,
    requiresContactConsent: false,
    category: 'themed',
    description: '80s laser portrait energy. Straight to camera.',
    slots: [
      { index: 0, position: [0, 0, 0], rotation: [0, 0, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
  {
    id: 'solo_thinker',
    name: 'The Thinker',
    minParticipants: 1,
    maxParticipants: 1,
    requiresContactConsent: false,
    category: 'dramatic',
    description: 'Hand on chin, thoughtful gaze into the distance.',
    slots: [
      { index: 0, position: [0, 0, 0], rotation: [0, -0.4, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
  {
    id: 'solo_power_stance',
    name: 'Power Stance',
    minParticipants: 1,
    maxParticipants: 1,
    requiresContactConsent: false,
    category: 'dramatic',
    description: 'Arms crossed, confident. Main character energy.',
    slots: [
      { index: 0, position: [0, 0, 0], rotation: [0, 0, 0], animation: 'idle', scale: [1.05, 1.05, 1.05], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
  {
    id: 'solo_peace_sign',
    name: 'Peace Out',
    minParticipants: 1,
    maxParticipants: 1,
    requiresContactConsent: false,
    category: 'fun',
    description: 'Peace sign, slight lean. Good vibes only.',
    slots: [
      { index: 0, position: [0, 0, 0], rotation: [0, 0.15, 0], animation: 'wave', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
  {
    id: 'solo_looking_away',
    name: 'Candid Look-Away',
    minParticipants: 1,
    maxParticipants: 1,
    requiresContactConsent: false,
    category: 'dramatic',
    description: 'Looking off-camera. Mysterious and artsy.',
    slots: [
      { index: 0, position: [0, 0, 0], rotation: [0, -0.7, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DUO POSES (2 players)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'duo_back_to_back',
    name: 'Back to Back',
    minParticipants: 2,
    maxParticipants: 2,
    requiresContactConsent: false,
    category: 'dramatic',
    description: 'Standing back-to-back. Album cover energy.',
    slots: [
      { index: 0, position: [-0.3, 0, 0], rotation: [0, -1.57, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 1, position: [0.3, 0, 0], rotation: [0, 1.57, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
  {
    id: 'duo_matching',
    name: 'Matching Poses',
    minParticipants: 2,
    maxParticipants: 2,
    requiresContactConsent: false,
    category: 'fun',
    description: 'Mirror image — both doing the same thing.',
    slots: [
      { index: 0, position: [-0.7, 0, 0], rotation: [0, 0.2, 0], animation: 'wave', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 1, position: [0.7, 0, 0], rotation: [0, -0.2, 0], animation: 'wave', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
  {
    id: 'duo_levels',
    name: 'Levels',
    minParticipants: 2,
    maxParticipants: 2,
    requiresContactConsent: false,
    category: 'classic',
    description: 'One standing tall, one crouched low. Dynamic composition.',
    slots: [
      { index: 0, position: [-0.4, 0, 0.3], rotation: [0, 0.1, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 1, position: [0.4, -0.4, 0], rotation: [0, -0.1, 0], animation: 'sit', scale: [0.85, 0.85, 0.85], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
  {
    id: 'duo_lean_in',
    name: 'The Lean',
    minParticipants: 2,
    maxParticipants: 2,
    requiresContactConsent: true,
    category: 'fun',
    description: 'Leaning toward each other. Requires contact consent.',
    slots: [
      { index: 0, position: [-0.4, 0, 0], rotation: [0, 0.2, -0.1], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: true, contactWithSlots: [1] },
      { index: 1, position: [0.4, 0, 0], rotation: [0, -0.2, 0.1], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: true, contactWithSlots: [0] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP POSES (3-6 players)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'group_classic_portrait',
    name: 'Studio Classic',
    minParticipants: 3,
    maxParticipants: 6,
    requiresContactConsent: false,
    category: 'classic',
    description: 'Traditional studio arrangement. Front row seated, back row standing.',
    slots: [
      { index: 0, position: [0, 0, 0.5], rotation: [0, 0, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 1, position: [-1.0, 0, 0], rotation: [0, 0.15, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 2, position: [1.0, 0, 0], rotation: [0, -0.15, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 3, position: [-0.5, -0.35, 0.8], rotation: [0, 0.1, 0], animation: 'sit', scale: [0.9, 0.9, 0.9], requiresContactConsent: false, contactWithSlots: [] },
      { index: 4, position: [0.5, -0.35, 0.8], rotation: [0, -0.1, 0], animation: 'sit', scale: [0.9, 0.9, 0.9], requiresContactConsent: false, contactWithSlots: [] },
      { index: 5, position: [0, 0, -0.6], rotation: [0, 0, 0], animation: 'idle', scale: [0.9, 0.9, 0.9], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
  {
    id: 'group_awkward_family',
    name: 'Awkward Family Photo',
    minParticipants: 3,
    maxParticipants: 6,
    requiresContactConsent: false,
    category: 'fun',
    description: 'Intentionally weird arrangement. Embrace the awkward.',
    slots: [
      { index: 0, position: [0, 0, 0.6], rotation: [0, 0.15, 0], animation: 'idle', scale: [1.05, 1.05, 1.05], requiresContactConsent: false, contactWithSlots: [] },
      { index: 1, position: [-1.3, 0, 0], rotation: [0, -0.3, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 2, position: [1.1, -0.3, 0.3], rotation: [0, 0.4, 0.05], animation: 'sit', scale: [0.9, 0.9, 0.9], requiresContactConsent: false, contactWithSlots: [] },
      { index: 3, position: [-0.5, 0, -0.7], rotation: [0, -0.5, 0], animation: 'wave', scale: [0.9, 0.9, 0.9], requiresContactConsent: false, contactWithSlots: [] },
      { index: 4, position: [0.7, 0, -0.5], rotation: [0, 0.6, 0], animation: 'idle', scale: [0.85, 0.85, 0.85], requiresContactConsent: false, contactWithSlots: [] },
      { index: 5, position: [0, -0.4, 1.0], rotation: [0, 0, 0], animation: 'sit', scale: [0.85, 0.85, 0.85], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
  {
    id: 'group_pyramid',
    name: 'The Pyramid',
    minParticipants: 3,
    maxParticipants: 6,
    requiresContactConsent: false,
    category: 'classic',
    description: 'Triangular stack formation. One up front, others fanning back.',
    slots: [
      { index: 0, position: [0, 0, 1.0], rotation: [0, 0, 0], animation: 'idle', scale: [1.1, 1.1, 1.1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 1, position: [-0.8, 0, 0.2], rotation: [0, 0.2, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 2, position: [0.8, 0, 0.2], rotation: [0, -0.2, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 3, position: [-1.3, 0, -0.6], rotation: [0, 0.3, 0], animation: 'idle', scale: [0.95, 0.95, 0.95], requiresContactConsent: false, contactWithSlots: [] },
      { index: 4, position: [0, 0, -0.6], rotation: [0, 0, 0], animation: 'idle', scale: [0.95, 0.95, 0.95], requiresContactConsent: false, contactWithSlots: [] },
      { index: 5, position: [1.3, 0, -0.6], rotation: [0, -0.3, 0], animation: 'idle', scale: [0.95, 0.95, 0.95], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
  {
    id: 'group_album_cover',
    name: 'Album Cover',
    minParticipants: 2,
    maxParticipants: 5,
    requiresContactConsent: false,
    category: 'dramatic',
    description: 'Band photo vibes. Moody, layered, slightly offset.',
    slots: [
      { index: 0, position: [0, 0, 0.8], rotation: [0, 0, 0], animation: 'idle', scale: [1.1, 1.1, 1.1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 1, position: [-1.0, 0, 0], rotation: [0, 0.4, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 2, position: [1.0, 0, 0.1], rotation: [0, -0.4, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 3, position: [-0.5, 0, -0.7], rotation: [0, 0.2, 0], animation: 'idle', scale: [0.9, 0.9, 0.9], requiresContactConsent: false, contactWithSlots: [] },
      { index: 4, position: [0.5, 0, -0.7], rotation: [0, -0.2, 0], animation: 'idle', scale: [0.9, 0.9, 0.9], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
  {
    id: 'group_chaos',
    name: 'Controlled Chaos',
    minParticipants: 2,
    maxParticipants: 6,
    requiresContactConsent: false,
    category: 'fun',
    description: 'Everyone doing their own thing — waves, dances, cheers. Wild energy.',
    slots: [
      { index: 0, position: [-0.8, 0, 0.3], rotation: [0, 0.5, 0], animation: 'dance', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 1, position: [0.8, 0, 0.2], rotation: [0, -0.4, 0], animation: 'wave', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 2, position: [0, 0, -0.3], rotation: [0, 0.2, 0], animation: 'cheer', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 3, position: [-1.4, 0, -0.5], rotation: [0, 0.6, 0], animation: 'wave', scale: [0.95, 0.95, 0.95], requiresContactConsent: false, contactWithSlots: [] },
      { index: 4, position: [1.4, 0, -0.5], rotation: [0, -0.5, 0], animation: 'dance', scale: [0.95, 0.95, 0.95], requiresContactConsent: false, contactWithSlots: [] },
      { index: 5, position: [0, 0.2, -1.0], rotation: [0, 0, 0], animation: 'cheer', scale: [0.9, 0.9, 0.9], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
  {
    id: 'group_90s_retro',
    name: '90s Retro',
    minParticipants: 2,
    maxParticipants: 5,
    requiresContactConsent: false,
    category: 'themed',
    description: 'Mall portrait studio 1993. Diagonal stagger, matching energy.',
    slots: [
      { index: 0, position: [-0.9, 0, 0.6], rotation: [0, 0.25, 0], animation: 'idle', scale: [1.05, 1.05, 1.05], requiresContactConsent: false, contactWithSlots: [] },
      { index: 1, position: [0.2, 0, 0.3], rotation: [0, -0.1, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 2, position: [1.1, 0, 0], rotation: [0, -0.25, 0], animation: 'idle', scale: [0.95, 0.95, 0.95], requiresContactConsent: false, contactWithSlots: [] },
      { index: 3, position: [-0.3, 0, -0.5], rotation: [0, 0.15, 0], animation: 'idle', scale: [0.9, 0.9, 0.9], requiresContactConsent: false, contactWithSlots: [] },
      { index: 4, position: [0.6, 0, -0.8], rotation: [0, -0.15, 0], animation: 'idle', scale: [0.85, 0.85, 0.85], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
  {
    id: 'group_cool_crew',
    name: 'Cool Crew',
    minParticipants: 2,
    maxParticipants: 6,
    requiresContactConsent: false,
    category: 'themed',
    description: 'Squad lineup. Arms crossed or hands in pockets. Too cool.',
    slots: [
      { index: 0, position: [0, 0, 0.2], rotation: [0, 0, 0], animation: 'idle', scale: [1.05, 1.05, 1.05], requiresContactConsent: false, contactWithSlots: [] },
      { index: 1, position: [-1.1, 0, 0], rotation: [0, 0.2, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 2, position: [1.1, 0, 0], rotation: [0, -0.2, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 3, position: [-0.5, 0, -0.7], rotation: [0, 0.1, 0], animation: 'idle', scale: [0.95, 0.95, 0.95], requiresContactConsent: false, contactWithSlots: [] },
      { index: 4, position: [0.5, 0, -0.7], rotation: [0, -0.1, 0], animation: 'idle', scale: [0.95, 0.95, 0.95], requiresContactConsent: false, contactWithSlots: [] },
      { index: 5, position: [0, 0, -1.2], rotation: [0, 0, 0], animation: 'idle', scale: [0.9, 0.9, 0.9], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
  {
    id: 'group_jump_freeze',
    name: 'Jump Freeze',
    minParticipants: 2,
    maxParticipants: 6,
    requiresContactConsent: false,
    category: 'fun',
    description: 'Everyone mid-jump! Suspended in the air.',
    slots: [
      { index: 0, position: [0, 0.4, 0.3], rotation: [0, 0, 0], animation: 'jump', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 1, position: [-1.0, 0.35, 0], rotation: [0, 0.2, 0], animation: 'jump', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 2, position: [1.0, 0.45, 0], rotation: [0, -0.2, 0], animation: 'jump', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 3, position: [-0.5, 0.3, -0.6], rotation: [0, 0.1, 0], animation: 'jump', scale: [0.95, 0.95, 0.95], requiresContactConsent: false, contactWithSlots: [] },
      { index: 4, position: [0.5, 0.5, -0.6], rotation: [0, -0.1, 0], animation: 'jump', scale: [0.95, 0.95, 0.95], requiresContactConsent: false, contactWithSlots: [] },
      { index: 5, position: [0, 0.35, -1.0], rotation: [0, 0, 0], animation: 'jump', scale: [0.9, 0.9, 0.9], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
  {
    id: 'group_huddle',
    name: 'The Huddle',
    minParticipants: 3,
    maxParticipants: 6,
    requiresContactConsent: true,
    category: 'classic',
    description: 'Tight circle formation, facing camera. Requires contact consent.',
    slots: [
      { index: 0, position: [0, 0, 0.6], rotation: [0, 0, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: true, contactWithSlots: [1, 2] },
      { index: 1, position: [-0.6, 0, 0.3], rotation: [0, 0.4, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: true, contactWithSlots: [0, 3] },
      { index: 2, position: [0.6, 0, 0.3], rotation: [0, -0.4, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: true, contactWithSlots: [0, 4] },
      { index: 3, position: [-0.9, 0, -0.2], rotation: [0, 0.6, 0], animation: 'idle', scale: [0.95, 0.95, 0.95], requiresContactConsent: true, contactWithSlots: [1, 5] },
      { index: 4, position: [0.9, 0, -0.2], rotation: [0, -0.6, 0], animation: 'idle', scale: [0.95, 0.95, 0.95], requiresContactConsent: true, contactWithSlots: [2, 5] },
      { index: 5, position: [0, 0, -0.4], rotation: [0, 0, 0], animation: 'idle', scale: [0.9, 0.9, 0.9], requiresContactConsent: true, contactWithSlots: [3, 4] },
    ],
  },
  {
    id: 'group_dramatic_stare',
    name: 'Dramatic Stare',
    minParticipants: 2,
    maxParticipants: 4,
    requiresContactConsent: false,
    category: 'dramatic',
    description: 'Everyone facing different directions. Serious faces. No smiling.',
    slots: [
      { index: 0, position: [0, 0, 0.5], rotation: [0, 0, 0], animation: 'idle', scale: [1.1, 1.1, 1.1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 1, position: [-0.9, 0, -0.1], rotation: [0, 0.8, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 2, position: [0.9, 0, -0.1], rotation: [0, -0.8, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 3, position: [0, 0, -0.8], rotation: [0, 3.14, 0], animation: 'idle', scale: [0.85, 0.85, 0.85], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
  {
    id: 'group_celebration',
    name: 'Celebration',
    minParticipants: 2,
    maxParticipants: 6,
    requiresContactConsent: false,
    category: 'fun',
    description: 'Arms up, cheering, pure joy. Party energy!',
    slots: [
      { index: 0, position: [0, 0, 0.3], rotation: [0, 0, 0], animation: 'cheer', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 1, position: [-1.0, 0, 0], rotation: [0, 0.2, 0], animation: 'cheer', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 2, position: [1.0, 0, 0], rotation: [0, -0.2, 0], animation: 'cheer', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 3, position: [-0.5, 0, -0.6], rotation: [0, 0.1, 0], animation: 'cheer', scale: [0.95, 0.95, 0.95], requiresContactConsent: false, contactWithSlots: [] },
      { index: 4, position: [0.5, 0, -0.6], rotation: [0, -0.1, 0], animation: 'cheer', scale: [0.95, 0.95, 0.95], requiresContactConsent: false, contactWithSlots: [] },
      { index: 5, position: [0, 0, -1.1], rotation: [0, 0, 0], animation: 'cheer', scale: [0.9, 0.9, 0.9], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
  {
    id: 'group_walking_away',
    name: 'Walking Away',
    minParticipants: 2,
    maxParticipants: 5,
    requiresContactConsent: false,
    category: 'dramatic',
    description: 'Cool people don\'t look at explosions. Backs to camera.',
    slots: [
      { index: 0, position: [0, 0, 0], rotation: [0, 3.14, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 1, position: [-0.9, 0, 0.2], rotation: [0, 2.9, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 2, position: [0.9, 0, 0.2], rotation: [0, 3.4, 0], animation: 'idle', scale: [1, 1, 1], requiresContactConsent: false, contactWithSlots: [] },
      { index: 3, position: [-0.4, 0, 0.7], rotation: [0, 3.0, 0], animation: 'idle', scale: [0.95, 0.95, 0.95], requiresContactConsent: false, contactWithSlots: [] },
      { index: 4, position: [0.4, 0, 0.7], rotation: [0, 3.3, 0], animation: 'idle', scale: [0.95, 0.95, 0.95], requiresContactConsent: false, contactWithSlots: [] },
    ],
  },
];

// ─── Pose Library Manager ────────────────────────────────────────────────────

export class PhotoboothPoseLibrary {
  private poses: PoseDefinition[] = [...POSE_LIBRARY];

  /**
   * Get all available poses for a given participant count and consent state.
   * Filters by:
   * - Number of participants (min/max range)
   * - Physical-contact consent (if any pose slot requires it, ALL must have consent)
   */
  getAvailablePoses(
    participantCount: number,
    consentStates: PhotoboothConsentState[]
  ): PoseDefinition[] {
    const allHaveContactConsent = consentStates.every(c => c.hasContactConsent);

    return this.poses.filter(pose => {
      if (participantCount < pose.minParticipants) return false;
      if (participantCount > pose.maxParticipants) return false;
      if (pose.requiresContactConsent && !allHaveContactConsent) return false;
      return true;
    });
  }

  /** Get a specific pose by ID */
  getPose(poseId: string): PoseDefinition | null {
    return this.poses.find(p => p.id === poseId) ?? null;
  }

  /**
   * Get the pose slots for a specific number of participants.
   * Returns only the first N slots needed.
   */
  getSlotsForCount(poseId: string, participantCount: number): PoseSlot[] {
    const pose = this.getPose(poseId);
    if (!pose) return [];
    return pose.slots.slice(0, participantCount);
  }

  /** Get all poses (unfiltered) */
  getAllPoses(): PoseDefinition[] {
    return [...this.poses];
  }

  /** Get poses by category */
  getByCategory(category: string): PoseDefinition[] {
    return this.poses.filter(p => p.category === category);
  }

  /** Add a custom pose (future expansion) */
  addPose(pose: PoseDefinition): void {
    this.poses.push(pose);
  }

  /** Get total pose count */
  getPoseCount(): number {
    return this.poses.length;
  }
}
