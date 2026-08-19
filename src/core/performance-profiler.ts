/**
 * OCC Live - Performance Profiler (Part 11)
 * Tracks frame time, memory usage, draw calls, and system load.
 * Designed for approximately 130 concurrent users while avoiding
 * unnecessary resource use at lower populations.
 *
 * Features:
 * - Real-time FPS and frame time tracking
 * - Renderer statistics (draw calls, triangles, texture/geometry memory)
 * - System-specific timing (avatar, NPC, multiplayer, physics)
 * - Network latency and bandwidth estimation
 * - Load scenario definitions for progressive testing
 * - Non-identifying performance data (no PII in metrics)
 * - Optimization recommendations based on current load
 *
 * Load scenarios (Part 11.2):
 * 1 player + NPCs, 10, 25, 50, 100, ~130 concurrent players
 */

import * as THREE from 'three';
import type { PerformanceMetrics, LoadScenario } from '../types/index.ts';

// ─── System Timing ───────────────────────────────────────────────────────────

export interface SystemTimings {
  playerController: number;
  animationStateMachine: number;
  npcSystem: number;
  remotePlayerManager: number;
  interactionSystem: number;
  activityAreaSystem: number;
  physicsUpdate: number;
  networkSync: number;
  render: number;
  total: number;
}

// ─── Performance Thresholds ──────────────────────────────────────────────────

export interface PerformanceThresholds {
  targetFPS: number;
  warningFPS: number;
  criticalFPS: number;
  maxFrameTime: number; // ms
  maxDrawCalls: number;
  maxTriangles: number;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  targetFPS: 60,
  warningFPS: 30,
  criticalFPS: 15,
  maxFrameTime: 33, // ~30 FPS
  maxDrawCalls: 500,
  maxTriangles: 2_000_000,
};

// ─── Performance Status ──────────────────────────────────────────────────────

export type PerformanceStatus = 'good' | 'warning' | 'critical';

export interface PerformanceReport {
  status: PerformanceStatus;
  metrics: PerformanceMetrics;
  timings: SystemTimings;
  recommendations: string[];
  timestamp: number;
}

// ─── Load Scenarios ──────────────────────────────────────────────────────────

export const LOAD_SCENARIOS: LoadScenario[] = [
  { id: 'solo_npc', name: 'Solo + NPCs', playerCount: 1, npcCount: 20, activeDistricts: ['main_union'], activeActivities: ['all'], description: 'Single player with full NPC population' },
  { id: 'small_10', name: '10 Players', playerCount: 10, npcCount: 15, activeDistricts: ['main_union'], activeActivities: ['all'], description: 'Small group in Main Union' },
  { id: 'medium_25', name: '25 Players', playerCount: 25, npcCount: 10, activeDistricts: ['main_union', 'skyline'], activeActivities: ['all'], description: 'Medium crowd, two districts' },
  { id: 'large_50', name: '50 Players', playerCount: 50, npcCount: 6, activeDistricts: ['main_union', 'skyline', 'pulse'], activeActivities: ['all'], description: 'Large crowd across three districts' },
  { id: 'heavy_100', name: '100 Players', playerCount: 100, npcCount: 3, activeDistricts: ['main_union', 'skyline', 'pulse', 'arcade'], activeActivities: ['all'], description: 'Heavy load across four districts' },
  { id: 'max_130', name: '~130 Players', playerCount: 130, npcCount: 1, activeDistricts: ['main_union', 'skyline', 'pulse', 'arcade', 'throwback_80s_90s', 'mystique'], activeActivities: ['all'], description: 'Maximum capacity across all districts' },
  { id: 'main_stage_crowd', name: 'Main Stage Crowd', playerCount: 80, npcCount: 5, activeDistricts: ['main_union'], activeActivities: ['main_stage', 'dance'], description: 'Large crowd concentrated at Main Stage' },
  { id: 'all_activities', name: 'Activity Stress', playerCount: 50, npcCount: 4, activeDistricts: ['main_union'], activeActivities: ['all'], description: 'Players simultaneously using all activities' },
];

// ─── Performance Profiler ────────────────────────────────────────────────────

export class PerformanceProfiler {
  private renderer: THREE.WebGLRenderer | null = null;
  private thresholds: PerformanceThresholds = { ...DEFAULT_THRESHOLDS };
  private enabled: boolean = false;

  // Frame tracking
  private frameTimes: number[] = [];
  private maxFrameSamples: number = 120; // 2 seconds at 60 FPS
  private lastFrameTime: number = 0;
  private frameCount: number = 0;

  // System timings
  private systemTimers: Map<string, number> = new Map();
  private currentTimings: SystemTimings = this.emptyTimings();

  // Network metrics
  private networkLatency: number = 0;
  private networkBandwidth: number = 0;

  // Active state
  private activeRemotePlayers: number = 0;
  private activeNPCs: number = 0;
  private loadedAssets: number = 0;

  // Reporting
  private lastReport: PerformanceReport | null = null;
  private reportInterval: number = 5000; // 5 seconds
  private lastReportTime: number = 0;
  private onReport: ((report: PerformanceReport) => void) | null = null;

  // ─── Configuration ─────────────────────────────────────────────────────

  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }

  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  setReportInterval(ms: number): void {
    this.reportInterval = ms;
  }

  setOnReport(callback: (report: PerformanceReport) => void): void {
    this.onReport = callback;
  }

  enable(): void { this.enabled = true; }
  disable(): void { this.enabled = false; }
  isEnabled(): boolean { return this.enabled; }

  // ─── Frame Tracking ────────────────────────────────────────────────────

  /** Call at the start of each frame */
  beginFrame(): void {
    if (!this.enabled) return;
    this.lastFrameTime = performance.now();
  }

  /** Call at the end of each frame */
  endFrame(): void {
    if (!this.enabled) return;

    const frameTime = performance.now() - this.lastFrameTime;
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxFrameSamples) {
      this.frameTimes.shift();
    }
    this.frameCount++;

    // Periodic report
    const now = performance.now();
    if (now - this.lastReportTime >= this.reportInterval) {
      this.lastReportTime = now;
      this.generateReport();
    }
  }

  // ─── System Timing ─────────────────────────────────────────────────────

  /** Start timing a system */
  startTimer(systemName: string): void {
    if (!this.enabled) return;
    this.systemTimers.set(systemName, performance.now());
  }

  /** End timing a system */
  endTimer(systemName: string): void {
    if (!this.enabled) return;
    const start = this.systemTimers.get(systemName);
    if (start === undefined) return;

    const elapsed = performance.now() - start;
    (this.currentTimings as any)[systemName] = elapsed;
    this.systemTimers.delete(systemName);
  }

  // ─── State Updates ─────────────────────────────────────────────────────

  setActiveRemotePlayers(count: number): void { this.activeRemotePlayers = count; }
  setActiveNPCs(count: number): void { this.activeNPCs = count; }
  setLoadedAssets(count: number): void { this.loadedAssets = count; }
  setNetworkLatency(ms: number): void { this.networkLatency = ms; }
  setNetworkBandwidth(bytesPerSecond: number): void { this.networkBandwidth = bytesPerSecond; }

  // ─── Metrics ───────────────────────────────────────────────────────────

  /** Get current FPS */
  getFPS(): number {
    if (this.frameTimes.length === 0) return 0;
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
  }

  /** Get average frame time in ms */
  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }

  /** Get current performance metrics */
  getMetrics(): PerformanceMetrics {
    const rendererInfo = this.renderer?.info;
    return {
      fps: Math.round(this.getFPS()),
      frameTime: this.getAverageFrameTime(),
      drawCalls: rendererInfo?.render.calls ?? 0,
      triangles: rendererInfo?.render.triangles ?? 0,
      textureMemory: rendererInfo?.memory.textures ?? 0,
      geometryMemory: rendererInfo?.memory.geometries ?? 0,
      activeRemotePlayers: this.activeRemotePlayers,
      activeNPCs: this.activeNPCs,
      loadedAssets: this.loadedAssets,
      networkLatency: this.networkLatency,
      networkBandwidth: this.networkBandwidth,
    };
  }

  /** Get current performance status */
  getStatus(): PerformanceStatus {
    const fps = this.getFPS();
    if (fps >= this.thresholds.warningFPS) return 'good';
    if (fps >= this.thresholds.criticalFPS) return 'warning';
    return 'critical';
  }

  /** Get the latest report */
  getLastReport(): PerformanceReport | null {
    return this.lastReport;
  }

  /** Get system timings from last frame */
  getTimings(): SystemTimings {
    return { ...this.currentTimings };
  }

  // ─── Optimization Recommendations ─────────────────────────────────────

  /** Generate optimization suggestions based on current metrics */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getMetrics();

    if (metrics.fps < this.thresholds.warningFPS) {
      recommendations.push('FPS below target. Consider reducing NPC count or draw distance.');
    }

    if (metrics.drawCalls > this.thresholds.maxDrawCalls) {
      recommendations.push(`Draw calls (${metrics.drawCalls}) exceed threshold. Consider instancing or LOD.`);
    }

    if (metrics.triangles > this.thresholds.maxTriangles) {
      recommendations.push(`Triangle count (${metrics.triangles}) is high. Consider mesh decimation.`);
    }

    if (metrics.activeRemotePlayers > 50 && metrics.fps < this.thresholds.targetFPS) {
      recommendations.push('High player count impacting performance. Consider relevance-based updates.');
    }

    if (metrics.networkLatency > 200) {
      recommendations.push(`Network latency (${metrics.networkLatency}ms) is high. May affect sync quality.`);
    }

    if (this.currentTimings.npcSystem > 5) {
      recommendations.push('NPC system taking >5ms. Reduce NPC update frequency for distant NPCs.');
    }

    if (this.currentTimings.remotePlayerManager > 8) {
      recommendations.push('Remote player updates taking >8ms. Enable spatial culling for distant players.');
    }

    return recommendations;
  }

  // ─── Load Testing ──────────────────────────────────────────────────────

  /** Get available load scenarios */
  getLoadScenarios(): LoadScenario[] {
    return [...LOAD_SCENARIOS];
  }

  /** Get recommended NPC count for current player count */
  getRecommendedNPCCount(playerCount: number): number {
    if (playerCount >= 61) return 1;
    if (playerCount >= 31) return 3;
    if (playerCount >= 16) return 6;
    if (playerCount >= 6) return 10;
    if (playerCount >= 1) return 15;
    return 20;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  reset(): void {
    this.frameTimes = [];
    this.frameCount = 0;
    this.currentTimings = this.emptyTimings();
    this.lastReport = null;
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private generateReport(): void {
    const metrics = this.getMetrics();
    const status = this.getStatus();
    const recommendations = this.getRecommendations();

    this.currentTimings.total = this.getAverageFrameTime();

    this.lastReport = {
      status,
      metrics,
      timings: { ...this.currentTimings },
      recommendations,
      timestamp: Date.now(),
    };

    this.onReport?.(this.lastReport);

    // Reset timings for next period
    this.currentTimings = this.emptyTimings();
  }

  private emptyTimings(): SystemTimings {
    return {
      playerController: 0,
      animationStateMachine: 0,
      npcSystem: 0,
      remotePlayerManager: 0,
      interactionSystem: 0,
      activityAreaSystem: 0,
      physicsUpdate: 0,
      networkSync: 0,
      render: 0,
      total: 0,
    };
  }
}
