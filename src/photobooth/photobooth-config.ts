/**
 * OCC Live - Photobooth Configuration
 * Default settings and zone registration for all OCC Live photobooths.
 * New photobooths added here without modifying core system code.
 */

import type { PhotoboothConfig } from './photobooth-types.ts';

export const DEFAULT_PHOTOBOOTH_CONFIG: Omit<PhotoboothConfig, 'id' | 'position' | 'rotation' | 'zoneId'> = {
  interactionRadius: 3,
  maxQueueLength: 10,
  maxGroupSize: 6,
  invitationTimeoutSeconds: 15,
  countdownSeconds: 3,
  previewDurationSeconds: 30,
  cameraPosition: [0, 1.6, 4],
  cameraTarget: [0, 1.0, 0],
  enabled: true,
};

export const photoboothConfigs: PhotoboothConfig[] = [
  {
    id: 'main_union_photobooth',
    position: [12, 0, -5],
    rotation: [0, -0.5, 0],
    zoneId: 'main_plaza',
    ...DEFAULT_PHOTOBOOTH_CONFIG,
  },
  {
    id: 'throwback_photobooth',
    position: [14, 0, 5],
    rotation: [0, 0, 0],
    zoneId: 'throwback_photobooth',
    ...DEFAULT_PHOTOBOOTH_CONFIG,
  },
];

export function getPhotoboothConfig(id: string): PhotoboothConfig | undefined {
  return photoboothConfigs.find(c => c.id === id);
}

export function getEnabledPhotobooths(): PhotoboothConfig[] {
  return photoboothConfigs.filter(c => c.enabled);
}
