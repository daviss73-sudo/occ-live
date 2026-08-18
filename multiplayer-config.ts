/**
 * OCC Live - Multiplayer Configuration (Part 3)
 * Configurable settings for the real-time presence system.
 */

import type { MultiplayerConfig } from '../types/multiplayer.ts';

export const multiplayerConfig: MultiplayerConfig = {
  serverUrl: `ws://${window.location.hostname || 'localhost'}:3001`,
  maxPlayers: 50,
  syncRateMs: 50,               // 20 updates/sec
  interpolationSpeed: 0.12,     // Lerp factor for remote player smoothing
  disconnectTimeoutMs: 10000,   // 10s before removing ghost avatar
  idleTimeoutMs: 120000,        // 2 min before IDLE
  afkTimeoutMs: 300000,         // 5 min before AFK
  seatInactiveReleaseMs: 600000, // 10 min seat release
};
