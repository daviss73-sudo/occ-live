/**
 * OCC Live - Audio Mixer & Balancing System (Part 12)
 * Manages master volume, per-category balancing, and smooth transitions.
 *
 * Requirements:
 * - Balance music/environmental audio
 * - Provide volume controls where supported
 * - Make event transitions smooth
 * - Avoid sudden loud changes
 * - Do not rely on audio alone for critical information
 *
 * Categories:
 * - music: Background playlists per zone
 * - ambience: Environmental sounds (water, birds, crowd)
 * - effects: UI sounds, interaction feedback
 * - notifications: Non-critical audio cues (supplement, never sole source)
 *
 * Integrates with AccessibilityManager for user volume preferences.
 */

// ─── Audio Category ──────────────────────────────────────────────────────────

export type AudioCategory = 'music' | 'ambience' | 'effects' | 'notifications';

// ─── Fade Config ─────────────────────────────────────────────────────────────

export interface FadeConfig {
  /** Duration of fade in ms */
  duration: number;
  /** Easing function type */
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

const DEFAULT_FADE: FadeConfig = { duration: 1000, easing: 'ease-in-out' };
const QUICK_FADE: FadeConfig = { duration: 300, easing: 'ease-out' };
const SLOW_FADE: FadeConfig = { duration: 2000, easing: 'ease-in-out' };

// ─── Active Audio Track ──────────────────────────────────────────────────────

interface ActiveTrack {
  id: string;
  category: AudioCategory;
  volume: number; // Target volume (0-1)
  currentVolume: number; // Current interpolated volume
  zoneId: string | null;
  isFading: boolean;
  fadeTarget: number;
  fadeStartVolume: number;
  fadeStartTime: number;
  fadeDuration: number;
}

// ─── Audio Mixer ─────────────────────────────────────────────────────────────

export class AudioMixer {
  // Volume levels (0-1)
  private masterVolume: number = 1.0;
  private categoryVolumes: Map<AudioCategory, number> = new Map([
    ['music', 0.7],
    ['ambience', 0.6],
    ['effects', 0.8],
    ['notifications', 0.5],
  ]);

  // Active tracks
  private activeTracks: Map<string, ActiveTrack> = new Map();

  // Transition settings
  private defaultFade: FadeConfig = DEFAULT_FADE;
  private zoneFade: FadeConfig = SLOW_FADE;
  private eventFade: FadeConfig = { duration: 1500, easing: 'ease-in-out' };

  // Ducking (lower music when effects play)
  private isDucking: boolean = false;
  private duckLevel: number = 0.4; // Reduce music to this fraction during duck
  private duckRecoverTime: number = 500; // ms to recover after duck ends

  // Callbacks
  private onVolumeUpdate: ((trackId: string, volume: number) => void) | null = null;

  // ─── Configuration ─────────────────────────────────────────────────────

  setOnVolumeUpdate(callback: (trackId: string, volume: number) => void): void {
    this.onVolumeUpdate = callback;
  }

  setDefaultFade(fade: FadeConfig): void { this.defaultFade = fade; }
  setZoneFade(fade: FadeConfig): void { this.zoneFade = fade; }
  setEventFade(fade: FadeConfig): void { this.eventFade = fade; }
  setDuckLevel(level: number): void { this.duckLevel = Math.max(0, Math.min(1, level)); }

  // ─── Volume Control ────────────────────────────────────────────────────

  /** Set master volume (0-1) */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.recalculateAllVolumes();
  }

  getMasterVolume(): number { return this.masterVolume; }

  /** Set volume for a category (0-1) */
  setCategoryVolume(category: AudioCategory, volume: number): void {
    this.categoryVolumes.set(category, Math.max(0, Math.min(1, volume)));
    this.recalculateAllVolumes();
  }

  getCategoryVolume(category: AudioCategory): number {
    return this.categoryVolumes.get(category) ?? 1.0;
  }

  /** Get effective volume for a track (master * category * track) */
  getEffectiveVolume(trackId: string): number {
    const track = this.activeTracks.get(trackId);
    if (!track) return 0;
    const categoryVol = this.categoryVolumes.get(track.category) ?? 1.0;
    let effective = this.masterVolume * categoryVol * track.currentVolume;

    // Apply ducking to music when effects are playing
    if (this.isDucking && track.category === 'music') {
      effective *= this.duckLevel;
    }

    return effective;
  }

  /**
   * Apply volume settings from AccessibilityManager.
   * Call this when accessibility settings change.
   */
  applyAccessibilityVolumes(config: {
    masterVolume: number;
    musicVolume: number;
    effectsVolume: number;
    ambienceVolume: number;
  }): void {
    this.masterVolume = config.masterVolume;
    this.categoryVolumes.set('music', config.musicVolume);
    this.categoryVolumes.set('effects', config.effectsVolume);
    this.categoryVolumes.set('ambience', config.ambienceVolume);
    this.recalculateAllVolumes();
  }

  // ─── Track Management ──────────────────────────────────────────────────

  /** Register a new audio track */
  registerTrack(id: string, category: AudioCategory, volume: number = 1.0, zoneId: string | null = null): void {
    this.activeTracks.set(id, {
      id,
      category,
      volume,
      currentVolume: 0, // Start silent, fade in
      zoneId,
      isFading: false,
      fadeTarget: volume,
      fadeStartVolume: 0,
      fadeStartTime: 0,
      fadeDuration: 0,
    });
  }

  /** Remove a track */
  unregisterTrack(id: string): void {
    this.activeTracks.delete(id);
  }

  /** Start a track (fade in from 0) */
  startTrack(id: string, fade?: FadeConfig): void {
    const track = this.activeTracks.get(id);
    if (!track) return;
    this.fadeTrack(id, track.volume, fade ?? this.defaultFade);
  }

  /** Stop a track (fade out to 0) */
  stopTrack(id: string, fade?: FadeConfig): void {
    this.fadeTrack(id, 0, fade ?? this.defaultFade);
  }

  /** Fade a track to a target volume */
  fadeTrack(id: string, targetVolume: number, fade?: FadeConfig): void {
    const track = this.activeTracks.get(id);
    if (!track) return;

    const config = fade ?? this.defaultFade;
    track.isFading = true;
    track.fadeTarget = Math.max(0, Math.min(1, targetVolume));
    track.fadeStartVolume = track.currentVolume;
    track.fadeStartTime = performance.now();
    track.fadeDuration = config.duration;
  }

  // ─── Zone Transitions ──────────────────────────────────────────────────

  /**
   * Crossfade between zones.
   * Fades out tracks from the old zone and fades in tracks from the new zone.
   * Avoids sudden loud changes.
   */
  crossfadeZones(fromZoneId: string | null, toZoneId: string): void {
    for (const track of this.activeTracks.values()) {
      if (track.zoneId === fromZoneId && track.category === 'music') {
        this.fadeTrack(track.id, 0, this.zoneFade);
      }
      if (track.zoneId === toZoneId && track.category === 'music') {
        this.fadeTrack(track.id, track.volume, this.zoneFade);
      }
      // Ambience fades slightly faster
      if (track.zoneId === fromZoneId && track.category === 'ambience') {
        this.fadeTrack(track.id, 0, QUICK_FADE);
      }
      if (track.zoneId === toZoneId && track.category === 'ambience') {
        this.fadeTrack(track.id, track.volume, { duration: 800, easing: 'ease-in' });
      }
    }
  }

  /**
   * Transition audio for an event start/end.
   * Smoothly blends event music over base music.
   */
  eventTransition(eventTrackIds: string[], start: boolean): void {
    for (const id of eventTrackIds) {
      if (start) {
        this.fadeTrack(id, 1.0, this.eventFade);
      } else {
        this.fadeTrack(id, 0, this.eventFade);
      }
    }
  }

  // ─── Ducking ───────────────────────────────────────────────────────────

  /** Duck music (when an important effect plays) */
  startDuck(): void {
    this.isDucking = true;
    this.recalculateAllVolumes();
  }

  /** Release duck (restore music volume) */
  endDuck(): void {
    this.isDucking = false;
    // Smooth recovery handled via recalculate
    setTimeout(() => this.recalculateAllVolumes(), this.duckRecoverTime);
  }

  // ─── Update Loop ───────────────────────────────────────────────────────

  /**
   * Call every frame to interpolate fading tracks.
   * Should be called from the render loop.
   */
  update(_dt: number): void {
    const now = performance.now();

    for (const track of this.activeTracks.values()) {
      if (!track.isFading) continue;

      const elapsed = now - track.fadeStartTime;
      const progress = Math.min(1, elapsed / Math.max(1, track.fadeDuration));
      const easedProgress = this.ease(progress, 'ease-in-out');

      track.currentVolume = track.fadeStartVolume + (track.fadeTarget - track.fadeStartVolume) * easedProgress;

      if (progress >= 1) {
        track.currentVolume = track.fadeTarget;
        track.isFading = false;
      }

      // Notify the actual audio system of the computed volume
      const effective = this.getEffectiveVolume(track.id);
      this.onVolumeUpdate?.(track.id, effective);
    }
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get all active tracks */
  getActiveTracks(): Array<{ id: string; category: AudioCategory; effectiveVolume: number; zoneId: string | null }> {
    return Array.from(this.activeTracks.values()).map(t => ({
      id: t.id,
      category: t.category,
      effectiveVolume: this.getEffectiveVolume(t.id),
      zoneId: t.zoneId,
    }));
  }

  /** Get tracks for a specific zone */
  getTracksForZone(zoneId: string): ActiveTrack[] {
    return Array.from(this.activeTracks.values()).filter(t => t.zoneId === zoneId);
  }

  /** Is any track currently fading? */
  hasFadingTracks(): boolean {
    return Array.from(this.activeTracks.values()).some(t => t.isFading);
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  dispose(): void {
    this.activeTracks.clear();
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private recalculateAllVolumes(): void {
    for (const track of this.activeTracks.values()) {
      const effective = this.getEffectiveVolume(track.id);
      this.onVolumeUpdate?.(track.id, effective);
    }
  }

  private ease(t: number, type: string): number {
    switch (type) {
      case 'ease-in': return t * t;
      case 'ease-out': return t * (2 - t);
      case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default: return t; // linear
    }
  }
}
