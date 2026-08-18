/**
 * OCC Live - Interaction Consent Type Definitions
 * Granular physical interaction consent system.
 * Every interaction defaults to OFF. Players must explicitly opt in.
 * Consent is session-locked and cannot be changed after entry.
 */

// ─── Physical Interaction Types ──────────────────────────────────────────────

/** Individual physical contact interactions */
export type PhysicalContactType =
  | 'high_five'
  | 'dap';

/** Shared physical activity interactions */
export type SharedActivityType =
  | 'frisbee_catch';

/** Union of all consent-gated interactions */
export type PhysicalInteractionType = PhysicalContactType | SharedActivityType;

// ─── Consent Categories ──────────────────────────────────────────────────────

export type ConsentCategory = 'physical_contact' | 'shared_activity';

export interface ConsentInteractionDef {
  id: PhysicalInteractionType;
  label: string;
  description: string;
  category: ConsentCategory;
}

// ─── Consent Preferences (per player, per session) ───────────────────────────

export type ConsentPreferences = Record<PhysicalInteractionType, boolean>;

// ─── Consent State ───────────────────────────────────────────────────────────

export interface ConsentState {
  preferences: ConsentPreferences;
  locked: boolean;       // true after ENTER OCC LIVE clicked
  timestamp: number;     // when preferences were locked
}

// ─── Consent Check Result ────────────────────────────────────────────────────

export interface ConsentCheckResult {
  permitted: boolean;
  reason: string;
  playerAConsents: boolean;
  playerBConsents: boolean;
}

// ─── Personal Space Configuration ────────────────────────────────────────────

export interface PersonalSpaceConfig {
  radius: number;          // Arms-length boundary in world units
  pushForce: number;       // How strongly to push players apart
  interactionOverride: boolean; // Temporarily disabled during approved interaction
}

// ─── Interaction Registry ────────────────────────────────────────────────────

/** All available consent-gated interactions with metadata */
export const CONSENT_INTERACTIONS: ConsentInteractionDef[] = [
  // Physical Contact
  { id: 'high_five', label: 'High-fives', description: 'Perform a high-five with another player', category: 'physical_contact' },
  { id: 'dap', label: 'Daps', description: 'Perform a dap (fist bump greeting) with another player', category: 'physical_contact' },

  // Shared Physical Activities
  { id: 'frisbee_catch', label: 'Playing frisbee', description: 'Throw and catch a frisbee with another player', category: 'shared_activity' },
];

/** Create default consent preferences (all OFF) */
export function createDefaultConsentPreferences(): ConsentPreferences {
  const prefs: Partial<ConsentPreferences> = {};
  for (const interaction of CONSENT_INTERACTIONS) {
    prefs[interaction.id] = false;
  }
  return prefs as ConsentPreferences;
}
