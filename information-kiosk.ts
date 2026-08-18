/**
 * OCC Live - Information Kiosk (Part 6)
 * Environmental object providing OCC Live information, activity
 * descriptions, navigation help, and upcoming events placeholder.
 *
 * Design:
 * - [E] to interact when nearby
 * - Shows a simple HTML overlay with content
 * - Content is configurable and data-driven
 * - Does not connect to external systems (Blackboard, student records)
 * - Establishes the framework for future content expansion
 * - Press ESC or click outside to close
 */

// ─── Kiosk Content Types ─────────────────────────────────────────────────────

export interface KioskPage {
  id: string;
  title: string;
  content: string;     // HTML content
  icon: string;        // Emoji or icon class
  order: number;
}

export interface KioskConfig {
  id: string;
  position: [number, number, number];
  radius: number;
  prompt: string;
  pages: KioskPage[];
}

// ─── Information Kiosk System ────────────────────────────────────────────────

export class InformationKiosk {
  private config: KioskConfig;
  private overlayElement: HTMLElement | null = null;
  private isOpen: boolean = false;
  private currentPageIndex: number = 0;
  private onClose: (() => void) | null = null;

  constructor(config: KioskConfig) {
    this.config = config;
  }

  // ─── Interaction ───────────────────────────────────────────────────────

  /** Open the kiosk overlay */
  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.currentPageIndex = 0;
    this.createOverlay();
  }

  /** Close the kiosk overlay */
  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.removeOverlay();
    this.onClose?.();
  }

  /** Toggle the kiosk */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /** Is the kiosk currently open? */
  isVisible(): boolean {
    return this.isOpen;
  }

  /** Set a callback for when the kiosk closes */
  setOnClose(callback: () => void): void {
    this.onClose = callback;
  }

  /** Get the kiosk config */
  getConfig(): KioskConfig {
    return this.config;
  }

  // ─── Content Management ────────────────────────────────────────────────

  /** Add a page to the kiosk */
  addPage(page: KioskPage): void {
    this.config.pages.push(page);
    this.config.pages.sort((a, b) => a.order - b.order);
    if (this.isOpen) {
      this.refreshOverlay();
    }
  }

  /** Remove a page by ID */
  removePage(pageId: string): void {
    this.config.pages = this.config.pages.filter(p => p.id !== pageId);
    if (this.isOpen) {
      this.currentPageIndex = Math.min(this.currentPageIndex, this.config.pages.length - 1);
      this.refreshOverlay();
    }
  }

  /** Update a page's content */
  updatePage(pageId: string, content: Partial<KioskPage>): void {
    const page = this.config.pages.find(p => p.id === pageId);
    if (page) {
      Object.assign(page, content);
      if (this.isOpen) {
        this.refreshOverlay();
      }
    }
  }

  // ─── Private: Overlay ──────────────────────────────────────────────────

  private createOverlay(): void {
    this.overlayElement = document.createElement('div');
    this.overlayElement.id = 'kiosk-overlay';
    this.overlayElement.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 5000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.6);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: kioskFadeIn 0.2s ease;
    `;

    const style = document.createElement('style');
    style.id = 'kiosk-styles';
    style.textContent = `
      @keyframes kioskFadeIn { from { opacity: 0; } to { opacity: 1; } }
      #kiosk-panel { max-width: 600px; width: 90%; max-height: 70vh; background: linear-gradient(135deg, #1a0a2e, #2d1b4e); border-radius: 16px; border: 1px solid rgba(124,77,255,0.3); overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
      #kiosk-header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; }
      #kiosk-header h2 { margin: 0; font-size: 18px; color: #fff; font-weight: 600; }
      #kiosk-close { background: none; border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; }
      #kiosk-close:hover { background: rgba(255,255,255,0.1); }
      #kiosk-tabs { display: flex; gap: 0; border-bottom: 1px solid rgba(255,255,255,0.1); overflow-x: auto; padding: 0 12px; }
      .kiosk-tab { padding: 10px 14px; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 13px; border-bottom: 2px solid transparent; white-space: nowrap; transition: color 0.15s, border-color 0.15s; }
      .kiosk-tab:hover { color: rgba(255,255,255,0.8); }
      .kiosk-tab.active { color: #fff; border-bottom-color: #7c4dff; }
      #kiosk-content { padding: 20px; overflow-y: auto; flex: 1; color: rgba(255,255,255,0.85); font-size: 14px; line-height: 1.6; }
      #kiosk-content h3 { color: #c4b5fd; margin: 0 0 8px 0; font-size: 16px; }
      #kiosk-content p { margin: 0 0 12px 0; }
      #kiosk-content ul { margin: 0 0 12px 0; padding-left: 20px; }
      #kiosk-content li { margin-bottom: 4px; }
    `;
    document.head.appendChild(style);

    this.overlayElement.innerHTML = this.buildPanelHTML();
    document.body.appendChild(this.overlayElement);

    // Wire events
    this.wireEvents();
  }

  private buildPanelHTML(): string {
    const pages = this.config.pages;
    const currentPage = pages[this.currentPageIndex];

    const tabs = pages.map((page, i) =>
      `<div class="kiosk-tab${i === this.currentPageIndex ? ' active' : ''}" data-tab-index="${i}">${page.icon} ${page.title}</div>`
    ).join('');

    return `
      <div id="kiosk-panel">
        <div id="kiosk-header">
          <h2>OCC Live Information</h2>
          <button id="kiosk-close">Close</button>
        </div>
        <div id="kiosk-tabs">${tabs}</div>
        <div id="kiosk-content">${currentPage?.content ?? '<p>No information available.</p>'}</div>
      </div>
    `;
  }

  private wireEvents(): void {
    if (!this.overlayElement) return;

    // Close button
    const closeBtn = this.overlayElement.querySelector('#kiosk-close');
    closeBtn?.addEventListener('click', () => this.close());

    // Click outside to close
    this.overlayElement.addEventListener('click', (e) => {
      if (e.target === this.overlayElement) {
        this.close();
      }
    });

    // Tab clicks
    const tabs = this.overlayElement.querySelectorAll('.kiosk-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const index = parseInt((tab as HTMLElement).dataset.tabIndex ?? '0');
        this.currentPageIndex = index;
        this.refreshOverlay();
      });
    });

    // ESC key
    document.addEventListener('keydown', this.handleKeydown);
  }

  private handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.isOpen) {
      this.close();
    }
  };

  private refreshOverlay(): void {
    if (this.overlayElement) {
      this.overlayElement.innerHTML = this.buildPanelHTML();
      this.wireEvents();
    }
  }

  private removeOverlay(): void {
    this.overlayElement?.remove();
    this.overlayElement = null;
    const style = document.getElementById('kiosk-styles');
    style?.remove();
    document.removeEventListener('keydown', this.handleKeydown);
  }
}

// ─── Default Kiosk Content ───────────────────────────────────────────────────

export function createDefaultKioskConfig(): KioskConfig {
  return {
    id: 'main_union_kiosk',
    position: [-8, 0, 8],
    radius: 2.5,
    prompt: 'Information',
    pages: [
      {
        id: 'welcome',
        title: 'Welcome',
        icon: '\u{1F44B}',
        order: 1,
        content: `
          <h3>Welcome to OCC Live</h3>
          <p>This is the Main Union — a social space where you can hang out, explore, and participate in activities.</p>
          <p>There's no objective or task required. Just enjoy the space.</p>
          <ul>
            <li>Walk around and explore</li>
            <li>Sit in a beanbag or at the cafe</li>
            <li>Dance near the stage</li>
            <li>Float down the Lazy River</li>
            <li>Roast marshmallows at the firepit</li>
            <li>Play in the ball pit</li>
            <li>Use the swings</li>
          </ul>
        `,
      },
      {
        id: 'activities',
        title: 'Activities',
        icon: '\u{1F3AE}',
        order: 2,
        content: `
          <h3>Activity Areas</h3>
          <p><strong>Main Stage</strong> — Dance and gather for events</p>
          <p><strong>Cafe Terrace</strong> — Sit, relax, grab a virtual drink</p>
          <p><strong>Beanbag Lawn</strong> — Chill and watch the world go by</p>
          <p><strong>Lazy River</strong> — Float in a wetsuit along the route</p>
          <p><strong>Firepit</strong> — Sit and roast marshmallows</p>
          <p><strong>Ball Pit</strong> — Jump in and play</p>
          <p><strong>Swing Zone</strong> — Take a swing</p>
        `,
      },
      {
        id: 'controls',
        title: 'Controls',
        icon: '\u{1F3AE}',
        order: 3,
        content: `
          <h3>Controls</h3>
          <ul>
            <li><strong>WASD</strong> — Move</li>
            <li><strong>Shift</strong> — Run</li>
            <li><strong>Space</strong> — Jump</li>
            <li><strong>E</strong> — Interact</li>
            <li><strong>R</strong> — Enter/Exit Lazy River</li>
            <li><strong>1</strong> — Wave</li>
            <li><strong>2</strong> — Dance</li>
            <li><strong>Right-click + drag</strong> — Rotate camera</li>
            <li><strong>Scroll wheel</strong> — Zoom</li>
          </ul>
        `,
      },
      {
        id: 'events',
        title: 'Events',
        icon: '\u{1F4C5}',
        order: 4,
        content: `
          <h3>Upcoming Events</h3>
          <p>Check back soon for scheduled events at the Main Stage!</p>
          <p>The Main Union is always open — no event required to enjoy the space.</p>
        `,
      },
      {
        id: 'navigation',
        title: 'Navigate',
        icon: '\u{1F9ED}',
        order: 5,
        content: `
          <h3>Finding Your Way</h3>
          <p>Look for the wayfinding signs near the main plaza. They point toward each activity area.</p>
          <p>The Main Union is designed to be explored freely. There are no locked areas or requirements.</p>
        `,
      },
    ],
  };
}
