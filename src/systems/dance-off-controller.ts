/**
 * OCC Live - Dance-Off Controller
 * Wires the Dance-Off game engine, UI, and leaderboard together.
 * Handles the interaction trigger (E key at the Dance-Off pad),
 * input blocking during gameplay, and integration with the world.
 *
 * Zone: Near Main Stage, player walks to the Dance-Off pad and presses E.
 * Input: During gameplay, WASD/arrows are captured by the game (not player movement).
 * Exit: Esc ends the game early, results shown. Tab blocked during play.
 */

import { DanceOffGame } from './dance-off-game.ts';
import type { GameScore, HitRating, FallingArrow } from './dance-off-game.ts';
import { DanceOffUI } from './dance-off-ui.ts';
import { DanceOffLeaderboard } from './dance-off-leaderboard.ts';

// ─── Controller Callbacks ────────────────────────────────────────────────────

export interface DanceOffControllerCallbacks {
  /** Called when the game starts (block player movement input) */
  onGameStarted?: () => void;
  /** Called when the game ends (restore player movement input) */
  onGameEnded?: () => void;
  /** Called to trigger the dance animation on the player avatar */
  onPlayerDancing?: (isDancing: boolean) => void;
  /** Called to show a notification */
  onNotification?: (message: string) => void;
}

// ─── Dance-Off Controller ────────────────────────────────────────────────────

export class DanceOffController {
  private game: DanceOffGame;
  private ui: DanceOffUI;
  private leaderboard: DanceOffLeaderboard;
  private callbacks: DanceOffControllerCallbacks = {};
  private isActive: boolean = false;

  constructor() {
    this.game = new DanceOffGame();
    this.ui = new DanceOffUI(this.game);
    this.leaderboard = new DanceOffLeaderboard();

    this.wireGame();
    this.wireUI();
  }

  // ─── Configuration ─────────────────────────────────────────────────────

  setCallbacks(callbacks: DanceOffControllerCallbacks): void {
    this.callbacks = callbacks;
  }

  // ─── Interaction Entry Point ───────────────────────────────────────────

  /**
   * Called when the player presses E at the Dance-Off zone.
   * Opens the intro screen with leaderboard.
   */
  handleInteraction(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.callbacks.onGameStarted?.();

    // Show intro with current leaderboard
    this.ui.setLeaderboardData(this.leaderboard.getTopScores(10));
    this.game.showIntro();
    this.ui.showIntro();
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Is the Dance-Off currently active (any screen showing)? */
  getIsActive(): boolean {
    return this.isActive;
  }

  /** Get the leaderboard instance for external access */
  getLeaderboard(): DanceOffLeaderboard {
    return this.leaderboard;
  }

  /** Get the game instance */
  getGame(): DanceOffGame {
    return this.game;
  }

  // ─── Private: Wire Game Engine ─────────────────────────────────────────

  private wireGame(): void {
    this.game.setCallbacks({
      onStateChange: (state) => {
        if (state === 'playing') {
          this.callbacks.onPlayerDancing?.(true);
        }
        if (state === 'results' || state === 'idle') {
          this.callbacks.onPlayerDancing?.(false);
        }
      },

      onCountdownTick: (seconds) => {
        this.ui.updateCountdown(seconds);
      },

      onArrowHit: (arrow: FallingArrow, rating: HitRating) => {
        this.ui.showFeedback(rating);
        this.ui.flashLane(arrow.direction, rating);
      },

      onArrowMiss: (_arrow: FallingArrow) => {
        this.ui.showFeedback('miss');
      },

      onComboBreak: (_combo: number) => {
        // Combo broke — UI handles via score update
      },

      onComboMilestone: (combo: number) => {
        this.callbacks.onNotification?.(`${combo}x Combo!`);
      },

      onScoreUpdate: (score: GameScore) => {
        this.ui.updateScore(score);
      },

      onGameComplete: (score: GameScore) => {
        // Submit score to leaderboard
        const rank = this.leaderboard.submitScore(
          score.totalScore,
          score.maxCombo,
          score.perfects,
          score.goods,
          score.misses
        );

        // Update UI leaderboard data and show results
        this.ui.setLeaderboardData(this.leaderboard.getTopScores(10));
        this.ui.showResults(score, rank);
      },
    });
  }

  // ─── Private: Wire UI ──────────────────────────────────────────────────

  private wireUI(): void {
    this.ui.setCallbacks({
      onStartGame: () => {
        this.game.startCountdown();
        this.ui.showCountdown(3);

        // After countdown, show gameplay
        setTimeout(() => {
          if (this.game.getState() === 'playing') {
            this.ui.showGameplay();
          }
        }, 3100); // 3 seconds countdown + 100ms buffer
      },

      onExitGame: () => {
        this.exitGame();
      },

      onPlayAgain: () => {
        this.game.reset();
        this.ui.setLeaderboardData(this.leaderboard.getTopScores(10));
        this.game.showIntro();
        this.ui.showIntro();
      },
    });
  }

  // ─── Private: Exit ─────────────────────────────────────────────────────

  private exitGame(): void {
    this.game.reset();
    this.ui.removeOverlay();
    this.isActive = false;
    this.callbacks.onGameEnded?.();
    this.callbacks.onPlayerDancing?.(false);
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  dispose(): void {
    this.game.dispose();
    this.ui.dispose();
  }
}

// ─── World Config Integration ────────────────────────────────────────────────
// Add this interaction to world-config.ts in the interactions array:
//
// {
//   id: 'dance_off_pad',
//   interactionType: 'play',
//   prompt: 'Dance-Off',
//   radius: 3,
//   animation: null,
//   sound: null,
//   cooldown: 0,
//   position: [5, 0, -26],  // Near Main Stage
//   zoneId: 'main_stage',
//   enabled: true,
// }
//
// And in main.ts, wire the interaction:
//
// const danceOffController = new DanceOffController();
// danceOffController.setCallbacks({
//   onGameStarted: () => {
//     playerController.setInputEnabled(false); // Block movement
//   },
//   onGameEnded: () => {
//     playerController.setInputEnabled(true); // Restore movement
//   },
//   onPlayerDancing: (isDancing) => {
//     if (isDancing) animStateMachine.playEmote('dance', 0);
//     else animStateMachine.stopSocialAnimation();
//   },
//   onNotification: (msg) => showNotification(msg),
// });
//
// interactionSystem.onInteraction((interaction) => {
//   if (interaction.id === 'dance_off_pad') {
//     danceOffController.handleInteraction();
//   }
// });
