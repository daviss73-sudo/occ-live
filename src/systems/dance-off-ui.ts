/**
 * OCC Live - Dance-Off Rhythm Game UI
 * Full-screen overlay UI for the Dance-Off mini-game.
 * Handles intro screen, countdown, gameplay HUD with falling arrows,
 * hit feedback, combo display, results screen, and leaderboard.
 *
 * No player names or identifying information displayed.
 */

import type {
  GameState,
  GameScore,
  FallingArrow,
  ArrowDirection,
  HitRating,
  DanceOffGame,
} from './dance-off-game.ts';
import type { LeaderboardEntry } from './dance-off-leaderboard.ts';

// ─── UI Callbacks ────────────────────────────────────────────────────────────

export interface DanceOffUICallbacks {
  onStartGame?: () => void;
  onExitGame?: () => void;
  onPlayAgain?: () => void;
}

// ─── Dance-Off UI ────────────────────────────────────────────────────────────

export class DanceOffUI {
  private game: DanceOffGame;
  private callbacks: DanceOffUICallbacks = {};
  private overlay: HTMLElement | null = null;
  private styleElement: HTMLStyleElement | null = null;
  private animFrameId: number | null = null;
  private leaderboardData: LeaderboardEntry[] = [];

  // Gameplay elements (cached for performance)
  private arrowLanes: HTMLElement | null = null;
  private scoreDisplay: HTMLElement | null = null;
  private comboDisplay: HTMLElement | null = null;
  private progressBar: HTMLElement | null = null;
  private feedbackDisplay: HTMLElement | null = null;

  // Active arrow elements
  private arrowElements: Map<number, HTMLElement> = new Map();

  constructor(game: DanceOffGame) {
    this.game = game;
    this.injectStyles();
  }

  // ─── Configuration ─────────────────────────────────────────────────────

  setCallbacks(callbacks: DanceOffUICallbacks): void {
    this.callbacks = callbacks;
  }

  setLeaderboardData(data: LeaderboardEntry[]): void {
    this.leaderboardData = data;
  }

  // ─── Screen Management ─────────────────────────────────────────────────

  /** Show the intro screen with leaderboard and start button */
  showIntro(): void {
    this.removeOverlay();

    const el = this.createOverlay();
    const topScores = this.leaderboardData.slice(0, 10);
    const leaderboardHTML = topScores.length > 0
      ? topScores.map((entry, i) => `
        <div class="do-lb-row">
          <span class="do-lb-rank">#${i + 1}</span>
          <span class="do-lb-score">${entry.score.toLocaleString()}</span>
          <span class="do-lb-combo">x${entry.maxCombo}</span>
        </div>
      `).join('')
      : '<div class="do-lb-empty">No scores yet. Be the first!</div>';

    el.innerHTML = `
      <div class="do-panel do-intro">
        <div class="do-title">DANCE-OFF</div>
        <div class="do-subtitle">Rhythm Challenge</div>
        <div class="do-instructions">
          <div class="do-key-row">
            <span class="do-key">←</span>
            <span class="do-key">↓</span>
            <span class="do-key">↑</span>
            <span class="do-key">→</span>
          </div>
          <div class="do-key-row">
            <span class="do-key">A</span>
            <span class="do-key">S</span>
            <span class="do-key">W</span>
            <span class="do-key">D</span>
          </div>
          <p>Hit the arrows as they reach the line.<br>Build combos for higher scores!</p>
        </div>
        <div class="do-leaderboard">
          <div class="do-lb-title">Leaderboard</div>
          ${leaderboardHTML}
        </div>
        <div class="do-buttons">
          <button class="do-btn do-btn-primary" id="do-start">START</button>
          <button class="do-btn do-btn-secondary" id="do-exit">Exit</button>
        </div>
      </div>
    `;

    document.body.appendChild(el);
    this.overlay = el;

    el.querySelector('#do-start')?.addEventListener('click', () => this.callbacks.onStartGame?.());
    el.querySelector('#do-exit')?.addEventListener('click', () => this.callbacks.onExitGame?.());
  }

  /** Show the 3-2-1 countdown */
  showCountdown(seconds: number): void {
    this.removeOverlay();

    const el = this.createOverlay();
    el.innerHTML = `
      <div class="do-countdown">
        <span class="do-countdown-num" id="do-cd-num">${seconds}</span>
      </div>
    `;

    document.body.appendChild(el);
    this.overlay = el;
  }

  /** Update countdown number */
  updateCountdown(seconds: number): void {
    const num = document.getElementById('do-cd-num');
    if (num) {
      num.textContent = seconds <= 0 ? 'GO!' : String(seconds);
      num.classList.add('do-countdown-pulse');
      setTimeout(() => num.classList.remove('do-countdown-pulse'), 300);
    }
  }

  /** Show the gameplay HUD (arrow lanes, score, combo) */
  showGameplay(): void {
    this.removeOverlay();
    this.arrowElements.clear();

    const el = this.createOverlay();
    el.classList.add('do-gameplay-overlay');
    el.innerHTML = `
      <div class="do-hud-top">
        <div class="do-score" id="do-score">0</div>
        <div class="do-combo" id="do-combo"></div>
        <div class="do-progress-wrap">
          <div class="do-progress-bar" id="do-progress"></div>
        </div>
      </div>
      <div class="do-lanes" id="do-lanes">
        <div class="do-lane" data-dir="left">
          <div class="do-hit-zone"><span>←</span></div>
        </div>
        <div class="do-lane" data-dir="down">
          <div class="do-hit-zone"><span>↓</span></div>
        </div>
        <div class="do-lane" data-dir="up">
          <div class="do-hit-zone"><span>↑</span></div>
        </div>
        <div class="do-lane" data-dir="right">
          <div class="do-hit-zone"><span>→</span></div>
        </div>
      </div>
      <div class="do-feedback" id="do-feedback"></div>
    `;

    document.body.appendChild(el);
    this.overlay = el;

    this.arrowLanes = el.querySelector('#do-lanes');
    this.scoreDisplay = el.querySelector('#do-score');
    this.comboDisplay = el.querySelector('#do-combo');
    this.progressBar = el.querySelector('#do-progress');
    this.feedbackDisplay = el.querySelector('#do-feedback');

    // Start render loop for arrows
    this.startArrowRendering();
  }

  /** Show results screen with score and leaderboard */
  showResults(score: GameScore, leaderboardRank: number | null): void {
    this.removeOverlay();
    this.stopArrowRendering();

    const accuracy = score.perfects + score.goods + score.misses > 0
      ? Math.round(((score.perfects + score.goods) / (score.perfects + score.goods + score.misses)) * 100)
      : 0;

    const topScores = this.leaderboardData.slice(0, 10);
    const leaderboardHTML = topScores.map((entry, i) => `
      <div class="do-lb-row ${entry.score === score.totalScore ? 'do-lb-highlight' : ''}">
        <span class="do-lb-rank">#${i + 1}</span>
        <span class="do-lb-score">${entry.score.toLocaleString()}</span>
        <span class="do-lb-combo">x${entry.maxCombo}</span>
      </div>
    `).join('');

    const rankText = leaderboardRank !== null
      ? `<div class="do-rank">Rank #${leaderboardRank}</div>`
      : '';

    const el = this.createOverlay();
    el.innerHTML = `
      <div class="do-panel do-results">
        <div class="do-title">RESULTS</div>
        <div class="do-final-score">${score.totalScore.toLocaleString()}</div>
        ${rankText}
        <div class="do-stats">
          <div class="do-stat"><span class="do-stat-val do-perfect">${score.perfects}</span><span class="do-stat-lbl">Perfect</span></div>
          <div class="do-stat"><span class="do-stat-val do-good">${score.goods}</span><span class="do-stat-lbl">Good</span></div>
          <div class="do-stat"><span class="do-stat-val do-miss">${score.misses}</span><span class="do-stat-lbl">Miss</span></div>
          <div class="do-stat"><span class="do-stat-val">${score.maxCombo}</span><span class="do-stat-lbl">Max Combo</span></div>
          <div class="do-stat"><span class="do-stat-val">${accuracy}%</span><span class="do-stat-lbl">Accuracy</span></div>
        </div>
        <div class="do-leaderboard">
          <div class="do-lb-title">Leaderboard</div>
          ${leaderboardHTML || '<div class="do-lb-empty">No other scores yet.</div>'}
        </div>
        <div class="do-buttons">
          <button class="do-btn do-btn-primary" id="do-again">PLAY AGAIN</button>
          <button class="do-btn do-btn-secondary" id="do-done">Done</button>
        </div>
      </div>
    `;

    document.body.appendChild(el);
    this.overlay = el;

    el.querySelector('#do-again')?.addEventListener('click', () => this.callbacks.onPlayAgain?.());
    el.querySelector('#do-done')?.addEventListener('click', () => this.callbacks.onExitGame?.());
  }

  // ─── Gameplay Updates ──────────────────────────────────────────────────

  /** Update score display */
  updateScore(score: GameScore): void {
    if (this.scoreDisplay) {
      this.scoreDisplay.textContent = score.totalScore.toLocaleString();
    }
    if (this.comboDisplay) {
      if (score.currentCombo > 1) {
        this.comboDisplay.textContent = `${score.currentCombo}x COMBO`;
        this.comboDisplay.style.opacity = '1';
      } else {
        this.comboDisplay.style.opacity = '0';
      }
    }
  }

  /** Update progress bar */
  updateProgress(elapsed: number, total: number): void {
    if (this.progressBar) {
      const pct = Math.min(100, (elapsed / total) * 100);
      this.progressBar.style.width = `${pct}%`;
    }
  }

  /** Show hit feedback (Perfect! Good! Miss!) */
  showFeedback(rating: HitRating): void {
    if (!this.feedbackDisplay) return;

    const text = rating === 'perfect' ? 'PERFECT!' : rating === 'good' ? 'GOOD' : 'MISS';
    const cls = `do-fb-${rating}`;

    this.feedbackDisplay.textContent = text;
    this.feedbackDisplay.className = `do-feedback ${cls} do-fb-show`;

    setTimeout(() => {
      if (this.feedbackDisplay) {
        this.feedbackDisplay.classList.remove('do-fb-show');
      }
    }, 400);
  }

  /** Flash a lane when hit */
  flashLane(direction: ArrowDirection, rating: HitRating): void {
    const lane = this.overlay?.querySelector(`.do-lane[data-dir="${direction}"]`);
    if (lane) {
      lane.classList.add(`do-lane-flash-${rating}`);
      setTimeout(() => lane.classList.remove(`do-lane-flash-${rating}`), 200);
    }
  }

  // ─── Arrow Rendering ───────────────────────────────────────────────────

  private startArrowRendering(): void {
    this.stopArrowRendering();

    const render = () => {
      if (this.game.getState() !== 'playing') return;

      const visibleArrows = this.game.getVisibleArrows();
      const activeIds = new Set(visibleArrows.map(a => a.id));

      // Remove arrows that are no longer visible
      for (const [id, el] of this.arrowElements) {
        if (!activeIds.has(id)) {
          el.remove();
          this.arrowElements.delete(id);
        }
      }

      // Update or create visible arrows
      for (const arrow of visibleArrows) {
        let el = this.arrowElements.get(arrow.id);

        if (!el) {
          el = this.createArrowElement(arrow);
          this.arrowElements.set(arrow.id, el);
          const lane = this.overlay?.querySelector(`.do-lane[data-dir="${arrow.direction}"]`);
          lane?.appendChild(el);
        }

        // Update position
        const progress = this.game.getArrowProgress(arrow);
        const topPct = Math.max(0, Math.min(100, progress * 85)); // 85% = hit zone position
        el.style.top = `${topPct}%`;
      }

      // Update progress
      this.updateProgress(this.game.getElapsedTime(), this.game.getRoundDuration());

      this.animFrameId = requestAnimationFrame(render);
    };

    this.animFrameId = requestAnimationFrame(render);
  }

  private stopArrowRendering(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private createArrowElement(arrow: FallingArrow): HTMLElement {
    const el = document.createElement('div');
    el.className = 'do-arrow';
    el.dataset.id = String(arrow.id);

    const symbols: Record<ArrowDirection, string> = {
      left: '←',
      down: '↓',
      up: '↑',
      right: '→',
    };
    el.textContent = symbols[arrow.direction];
    return el;
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────

  removeOverlay(): void {
    this.stopArrowRendering();
    this.arrowElements.clear();
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.arrowLanes = null;
    this.scoreDisplay = null;
    this.comboDisplay = null;
    this.progressBar = null;
    this.feedbackDisplay = null;
  }

  dispose(): void {
    this.removeOverlay();
    this.styleElement?.remove();
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private createOverlay(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'dance-off-overlay';
    el.className = 'do-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Dance-Off Rhythm Game');
    return el;
  }

  private injectStyles(): void {
    if (document.getElementById('do-styles')) return;
    const s = document.createElement('style');
    s.id = 'do-styles';
    s.textContent = `
      .do-overlay{position:fixed;inset:0;z-index:8000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.92);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fff}
      .do-gameplay-overlay{align-items:stretch;justify-content:stretch;flex-direction:column}
      .do-panel{background:linear-gradient(135deg,#1a0a2e,#2d1b4e);border-radius:20px;border:1px solid rgba(124,77,255,0.3);padding:32px;max-width:480px;width:90%;max-height:85vh;overflow-y:auto;text-align:center;box-shadow:0 20px 80px rgba(0,0,0,0.7)}
      .do-title{font-size:32px;font-weight:900;background:linear-gradient(135deg,#7c4dff,#ff4dff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px}
      .do-subtitle{font-size:14px;opacity:0.6;margin-bottom:20px}
      .do-instructions{margin-bottom:20px}
      .do-instructions p{font-size:13px;opacity:0.7;line-height:1.5;margin-top:10px}
      .do-key-row{display:flex;gap:8px;justify-content:center;margin-bottom:6px}
      .do-key{width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:rgba(124,77,255,0.2);border:2px solid rgba(124,77,255,0.5);border-radius:8px;font-size:18px;font-weight:700}
      .do-buttons{display:flex;gap:12px;justify-content:center;margin-top:20px}
      .do-btn{padding:12px 28px;border:none;border-radius:10px;cursor:pointer;font-size:15px;font-weight:700;transition:transform 0.1s}
      .do-btn:hover{transform:scale(1.05)}
      .do-btn:active{transform:scale(0.98)}
      .do-btn-primary{background:linear-gradient(135deg,#7c4dff,#536dfe);color:#fff}
      .do-btn-secondary{background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2)}
      .do-leaderboard{margin-top:16px;text-align:left}
      .do-lb-title{font-size:13px;font-weight:600;opacity:0.6;text-transform:uppercase;margin-bottom:8px;text-align:center}
      .do-lb-row{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;margin-bottom:4px;background:rgba(255,255,255,0.03)}
      .do-lb-highlight{background:rgba(124,77,255,0.2);border:1px solid rgba(124,77,255,0.4)}
      .do-lb-rank{font-size:12px;font-weight:700;opacity:0.5;min-width:28px}
      .do-lb-score{font-size:14px;font-weight:600;flex:1}
      .do-lb-combo{font-size:11px;opacity:0.5}
      .do-lb-empty{font-size:13px;opacity:0.5;text-align:center;padding:12px}
      .do-countdown{display:flex;align-items:center;justify-content:center;height:100%}
      .do-countdown-num{font-size:120px;font-weight:900;text-shadow:0 0 40px rgba(124,77,255,0.6)}
      .do-countdown-pulse{animation:do-pulse 0.3s ease}
      @keyframes do-pulse{0%{transform:scale(1)}50%{transform:scale(1.3)}100%{transform:scale(1)}}

      /* Gameplay */
      .do-hud-top{position:absolute;top:16px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px;z-index:10}
      .do-score{font-size:28px;font-weight:900}
      .do-combo{font-size:16px;font-weight:700;color:#ff4dff;opacity:0;transition:opacity 0.2s}
      .do-progress-wrap{width:200px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden}
      .do-progress-bar{height:100%;background:linear-gradient(90deg,#7c4dff,#ff4dff);border-radius:2px;width:0%;transition:width 0.3s linear}

      .do-lanes{display:flex;justify-content:center;gap:4px;position:absolute;bottom:80px;left:50%;transform:translateX(-50%);height:70vh;width:320px}
      .do-lane{position:relative;flex:1;background:rgba(255,255,255,0.03);border-radius:8px;overflow:hidden}
      .do-hit-zone{position:absolute;bottom:0;left:0;right:0;height:50px;display:flex;align-items:center;justify-content:center;background:rgba(124,77,255,0.15);border-top:3px solid rgba(124,77,255,0.6);font-size:20px;font-weight:700;opacity:0.8}
      .do-lane-flash-perfect .do-hit-zone{background:rgba(0,255,150,0.3);border-top-color:#00ff96}
      .do-lane-flash-good .do-hit-zone{background:rgba(255,200,0,0.3);border-top-color:#ffc800}

      .do-arrow{position:absolute;left:50%;transform:translateX(-50%);width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#7c4dff,#536dfe);border-radius:10px;font-size:20px;font-weight:700;box-shadow:0 4px 12px rgba(124,77,255,0.4);transition:top 0.05s linear}

      .do-feedback{position:absolute;bottom:160px;left:50%;transform:translateX(-50%);font-size:24px;font-weight:900;opacity:0;transition:opacity 0.15s}
      .do-fb-show{opacity:1}
      .do-fb-perfect{color:#00ff96;text-shadow:0 0 12px rgba(0,255,150,0.5)}
      .do-fb-good{color:#ffc800;text-shadow:0 0 12px rgba(255,200,0,0.5)}
      .do-fb-miss{color:#ff4444;text-shadow:0 0 12px rgba(255,68,68,0.5)}

      /* Results */
      .do-results .do-final-score{font-size:48px;font-weight:900;margin:8px 0}
      .do-rank{font-size:14px;color:#7c4dff;font-weight:600;margin-bottom:16px}
      .do-stats{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:16px}
      .do-stat{display:flex;flex-direction:column;align-items:center;min-width:50px}
      .do-stat-val{font-size:20px;font-weight:700}
      .do-stat-lbl{font-size:10px;opacity:0.5;margin-top:2px}
      .do-perfect{color:#00ff96}
      .do-good{color:#ffc800}
      .do-miss{color:#ff4444}
    `;
    document.head.appendChild(s);
    this.styleElement = s;
  }
}
