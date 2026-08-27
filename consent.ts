export type PhysicalInteractionType = string;
export type ConsentPreferences = Record<string, boolean>;
export interface ConsentState { preferences: ConsentPreferences; locked: boolean; timestamp: number; }
export interface ConsentCheckResult { permitted: boolean; reason: string; }
export interface PersonalSpaceConfig { radius: number; pushForce: number; interactionOverride: boolean; }
export const CONSENT_INTERACTIONS: any[] = [];
export function createDefaultConsentPreferences(): ConsentPreferences { return {}; }
