/**
 * OCC Live - Safety Tests
 * These tests verify that all consent and interaction safety requirements
 * remain intact. They are required GitHub status checks and must pass
 * before any merge to main.
 *
 * Run: npm run test:safety
 */

import { InteractionConsentManager } from '../src/systems/interaction-consent-manager.ts';
import { createDefaultConsentPreferences, CONSENT_INTERACTIONS } from '../src/types/consent.ts';
import type { ConsentPreferences, PhysicalInteractionType } from '../src/types/consent.ts';

// ─── Test Utilities ──────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string): void {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${testName}`);
    failed++;
  }
}

function describe(name: string, fn: () => void): void {
  console.log(`\n${name}`);
  fn();
}

// ─── SAFETY TEST 001 ─────────────────────────────────────────────────────────
// A player cannot initiate a physical interaction without the required consent state.

describe('SAFETY TEST 001: No interaction without consent', () => {
  const manager = new InteractionConsentManager({ radius: 1.2, pushForce: 0.8, interactionOverride: true });
  // Leave all defaults (OFF)
  manager.lockPreferences();

  // Remote player also has defaults (OFF)
  manager.setRemotePlayerConsent('remote_001', createDefaultConsentPreferences());

  const result = manager.checkInteraction('remote_001', 'high_five', 1.5);
  assert(result.permitted === false, 'Interaction denied when local player has not consented');
  assert(result.playerAConsents === false, 'Local player consent correctly reported as false');
});

// ─── SAFETY TEST 002 ─────────────────────────────────────────────────────────
// A player who has disabled physical interactions cannot receive a physical interaction.

describe('SAFETY TEST 002: Disabled player cannot receive interaction', () => {
  const manager = new InteractionConsentManager({ radius: 1.2, pushForce: 0.8, interactionOverride: true });

  // Local player consents to high-five
  manager.setPreference('high_five', true);
  manager.lockPreferences();

  // Remote player has NOT consented
  manager.setRemotePlayerConsent('remote_002', createDefaultConsentPreferences());

  const result = manager.checkInteraction('remote_002', 'high_five', 1.5);
  assert(result.permitted === false, 'Interaction denied when remote player has not consented');
  assert(result.playerBConsents === false, 'Remote player consent correctly reported as false');
});

// ─── SAFETY TEST 003 ─────────────────────────────────────────────────────────
// A player cannot force an interaction by modifying client-side state.

describe('SAFETY TEST 003: Cannot modify consent after lock', () => {
  const manager = new InteractionConsentManager({ radius: 1.2, pushForce: 0.8, interactionOverride: true });
  manager.lockPreferences();

  // Attempt to change preferences after lock
  const result = manager.setPreference('high_five', true);
  assert(result === false, 'setPreference returns false after lock');
  assert(manager.doesLocalPlayerConsent('high_five') === false, 'Preference remains OFF after attempted modification');
});

// ─── SAFETY TEST 004 ─────────────────────────────────────────────────────────
// Removing the consent response must prevent the interaction from occurring.

describe('SAFETY TEST 004: Removing remote consent prevents interaction', () => {
  const manager = new InteractionConsentManager({ radius: 1.2, pushForce: 0.8, interactionOverride: true });
  manager.setPreference('high_five', true);
  manager.lockPreferences();

  // Initially remote consents
  const remotePrefs = createDefaultConsentPreferences();
  remotePrefs.high_five = true;
  manager.setRemotePlayerConsent('remote_004', remotePrefs);

  let result = manager.checkInteraction('remote_004', 'high_five', 1.5);
  assert(result.permitted === true, 'Interaction initially permitted with mutual consent');

  // Remote player leaves / consent removed
  manager.removeRemotePlayer('remote_004');

  result = manager.checkInteraction('remote_004', 'high_five', 1.5);
  assert(result.permitted === false, 'Interaction denied after remote player consent removed');
});

// ─── SAFETY TEST 005 ─────────────────────────────────────────────────────────
// A new interaction cannot bypass InteractionConsentManager.

describe('SAFETY TEST 005: Every interaction type requires consent check', () => {
  const manager = new InteractionConsentManager({ radius: 1.2, pushForce: 0.8, interactionOverride: true });
  manager.lockPreferences();
  manager.setRemotePlayerConsent('remote_005', createDefaultConsentPreferences());

  // Test every registered interaction
  for (const interaction of CONSENT_INTERACTIONS) {
    const result = manager.checkInteraction('remote_005', interaction.id, 1.0);
    assert(result.permitted === false, `${interaction.id}: denied without consent`);
  }
});

// ─── SAFETY TEST 006 ─────────────────────────────────────────────────────────
// Anonymous users cannot access another user's private interaction state.

describe('SAFETY TEST 006: Cannot access non-existent remote consent', () => {
  const manager = new InteractionConsentManager({ radius: 1.2, pushForce: 0.8, interactionOverride: true });
  manager.setPreference('high_five', true);
  manager.lockPreferences();

  // No remote player registered — should not be able to interact
  const result = manager.checkInteraction('nonexistent_player', 'high_five', 1.0);
  assert(result.permitted === false, 'Cannot interact with unregistered player');
  assert(result.playerBConsents === false, 'Unknown player consent defaults to false');
});

// ─── SAFETY TEST 007 ─────────────────────────────────────────────────────────
// Disabling interactions immediately prevents future interactions.

describe('SAFETY TEST 007: All interactions default to OFF', () => {
  const defaults = createDefaultConsentPreferences();

  for (const interaction of CONSENT_INTERACTIONS) {
    assert(defaults[interaction.id] === false, `${interaction.id} defaults to OFF`);
  }
});

// ─── SAFETY TEST 008 ─────────────────────────────────────────────────────────
// Consent to one interaction does not imply consent to another.

describe('SAFETY TEST 008: Consent is per-interaction', () => {
  const manager = new InteractionConsentManager({ radius: 1.2, pushForce: 0.8, interactionOverride: true });
  manager.setPreference('high_five', true);
  manager.lockPreferences();

  assert(manager.doesLocalPlayerConsent('high_five') === true, 'High-five: consented');
  assert(manager.doesLocalPlayerConsent('dap') === false, 'Dap: NOT consented (not implied by high-five)');
  assert(manager.doesLocalPlayerConsent('frisbee_catch') === false, 'Frisbee: NOT consented');
});

// ─── SAFETY TEST 009 ─────────────────────────────────────────────────────────
// Range check prevents interaction when players are too far apart.

describe('SAFETY TEST 009: Range check enforced', () => {
  const manager = new InteractionConsentManager({ radius: 1.2, pushForce: 0.8, interactionOverride: true });
  manager.setPreference('high_five', true);
  manager.lockPreferences();

  const remotePrefs = createDefaultConsentPreferences();
  remotePrefs.high_five = true;
  manager.setRemotePlayerConsent('remote_009', remotePrefs);

  // Too far (high-five range is 2.0)
  let result = manager.checkInteraction('remote_009', 'high_five', 10.0);
  assert(result.permitted === false, 'Denied when too far away');

  // Within range
  result = manager.checkInteraction('remote_009', 'high_five', 1.5);
  assert(result.permitted === true, 'Permitted when within range');
});

// ─── SAFETY TEST 010 ─────────────────────────────────────────────────────────
// Personal space re-enables immediately after interaction ends.

describe('SAFETY TEST 010: Personal space re-enables after interaction', () => {
  const manager = new InteractionConsentManager({ radius: 1.2, pushForce: 0.8, interactionOverride: true });
  manager.setPreference('high_five', true);
  manager.lockPreferences();

  // Begin interaction
  manager.beginInteraction('high_five', 'remote_010');
  assert(manager.isPersonalSpaceSuspendedFor('remote_010') === true, 'Personal space suspended during interaction');

  // End interaction
  manager.endInteraction();
  assert(manager.isPersonalSpaceSuspendedFor('remote_010') === false, 'Personal space immediately re-enabled');
});

// ─── Results ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`Safety Tests: ${passed} passed, ${failed} failed`);
console.log(`${'─'.repeat(60)}\n`);

if (failed > 0) {
  process.exit(1);
}
