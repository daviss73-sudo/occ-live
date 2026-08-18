/**
 * OCC Live - Error Recovery System (Part 11)
 * Catches failures without crashing the app and provides
 * useful non-identifying error feedback.
 *
 * Design:
 * - A failed asset or animation must not crash the app
 * - Recoverable network/state failures must not permanently corrupt player state
 * - Provides useful non-identifying error feedback
 * - Categorizes errors by severity and system
 * - Automatic recovery attempts for transient failures
 * - Graceful degradation (disable non-critical systems on repeated failure)
 * - No PII in error logs or messages
 */

// ─── Error Categories ────────────────────────────────────────────────────────

export type ErrorCategory =
  | 'asset_load'      // GLB/texture/audio failed to load
  | 'animation'       // Animation clip/state machine error
  | 'network'         // WebSocket/sync failure
  | 'state'           // Invalid state transition
  | 'render'          // WebGL/Three.js render error
  | 'audio'           // Audio playback/decode error
  | 'interaction'     // Interaction system failure
  | 'system'          // General system error
  | 'district'        // District load/transition failure
  | 'photobooth';     // Photobooth session error

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

// ─── Error Entry ─────────────────────────────────────────────────────────────

export interface ErrorEntry {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  /** Technical detail (for console, not shown to user) */
  detail: string | null;
  /** Timestamp of occurrence */
  timestamp: number;
  /** How many times this error has occurred */
  count: number;
  /** Whether recovery was attempted */
  recoveryAttempted: boolean;
  /** Whether recovery succeeded */
  recovered: boolean;
}

// ─── Recovery Strategy ───────────────────────────────────────────────────────

export interface RecoveryStrategy {
  category: ErrorCategory;
  /** Maximum auto-recovery attempts before giving up */
  maxAttempts: number;
  /** Delay between recovery attempts (ms) */
  retryDelay: number;
  /** Action to take on recovery */
  recover: (error: ErrorEntry) => Promise<boolean>;
  /** Action to take when all recovery attempts fail */
  onGiveUp: (error: ErrorEntry) => void;
}

// ─── User-Facing Feedback ────────────────────────────────────────────────────

export interface UserFeedback {
  message: string;
  type: 'info' | 'warning' | 'error';
  duration: number; // ms (0 = persistent until dismissed)
  action?: { label: string; callback: () => void };
}

// ─── Callbacks ───────────────────────────────────────────────────────────────

export interface ErrorRecoveryCallbacks {
  /** Show a non-identifying message to the user */
  onUserFeedback?: (feedback: UserFeedback) => void;
  /** A system was disabled due to repeated failures */
  onSystemDisabled?: (system: string) => void;
  /** Network reconnection needed */
  onReconnectNeeded?: () => void;
  /** State reset needed (non-destructive) */
  onStateReset?: (system: string) => void;
}

// ─── Error Recovery System ───────────────────────────────────────────────────

export class ErrorRecoverySystem {
  private errors: Map<string, ErrorEntry> = new Map();
  private recentErrors: ErrorEntry[] = [];
  private maxRecentErrors: number = 100;
  private strategies: Map<ErrorCategory, RecoveryStrategy> = new Map();
  private callbacks: ErrorRecoveryCallbacks = {};
  private disabledSystems: Set<string> = new Set();

  // Failure tracking per category
  private failureCounts: Map<string, number> = new Map();
  private maxFailuresBeforeDisable: number = 10;

  constructor() {
    this.registerDefaultStrategies();
  }

  // ─── Configuration ─────────────────────────────────────────────────────

  setCallbacks(callbacks: ErrorRecoveryCallbacks): void {
    this.callbacks = callbacks;
  }

  setMaxFailuresBeforeDisable(count: number): void {
    this.maxFailuresBeforeDisable = count;
  }

  /** Register a custom recovery strategy for a category */
  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.set(strategy.category, strategy);
  }

  // ─── Error Handling ────────────────────────────────────────────────────

  /**
   * Report an error. The system will:
   * 1. Log it (non-identifying)
   * 2. Attempt recovery if a strategy exists
   * 3. Show user feedback if appropriate
   * 4. Disable the system if repeated failures occur
   */
  async handleError(
    category: ErrorCategory,
    severity: ErrorSeverity,
    message: string,
    detail?: string
  ): Promise<boolean> {
    const id = `${category}_${this.hashMessage(message)}`;

    // Track error
    const existing = this.errors.get(id);
    if (existing) {
      existing.count++;
      existing.timestamp = Date.now();
    } else {
      const entry: ErrorEntry = {
        id,
        category,
        severity,
        message,
        detail: detail ?? null,
        timestamp: Date.now(),
        count: 1,
        recoveryAttempted: false,
        recovered: false,
      };
      this.errors.set(id, entry);
      this.addRecent(entry);
    }

    const entry = this.errors.get(id)!;

    // Log (non-identifying)
    this.logError(entry);

    // Track failure count for this category
    const catKey = category;
    const failCount = (this.failureCounts.get(catKey) ?? 0) + 1;
    this.failureCounts.set(catKey, failCount);

    // Check if system should be disabled
    if (failCount >= this.maxFailuresBeforeDisable && severity !== 'info') {
      this.disableSystem(category);
    }

    // Attempt recovery
    const strategy = this.strategies.get(category);
    if (strategy && entry.count <= strategy.maxAttempts) {
      entry.recoveryAttempted = true;
      try {
        await this.delay(strategy.retryDelay);
        const recovered = await strategy.recover(entry);
        entry.recovered = recovered;
        if (recovered) {
          this.failureCounts.set(catKey, Math.max(0, failCount - 1));
          return true;
        }
      } catch {
        // Recovery itself failed — don't crash
      }

      if (entry.count >= strategy.maxAttempts) {
        strategy.onGiveUp(entry);
      }
    }

    // User feedback for non-info errors
    if (severity !== 'info') {
      this.showUserFeedback(category, severity, message);
    }

    return entry.recovered;
  }

  /**
   * Wrap an async operation with error handling.
   * Returns null on failure instead of throwing.
   */
  async safeAsync<T>(
    category: ErrorCategory,
    operation: () => Promise<T>,
    fallback?: T
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await this.handleError(category, 'error', message);
      return fallback ?? null;
    }
  }

  /**
   * Wrap a synchronous operation with error handling.
   * Returns fallback on failure instead of throwing.
   */
  safeSync<T>(
    category: ErrorCategory,
    operation: () => T,
    fallback: T
  ): T {
    try {
      return operation();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.handleError(category, 'error', message);
      return fallback;
    }
  }

  // ─── System Status ─────────────────────────────────────────────────────

  /** Is a system currently disabled due to failures? */
  isSystemDisabled(system: string): boolean {
    return this.disabledSystems.has(system);
  }

  /** Get all disabled systems */
  getDisabledSystems(): string[] {
    return Array.from(this.disabledSystems);
  }

  /** Manually re-enable a system */
  enableSystem(system: string): void {
    this.disabledSystems.delete(system);
    this.failureCounts.delete(system);
  }

  /** Reset all error tracking */
  resetAll(): void {
    this.errors.clear();
    this.recentErrors = [];
    this.failureCounts.clear();
    this.disabledSystems.clear();
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Get recent errors */
  getRecentErrors(): ErrorEntry[] {
    return [...this.recentErrors];
  }

  /** Get errors by category */
  getErrorsByCategory(category: ErrorCategory): ErrorEntry[] {
    return this.recentErrors.filter(e => e.category === category);
  }

  /** Get total error count */
  getTotalErrorCount(): number {
    let total = 0;
    for (const entry of this.errors.values()) total += entry.count;
    return total;
  }

  /** Get error summary (for dev tools, non-identifying) */
  getSummary(): Record<ErrorCategory, number> {
    const summary: Record<string, number> = {};
    for (const entry of this.errors.values()) {
      summary[entry.category] = (summary[entry.category] ?? 0) + entry.count;
    }
    return summary as Record<ErrorCategory, number>;
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private registerDefaultStrategies(): void {
    // Asset load failures: retry once, then use placeholder
    this.strategies.set('asset_load', {
      category: 'asset_load',
      maxAttempts: 2,
      retryDelay: 2000,
      recover: async () => false, // Placeholder is used by DistrictLoader
      onGiveUp: (error) => {
        console.warn(`[Recovery] Asset permanently unavailable: ${error.message}`);
      },
    });

    // Network failures: attempt reconnection
    this.strategies.set('network', {
      category: 'network',
      maxAttempts: 5,
      retryDelay: 3000,
      recover: async () => {
        this.callbacks.onReconnectNeeded?.();
        return false; // NetworkManager handles actual reconnection
      },
      onGiveUp: (error) => {
        this.showUserFeedback('network', 'warning',
          'Connection lost. You can still explore, but other players won\'t be visible.');
      },
    });

    // State corruption: reset the affected system
    this.strategies.set('state', {
      category: 'state',
      maxAttempts: 3,
      retryDelay: 500,
      recover: async (error) => {
        this.callbacks.onStateReset?.(error.detail ?? 'unknown');
        return true;
      },
      onGiveUp: () => {},
    });

    // Animation failures: graceful (fall back to idle)
    this.strategies.set('animation', {
      category: 'animation',
      maxAttempts: 1,
      retryDelay: 0,
      recover: async () => true, // AnimationStateMachine falls back to idle
      onGiveUp: () => {},
    });

    // Render errors: warn but continue
    this.strategies.set('render', {
      category: 'render',
      maxAttempts: 3,
      retryDelay: 1000,
      recover: async () => false,
      onGiveUp: () => {
        this.showUserFeedback('render', 'warning',
          'Some visual elements may not display correctly.');
      },
    });

    // Audio errors: silent degradation
    this.strategies.set('audio', {
      category: 'audio',
      maxAttempts: 2,
      retryDelay: 1000,
      recover: async () => false,
      onGiveUp: () => {}, // Audio failing is not user-facing
    });

    // District load: already handled by DistrictLoader with placeholders
    this.strategies.set('district', {
      category: 'district',
      maxAttempts: 2,
      retryDelay: 3000,
      recover: async () => false,
      onGiveUp: (error) => {
        this.showUserFeedback('district', 'warning',
          'This area couldn\'t load fully. Some elements may be missing.');
      },
    });

    // Photobooth: reset session
    this.strategies.set('photobooth', {
      category: 'photobooth',
      maxAttempts: 2,
      retryDelay: 1000,
      recover: async () => true, // PhotoboothSession.fullReset handles this
      onGiveUp: () => {},
    });
  }

  private disableSystem(system: string): void {
    if (this.disabledSystems.has(system)) return;
    this.disabledSystems.add(system);
    this.callbacks.onSystemDisabled?.(system);
    console.warn(`[Recovery] System disabled due to repeated failures: ${system}`);
  }

  private showUserFeedback(category: ErrorCategory, severity: ErrorSeverity, message: string): void {
    const feedback: UserFeedback = {
      message,
      type: severity === 'critical' ? 'error' : severity === 'error' ? 'warning' : 'info',
      duration: severity === 'critical' ? 0 : 5000,
    };

    // Add retry action for network issues
    if (category === 'network') {
      feedback.action = {
        label: 'Retry',
        callback: () => this.callbacks.onReconnectNeeded?.(),
      };
    }

    this.callbacks.onUserFeedback?.(feedback);
  }

  private logError(entry: ErrorEntry): void {
    const prefix = `[OCC Live ${entry.severity.toUpperCase()}]`;
    const msg = `${prefix} [${entry.category}] ${entry.message}${entry.count > 1 ? ` (x${entry.count})` : ''}`;

    switch (entry.severity) {
      case 'critical':
      case 'error':
        console.error(msg);
        break;
      case 'warning':
        console.warn(msg);
        break;
      default:
        console.log(msg);
    }
  }

  private addRecent(entry: ErrorEntry): void {
    this.recentErrors.push(entry);
    if (this.recentErrors.length > this.maxRecentErrors) {
      this.recentErrors.shift();
    }
  }

  private hashMessage(msg: string): string {
    let hash = 0;
    for (let i = 0; i < msg.length; i++) {
      const chr = msg.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}

// ─── Global Error Boundary ───────────────────────────────────────────────────

/**
 * Install a global unhandled error/promise rejection handler.
 * Prevents app crash from unexpected errors.
 */
export function installGlobalErrorBoundary(recovery: ErrorRecoverySystem): void {
  window.addEventListener('error', (event) => {
    event.preventDefault();
    recovery.handleError(
      'system',
      'error',
      event.message || 'Unhandled error',
      event.filename ? `${event.filename}:${event.lineno}` : undefined
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason ?? 'Unhandled promise rejection');
    recovery.handleError('system', 'error', message);
  });
}
