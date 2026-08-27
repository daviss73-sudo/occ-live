/**
 * OCC Live - Energy Wheel UI
 * Radial menu for selecting energy reactions.
 * Opens on key press (Q or click), displays 8 universal non-human
 * energy symbols, closes after selection or dismissal.
 *
 * Design:
 * - Radial/wheel layout with 8 reactions
 * - Opens/closes cleanly (no leftover state)
 * - Lightweight, game-like feel
 * - No names, profiles, favorites, or identity required
 * - Works with unrigged/static avatars (no animation needed)
 * - Repeatable — users can trigger reactions repeatedly
 */

// ─── Reaction Definitions ────────────────────────────────────────────────────

export interface EnergyReaction {
  id: string;
  symbol: string;
  label: string;
  energy: string;
  color: string;
}

export const ENERGY_REACTIONS: EnergyReaction[] = [
  { id: 'fire', symbol: '🔥', label: 'Fire', energy: 'Hype / intensity', color: '#ff4400' },
  { id: 'lightning', symbol: '⚡', label: 'Lightning', energy: 'Electric / energized', color: '#ffdd00' },
  { id: 'sparkle', symbol: '✨', label: 'Sparkle', energy: 'Good energy', color: '#ffee88' },
  { id: 'boom', symbol: '💥', label: 'Boom', energy: 'Big moment', color: '#ff6600' },
  { id: 'celebrate', symbol: '🎉', label: 'Celebrate', energy: 'Celebration', color: '#ff44cc' },
  { id: 'wave', symbol: '🌊', label: 'Wave', energy: 'Flow / chill', color: '#4488ff' },
  { id: 'cosmic', symbol: '💫', label: 'Cosmic', energy: 'Extra energy', color: '#aa66ff' },
  { id: 'moon', symbol: '🌙', label: 'Moon', energy: 'Calm / low-key', color: '#8899bb' },
];

// ─── Callbacks ───────────────────────────────────────────────────────────────

export interface EnergyWheelCallbacks {
  onReactionSelected?: (reaction: EnergyReaction) => void;
  onWheelOpened?: () => void;
  onWheelClosed?: () => void;
}

// ─── Energy Wheel UI ─────────────────────────────────────────────────────────

export class EnergyWheelUI {
  private callbacks: EnergyWheelCallbacks = {};
  private overlay: HTMLElement | null = null;
  private styleElement: HTMLStyleElement | null = null;
  private isOpen: boolean = false;
  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    this.injectStyles();
    this.bindToggleKey();
  }

  // ─── Configuration ─────────────────────────────────────────────────────

  setCallbacks(callbacks: EnergyWheelCallbacks): void {
    this.callbacks = callbacks;
  }

  // ─── Open / Close ──────────────────────────────────────────────────────

  /** Open the Energy Wheel */
  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.render();
    this.callbacks.onWheelOpened?.();
  }

  /** Close the Energy Wheel without selecting */
  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.removeOverlay();
    this.callbacks.onWheelClosed?.();
  }

  /** Toggle open/close */
  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  /** Is the wheel currently open? */
  getIsOpen(): boolean {
    return this.isOpen;
  }

  // ─── Rendering ─────────────────────────────────────────────────────────

  private render(): void {
    this.removeOverlay();

    const el = document.createElement('div');
    el.id = 'energy-wheel-overlay';
    el.className = 'ew-overlay';
    el.setAttribute('role', 'menu');
    el.setAttribute('aria-label', 'Energy Wheel');

    // Build radial items
    const items = ENERGY_REACTIONS.map((reaction, index) => {
      const angle = (index / ENERGY_REACTIONS.length) * 360 - 90; // Start from top
      const rad = (angle * Math.PI) / 180;
      const radius = 120; // px from center
      const x = Math.cos(rad) * radius;
      const y = Math.sin(rad) * radius;

      return `
        <button class="ew-item" data-id="${reaction.id}"
          style="transform: translate(${x}px, ${y}px);"
          aria-label="${reaction.label}: ${reaction.energy}">
          <span class="ew-symbol">${reaction.symbol}</span>
          <span class="ew-label">${reaction.label}</span>
        </button>
      `;
    }).join('');

    el.innerHTML = `
      <div class="ew-backdrop"></div>
      <div class="ew-wheel">
        <div class="ew-center">
          <span class="ew-center-text">ENERGY</span>
        </div>
        ${items}
      </div>
      <div class="ew-hint">Q to close</div>
    `;

    document.body.appendChild(el);
    this.overlay = el;

    // Wire click events
    el.querySelectorAll('.ew-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (btn as HTMLElement).dataset.id;
        const reaction = ENERGY_REACTIONS.find(r => r.id === id);
        if (reaction) {
          this.selectReaction(reaction);
        }
        e.stopPropagation();
      });
    });

    // Click backdrop to close
    el.querySelector('.ew-backdrop')?.addEventListener('click', () => this.close());
  }

  private selectReaction(reaction: EnergyReaction): void {
    this.close();
    this.callbacks.onReactionSelected?.(reaction);
  }

  private removeOverlay(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  // ─── Key Binding ───────────────────────────────────────────────────────

  private bindToggleKey(): void {
    this.boundKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key.toLowerCase() === 'q') {
        e.preventDefault();
        this.toggle();
      }

      // Escape closes the wheel
      if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        this.close();
      }
    };
    document.addEventListener('keydown', this.boundKeyDown);
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  dispose(): void {
    this.removeOverlay();
    if (this.boundKeyDown) {
      document.removeEventListener('keydown', this.boundKeyDown);
      this.boundKeyDown = null;
    }
    this.styleElement?.remove();
  }

  // ─── Styles ────────────────────────────────────────────────────────────

  private injectStyles(): void {
    if (document.getElementById('ew-styles')) return;
    const s = document.createElement('style');
    s.id = 'ew-styles';
    s.textContent = `
      .ew-overlay{position:fixed;inset:0;z-index:7500;display:flex;align-items:center;justify-content:center;pointer-events:all}
      .ew-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.3)}
      .ew-wheel{position:relative;width:300px;height:300px;display:flex;align-items:center;justify-content:center;animation:ew-appear 0.2s ease-out}
      @keyframes ew-appear{0%{transform:scale(0.7);opacity:0}100%{transform:scale(1);opacity:1}}
      .ew-center{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#1a0a2e,#2d1b4e);border:2px solid rgba(124,77,255,0.4);display:flex;align-items:center;justify-content:center;position:absolute}
      .ew-center-text{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;opacity:0.6;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
      .ew-item{position:absolute;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#1a0a2e,#2d1b4e);border:2px solid rgba(124,77,255,0.3);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.15s,border-color 0.15s,box-shadow 0.15s;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:0;color:#fff}
      .ew-item:hover{transform:translate(var(--tx,0),var(--ty,0)) scale(1.2) !important;border-color:rgba(124,77,255,0.8);box-shadow:0 0 20px rgba(124,77,255,0.4);z-index:10}
      .ew-item:active{transform:translate(var(--tx,0),var(--ty,0)) scale(0.95) !important}
      .ew-symbol{font-size:24px;line-height:1}
      .ew-label{font-size:8px;opacity:0.7;margin-top:2px;font-weight:500}
      .ew-hint{position:absolute;bottom:20%;left:50%;transform:translateX(-50%);font-size:11px;opacity:0.4;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    `;
    document.head.appendChild(s);
    this.styleElement = s;
  }
}
