/**
 * OCC Live - Dance-Off Rhythm Game
 * Falling-arrow rhythm game near the Main Stage.
 * Players hit A/S/W/D or arrow keys as arrows reach the hit line.
 * Builds combo streaks, scores points, saves to anonymous leaderboard.
 *
 * Design:
 * - Player walks to Dance-Off pad and presses E to start
 * - 3-2-1 countdown leads into the rhythm round
 * - Arrows fall from top → hit line at bottom
 * - Perfect/Good/Miss timing windows
 * - Combo streaks multiply score
 * - Tab/Esc handled (won't fight the game)
 * - Anonymous scores (no names, no identity)
 * - Results screen with leaderboard
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ArrowDirection = 'left' | 'down' | 'up' | 'right';
export type HitRating = 'perfect' | 'good' | 'miss';
export type GameState = 'idle' | 'intro' | 'countdown' | 'playing' | 'results';

export interface FallingArrow {
  id: number;
  direction: ArrowDirection;
  /** Time (in seconds from song start) when this arrow should be hit */
  hitTime: number;
  /** Whether this arrow has been judged already */
  judged: boolean;
  /** The rating received (null if not yet judged) */
  rating: HitRating | null;
}

export interface GameScore {
  totalScore: number;
  perfects: number;
  goods: number;
  misses: number;
  maxCombo: number;
  currentCombo: number;
}

export interface DanceOffConfig {
  /** Duration of the round in seconds */
  roundDuration: number;
  /** Arrows per second (difficulty) */
  arrowsPerSecond: number;
  /** How fast arrows fall (seconds from spawn to hit line) */
  fallDuration: number;
  /** Perfect timing window (±ms) */
  perfectWindow: number;
  /** Good timing window (±ms) */
  goodWindow: number;
  /** Points for perfect hit */
  perfectPoints: number;
  /** Points for good hit */
  goodPoints: number;
  /** Combo multiplier increment */
  comboMultiplierStep: number;
  /** Max combo multiplier */
  maxComboMultiplier: number;
}

// ─── Default Config ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG: DanceOffConfig = {
  roundDuration: 60,
  arrowsPerSecond: 2,
  fallDuration: 2.0,
  perfectWindow: 80,
  goodWindow: 150,
  perfectPoints: 100,
  goodPoints: 50,
  comboMultiplierStep: 0.1,
  maxComboMultiplier: 4.0,
};

// ─── Arrow Pattern Generator ─────────────────────────────────────────────────

function generateArrowPattern(config: DanceOffConfig): FallingArrow[] {
  const arrows: FallingArrow[] = [];
  const directions: ArrowDirection[] = ['left', 'down', 'up', 'right'];
  const totalArrows = Math.floor(config.roundDuration * config.arrowsPerSecond);

  let lastDirection: ArrowDirection | null = null;

  for (let i = 0; i < totalArrows; i++) {
    // Slight randomization of timing for natural feel
    const baseTime = (i + 1) / config.arrowsPerSecond;
    const jitter = (Math.random() - 0.5) * 0.15;
    const hitTime = baseTime + jitter;

    // Avoid repeating same direction more than twice
    let direction: ArrowDirection;
    do {
      direction = directions[Math.floor(Math.random() * directions.length)];
    } while (direction === lastDirection && Math.random() > 0.3);
    lastDirection = direction;

    arrows.push({
      id: i,
      direction,
      hitTime,
      judged: false,
      rating: null,
    });
  }

  return arrows;
}

// ─── Callbacks ───────────────────────────────────────────────────────────────

export interface DanceOffCallbacks {
  onStateChange?: (state: GameState) => void;
  onArrowHit?: (arrow: FallingArrow, rating: HitRating) => void;
  onArrowMiss?: (arrow: FallingArrow) => void;
  onComboBreak?: (combo: number) => void;
  onComboMilestone?: (combo: number) => void;
  onScoreUpdate?: (score: GameScore) => void;
  onGameComplete?: (score: GameScore) => void;
  onCountdownTick?: (seconds: number) => void;
}

// ─── Dance-Off Game Engine ───────────────────────────────────────────────────

export class DanceOffGame {
  private config: DanceOffConfig;
  private callbacks: DanceOffCallbacks = {};
  private state: GameState = 'idle';

  // Game state
  private arrows: FallingArrow[] = [];
  private score: GameScore = this.emptyScore();
  private elapsedTime: number = 0;
  private countdownRemaining: number = 3;
  private countdownTimer: number | null = null;

  // Input tracking
  private keyMap: Record<string, ArrowDirection> = {
    'arrowleft': 'left',
    'arrowdown': 'down',
    'arrowup': 'up',
    'arrowright': 'right',
    'a': 'left',
    's': 'down',
    'w': 'up',
    'd': 'right',
  };
  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private activeKeys: Set<string> = new Set();

  // Timing
  private gameStartTime: number = 0;
  private isRunning: boolean = false;
  private animFrameId: number | null = null;

  constructor(config?: Partial<DanceOffConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─── Configuration ─────────────────────────────────────────────────────

  setCallbacks(callbacks: DanceOffCallbacks): void {
    this.callbacks = callbacks;
  }

  setConfig(config: Partial<DanceOffConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): DanceOffConfig {
    return { ...this.config };
  }

  // ─── Game Lifecycle ────────────────────────────────────────────────────

  /** Show the intro screen (leaderboard + start prompt) */
  showIntro(): void {
    this.setState('intro');
  }

  /** Start the countdown (3-2-1) then begin */
  startCountdown(): void {
    this.setState('countdown');
    this.countdownRemaining = 3;
    this.callbacks.onCountdownTick?.(3);

    this.countdownTimer = window.setInterval(() => {
      this.countdownRemaining--;
      if (this.countdownRemaining > 0) {
        this.callbacks.onCountdownTick?.(this.countdownRemaining);
      } else {
        this.clearCountdownTimer();
        this.startGame();
      }
    }, 1000);
  }

  /** Start the actual rhythm game */
  private startGame(): void {
    this.arrows = generateArrowPattern(this.config);
    this.score = this.emptyScore();
    this.elapsedTime = 0;
    this.gameStartTime = performance.now();
    this.isRunning = true;
    this.activeKeys.clear();

    this.bindInput();
    this.setState('playing');

    // Start game loop
    this.gameLoop();
  }

  /** End the game and show results */
  endGame(): void {
    this.isRunning = false;
    this.unbindInput();
    this.cancelAnimFrame();
    this.setState('results');
    this.callbacks.onGameComplete?.(this.score);
  }

  /** Reset everything back to idle */
  reset(): void {
    this.isRunning = false;
    this.unbindInput();
    this.clearCountdownTimer();
    this.cancelAnimFrame();
    this.arrows = [];
    this.score = this.emptyScore();
    this.elapsedTime = 0;
    this.activeKeys.clear();
    this.setState('idle');
  }

  // ─── Game Loop ─────────────────────────────────────────────────────────

  private gameLoop(): void {
    if (!this.isRunning) return;

    const now = performance.now();
    this.elapsedTime = (now - this.gameStartTime) / 1000;

    // Check for missed arrows (passed the hit line without being hit)
    this.checkMissedArrows();

    // Check if round is over
    if (this.elapsedTime >= this.config.roundDuration + 1) {
      this.endGame();
      return;
    }

    this.animFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  private checkMissedArrows(): void {
    const missThreshold = this.config.goodWindow / 1000 + 0.1; // Grace period after hit time

    for (const arrow of this.arrows) {
      if (arrow.judged) continue;
      if (this.elapsedTime > arrow.hitTime + missThreshold) {
        arrow.judged = true;
        arrow.rating = 'miss';
        this.score.misses++;

        // Break combo
        if (this.score.currentCombo > 0) {
          this.callbacks.onComboBreak?.(this.score.currentCombo);
        }
        this.score.currentCombo = 0;

        this.callbacks.onArrowMiss?.(arrow);
        this.callbacks.onScoreUpdate?.(this.score);
      }
    }
  }

  // ─── Input Handling ────────────────────────────────────────────────────

  private bindInput(): void {
    this.boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
    this.boundKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e);
    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keyup', this.boundKeyUp);
  }

  private unbindInput(): void {
    if (this.boundKeyDown) {
      document.removeEventListener('keydown', this.boundKeyDown);
      this.boundKeyDown = null;
    }
    if (this.boundKeyUp) {
      document.removeEventListener('keyup', this.boundKeyUp);
      this.boundKeyUp = null;
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Block Tab and Escape from interfering
    if (e.key === 'Tab' || e.key === 'Escape') {
      e.preventDefault();
      if (e.key === 'Escape' && this.state === 'playing') {
        this.endGame();
      }
      return;
    }

    const key = e.key.toLowerCase();
    const direction = this.keyMap[key];
    if (!direction) return;

    e.preventDefault();

    // Prevent key repeat
    if (this.activeKeys.has(key)) return;
    this.activeKeys.add(key);

    if (this.state === 'playing') {
      this.judgeInput(direction);
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.activeKeys.delete(key);
  }

  private judgeInput(direction: ArrowDirection): void {
    const now = this.elapsedTime;

    // Find the closest unjudged arrow matching this direction
    let bestArrow: FallingArrow | null = null;
    let bestDelta = Infinity;

    for (const arrow of this.arrows) {
      if (arrow.judged) continue;
      if (arrow.direction !== direction) continue;

      const delta = Math.abs(now - arrow.hitTime) * 1000; // Convert to ms
      if (delta < bestDelta && delta < this.config.goodWindow) {
        bestDelta = delta;
        bestArrow = arrow;
      }
    }

    if (!bestArrow) return; // No matching arrow in range

    bestArrow.judged = true;

    // Determine rating
    let rating: HitRating;
    if (bestDelta <= this.config.perfectWindow) {
      rating = 'perfect';
      bestArrow.rating = 'perfect';
      this.score.perfects++;
    } else {
      rating = 'good';
      bestArrow.rating = 'good';
      this.score.goods++;
    }

    // Update combo
    this.score.currentCombo++;
    if (this.score.currentCombo > this.score.maxCombo) {
      this.score.maxCombo = this.score.currentCombo;
    }

    // Combo milestones
    if (this.score.currentCombo > 0 && this.score.currentCombo % 10 === 0) {
      this.callbacks.onComboMilestone?.(this.score.currentCombo);
    }

    // Calculate score with multiplier
    const multiplier = Math.min(
      1 + this.score.currentCombo * this.config.comboMultiplierStep,
      this.config.maxComboMultiplier
    );
    const basePoints = rating === 'perfect' ? this.config.perfectPoints : this.config.goodPoints;
    this.score.totalScore += Math.round(basePoints * multiplier);

    this.callbacks.onArrowHit?.(bestArrow, rating);
    this.callbacks.onScoreUpdate?.(this.score);
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  getState(): GameState { return this.state; }
  getScore(): GameScore { return { ...this.score }; }
  getElapsedTime(): number { return this.elapsedTime; }
  getRoundDuration(): number { return this.config.roundDuration; }
  getCountdownRemaining(): number { return this.countdownRemaining; }

  /** Get arrows that are currently visible (between spawn and miss) */
  getVisibleArrows(): FallingArrow[] {
    if (this.state !== 'playing') return [];

    const visibleStart = this.elapsedTime - 0.3; // Show briefly after hit
    const visibleEnd = this.elapsedTime + this.config.fallDuration;

    return this.arrows.filter(a =>
      !a.judged && a.hitTime >= visibleStart && a.hitTime <= visibleEnd
    );
  }

  /** Get arrow position as 0-1 progress (0 = top, 1 = hit line) */
  getArrowProgress(arrow: FallingArrow): number {
    const timeUntilHit = arrow.hitTime - this.elapsedTime;
    return 1 - (timeUntilHit / this.config.fallDuration);
  }

  isPlaying(): boolean { return this.state === 'playing'; }

  // ─── Private Helpers ───────────────────────────────────────────────────

  private setState(state: GameState): void {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  private emptyScore(): GameScore {
    return {
      totalScore: 0,
      perfects: 0,
      goods: 0,
      misses: 0,
      maxCombo: 0,
      currentCombo: 0,
    };
  }

  private clearCountdownTimer(): void {
    if (this.countdownTimer !== null) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private cancelAnimFrame(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  dispose(): void {
    this.reset();
  }
}
