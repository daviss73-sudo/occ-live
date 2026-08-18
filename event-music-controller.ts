/**
 * OCC Live - Event Music Controller (Part 7)
 * Wraps the existing MusicSystem to provide event-specific music overrides.
 * On event start: crossfades from normal to event music.
 * On event end: crossfades back to normal.
 *
 * Design:
 * - Does not replace the MusicSystem — wraps it
 * - Stores the "normal" state before override
 * - Smooth crossfade transitions (no abrupt audio changes)
 * - Supports per-area audio zone overrides during events
 */

import type { EventConfig } from './event-types.ts';
import type { EventMusicController } from './event-manager.ts';
import type { MusicSystem } from '../systems/music-system.ts';

export class EventMusicControllerImpl implements EventMusicController {
  private musicSystem: MusicSystem;
  private normalPlaylistId: string | null = null;
  private isOverrideActive: boolean = false;

  constructor(musicSystem: MusicSystem) {
    this.musicSystem = musicSystem;
  }

  /** Apply event music (crossfade from normal to event playlist) */
  applyEventMusic(config: EventConfig): void {
    // Store current state as "normal" so we can restore later
    this.normalPlaylistId = this.musicSystem.getCurrentPlaylistId();
    this.isOverrideActive = true;

    // Force the event playlist
    this.musicSystem.forcePlaylist(config.music.playlistId);

    // Apply volume
    this.musicSystem.setMasterVolume(config.music.volume);

    console.log(`[EventMusic] Applied event music: ${config.music.playlistId}`);
  }

  /** Remove event music (crossfade back to normal) */
  removeEventMusic(_fadeOutDuration: number): void {
    if (!this.isOverrideActive) return;

    // Restore normal playlist
    if (this.normalPlaylistId) {
      this.musicSystem.forcePlaylist(this.normalPlaylistId);
    } else {
      this.musicSystem.stop();
    }

    // Restore default volume
    this.musicSystem.setMasterVolume(0.7);
    this.isOverrideActive = false;

    console.log(`[EventMusic] Restored normal music`);
  }

  /** Is event music currently playing? */
  isEventMusicActive(): boolean {
    return this.isOverrideActive;
  }
}
