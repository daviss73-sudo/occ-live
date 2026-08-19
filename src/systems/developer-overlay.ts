/**
 * OCC Live - Developer Overlay (Part 5 Updated)
 * Toggleable debug display for system state, avatar info, AVS status,
 * outfit state, animation compatibility, and Lazy River.
 * Disabled in production. Activated via backtick key (`) in dev mode.
 *
 * Part 5 additions:
 * - View Avatar ID and source reference
 * - Force a specific avatar (reload GLB)
 * - Force a specific AVS variation
 * - Reset all variation assignments
 * - Test wetsuit state (apply/remove)
 * - Test animation compatibility
 * - Preview avatar thumbnails
 * - Avatar library stats (loaded, cached, total)
 *
 * These tools are NEVER shown to students in the normal experience.
 */

import type { AvatarLibrary } from '../avatar/avatar-library.ts';
import type { AvatarVariationSystem } from './avatar-variation-system.ts';
import type { TemporaryOutfitSystem } from './temporary-outfit.ts';
import type { LazyRiverSystem } from './lazy-river.ts';
import type { SpawnSystem } from './spawn-system.ts';
import type { AvatarModelEntry } from '../types/pipeline.ts';

// ─── Developer Overlay Configuration ─────────────────────────────────────────

interface DevOverlayConfig {
  isProduction: boolean;
  selectedAvatar?: AvatarModelEntry;
  sessionId?: string;
}

// ─── Developer Overlay System ────────────────────────────────────────────────

export class DeveloperOverlay {
  private enabled: boolean = false;
  private visible: boolean = false;
  private overlayElement: HTMLElement | null = null;
  private panelElement: HTMLElement | null = null;

  // System references
  private avatarLibrary: AvatarLibrary | null = null;
  private avatarVariationSystem: AvatarVariationSystem | null = null;
  private temporaryOutfitSystem: TemporaryOutfitSystem | null = null;
  private lazyRiver: LazyRiverSystem | null = null;
  private spawnSystem: SpawnSystem | null = null;

  // State
  private playerCount: number = 0;
  private localSessionId: string = '';
  private remoteCount: number = 0;
  private selectedAvatar: AvatarModelEntry | null = null;
  private config: DevOverlayConfig;

  // Callbacks for dev actions
  private onForceAvatar: ((avatarId: string) => void) | null = null;
  private onForceVariation: ((topColor: number, bottomColor: number, shoesColor: number) => void) | null = null;
  private onTestWetsuit: ((apply: boolean) => void) | null = null;
  private onResetVariations: (() => void) | null = null;

  constructor(config: DevOverlayConfig) {
    this.config = config;
    this.enabled = !config.isProduction;
    this.selectedAvatar = config.selectedAvatar ?? null;
    this.localSessionId = config.sessionId ?? '';

    if (this.enabled) {
      this.setupKeybind();
      this.createOverlayElement();
      this.createDevPanel();
    }
  }

  // ─── System Attachment ─────────────────────────────────────────────────

  /** Attach Part 5 systems for debug queries and actions */
  attachSystems(opts: {
    avatarLibrary?: AvatarLibrary;
    avatarVariationSystem?: AvatarVariationSystem;
    temporaryOutfitSystem?: TemporaryOutfitSystem;
    lazyRiver?: LazyRiverSystem;
    spawnSystem?: SpawnSystem;
  }): void {
    if (opts.avatarLibrary) this.avatarLibrary = opts.avatarLibrary;
    if (opts.avatarVariationSystem) this.avatarVariationSystem = opts.avatarVariationSystem;
    if (opts.temporaryOutfitSystem) this.temporaryOutfitSystem = opts.temporaryOutfitSystem;
    if (opts.lazyRiver) this.lazyRiver = opts.lazyRiver;
    if (opts.spawnSystem) this.spawnSystem = opts.spawnSystem;
  }

  /** Set action callbacks (wired from main.ts) */
  setActions(actions: {
    onForceAvatar?: (avatarId: string) => void;
    onForceVariation?: (topColor: number, bottomColor: number, shoesColor: number) => void;
    onTestWetsuit?: (apply: boolean) => void;
    onResetVariations?: () => void;
  }): void {
    if (actions.onForceAvatar) this.onForceAvatar = actions.onForceAvatar;
    if (actions.onForceVariation) this.onForceVariation = actions.onForceVariation;
    if (actions.onTestWetsuit) this.onTestWetsuit = actions.onTestWetsuit;
    if (actions.onResetVariations) this.onResetVariations = actions.onResetVariations;
  }

  // ─── State Updates ─────────────────────────────────────────────────────

  /** Update general stats */
  updateStats(playerCount: number, localSessionId: string, remoteCount: number): void {
    this.playerCount = playerCount;
    this.localSessionId = localSessionId;
    this.remoteCount = remoteCount;
  }

  /** Update selected avatar reference */
  setSelectedAvatar(avatar: AvatarModelEntry): void {
    this.selectedAvatar = avatar;
  }

  // ─── Visibility ────────────────────────────────────────────────────────

  /** Toggle visibility */
  toggle(): void {
    if (!this.enabled) return;
    this.visible = !this.visible;
    this.updateVisibility();
    if (this.visible) this.refresh();
  }

  /** Is the overlay currently visible? */
  isVisible(): boolean {
    return this.visible;
  }

  /** Is the overlay system enabled? */
  isEnabled(): boolean {
    return this.enabled;
  }

  /** Force show/hide */
  setVisible(visible: boolean): void {
    this.visible = visible;
    this.updateVisibility();
    if (visible) this.refresh();
  }

  /** Refresh overlay content */
  refresh(): void {
    if (this.visible) {
      this.updateOverlayContent();
    }
  }

  // ─── Private: Setup ────────────────────────────────────────────────────

  private setupKeybind(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === '`' || e.key === '~') {
        this.toggle();
      }
    });
  }

  private createOverlayElement(): void {
    this.overlayElement = document.createElement('div');
    this.overlayElement.id = 'dev-overlay';
    this.overlayElement.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      background: rgba(0, 0, 0, 0.9);
      color: #00ff88;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid rgba(0, 255, 136, 0.3);
      z-index: 9999;
      pointer-events: none;
      display: none;
      min-width: 300px;
      max-width: 380px;
      line-height: 1.5;
      max-height: 60vh;
      overflow-y: auto;
    `;
    document.body.appendChild(this.overlayElement);
  }

  private createDevPanel(): void {
    this.panelElement = document.createElement('div');
    this.panelElement.id = 'dev-panel';
    this.panelElement.style.cssText = `
      position: fixed;
      bottom: 16px;
      right: 16px;
      background: rgba(0, 0, 0, 0.92);
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid rgba(124, 77, 255, 0.4);
      z-index: 9999;
      display: none;
      min-width: 280px;
      max-width: 340px;
    `;
    document.body.appendChild(this.panelElement);
  }

  private updateVisibility(): void {
    if (this.overlayElement) {
      this.overlayElement.style.display = this.visible ? 'block' : 'none';
      this.overlayElement.style.pointerEvents = this.visible ? 'auto' : 'none';
    }
    if (this.panelElement) {
      this.panelElement.style.display = this.visible ? 'block' : 'none';
    }
  }

  // ─── Private: Content ──────────────────────────────────────────────────

  private updateOverlayContent(): void {
    if (!this.overlayElement || !this.panelElement) return;

    // ─── Info Overlay (top-right) ────────────────────────────────────────
    const lines: string[] = [
      '<span style="color:#7c4dff;font-weight:bold">── OCC LIVE DEV (Part 5) ──</span>',
      '',
    ];

    // Session info
    lines.push(`<span style="color:#aaa">Session:</span> ${this.localSessionId.slice(0, 12) || 'N/A'}...`);
    lines.push(`<span style="color:#aaa">Players:</span> ${this.playerCount} (${this.remoteCount} remote)`);
    lines.push('');

    // Avatar info
    lines.push('<span style="color:#7c4dff">── AVATAR ──</span>');
    if (this.selectedAvatar) {
      lines.push(`<span style="color:#aaa">ID:</span> ${this.selectedAvatar.id}`);
      lines.push(`<span style="color:#aaa">GLB:</span> ${this.selectedAvatar.file}`);
      lines.push(`<span style="color:#aaa">Mobility:</span> ${this.selectedAvatar.mobility}`);
      lines.push(`<span style="color:#aaa">Tags:</span> ${this.selectedAvatar.tags.join(', ') || 'none'}`);
    } else {
      lines.push('No avatar selected');
    }
    lines.push('');

    // Avatar Library stats
    lines.push('<span style="color:#7c4dff">── LIBRARY ──</span>');
    if (this.avatarLibrary) {
      lines.push(`<span style="color:#aaa">Registered:</span> ${this.avatarLibrary.getCount()}`);
      lines.push(`<span style="color:#aaa">Cached:</span> ${this.avatarLibrary.getCacheSize()}`);

      if (this.selectedAvatar) {
        const state = this.avatarLibrary.getLoadState(this.selectedAvatar.id);
        lines.push(`<span style="color:#aaa">Load State:</span> ${state}`);
        const info = this.avatarLibrary.getAvatarMeshInfo(this.selectedAvatar.id);
        if (info) {
          lines.push(`<span style="color:#aaa">Skeleton:</span> ${info.hasSkeleton ? `yes (${info.boneCount} bones)` : 'no (procedural)'}`);
          lines.push(`<span style="color:#aaa">Meshes:</span> ${info.meshCount}`);
        }
      }
    }
    lines.push('');

    // AVS status
    lines.push('<span style="color:#7c4dff">── AVS ──</span>');
    if (this.avatarVariationSystem) {
      const debug = this.avatarVariationSystem.getDebugInfo();
      lines.push(`<span style="color:#aaa">Active Variations:</span> ${debug.totalVariations}`);
      lines.push(`<span style="color:#aaa">Palette Size:</span> ${debug.paletteSize}`);

      const hasVar = this.avatarVariationSystem.hasVariation(this.localSessionId);
      lines.push(`<span style="color:#aaa">Local Variation:</span> ${hasVar ? 'YES' : 'no (original)'}`);

      if (hasVar) {
        const colors = this.avatarVariationSystem.getColors(this.localSessionId);
        lines.push(`  Top: #${(colors.top ?? 0).toString(16).padStart(6, '0')}`);
        lines.push(`  Bottom: #${(colors.bottom ?? 0).toString(16).padStart(6, '0')}`);
        lines.push(`  Shoes: #${(colors.shoes ?? 0).toString(16).padStart(6, '0')}`);
      }

      // Show duplicate avatar counts
      const usage = debug.avatarUsage;
      const duplicates = Object.entries(usage).filter(([, count]) => count > 1);
      if (duplicates.length > 0) {
        lines.push(`<span style="color:#aaa">Duplicates:</span>`);
        for (const [id, count] of duplicates) {
          lines.push(`  ${id}: ${count} players`);
        }
      }
    }
    lines.push('');

    // Outfit status
    lines.push('<span style="color:#7c4dff">── OUTFIT ──</span>');
    if (this.temporaryOutfitSystem) {
      const wearing = this.temporaryOutfitSystem.isWearingOutfit(this.localSessionId);
      const outfitId = this.temporaryOutfitSystem.getActiveOutfitId(this.localSessionId);
      lines.push(`<span style="color:#aaa">Wearing:</span> ${wearing ? outfitId : 'none'}`);
    }
    lines.push('');

    // Lazy River status
    lines.push('<span style="color:#7c4dff">── LAZY RIVER ──</span>');
    if (this.lazyRiver) {
      lines.push(`<span style="color:#aaa">Floating:</span> ${this.lazyRiver.getFloatingCount()} players`);
      lines.push(`<span style="color:#aaa">Local in river:</span> ${this.lazyRiver.isFloating(this.localSessionId) ? 'YES' : 'no'}`);
      lines.push(`<span style="color:#aaa">Waypoints:</span> ${this.lazyRiver.getWaypointCount()}`);
    }
    lines.push('');
    lines.push('<span style="color:#666">Press ` to toggle</span>');

    this.overlayElement.innerHTML = lines.join('<br>');

    // ─── Action Panel (bottom-right) ─────────────────────────────────────
    this.panelElement.innerHTML = `
      <div style="font-weight:bold;color:#7c4dff;margin-bottom:8px;font-size:13px">DEV ACTIONS</div>

      <div style="margin-bottom:8px">
        <label style="color:#aaa;font-size:11px">Force Avatar ID:</label><br>
        <input id="dev-force-avatar" type="text" value="${this.selectedAvatar?.id ?? ''}"
          style="width:140px;background:#1a1a1a;border:1px solid #444;color:#fff;padding:3px 6px;border-radius:4px;font-size:11px"
          placeholder="avatar_001">
        <button id="dev-force-avatar-btn" style="background:#536dfe;color:#fff;border:none;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:11px;margin-left:4px">Load</button>
      </div>

      <div style="margin-bottom:8px">
        <label style="color:#aaa;font-size:11px">Force Variation Colors:</label><br>
        <input id="dev-var-top" type="text" value="#4488cc" style="width:65px;background:#1a1a1a;border:1px solid #444;color:#fff;padding:3px 4px;border-radius:4px;font-size:11px" placeholder="#hex">
        <input id="dev-var-bottom" type="text" value="#2c3e50" style="width:65px;background:#1a1a1a;border:1px solid #444;color:#fff;padding:3px 4px;border-radius:4px;font-size:11px;margin-left:2px" placeholder="#hex">
        <input id="dev-var-shoes" type="text" value="#ffffff" style="width:65px;background:#1a1a1a;border:1px solid #444;color:#fff;padding:3px 4px;border-radius:4px;font-size:11px;margin-left:2px" placeholder="#hex">
        <button id="dev-force-var-btn" style="background:#536dfe;color:#fff;border:none;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:11px;margin-left:4px">Apply</button>
      </div>

      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
        <button id="dev-reset-avs" style="background:#333;color:#ff6b6b;border:1px solid #ff6b6b;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">Reset AVS</button>
        <button id="dev-test-wetsuit" style="background:#333;color:#4fc3f7;border:1px solid #4fc3f7;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">Toggle Wetsuit</button>
        <button id="dev-anim-check" style="background:#333;color:#66bb6a;border:1px solid #66bb6a;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">Anim Check</button>
      </div>

      <div style="margin-bottom:4px">
        <button id="dev-thumbnail-preview" style="background:#333;color:#ffd54f;border:1px solid #ffd54f;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">Preview Thumbnails</button>
        <button id="dev-refresh" style="background:#333;color:#aaa;border:1px solid #555;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;margin-left:4px">Refresh</button>
      </div>

      <div id="dev-output" style="margin-top:8px;padding:6px;background:#111;border-radius:4px;font-family:monospace;font-size:10px;color:#0f0;max-height:100px;overflow-y:auto;display:none"></div>
    `;

    // Wire button events
    this.wireDevPanelEvents();
  }

  private wireDevPanelEvents(): void {
    // Force Avatar
    const forceAvatarBtn = document.getElementById('dev-force-avatar-btn');
    forceAvatarBtn?.addEventListener('click', () => {
      const input = document.getElementById('dev-force-avatar') as HTMLInputElement;
      const id = input.value.trim();
      if (id && this.onForceAvatar) {
        this.onForceAvatar(id);
        this.showDevOutput(`Forcing avatar: ${id}`);
      }
    });

    // Force Variation
    const forceVarBtn = document.getElementById('dev-force-var-btn');
    forceVarBtn?.addEventListener('click', () => {
      const topInput = document.getElementById('dev-var-top') as HTMLInputElement;
      const bottomInput = document.getElementById('dev-var-bottom') as HTMLInputElement;
      const shoesInput = document.getElementById('dev-var-shoes') as HTMLInputElement;

      const parseHex = (s: string): number => {
        const clean = s.replace('#', '').trim();
        return parseInt(clean, 16) || 0;
      };

      const top = parseHex(topInput.value);
      const bottom = parseHex(bottomInput.value);
      const shoes = parseHex(shoesInput.value);

      if (this.onForceVariation) {
        this.onForceVariation(top, bottom, shoes);
        this.showDevOutput(`Variation forced: top=#${top.toString(16)}, bottom=#${bottom.toString(16)}, shoes=#${shoes.toString(16)}`);
      }
    });

    // Reset AVS
    const resetBtn = document.getElementById('dev-reset-avs');
    resetBtn?.addEventListener('click', () => {
      if (this.onResetVariations) {
        this.onResetVariations();
        this.showDevOutput('All AVS variations reset');
      }
    });

    // Toggle Wetsuit
    const wetsuitBtn = document.getElementById('dev-test-wetsuit');
    wetsuitBtn?.addEventListener('click', () => {
      if (this.temporaryOutfitSystem && this.onTestWetsuit) {
        const isWearing = this.temporaryOutfitSystem.isWearingOutfit(this.localSessionId);
        this.onTestWetsuit(!isWearing);
        this.showDevOutput(isWearing ? 'Wetsuit removed' : 'Wetsuit applied');
      }
    });

    // Animation Check
    const animBtn = document.getElementById('dev-anim-check');
    animBtn?.addEventListener('click', () => {
      if (this.avatarLibrary && this.selectedAvatar) {
        const result = this.avatarLibrary.checkAnimationCompatibility(this.selectedAvatar.id);
        const msg = result.warnings.length > 0
          ? `Warnings:\n${result.warnings.join('\n')}`
          : 'All animations compatible';
        this.showDevOutput(msg);
      }
    });

    // Thumbnail Preview
    const thumbBtn = document.getElementById('dev-thumbnail-preview');
    thumbBtn?.addEventListener('click', () => {
      this.showThumbnailPreview();
    });

    // Refresh
    const refreshBtn = document.getElementById('dev-refresh');
    refreshBtn?.addEventListener('click', () => {
      this.refresh();
      this.showDevOutput('Refreshed');
    });
  }

  private showDevOutput(message: string): void {
    const output = document.getElementById('dev-output');
    if (output) {
      output.style.display = 'block';
      output.textContent = message;
      setTimeout(() => { output.style.display = 'none'; }, 5000);
    }
    // Also refresh the info panel
    setTimeout(() => this.refresh(), 100);
  }

  /**
   * Show a floating thumbnail preview grid (dev tool).
   * Allows developers to see all avatar thumbnails at a glance.
   */
  private showThumbnailPreview(): void {
    const existing = document.getElementById('dev-thumbnail-preview-overlay');
    if (existing) {
      existing.remove();
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'dev-thumbnail-preview-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      border: 1px solid rgba(124, 77, 255, 0.4);
      border-radius: 12px;
      padding: 16px;
      z-index: 10000;
      max-width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px';
    header.innerHTML = `
      <span style="color:#7c4dff;font-weight:bold;font-size:14px">Avatar Thumbnails (${this.avatarLibrary?.getCount() ?? 0})</span>
      <button id="dev-close-thumb" style="background:none;border:1px solid #666;color:#fff;padding:4px 8px;border-radius:4px;cursor:pointer">Close</button>
    `;
    overlay.appendChild(header);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:4px';

    const entries = this.avatarLibrary?.getAllEntries() ?? [];
    for (const entry of entries) {
      const cell = document.createElement('div');
      cell.style.cssText = 'position:relative;border-radius:4px;overflow:hidden;border:1px solid #333;cursor:pointer';
      cell.title = entry.id;

      const img = document.createElement('img');
      img.src = entry.thumbnail ?? '';
      img.style.cssText = 'width:100%;height:auto;display:block';
      img.loading = 'lazy';
      cell.appendChild(img);

      const label = document.createElement('div');
      label.style.cssText = 'position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.8);color:#0f0;font-size:8px;text-align:center;padding:1px';
      label.textContent = entry.id.replace('avatar_', '');
      cell.appendChild(label);

      cell.addEventListener('click', () => {
        const input = document.getElementById('dev-force-avatar') as HTMLInputElement;
        if (input) input.value = entry.id;
        this.showDevOutput(`Selected: ${entry.id}`);
      });

      grid.appendChild(cell);
    }

    overlay.appendChild(grid);
    document.body.appendChild(overlay);

    // Close button
    document.getElementById('dev-close-thumb')?.addEventListener('click', () => {
      overlay.remove();
    });

    // ESC to close
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }
}
