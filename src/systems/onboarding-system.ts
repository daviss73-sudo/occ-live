/**
 * OCC Live - Onboarding System (Part 12)
 * Short, skippable introduction explaining core controls and interactions.
 *
 * Design:
 * - Keep onboarding short (under 60 seconds)
 * - Explain: movement, interaction key, avatar selection, wave/dance, basic activities
 * - Do not require tutorial completion
 * - Never request identifying information
 * - Show once per session (not persistent across sessions)
 * - Can be dismissed at any time
 * - Accessible: readable text, sufficient contrast, text alternatives
 */

// ─── Onboarding Step ─────────────────────────────────────────────────────────

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  /** Key/button to highlight (visual cue) */
  highlightKey: string | null;
  /** Duration to auto-advance (ms). 0 = wait for user action. */
  autoAdvanceMs: number;
  /** Position hint on screen */
  position: 'center' | 'bottom' | 'top';
}

// ─── Default Steps ───────────────────────────────────────────────────────────

const DEFAULT_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to OCC Live',
    description: 'A social space to hang out, explore, and have fun. No login needed.',
    highlightKey: null,
    autoAdvanceMs: 0,
    position: 'center',
  },
  {
    id: 'movement',
    title: 'Moving Around',
    description: 'Use WASD to walk. Hold Shift to run. Space to jump.',
    highlightKey: 'WASD',
    autoAdvanceMs: 0,
    position: 'bottom',
  },
  {
    id: 'camera',
    title: 'Camera',
    description: 'Right-click and drag to rotate the camera. Scroll to zoom.',
    highlightKey: 'Mouse',
    autoAdvanceMs: 0,
    position: 'bottom',
  },
  {
    id: 'interact',
    title: 'Interactions',
    description: 'Press E near highlighted objects to interact. Sit, dance, explore!',
    highlightKey: 'E',
    autoAdvanceMs: 0,
    position: 'bottom',
  },
  {
    id: 'emotes',
    title: 'Emotes',
    description: 'Press 1 to Wave, 2 to Dance, 3 to Cheer. More emotes on number keys.',
    highlightKey: '1-8',
    autoAdvanceMs: 0,
    position: 'bottom',
  },
  {
    id: 'explore',
    title: 'Explore!',
    description: 'Visit districts through portals. Try activities. Meet other visitors. Have fun!',
    highlightKey: null,
    autoAdvanceMs: 0,
    position: 'center',
  },
];

// ─── Callbacks ───────────────────────────────────────────────────────────────

export interface OnboardingCallbacks {
  onStepShown?: (step: OnboardingStep, index: number, total: number) => void;
  onStepCompleted?: (step: OnboardingStep) => void;
  onCompleted?: () => void;
  onSkipped?: () => void;
}

// ─── Onboarding System ───────────────────────────────────────────────────────

export class OnboardingSystem {
  private steps: OnboardingStep[];
  private currentIndex: number = -1;
  private isActive: boolean = false;
  private isComplete: boolean = false;
  private callbacks: OnboardingCallbacks = {};
  private overlayElement: HTMLElement | null = null;
  private autoAdvanceTimer: number | null = null;

  constructor(steps?: OnboardingStep[]) {
    this.steps = steps ?? [...DEFAULT_ONBOARDING_STEPS];
  }

  // ─── Configuration ─────────────────────────────────────────────────────

  setCallbacks(callbacks: OnboardingCallbacks): void {
    this.callbacks = callbacks;
  }

  setSteps(steps: OnboardingStep[]): void {
    this.steps = steps;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  /** Start the onboarding flow */
  start(): void {
    if (this.isComplete || this.isActive) return;
    this.isActive = true;
    this.currentIndex = -1;
    this.showNext();
  }

  /** Skip the entire onboarding */
  skip(): void {
    this.clearAutoAdvance();
    this.removeOverlay();
    this.isActive = false;
    this.isComplete = true;
    this.callbacks.onSkipped?.();
  }

  /** Advance to the next step */
  showNext(): void {
    this.clearAutoAdvance();
    this.currentIndex++;

    if (this.currentIndex >= this.steps.length) {
      this.complete();
      return;
    }

    const step = this.steps[this.currentIndex];
    this.renderStep(step);
    this.callbacks.onStepShown?.(step, this.currentIndex, this.steps.length);

    if (step.autoAdvanceMs > 0) {
      this.autoAdvanceTimer = window.setTimeout(() => {
        this.showNext();
      }, step.autoAdvanceMs);
    }
  }

  /** Go back to previous step */
  showPrevious(): void {
    if (this.currentIndex <= 0) return;
    this.clearAutoAdvance();
    this.currentIndex -= 2; // Will be incremented in showNext
    this.showNext();
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  isOnboardingActive(): boolean { return this.isActive; }
  isOnboardingComplete(): boolean { return this.isComplete; }
  getCurrentStep(): OnboardingStep | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.steps.length) return null;
    return this.steps[this.currentIndex];
  }
  getProgress(): { current: number; total: number } {
    return { current: this.currentIndex + 1, total: this.steps.length };
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────

  dispose(): void {
    this.clearAutoAdvance();
    this.removeOverlay();
  }

  // ─── Private: Rendering ────────────────────────────────────────────────

  private complete(): void {
    this.removeOverlay();
    this.isActive = false;
    this.isComplete = true;
    this.callbacks.onCompleted?.();
  }

  private renderStep(step: OnboardingStep): void {
    this.removeOverlay();

    const el = document.createElement('div');
    el.id = 'onboarding-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Tutorial');

    const positionStyles: Record<string, string> = {
      center: 'top: 50%; left: 50%; transform: translate(-50%, -50%);',
      bottom: 'bottom: 80px; left: 50%; transform: translateX(-50%);',
      top: 'top: 80px; left: 50%; transform: translateX(-50%);',
    };

    el.style.cssText = `
      position: fixed;
      ${positionStyles[step.position]}
      z-index: 8000;
      max-width: 420px;
      width: 90%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    const progress = `${this.currentIndex + 1} / ${this.steps.length}`;
    const keyHint = step.highlightKey
      ? `<div style="margin-top:8px;"><span style="display:inline-block;padding:4px 12px;background:rgba(124,77,255,0.3);border:1px solid rgba(124,77,255,0.6);border-radius:6px;font-size:13px;font-weight:600;">${step.highlightKey}</span></div>`
      : '';

    el.innerHTML = `
      <div style="background:linear-gradient(135deg,#1a0a2e,#2d1b4e);border-radius:16px;border:1px solid rgba(124,77,255,0.3);padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.6);color:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:12px;opacity:0.5;">${progress}</span>
          <button id="ob-skip" style="background:none;border:none;color:rgba(255,255,255,0.5);font-size:12px;cursor:pointer;padding:4px 8px;" aria-label="Skip tutorial">Skip</button>
        </div>
        <h2 style="font-size:18px;font-weight:700;margin:0 0 8px;">${step.title}</h2>
        <p style="font-size:14px;line-height:1.5;margin:0;opacity:0.85;">${step.description}</p>
        ${keyHint}
        <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;">
          ${this.currentIndex > 0 ? '<button id="ob-prev" style="padding:8px 16px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:#fff;border-radius:8px;cursor:pointer;font-size:13px;">Back</button>' : ''}
          <button id="ob-next" style="padding:8px 20px;background:linear-gradient(135deg,#7c4dff,#536dfe);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">${this.currentIndex < this.steps.length - 1 ? 'Next' : 'Got it!'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(el);
    this.overlayElement = el;

    // Wire buttons
    el.querySelector('#ob-skip')?.addEventListener('click', () => this.skip());
    el.querySelector('#ob-next')?.addEventListener('click', () => {
      this.callbacks.onStepCompleted?.(step);
      this.showNext();
    });
    el.querySelector('#ob-prev')?.addEventListener('click', () => this.showPrevious());

    // Keyboard: Enter to advance, Escape to skip
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { this.callbacks.onStepCompleted?.(step); this.showNext(); }
      if (e.key === 'Escape') this.skip();
      document.removeEventListener('keydown', keyHandler);
    };
    document.addEventListener('keydown', keyHandler);
  }

  private removeOverlay(): void {
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
  }

  private clearAutoAdvance(): void {
    if (this.autoAdvanceTimer !== null) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }
}
