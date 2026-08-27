import type { ConsentPreferences } from '../types/consent.ts';

export function showConsentScreen(): Promise<ConsentPreferences> {
  return Promise.resolve({} as ConsentPreferences);
}
