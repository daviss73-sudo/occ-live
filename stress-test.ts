/**
 * OCC Live - Multiplayer Stress Test & Optimization (Part 11)
 * Utilities for simulating and validating high-load scenarios.
 * Designed for approximately 130 concurrent users.
 *
 * Systems stressed:
 * - Avatar loading/animation
 * - Avatar Variation System
 * - NPC behavior
 * - Multiplayer synchronization
 * - Lazy River, seating, dance area, photobooth
 * - Events, district transitions
 * - Audio zones, lighting/effects
 * - Asset loading
 *
 * Optimization techniques:
 * - Relevance-based updates (distance-based update frequency)
 * - Spatial culling (don't render/update distant players)
 * - Rate-limited state sync (adaptive based on population)
 * - LOD for remote avatars
 * - Efficient serialization (delta compression)
 * - NPC population scaling based on player count
 * - Don't sync purely cosmetic effects unnecessarily
 *
 * Privacy:
 * - Simulated players use anonymous session IDs
 * - No real identity data in test scenarios
 * - No IP collection in test harness
 */

import type { LoadScenario, Vec3 } from '../types/index.ts';
import type { PerformanceProfiler } from '../core/performance-profiler.ts';

// ─── Simulated Player ────────────────────────────────────────────────────────

export interface SimulatedPlayer {
  sessionId: string;
  position: Vec3;
  rotation: Vec3;
  animationState: string;
  district: string;
  activity: string | null;
  isMoving: boolean;
  moveDirection: Vec3;
  moveSpeed: number;
}

// ─── Optimization Config ─────────────────────────────────────────────────────

export interface SyncOptimizationConfig {
  /** Distance beyond which remote players update at reduced frequency */
  nearDistance: number;
  /** Distance beyond which remote players are culled (not rendered) */
  farDistance: number;
  /** Update frequency for near players (ms between updates) */
  nearUpdateInterval: number;
  /** Update frequency for far players (ms between updates) */
  farUpdateInterval: number;
  /** Maximum simultaneous avatar mesh updates per frame */
  maxAvatarUpdatesPerFrame: number;
  /** Whether to send delta-only state updates */
  useDeltaCompression: boolean;
  /** Maximum state broadcasts per second */
  maxBroadcastsPerSecond: number;
  /** Whether to cull purely cosmetic sync (particle effects, etc.) */
  cullCosmeticSync: boolean;
}

const DEFAULT_OPTIMIZATION: SyncOptimizationConfig = {
  nearDistance: 20,
  farDistance: 50,
  nearUpdateInterval: 50, // 20 Hz
  farUpdateInterval: 200, // 5 Hz
  maxAvatarUpdatesPerFrame: 5,
  useDeltaCompression: true,
  maxBroadcastsPerSecond: 20,
  cullCosmeticSync: true,
};

// ─── Adaptive Sync (scales with player count) ────────────────────────────────

export function getAdaptiveSyncConfig(playerCount: number): SyncOptimizationConfig {
  if (playerCount <= 10) {
    return {
      ...DEFAULT_OPTIMIZATION,
      nearDistance: 30,
      farDistance: 80,
      nearUpdateInterval: 33, // 30 Hz
      farUpdateInterval: 100, // 10 Hz
      maxAvatarUpdatesPerFrame: 10,
      maxBroadcastsPerSecond: 30,
    };
  }
  if (playerCount <= 25) {
    return {
      ...DEFAULT_OPTIMIZATION,
      nearDistance: 25,
      farDistance: 60,
      nearUpdateInterval: 50,
      farUpdateInterval: 150,
      maxAvatarUpdatesPerFrame: 8,
      maxBroadcastsPerSecond: 20,
    };
  }
  if (playerCount <= 50) {
    return {
      ...DEFAULT_OPTIMIZATION,
      nearDistance: 20,
      farDistance: 50,
      nearUpdateInterval: 66, // 15 Hz
      farUpdateInterval: 200, // 5 Hz
      maxAvatarUpdatesPerFrame: 5,
      maxBroadcastsPerSecond: 15,
    };
  }
  if (playerCount <= 100) {
    return {
      ...DEFAULT_OPTIMIZATION,
      nearDistance: 15,
      farDistance: 40,
      nearUpdateInterval: 100, // 10 Hz
      farUpdateInterval: 333, // 3 Hz
      maxAvatarUpdatesPerFrame: 3,
      maxBroadcastsPerSecond: 10,
      cullCosmeticSync: true,
    };
  }
  // 100+ players (max capacity)
  return {
    ...DEFAULT_OPTIMIZATION,
    nearDistance: 12,
    farDistance: 30,
    nearUpdateInterval: 100,
    farUpdateInterval: 500, // 2 Hz
    maxAvatarUpdatesPerFrame: 2,
    maxBroadcastsPerSecond: 8,
    cullCosmeticSync: true,
  };
}

// ─── Stress Test Results ─────────────────────────────────────────────────────

export interface StressTestResult {
  scenario: LoadScenario;
  duration: number; // ms
  averageFPS: number;
  minimumFPS: number;
  maxFrameTime: number;
  droppedFrames: number;
  networkMessages: number;
  memoryPeakMB: number;
  passed: boolean;
  issues: string[];
}

// ─── Multiplayer Stress Test ─────────────────────────────────────────────────

export class MultiplayerStressTest {
  private simulatedPlayers: Map<string, SimulatedPlayer> = new Map();
  private isRunning: boolean = false;
  private currentScenario: LoadScenario | null = null;
  private profiler: PerformanceProfiler | null = null;
  private updateInterval: number | null = null;
  private results: StressTestResult[] = [];

  // Test metrics
  private testStartTime: number = 0;
  private fpsReadings: number[] = [];
  private frameTimeReadings: number[] = [];
  private networkMessageCount: number = 0;

  // ─── Configuration ─────────────────────────────────────────────────────

  setProfiler(profiler: PerformanceProfiler): void {
    this.profiler = profiler;
  }

  // ─── Simulation ────────────────────────────────────────────────────────

  /**
   * Start simulating a load scenario.
   * Creates fake player entities that move and animate.
   */
  startScenario(scenario: LoadScenario): void {
    if (this.isRunning) this.stopScenario();

    this.currentScenario = scenario;
    this.isRunning = true;
    this.testStartTime = Date.now();
    this.fpsReadings = [];
    this.frameTimeReadings = [];
    this.networkMessageCount = 0;

    // Create simulated players
    for (let i = 0; i < scenario.playerCount; i++) {
      const player = this.createSimulatedPlayer(i, scenario);
      this.simulatedPlayers.set(player.sessionId, player);
    }

    // Start update loop for simulated players
    this.updateInterval = window.setInterval(() => {
      this.updateSimulatedPlayers();
      this.collectMetrics();
    }, 100); // 10 Hz update for simulated players

    console.log(`[StressTest] Started: ${scenario.name} (${scenario.playerCount} players)`);
  }

  /** Stop the current scenario */
  stopScenario(): StressTestResult | null {
    if (!this.isRunning || !this.currentScenario) return null;

    this.isRunning = false;
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    const result = this.buildResult();
    this.results.push(result);

    this.simulatedPlayers.clear();
    this.currentScenario = null;

    console.log(`[StressTest] Completed: ${result.scenario.name} — ${result.passed ? 'PASSED' : 'FAILED'}`);
    if (result.issues.length > 0) {
      result.issues.forEach(i => console.warn(`  Issue: ${i}`));
    }

    return result;
  }

  /** Get simulated players (for rendering in test mode) */
  getSimulatedPlayers(): SimulatedPlayer[] {
    return Array.from(this.simulatedPlayers.values());
  }

  /** Is a test currently running? */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /** Get all test results */
  getResults(): StressTestResult[] {
    return [...this.results];
  }

  /** Clear test results */
  clearResults(): void {
    this.results = [];
  }

  // ─── Relevance-Based Spatial Culling ───────────────────────────────────

  /**
   * Determine which remote players should be fully updated, partially
   * updated, or culled based on distance from local player.
   */
  static categorizeByRelevance(
    localPosition: Vec3,
    remotePlayers: Array<{ sessionId: string; position: Vec3 }>,
    config: SyncOptimizationConfig
  ): {
    near: string[];
    far: string[];
    culled: string[];
  } {
    const near: string[] = [];
    const far: string[] = [];
    const culled: string[] = [];

    for (const remote of remotePlayers) {
      const dx = localPosition[0] - remote.position[0];
      const dz = localPosition[2] - remote.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= config.nearDistance) {
        near.push(remote.sessionId);
      } else if (dist <= config.farDistance) {
        far.push(remote.sessionId);
      } else {
        culled.push(remote.sessionId);
      }
    }

    return { near, far, culled };
  }

  /**
   * Should this remote player's state be updated this frame?
   * Uses time-slicing based on distance category.
   */
  static shouldUpdatePlayer(
    lastUpdateTime: number,
    now: number,
    isNear: boolean,
    config: SyncOptimizationConfig
  ): boolean {
    const interval = isNear ? config.nearUpdateInterval : config.farUpdateInterval;
    return (now - lastUpdateTime) >= interval;
  }

  // ─── Delta Compression ─────────────────────────────────────────────────

  /**
   * Compute a minimal state delta between previous and current state.
   * Only includes fields that changed.
   */
  static computeStateDelta(
    previous: { position: Vec3; rotation: Vec3; animation: string },
    current: { position: Vec3; rotation: Vec3; animation: string }
  ): Partial<{ position: Vec3; rotation: Vec3; animation: string }> | null {
    const delta: Partial<{ position: Vec3; rotation: Vec3; animation: string }> = {};
    let hasChange = false;

    // Position threshold (don't send sub-centimeter changes)
    const posDiff = Math.abs(current.position[0] - previous.position[0]) +
                    Math.abs(current.position[1] - previous.position[1]) +
                    Math.abs(current.position[2] - previous.position[2]);
    if (posDiff > 0.01) {
      delta.position = current.position;
      hasChange = true;
    }

    // Rotation threshold
    const rotDiff = Math.abs(current.rotation[1] - previous.rotation[1]);
    if (rotDiff > 0.01) {
      delta.rotation = current.rotation;
      hasChange = true;
    }

    // Animation change
    if (current.animation !== previous.animation) {
      delta.animation = current.animation;
      hasChange = true;
    }

    return hasChange ? delta : null;
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private createSimulatedPlayer(index: number, scenario: LoadScenario): SimulatedPlayer {
    // Distribute players across specified districts
    const districts = scenario.activeDistricts;
    const district = districts[index % districts.length];

    // Random position within district bounds
    const angle = (index / scenario.playerCount) * Math.PI * 2;
    const radius = 5 + Math.random() * 20;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const animations = ['idle', 'walk', 'dance', 'sit', 'wave'];
    const animation = animations[Math.floor(Math.random() * animations.length)];

    return {
      sessionId: `sim_${index.toString().padStart(4, '0')}_${Date.now().toString(36)}`,
      position: [x, 0, z],
      rotation: [0, angle, 0],
      animationState: animation,
      district,
      activity: null,
      isMoving: Math.random() > 0.4,
      moveDirection: [Math.cos(angle), 0, Math.sin(angle)],
      moveSpeed: 1 + Math.random() * 3,
    };
  }

  private updateSimulatedPlayers(): void {
    for (const player of this.simulatedPlayers.values()) {
      if (!player.isMoving) {
        // Chance to start moving
        if (Math.random() < 0.02) {
          player.isMoving = true;
          const angle = Math.random() * Math.PI * 2;
          player.moveDirection = [Math.cos(angle), 0, Math.sin(angle)];
          player.animationState = Math.random() > 0.3 ? 'walk' : 'run';
        }
        continue;
      }

      // Move player
      const speed = player.moveSpeed * 0.1; // 10 Hz update
      player.position = [
        player.position[0] + player.moveDirection[0] * speed,
        player.position[1],
        player.position[2] + player.moveDirection[2] * speed,
      ];
      player.rotation = [0, Math.atan2(player.moveDirection[0], player.moveDirection[2]), 0];

      // Keep within bounds
      const dist = Math.sqrt(player.position[0] ** 2 + player.position[2] ** 2);
      if (dist > 35) {
        player.moveDirection = [-player.moveDirection[0], 0, -player.moveDirection[2]];
      }

      // Chance to stop
      if (Math.random() < 0.03) {
        player.isMoving = false;
        const idleAnims = ['idle', 'dance', 'sit', 'wave', 'cheer'];
        player.animationState = idleAnims[Math.floor(Math.random() * idleAnims.length)];
      }

      this.networkMessageCount++;
    }
  }

  private collectMetrics(): void {
    if (!this.profiler) return;
    const fps = this.profiler.getFPS();
    const frameTime = this.profiler.getAverageFrameTime();
    if (fps > 0) this.fpsReadings.push(fps);
    if (frameTime > 0) this.frameTimeReadings.push(frameTime);
  }

  private buildResult(): StressTestResult {
    const scenario = this.currentScenario!;
    const duration = Date.now() - this.testStartTime;
    const avgFPS = this.fpsReadings.length > 0
      ? this.fpsReadings.reduce((a, b) => a + b, 0) / this.fpsReadings.length
      : 0;
    const minFPS = this.fpsReadings.length > 0
      ? Math.min(...this.fpsReadings)
      : 0;
    const maxFrameTime = this.frameTimeReadings.length > 0
      ? Math.max(...this.frameTimeReadings)
      : 0;
    const droppedFrames = this.frameTimeReadings.filter(t => t > 33).length;

    const issues: string[] = [];
    if (avgFPS < 30) issues.push(`Average FPS (${avgFPS.toFixed(1)}) below 30`);
    if (minFPS < 15) issues.push(`Minimum FPS (${minFPS.toFixed(1)}) below 15`);
    if (maxFrameTime > 100) issues.push(`Max frame time (${maxFrameTime.toFixed(1)}ms) exceeds 100ms`);
    if (droppedFrames > this.frameTimeReadings.length * 0.1) {
      issues.push(`>10% frames dropped (${droppedFrames}/${this.frameTimeReadings.length})`);
    }

    const passed = avgFPS >= 25 && minFPS >= 10;

    // Estimate memory (rough)
    const memoryPeakMB = (scenario.playerCount * 2) + (scenario.npcCount * 1.5) + 50; // Rough estimate

    return {
      scenario,
      duration,
      averageFPS: Math.round(avgFPS * 10) / 10,
      minimumFPS: Math.round(minFPS * 10) / 10,
      maxFrameTime: Math.round(maxFrameTime * 10) / 10,
      droppedFrames,
      networkMessages: this.networkMessageCount,
      memoryPeakMB: Math.round(memoryPeakMB),
      passed,
      issues,
    };
  }
}
