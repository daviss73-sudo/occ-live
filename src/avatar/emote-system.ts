/**
 * OCC Live - Emote System (Part 2)
 * Provides playAnimation(emote) API for triggering emotes.
 * Implements wave and dance as test emotes.
 * Architecture supports future expansion without modifying this core.
 */

import type { EmoteType } from '../types/avatar.ts';
import { AnimationStateMachine } from './animation-state-machine.ts';

export interface EmoteDefinition {
  id: EmoteType;
  label: string;
  duration: number;
  keybind: string | null;
}

/** All registered emotes */
const EMOTE_REGISTRY: EmoteDefinition[] = [
  // Part 2 emotes (keybinds 1-3)
  { id: 'wave', label: 'Wave', duration: 2.0, keybind: '1' },
  { id: 'dance', label: 'Dance', duration: 4.0, keybind: '2' },
  { id: 'cheer', label: 'Cheer', duration: 2.5, keybind: '3' },
  // Part 9 emotes (keybinds 4-8 + emote wheel)
  { id: 'celebrate', label: 'Celebrate', duration: 3.0, keybind: '4' },
  { id: 'clap', label: 'Clap', duration: 2.0, keybind: '5' },
  { id: 'thumbsup', label: 'Thumbs Up', duration: 1.5, keybind: '6' },
  { id: 'laugh', label: 'Laugh', duration: 2.0, keybind: '7' },
  { id: 'point', label: 'Point', duration: 1.5, keybind: '8' },
  { id: 'shrug', label: 'Shrug', duration: 1.5, keybind: null },
  { id: 'bow', label: 'Bow', duration: 2.0, keybind: null },
  { id: 'meditate', label: 'Meditate', duration: 0, keybind: null }, // Duration 0 = loops
  { id: 'sit', label: 'Sit', duration: 0, keybind: null }, // Duration 0 = loops
];

export class EmoteSystem {
  private animStateMachine: AnimationStateMachine;
  private emotes: Map<string, EmoteDefinition> = new Map();
  private onEmoteTriggered: ((emote: EmoteType) => void) | null = null;

  constructor(animStateMachine: AnimationStateMachine) {
    this.animStateMachine = animStateMachine;

    for (const emote of EMOTE_REGISTRY) {
      this.emotes.set(emote.id, emote);
    }

    this.setupKeybinds();
  }

  /** Play an emote by ID */
  playAnimation(emoteId: EmoteType): boolean {
    const def = this.emotes.get(emoteId);
    if (!def) {
      console.warn(`[EmoteSystem] Unknown emote: ${emoteId}`);
      return false;
    }

    // Don't interrupt if already playing same emote
    if (this.animStateMachine.isEmotePlaying() &&
        this.animStateMachine.getState() === emoteId) {
      return false;
    }

    this.animStateMachine.playEmote(emoteId, def.duration);

    if (this.onEmoteTriggered) {
      this.onEmoteTriggered(emoteId);
    }

    console.log(`[OCC Live] Emote: ${def.label}`);
    return true;
  }

  /** Set callback for emote triggers (for UI/networking) */
  onEmote(callback: (emote: EmoteType) => void): void {
    this.onEmoteTriggered = callback;
  }

  /** Get all available emotes */
  getAvailableEmotes(): EmoteDefinition[] {
    return Array.from(this.emotes.values());
  }

  /** Get emote by ID */
  getEmote(id: EmoteType): EmoteDefinition | undefined {
    return this.emotes.get(id);
  }

  /** Stop current emote */
  stopEmote(): void {
    this.animStateMachine.stopSocialAnimation();
  }

  /** Register a new emote at runtime (for content packs or districts) */
  registerEmote(emote: EmoteDefinition): void {
    this.emotes.set(emote.id, emote);
  }

  /** Remove an emote */
  unregisterEmote(emoteId: string): void {
    this.emotes.delete(emoteId);
  }

  /** Get emotes that have keybinds assigned */
  getKeyboundEmotes(): EmoteDefinition[] {
    return Array.from(this.emotes.values()).filter(e => e.keybind !== null);
  }

  /** Get emotes without keybinds (shown in emote wheel only) */
  getWheelOnlyEmotes(): EmoteDefinition[] {
    return Array.from(this.emotes.values()).filter(e => e.keybind === null);
  }

  /** Is the player currently performing an emote? */
  isEmoting(): boolean {
    return this.animStateMachine.isEmotePlaying();
  }

  /** Get current emote ID if one is playing */
  getCurrentEmote(): EmoteType | null {
    if (!this.animStateMachine.isEmotePlaying()) return null;
    const state = this.animStateMachine.getState();
    return this.emotes.has(state) ? state as EmoteType : null;
  }

  /** Dispose keybind listeners */
  dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown);
  }

  // ─── Keybinds ──────────────────────────────────────────────────────────

  private setupKeybinds(): void {
    document.addEventListener('keydown', this.onKeyDown);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // Only trigger on number keys when not typing in an input
    if (e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement) return;

    for (const emote of this.emotes.values()) {
      if (emote.keybind === e.key) {
        this.playAnimation(emote.id);
        break;
      }
    }
  };
}
