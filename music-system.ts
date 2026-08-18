/**
 * OCC Live - Music System (Part 6)
 * Continuous spatial music playback for the Main Union.
 * Music plays 24/7 regardless of events — the space is always alive.
 *
 * Features:
 * - Configurable playlists per activity area
 * - Spatial volume based on player distance from zone center
 * - Crossfade transitions between zones
 * - Ambient sound layers (fire, water, crowd)
 * - Web Audio API with user-gesture activation
 * - Tracks defined through configuration, not hard-coded
 * - Supports simultaneous ambient + music layers
 * - Developer controls for testing
 */

import * as THREE from 'three';

// ─── Music Configuration Types ───────────────────────────────────────────────

export interface MusicTrack {
  id: string;
  file: string;
  title: string;
  duration: number;    // seconds (0 = unknown / streaming)
  loop: boolean;
  volume: number;      // 0-1 base volume
}

export interface MusicPlaylist {
  id: string;
  name: string;
  tracks: MusicTrack[];
  shuffle: boolean;
  loop: boolean;
}

export interface AmbienceConfig {
  id: string;
  file: string;
  volume: number;
  loop: boolean;
  fadeInDuration: number;
  fadeOutDuration: number;
}

export interface MusicZoneConfig {
  id: string;
  areaId: string;
  position: [number, number, number];
  radius: number;
  /** Playlist to play in this zone (null = ambience only) */
  playlistId: string | null;
  /** Ambient sound layer (null = none) */
  ambienceId: string | null;
  /** Volume multiplier for this zone */
  volume: number;
  /** Priority — higher priority zones override lower ones when overlapping */
  priority: number;
}

// ─── Music System State ──────────────────────────────────────────────────────

interface ActiveZoneState {
  config: MusicZoneConfig;
  center: THREE.Vector3;
  currentVolume: number;
  targetVolume: number;
}

export class MusicSystem {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isInitialized: boolean = false;
  private isEnabled: boolean = true;
  private masterVolume: number = 0.7;

  // Configuration
  private playlists: Map<string, MusicPlaylist> = new Map();
  private ambiences: Map<string, AmbienceConfig> = new Map();
  private zones: Map<string, ActiveZoneState> = new Map();

  // Playback state
  private currentZoneId: string | null = null;
  private currentPlaylistId: string | null = null;
  private currentTrackIndex: number = 0;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGain: GainNode | null = null;
  private ambienceSource: AudioBufferSourceNode | null = null;
  private ambienceGain: GainNode | null = null;

  // Audio buffer cache
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private loadingFiles: Set<string> = new Set();

  // Crossfade
  private crossfadeDuration: number = 2.0; // seconds
  private volumeUpdateInterval: number | null = null;

  constructor() {
    this.setupUserGestureListener();
  }

  // ─── Initialization ────────────────────────────────────────────────────

  /**
   * Initialize the Web Audio API context.
   * Must be called from a user gesture (click/keypress) due to browser policy.
   */
  initialize(): boolean {
    if (this.isInitialized) return true;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.audioContext.destination);
      this.isInitialized = true;

      // Start volume update loop
      this.volumeUpdateInterval = window.setInterval(() => {
        this.updateVolumes();
      }, 100);

      console.log('[MusicSystem] Audio context initialized');
      return true;
    } catch (e) {
      console.warn('[MusicSystem] Failed to initialize audio context:', e);
      return false;
    }
  }

  /** Register playlists */
  registerPlaylists(playlists: MusicPlaylist[]): void {
    for (const pl of playlists) {
      this.playlists.set(pl.id, pl);
    }
  }

  /** Register ambience configs */
  registerAmbiences(ambiences: AmbienceConfig[]): void {
    for (const amb of ambiences) {
      this.ambiences.set(amb.id, amb);
    }
  }

  /** Register music zones */
  registerZones(zones: MusicZoneConfig[]): void {
    for (const zone of zones) {
      this.zones.set(zone.id, {
        config: zone,
        center: new THREE.Vector3(zone.position[0], zone.position[1], zone.position[2]),
        currentVolume: 0,
        targetVolume: 0,
      });
    }
  }

  // ─── Spatial Update ────────────────────────────────────────────────────

  /**
   * Update the music system with the player's current position.
   * Determines which zone they're in and adjusts volume/track accordingly.
   * Call each frame or at a reasonable interval.
   */
  updatePlayerPosition(position: THREE.Vector3): void {
    if (!this.isEnabled) return;

    // Find the active zone (highest priority within radius)
    let activeZone: ActiveZoneState | null = null;
    let highestPriority = -1;

    for (const zone of this.zones.values()) {
      const dist = position.distanceTo(zone.center);
      if (dist <= zone.config.radius) {
        // Calculate volume based on distance (louder toward center)
        const volumeFactor = Math.max(0, 1 - (dist / zone.config.radius));
        zone.targetVolume = volumeFactor * zone.config.volume;

        if (zone.config.priority > highestPriority) {
          highestPriority = zone.config.priority;
          activeZone = zone;
        }
      } else {
        zone.targetVolume = 0;
      }
    }

    // Handle zone transition
    const newZoneId = activeZone?.config.id ?? null;
    if (newZoneId !== this.currentZoneId) {
      this.transitionToZone(activeZone);
      this.currentZoneId = newZoneId;
    }
  }

  // ─── Playback Control ──────────────────────────────────────────────────

  /** Start playing (resume after pause) */
  play(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    this.isEnabled = true;
  }

  /** Pause all playback */
  pause(): void {
    if (this.audioContext?.state === 'running') {
      this.audioContext.suspend();
    }
  }

  /** Stop all playback and reset */
  stop(): void {
    this.stopCurrentTrack();
    this.stopAmbience();
    this.currentZoneId = null;
    this.currentPlaylistId = null;
  }

  /** Set master volume (0-1) */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
  }

  /** Get master volume */
  getMasterVolume(): number {
    return this.masterVolume;
  }

  /** Enable/disable the music system */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  /** Is the music system currently playing? */
  isPlaying(): boolean {
    return this.isInitialized && this.isEnabled && this.currentSource !== null;
  }

  /** Get the current active zone ID */
  getCurrentZoneId(): string | null {
    return this.currentZoneId;
  }

  /** Get the current playlist ID */
  getCurrentPlaylistId(): string | null {
    return this.currentPlaylistId;
  }

  // ─── Developer Controls ────────────────────────────────────────────────

  /** Force a specific playlist to play (dev mode) */
  forcePlaylist(playlistId: string): void {
    const playlist = this.playlists.get(playlistId);
    if (playlist) {
      this.startPlaylist(playlist);
    }
  }

  /** Force a specific ambience (dev mode) */
  forceAmbience(ambienceId: string): void {
    this.startAmbience(ambienceId);
  }

  /** Skip to next track */
  nextTrack(): void {
    if (!this.currentPlaylistId) return;
    const playlist = this.playlists.get(this.currentPlaylistId);
    if (!playlist) return;

    this.currentTrackIndex = (this.currentTrackIndex + 1) % playlist.tracks.length;
    this.playTrack(playlist.tracks[this.currentTrackIndex]);
  }

  /** Get debug state */
  getDebugState(): {
    initialized: boolean;
    enabled: boolean;
    playing: boolean;
    currentZone: string | null;
    currentPlaylist: string | null;
    currentTrack: number;
    masterVolume: number;
    cachedBuffers: number;
  } {
    return {
      initialized: this.isInitialized,
      enabled: this.isEnabled,
      playing: this.isPlaying(),
      currentZone: this.currentZoneId,
      currentPlaylist: this.currentPlaylistId,
      currentTrack: this.currentTrackIndex,
      masterVolume: this.masterVolume,
      cachedBuffers: this.bufferCache.size,
    };
  }

  /** Clean up resources */
  dispose(): void {
    this.stop();
    if (this.volumeUpdateInterval !== null) {
      clearInterval(this.volumeUpdateInterval);
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.bufferCache.clear();
  }

  // ─── Private: Zone Transitions ─────────────────────────────────────────

  private transitionToZone(zone: ActiveZoneState | null): void {
    if (!this.isInitialized || !this.audioContext) return;

    if (!zone) {
      // Leaving all zones — fade out
      this.fadeOutCurrent();
      this.fadeOutAmbience();
      return;
    }

    const config = zone.config;

    // Start playlist if different
    if (config.playlistId && config.playlistId !== this.currentPlaylistId) {
      const playlist = this.playlists.get(config.playlistId);
      if (playlist) {
        this.crossfadeToPlaylist(playlist);
      }
    } else if (!config.playlistId) {
      this.fadeOutCurrent();
    }

    // Start ambience if different
    if (config.ambienceId) {
      this.startAmbience(config.ambienceId);
    } else {
      this.fadeOutAmbience();
    }
  }

  private crossfadeToPlaylist(playlist: MusicPlaylist): void {
    this.fadeOutCurrent();
    this.currentPlaylistId = playlist.id;
    this.currentTrackIndex = playlist.shuffle
      ? Math.floor(Math.random() * playlist.tracks.length)
      : 0;

    if (playlist.tracks.length > 0) {
      this.playTrack(playlist.tracks[this.currentTrackIndex]);
    }
  }

  private startPlaylist(playlist: MusicPlaylist): void {
    this.stopCurrentTrack();
    this.currentPlaylistId = playlist.id;
    this.currentTrackIndex = 0;

    if (playlist.tracks.length > 0) {
      this.playTrack(playlist.tracks[0]);
    }
  }

  // ─── Private: Track Playback ───────────────────────────────────────────

  private async playTrack(track: MusicTrack): Promise<void> {
    if (!this.audioContext || !this.masterGain) return;

    // Load the audio buffer
    const buffer = await this.loadAudioBuffer(track.file);
    if (!buffer) return;

    // Stop previous source
    this.stopCurrentTrack();

    // Create new source
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = track.loop;

    // Create gain for this track
    const gain = this.audioContext.createGain();
    gain.gain.value = 0; // Start at 0 for fade-in

    source.connect(gain);
    gain.connect(this.masterGain);

    source.start();
    this.currentSource = source;
    this.currentGain = gain;

    // Fade in
    gain.gain.linearRampToValueAtTime(
      track.volume,
      this.audioContext.currentTime + this.crossfadeDuration
    );

    // Handle track end (auto-advance)
    source.onended = () => {
      if (this.currentSource === source) {
        this.advanceTrack();
      }
    };
  }

  private advanceTrack(): void {
    if (!this.currentPlaylistId) return;
    const playlist = this.playlists.get(this.currentPlaylistId);
    if (!playlist) return;

    if (playlist.shuffle) {
      this.currentTrackIndex = Math.floor(Math.random() * playlist.tracks.length);
    } else {
      this.currentTrackIndex++;
      if (this.currentTrackIndex >= playlist.tracks.length) {
        if (playlist.loop) {
          this.currentTrackIndex = 0;
        } else {
          this.currentSource = null;
          this.currentGain = null;
          return;
        }
      }
    }

    this.playTrack(playlist.tracks[this.currentTrackIndex]);
  }

  private stopCurrentTrack(): void {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch { /* already stopped */ }
      this.currentSource = null;
    }
    if (this.currentGain) {
      this.currentGain.disconnect();
      this.currentGain = null;
    }
  }

  private fadeOutCurrent(): void {
    if (!this.audioContext || !this.currentGain) return;
    this.currentGain.gain.linearRampToValueAtTime(
      0,
      this.audioContext.currentTime + this.crossfadeDuration
    );
    // Schedule stop after fade
    const source = this.currentSource;
    const gain = this.currentGain;
    setTimeout(() => {
      try { source?.stop(); } catch { /* already stopped */ }
      gain?.disconnect();
    }, this.crossfadeDuration * 1000 + 100);

    this.currentSource = null;
    this.currentGain = null;
    this.currentPlaylistId = null;
  }

  // ─── Private: Ambience ─────────────────────────────────────────────────

  private async startAmbience(ambienceId: string): Promise<void> {
    if (!this.audioContext || !this.masterGain) return;

    const config = this.ambiences.get(ambienceId);
    if (!config) return;

    // Don't restart if already playing this ambience
    if (this.ambienceSource && (this.ambienceSource as any).__ambienceId === ambienceId) return;

    this.fadeOutAmbience();

    const buffer = await this.loadAudioBuffer(config.file);
    if (!buffer) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = config.loop;
    (source as any).__ambienceId = ambienceId;

    const gain = this.audioContext.createGain();
    gain.gain.value = 0;

    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();

    // Fade in
    gain.gain.linearRampToValueAtTime(
      config.volume,
      this.audioContext.currentTime + config.fadeInDuration
    );

    this.ambienceSource = source;
    this.ambienceGain = gain;
  }

  private fadeOutAmbience(): void {
    if (!this.audioContext || !this.ambienceGain || !this.ambienceSource) return;

    this.ambienceGain.gain.linearRampToValueAtTime(
      0,
      this.audioContext.currentTime + 1.0
    );

    const source = this.ambienceSource;
    const gain = this.ambienceGain;
    setTimeout(() => {
      try { source.stop(); } catch { /* already stopped */ }
      gain.disconnect();
    }, 1100);

    this.ambienceSource = null;
    this.ambienceGain = null;
  }

  private stopAmbience(): void {
    if (this.ambienceSource) {
      try { this.ambienceSource.stop(); } catch { /* already stopped */ }
      this.ambienceSource = null;
    }
    if (this.ambienceGain) {
      this.ambienceGain.disconnect();
      this.ambienceGain = null;
    }
  }

  // ─── Private: Volume Updates ───────────────────────────────────────────

  private updateVolumes(): void {
    // Smooth volume transitions for spatial zones
    for (const zone of this.zones.values()) {
      const diff = zone.targetVolume - zone.currentVolume;
      zone.currentVolume += diff * 0.1; // Smooth lerp
    }
  }

  // ─── Private: Audio Loading ────────────────────────────────────────────

  private async loadAudioBuffer(file: string): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;

    // Check cache
    if (this.bufferCache.has(file)) {
      return this.bufferCache.get(file)!;
    }

    // Prevent duplicate loads
    if (this.loadingFiles.has(file)) return null;
    this.loadingFiles.add(file);

    try {
      const response = await fetch(file);
      if (!response.ok) {
        console.warn(`[MusicSystem] Failed to fetch: ${file}`);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.bufferCache.set(file, audioBuffer);
      return audioBuffer;
    } catch (e) {
      console.warn(`[MusicSystem] Failed to load audio: ${file}`, e);
      return null;
    } finally {
      this.loadingFiles.delete(file);
    }
  }

  // ─── Private: User Gesture ─────────────────────────────────────────────

  private setupUserGestureListener(): void {
    const initOnGesture = () => {
      if (!this.isInitialized) {
        this.initialize();
      }
      document.removeEventListener('click', initOnGesture);
      document.removeEventListener('keydown', initOnGesture);
    };

    document.addEventListener('click', initOnGesture, { once: true });
    document.addEventListener('keydown', initOnGesture, { once: true });
  }
}
