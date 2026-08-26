/**
 * OCC Live - Avatar Selection Screen (Part 5)
 * Displays the full production avatar library as a visual thumbnail grid.
 * Players choose a complete avatar character — no names, labels, or
 * personal information requested. Just pick and enter.
 *
 * Design:
 * - Grid of avatar thumbnail images (loaded efficiently)
 * - Single selection → "ENTER OCC LIVE" button
 * - No avatar names, player names, or ID labels exposed
 * - Responsive layout supporting 100+ avatars
 * - Lazy image loading for performance
 * - Keyboard accessible (Tab + Enter)
 */

import type { AvatarModelEntry } from '../types/pipeline.ts';

/**
 * Show the avatar selection screen.
 * Blocks until the player picks an avatar and confirms.
 * Returns the selected AvatarModelEntry.
 *
 * No personal information is collected. No names, nicknames,
 * usernames, student IDs, or email addresses are requested.
 */
export function showAvatarSelectionScreen(catalog: AvatarModelEntry[]): Promise<AvatarModelEntry> {
  return new Promise((resolve) => {
    let selectedEntry: AvatarModelEntry | null = null;

    // ─── Inject Styles ─────────────────────────────────────────────────────

    const style = document.createElement('style');
    style.id = 'avatar-selection-styles';
    style.textContent = `
      html, body {
        overflow: auto !important;
        height: auto !important;
      }
      #app {
        display: none !important;
      }
      #avatar-selection-screen {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 10001;
        background: linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%);
        overflow-y: auto;
        padding: 32px 24px 80px 24px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #fff;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      #avatar-selection-screen .header {
        text-align: center;
        margin-bottom: 24px;
        max-width: 600px;
      }
      #avatar-selection-screen h1 {
        font-size: 32px;
        font-weight: 700;
        margin: 0 0 8px 0;
        background: linear-gradient(135deg, #fff, #c4b5fd);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      #avatar-selection-screen .subtitle {
        font-size: 15px;
        color: rgba(255,255,255,0.55);
        margin: 0;
        line-height: 1.4;
      }
      #avatar-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 8px;
        max-width: 1080px;
        width: 100%;
        margin: 0 auto 32px auto;
      }
      @media (min-width: 768px) {
        #avatar-grid {
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: 10px;
        }
      }
      @media (min-width: 1200px) {
        #avatar-grid {
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px;
        }
      }
      .avatar-cell {
        position: relative;
        border-radius: 12px;
        border: 3px solid rgba(255,255,255,0.08);
        cursor: pointer;
        overflow: hidden;
        transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
        background: rgba(255,255,255,0.03);
        aspect-ratio: 1;
      }
      .avatar-cell:hover {
        border-color: rgba(124, 77, 255, 0.5);
        transform: scale(1.04);
        box-shadow: 0 4px 16px rgba(124, 77, 255, 0.2);
      }
      .avatar-cell:focus {
        outline: none;
        border-color: rgba(124, 77, 255, 0.7);
        box-shadow: 0 0 0 3px rgba(124, 77, 255, 0.3);
      }
      .avatar-cell.selected {
        border-color: #7c4dff;
        transform: scale(1.06);
        box-shadow: 0 4px 24px rgba(124, 77, 255, 0.4);
      }
      .avatar-cell.selected::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 9px;
        border: 2px solid rgba(124, 77, 255, 0.6);
        pointer-events: none;
      }
      .avatar-cell img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: opacity 0.3s ease;
      }
      .avatar-cell img[data-loaded="false"] {
        opacity: 0;
      }
      .avatar-cell img[data-loaded="true"] {
        opacity: 1;
      }
      .avatar-cell .loading-placeholder {
        position: absolute;
        inset: 0;
        background: rgba(255,255,255,0.05);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .avatar-cell .loading-placeholder::after {
        content: '';
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255,255,255,0.2);
        border-top-color: rgba(124, 77, 255, 0.6);
        border-radius: 50%;
        animation: avatar-spin 0.8s linear infinite;
      }
      @keyframes avatar-spin {
        to { transform: rotate(360deg); }
      }
      #avatar-selection-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 16px 24px;
        background: linear-gradient(to top, rgba(26, 10, 46, 0.98) 60%, transparent);
        display: flex;
        justify-content: center;
        z-index: 10002;
      }
      #enter-occ-live-btn {
        padding: 14px 48px;
        font-size: 16px;
        font-weight: 700;
        color: #fff;
        background: linear-gradient(135deg, #7c4dff, #536dfe);
        border: none;
        border-radius: 12px;
        cursor: pointer;
        opacity: 0.35;
        pointer-events: none;
        transition: opacity 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
        box-shadow: 0 4px 20px rgba(124, 77, 255, 0.3);
        letter-spacing: 0.5px;
      }
      #enter-occ-live-btn.active {
        opacity: 1;
        pointer-events: auto;
      }
      #enter-occ-live-btn.active:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 28px rgba(124, 77, 255, 0.5);
      }
      #enter-occ-live-btn.active:active {
        transform: translateY(0);
      }
      #avatar-count-badge {
        font-size: 12px;
        color: rgba(255,255,255,0.4);
        text-align: center;
        margin-bottom: 16px;
      }
    `;
    document.head.appendChild(style);

    // ─── Build DOM ───────────────────────────────────────────────────────────

    const overlay = document.createElement('div');
    overlay.id = 'avatar-selection-screen';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Choose your avatar');

    // Header — no personal info fields, just the instruction
    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `
      <h1>Choose Your Avatar</h1>
      <p class="subtitle">Pick the character you'd like to use in OCC Live.</p>
    `;
    overlay.appendChild(header);

    // Count badge (subtle, non-identifying)
    const countBadge = document.createElement('div');
    countBadge.id = 'avatar-count-badge';
    countBadge.textContent = `${catalog.length} avatars available`;
    overlay.appendChild(countBadge);

    // Grid
    const grid = document.createElement('div');
    grid.id = 'avatar-grid';
    grid.setAttribute('role', 'listbox');
    grid.setAttribute('aria-label', 'Available avatars');

    // Build cells for each avatar in the catalog
    for (let i = 0; i < catalog.length; i++) {
      const entry = catalog[i];
      const cell = document.createElement('div');
      cell.className = 'avatar-cell';
      cell.setAttribute('role', 'option');
      cell.setAttribute('aria-selected', 'false');
      cell.setAttribute('tabindex', '0');
      cell.dataset.avatarId = entry.id;
      cell.dataset.index = String(i);

      // Loading placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'loading-placeholder';
      cell.appendChild(placeholder);

      // Thumbnail image with lazy loading
      const img = document.createElement('img');
      img.src = entry.thumbnail;
      img.alt = ''; // Intentionally empty — no identifying labels per spec
      img.loading = 'lazy';
      img.draggable = false;
      img.dataset.loaded = 'false';

      img.onload = () => {
        img.dataset.loaded = 'true';
        placeholder.remove();
      };
      img.onerror = () => {
        // Fallback: try alternative thumbnail path
                img.onerror = () => {
          // Final fallback: show colored placeholder
          placeholder.innerHTML = '';
          placeholder.style.background = `hsl(${(i * 37) % 360}, 40%, 25%)`;
          img.style.display = 'none';
        };
      };

      cell.appendChild(img);
      grid.appendChild(cell);
    }

    overlay.appendChild(grid);

    // Footer with enter button
    const footer = document.createElement('div');
    footer.id = 'avatar-selection-footer';
    footer.innerHTML = `<button id="enter-occ-live-btn" aria-disabled="true">ENTER OCC LIVE</button>`;
    overlay.appendChild(footer);

    document.body.appendChild(overlay);

    // ─── Event Handling ──────────────────────────────────────────────────────

    const btn = document.getElementById('enter-occ-live-btn')!;

    function selectAvatar(cell: HTMLElement): void {
      // Deselect previous
      const prev = grid.querySelector('.avatar-cell.selected');
      if (prev) {
        prev.classList.remove('selected');
        prev.setAttribute('aria-selected', 'false');
      }

      // Select new
      cell.classList.add('selected');
      cell.setAttribute('aria-selected', 'true');

      const avatarId = cell.dataset.avatarId!;
      selectedEntry = catalog.find(e => e.id === avatarId) ?? null;

      // Activate button
      btn.classList.add('active');
      btn.setAttribute('aria-disabled', 'false');
    }

    function confirmSelection(): void {
      if (!selectedEntry) return;

      // Clean up DOM
      overlay.remove();
      style.remove();

      // Restore body state
      document.body.style.overflow = '';

      resolve(selectedEntry);
    }

    // Click selection
    grid.addEventListener('click', (e) => {
      const cell = (e.target as HTMLElement).closest('.avatar-cell') as HTMLElement | null;
      if (!cell) return;
      selectAvatar(cell);
    });

    // Keyboard selection (Enter or Space on focused cell)
    grid.addEventListener('keydown', (e) => {
      const cell = (e.target as HTMLElement).closest('.avatar-cell') as HTMLElement | null;
      if (!cell) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectAvatar(cell);
      }
    });

    // Double-click to select and immediately enter
    grid.addEventListener('dblclick', (e) => {
      const cell = (e.target as HTMLElement).closest('.avatar-cell') as HTMLElement | null;
      if (!cell) return;
      selectAvatar(cell);
      confirmSelection();
    });

    // Enter button
    btn.addEventListener('click', confirmSelection);

    // Keyboard shortcut: Enter key confirms when button is active
    document.addEventListener('keydown', function onEnterKey(e) {
      if (e.key === 'Enter' && selectedEntry && document.activeElement !== grid) {
        // Only if not focused on a grid cell (to avoid double-fire)
        if (!(document.activeElement as HTMLElement)?.classList?.contains('avatar-cell')) {
          confirmSelection();
          document.removeEventListener('keydown', onEnterKey);
        }
      }
    });
  });
}
