/**
 * OCC Live - Accessibility Manager (Part 12)
 * Manages accessibility settings for readable text, contrast,
 * reduced motion, text alternatives, and flashing prevention.
 *
 * Requirements:
 * - Readable text and sufficient contrast
 * - Do not rely solely on color for important states
 * - Provide text alternatives for important prompts
 * - Allow reduction of nonessential effects where practical
 * - Avoid excessive flashing
 * - Do not rely on audio alone for critical information
 * - No identifying information in accessibility features
 */

import type { AccessibilityConfig } from '../types/index.ts';

// ─── Default Accessibility Config ────────────────────────────────────────────

const DEFAULT_ACCESSIBILITY: AccessibilityConfig = {
  reducedMotion: false,
  highContrast: false,
  textScale: 1.0,
  showTextAlternatives: false,
  disableFlashing: false,
  masterVolume: 1.0,
  musicVolume: 0.7,
  effectsVolume: 0.8,
  ambienceVolume: 0.6,
};

// ─── Callbacks ───────────────────────────────────────────────────────────────

export interface AccessibilityCallbacks {
  onReducedMotionChanged?: (enabled: boolean) => void;
  onHighContrastChanged?: (enabled: boolean) => void;
  onTextScaleChanged?: (scale: number) => void;
  onVolumeChanged?: (category: string, volume: number) => void;
  onFlashingDisabled?: (disabled: boolean) => void;
}

// ─── Accessibility Manager ───────────────────────────────────────────────────

export class AccessibilityManager {
  private config: AccessibilityConfig;
  private callbacks: AccessibilityCallbacks = {};
  private styleElement: HTMLStyleElement | null = null;
  private mediaQuery: MediaQueryList | null = null;

  constructor(initialConfig?: Partial<AccessibilityConfig>) {
    this.config = { ...DEFAULT_ACCESSIBILITY, ...initialConfig };
    this.detectSystemPreferences();
    this.applyStyles();
  }

  // ─── Configuration ─────────────────────────────────────────────────────

  setCallbacks(callbacks: AccessibilityCallbacks): void {
    this.callbacks = callbacks;
  }

  /** Get the current accessibility config */
  getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  /** Apply a partial config update */
  updateConfig(updates: Partial<AccessibilityConfig>): void {
    const prev = { ...this.config };
    this.config = { ...this.config, ...updates };

    // Notify on changes
    if (updates.reducedMotion !== undefined && updates.reducedMotion !== prev.reducedMotion) {
      this.callbacks.onReducedMotionChanged?.(this.config.reducedMotion);
    }
    if (updates.highContrast !== undefined && updates.highContrast !== prev.highContrast) {
      this.callbacks.onHighContrastChanged?.(this.config.highContrast);
    }
    if (updates.textScale !== undefined && updates.textScale !== prev.textScale) {
      this.callbacks.onTextScaleChanged?.(this.config.textScale);
    }
    if (updates.disableFlashing !== undefined && updates.disableFlashing !== prev.disableFlashing) {
      this.callbacks.onFlashingDisabled?.(this.config.disableFlashing);
    }
    if (updates.masterVolume !== undefined) this.callbacks.onVolumeChanged?.('master', this.config.masterVolume);
    if (updates.musicVolume !== undefined) this.callbacks.onVolumeChanged?.('music', this.config.musicVolume);
    if (updates.effectsVolume !== undefined) this.callbacks.onVolumeChanged?.('effects', this.config.effectsVolume);
    if (updates.ambienceVolume !== undefined) this.callbacks.onVolumeChanged?.('ambience', this.config.ambienceVolume);

    this.applyStyles();
  }

  // ─── Individual Settings ───────────────────────────────────────────────

  setReducedMotion(enabled: boolean): void {
    this.updateConfig({ reducedMotion: enabled });
  }

  setHighContrast(enabled: boolean): void {
    this.updateConfig({ highContrast: enabled });
  }

  setTextScale(scale: number): void {
    this.updateConfig({ textScale: Math.max(0.8, Math.min(2.0, scale)) });
  }

  setShowTextAlternatives(enabled: boolean): void {
    this.updateConfig({ showTextAlternatives: enabled });
  }

  setDisableFlashing(disabled: boolean): void {
    this.updateConfig({ disableFlashing: disabled });
  }

  setMasterVolume(volume: number): void {
    this.updateConfig({ masterVolume: Math.max(0, Math.min(1, volume)) });
  }

  setMusicVolume(volume: number): void {
    this.updateConfig({ musicVolume: Math.max(0, Math.min(1, volume)) });
  }

  setEffectsVolume(volume: number): void {
    this.updateConfig({ effectsVolume: Math.max(0, Math.min(1, volume)) });
  }

  setAmbienceVolume(volume: number): void {
    this.updateConfig({ ambienceVolume: Math.max(0, Math.min(1, volume)) });
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  isReducedMotion(): boolean { return this.config.reducedMotion; }
  isHighContrast(): boolean { return this.config.highContrast; }
  isFlashingDisabled(): boolean { return this.config.disableFlashing; }
  shouldShowTextAlternatives(): boolean { return this.config.showTextAlternatives; }
  getTextScale(): number { return this.config.textScale; }

  /** Get the effective volume for a category (master × category) */
  getEffectiveVolume(category: 'music' | 'effects' | 'ambience'): number {
    const categoryVolume = this.config[`${category}Volume`] ?? 1;
    return this.config.masterVolume * categoryVolume;
  }

  /** Should an animation/particle effect be shown? */
  shouldShowEffect(isEssential: boolean): boolean {
    if (isEssential) return true; // Essential effects always shown
    return !this.config.reducedMotion;
  }

  /** Should a flashing/strobing effect be shown? */
  shouldShowFlashing(): boolean {
    return !this.config.disableFlashing;
  }

  // ─── Settings Panel UI ─────────────────────────────────────────────────

  /** Show the accessibility settings panel */
  showSettingsPanel(): void {
    this.removeSettingsPanel();

    const el = document.createElement('div');
    el.id = 'accessibility-panel';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Accessibility Settings');
    el.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      z-index:7500;max-width:380px;width:90%;max-height:80vh;overflow-y:auto;
      background:linear-gradient(135deg,#1a0a2e,#2d1b4e);
      border-radius:16px;border:1px solid rgba(124,77,255,0.3);
      padding:24px;color:#fff;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      box-shadow:0 20px 60px rgba(0,0,0,0.6);
    `;

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h2 style="font-size:18px;font-weight:700;margin:0;">Accessibility</h2>
        <button id="a11y-close" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:4px 8px;" aria-label="Close">&times;</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;">
        ${this.renderToggle('a11y-motion', 'Reduce Motion', 'Minimizes animations and particle effects', this.config.reducedMotion)}
        ${this.renderToggle('a11y-contrast', 'High Contrast', 'Increases contrast for better readability', this.config.highContrast)}
        ${this.renderToggle('a11y-flash', 'Disable Flashing', 'Prevents strobing and rapid light changes', this.config.disableFlashing)}
        ${this.renderToggle('a11y-text-alt', 'Text Alternatives', 'Shows text labels for icon-only prompts', this.config.showTextAlternatives)}

        <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;">
          ${this.renderSlider('a11y-text-scale', 'Text Size', this.config.textScale, 0.8, 2.0, 0.1)}
        </div>

        <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;">
          <div style="font-size:14px;font-weight:600;margin-bottom:8px;">Volume</div>
          ${this.renderSlider('a11y-vol-master', 'Master', this.config.masterVolume, 0, 1, 0.05)}
          ${this.renderSlider('a11y-vol-music', 'Music', this.config.musicVolume, 0, 1, 0.05)}
          ${this.renderSlider('a11y-vol-effects', 'Effects', this.config.effectsVolume, 0, 1, 0.05)}
          ${this.renderSlider('a11y-vol-ambience', 'Ambience', this.config.ambienceVolume, 0, 1, 0.05)}
        </div>
      </div>
    `;

    document.body.appendChild(el);

    // Wire events
    el.querySelector('#a11y-close')?.addEventListener('click', () => this.removeSettingsPanel());
    el.querySelector('#a11y-motion')?.addEventListener('change', (e) => this.setReducedMotion((e.target as HTMLInputElement).checked));
    el.querySelector('#a11y-contrast')?.addEventListener('change', (e) => this.setHighContrast((e.target as HTMLInputElement).checked));
    el.querySelector('#a11y-flash')?.addEventListener('change', (e) => this.setDisableFlashing((e.target as HTMLInputElement).checked));
    el.querySelector('#a11y-text-alt')?.addEventListener('change', (e) => this.setShowTextAlternatives((e.target as HTMLInputElement).checked));
    el.querySelector('#a11y-text-scale')?.addEventListener('input', (e) => this.setTextScale(parseFloat((e.target as HTMLInputElement).value)));
    el.querySelector('#a11y-vol-master')?.addEventListener('input', (e) => this.setMasterVolume(parseFloat((e.target as HTMLInputElement).value)));
    el.querySelector('#a11y-vol-music')?.addEventListener('input', (e) => this.setMusicVolume(parseFloat((e.target as HTMLInputElement).value)));
    el.querySelector('#a11y-vol-effects')?.addEventListener('input', (e) => this.setEffectsVolume(parseFloat((e.target as HTMLInputElement).value)));
    el.querySelector('#a11y-vol-ambience')?.addEventListener('input', (e) => this.setAmbienceVolume(parseFloat((e.target as HTMLInputElement).value)));

    // Escape to close
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { this.removeSettingsPanel(); document.removeEventListener('keydown', keyHandler); }
    };
    document.addEventListener('keydown', keyHandler);
  }

  /** Remove the settings panel */
  removeSettingsPanel(): void {
    document.getElementById('accessibility-panel')?.remove();
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  dispose(): void {
    this.removeStyles();
    this.removeSettingsPanel();
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener('change', this.onMotionPreferenceChange);
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private detectSystemPreferences(): void {
    // Respect OS-level reduced motion preference
    this.mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (this.mediaQuery.matches) {
      this.config.reducedMotion = true;
      this.config.disableFlashing = true;
    }
    this.mediaQuery.addEventListener('change', this.onMotionPreferenceChange);

    // Respect OS-level high contrast
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');
    if (contrastQuery.matches) {
      this.config.highContrast = true;
    }
  }

  private onMotionPreferenceChange = (e: MediaQueryListEvent): void => {
    this.setReducedMotion(e.matches);
    if (e.matches) this.setDisableFlashing(true);
  };

  private applyStyles(): void {
    this.removeStyles();

    const styles: string[] = [];

    // Text scaling
    if (this.config.textScale !== 1.0) {
      styles.push(`
        #hud, .pb-overlay, #onboarding-overlay, .notification {
          font-size: ${this.config.textScale * 100}% !important;
        }
      `);
    }

    // High contrast
    if (this.config.highContrast) {
      styles.push(`
        #hud { text-shadow: 0 1px 4px rgba(0,0,0,1) !important; }
        .pb-panel, #onboarding-overlay > div > div {
          border-width: 2px !important;
          border-color: rgba(255,255,255,0.6) !important;
        }
        .pb-btn { border: 2px solid rgba(255,255,255,0.5) !important; }
        .pb-message, .pb-title { color: #ffffff !important; opacity: 1 !important; }
      `);
    }

    // Reduced motion
    if (this.config.reducedMotion) {
      styles.push(`
        *, *::before, *::after {
          animation-duration: 0.001ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.001ms !important;
        }
        @keyframes pb-pulse { 0%, 100% { transform: none; } }
      `);
    }

    // Text alternatives (show hidden labels)
    if (this.config.showTextAlternatives) {
      styles.push(`
        [aria-label]::after {
          content: attr(aria-label);
          display: block;
          font-size: 11px;
          opacity: 0.7;
          margin-top: 2px;
        }
      `);
    }

    if (styles.length > 0) {
      const styleEl = document.createElement('style');
      styleEl.id = 'occ-accessibility-styles';
      styleEl.textContent = styles.join('\n');
      document.head.appendChild(styleEl);
      this.styleElement = styleEl;
    }
  }

  private removeStyles(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
    document.getElementById('occ-accessibility-styles')?.remove();
  }

  private renderToggle(id: string, label: string, description: string, checked: boolean): string {
    return `
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="width:18px;height:18px;accent-color:#7c4dff;cursor:pointer;" />
        <div>
          <div style="font-size:14px;font-weight:500;">${label}</div>
          <div style="font-size:12px;opacity:0.6;">${description}</div>
        </div>
      </label>
    `;
  }

  private renderSlider(id: string, label: string, value: number, min: number, max: number, step: number): string {
    return `
      <label style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <span style="font-size:13px;min-width:60px;">${label}</span>
        <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"
          style="flex:1;accent-color:#7c4dff;cursor:pointer;" />
        <span style="font-size:12px;opacity:0.6;min-width:32px;text-align:right;">${Math.round(value * 100)}%</span>
      </label>
    `;
  }
}
