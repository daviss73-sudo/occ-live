/**
 * OCC Live - Interaction Controller
 * Wires the InteractionSystem (E key prompts) to the avatar
 * animation system. Maps interaction types to social animations,
 * handles toggle states (sit/stand), and reports when an animation
 * is not yet available.
 */

import type { InteractionConfig, InteractionType } from '../types/index.ts';
import type { SocialAnimation } from '../types/avatar.ts';
import { AnimationStateMachine } from './animation-state-machine.ts';

/** Maps interaction types to social animation states */
const INTERACTION_TO_ANIMATION: Partial<Record<InteractionType, SocialAnimation>> = {
  sit: 'sit',
  dance: 'dance',
  swing: 'swing',
  float: 'float',
  enter: 'enter',
  drink: 'drink',
  play: 'play',
  roast_marshmallow: 'roast_marshmallow',
};

/** Interactions that toggle (sit→stand, enter→exit) */
const TOGGLE_INTERACTIONS: Set<InteractionType> = new Set([
  'sit', 'float', 'enter', 'roast_marshmallow',
]);

export interface InteractionResult {
  executed: boolean;
  animationAvailable: boolean;
  animationState: string | null;
  message: string;
}

export class InteractionController {
  private animStateMachine: AnimationStateMachine;
  private activeToggle: InteractionType | null = null;
  private promptOverride: string | null = null;
  private onPromptChange: ((prompt: string | null) => void) | null = null;

  constructor(animStateMachine: AnimationStateMachine) {
    this.animStateMachine = animStateMachine;
  }

  /** Get current prompt override (for toggle states like "Stand") */
  getPromptOverride(): string | null {
    return this.promptOverride;
  }

  /** Set callback for when prompt text should change */
  onPromptUpdate(callback: (prompt: string | null) => void): void {
    this.onPromptChange = callback;
  }

  /**
   * Handle an interaction triggered by E.
   * Returns result indicating whether the animation played.
   */
  handleInteraction(interaction: InteractionConfig): InteractionResult {
    const animState = INTERACTION_TO_ANIMATION[interaction.interactionType];

    // Portal interactions are handled elsewhere
    if (interaction.interactionType === 'portal') {
      return {
        executed: false,
        animationAvailable: false,
        animationState: null,
        message: 'Portal interaction handled by district system.',
      };
    }

    // Emote-type (no animation mapping — e.g. 'emote', 'stand', 'none')
    if (!animState) {
      return {
        executed: false,
        animationAvailable: false,
        animationState: null,
        message: `No animation mapped for interaction type: ${interaction.interactionType}`,
      };
    }

    // Toggle logic: if already in this state, exit it
    if (TOGGLE_INTERACTIONS.has(interaction.interactionType) &&
        this.activeToggle === interaction.interactionType) {
      return this.exitToggleState();
    }

    // Check if animation is implemented
    const available = this.animStateMachine.hasAnimation(animState);

    if (available) {
      // Play the social animation
      this.animStateMachine.playSocialAnimation(animState);

      // Set up toggle state
      if (TOGGLE_INTERACTIONS.has(interaction.interactionType)) {
        this.activeToggle = interaction.interactionType;
        this.promptOverride = this.getExitPrompt(interaction.interactionType);
        if (this.onPromptChange) {
          this.onPromptChange(this.promptOverride);
        }
      }

      return {
        executed: true,
        animationAvailable: true,
        animationState: animState,
        message: `Playing: ${animState}`,
      };
    } else {
      // Animation hook exists but no procedural/clip animation yet
      // Still enter the state so the architecture is exercised
      this.animStateMachine.playSocialAnimation(animState);

      if (TOGGLE_INTERACTIONS.has(interaction.interactionType)) {
        this.activeToggle = interaction.interactionType;
        this.promptOverride = this.getExitPrompt(interaction.interactionType);
        if (this.onPromptChange) {
          this.onPromptChange(this.promptOverride);
        }
      }

      return {
        executed: true,
        animationAvailable: false,
        animationState: animState,
        message: `Interaction wiring complete, but the ${animState} animation asset is not currently available.`,
      };
    }
  }

  /** Exit the current toggle state (sit→stand, float→exit) */
  exitToggleState(): InteractionResult {
    const wasState = this.activeToggle;
    this.activeToggle = null;
    this.promptOverride = null;
    this.animStateMachine.stopSocialAnimation();

    if (this.onPromptChange) {
      this.onPromptChange(null);
    }

    return {
      executed: true,
      animationAvailable: true,
      animationState: 'idle',
      message: `Exited ${wasState} state.`,
    };
  }

  /** Check if player is currently in a toggle interaction */
  isInToggleState(): boolean {
    return this.activeToggle !== null;
  }

  /** Get the active toggle type */
  getActiveToggle(): InteractionType | null {
    return this.activeToggle;
  }

  /** Force exit any active interaction (e.g. when player starts moving) */
  forceExit(): void {
    if (this.activeToggle) {
      this.exitToggleState();
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private getExitPrompt(type: InteractionType): string {
    switch (type) {
      case 'sit': return '[E] Stand';
      case 'float': return '[E] Exit Water';
      case 'enter': return '[E] Exit';
      case 'roast_marshmallow': return '[E] Stop Roasting';
      default: return '[E] Stop';
    }
  }
}
