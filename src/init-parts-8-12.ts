/**
 * OCC Live - Parts 8-12 System Initialization
 * Wires all new systems introduced in Parts 8-12 into the existing application.
 * Called from main.ts after Parts 1-7 systems are initialized.
 *
 * This module initializes:
 * - Part 8: District loader, transitions, and full district configs
 * - Part 9: Shared activity system, expanded photobooth registry
 * - Part 10: Content pack manager, seasonal layers, availability scheduler
 * - Part 11: Performance profiler, error recovery, privacy audit
 * - Part 12: Onboarding, accessibility, audio mixer
 *
 * Preserves all existing functionality from Parts 1-7.
 */

import * as THREE from 'three';

// ─── Part 8 Imports ──────────────────────────────────────────────────────────
import { DistrictLoader } from './world/district-loader.ts';
import { DistrictTransitionManager } from './world/district-transition.ts';
import { allDistrictConfigs, getFullDistrictConfig } from './config/district-configs.ts';

// ─── Part 9 Imports ──────────────────────────────────────────────────────────
import { SharedActivitySystem } from './systems/shared-activity-system.ts';
import { sharedActivityConfigs } from './config/shared-activities.ts';
import { PhotoboothRegistry } from './photobooth/photobooth-registry.ts';

// ─── Part 10 Imports ─────────────────────────────────────────────────────────
import { ContentPackManager } from './content/content-pack-manager.ts';
import { SeasonalLayerManager } from './content/seasonal-layer.ts';
import { AvailabilityScheduler } from './content/availability-scheduler.ts';
import { contentPacks, seasonalLayers } from './config/content-packs.ts';

// ─── Part 11 Imports ─────────────────────────────────────────────────────────
import { PerformanceProfiler } from './core/performance-profiler.ts';
import { ErrorRecoverySystem, installGlobalErrorBoundary } from './core/error-recovery.ts';
import { runPrivacyAuditAndLog } from './core/privacy-audit.ts';
import { MultiplayerStressTest } from './multiplayer/stress-test.ts';
import { AnonymousAnalytics } from './core/anonymous-analytics.ts';

// ─── Part 12 Imports ─────────────────────────────────────────────────────────
import { OnboardingSystem } from './systems/onboarding-system.ts';
import { AccessibilityManager } from './systems/accessibility-manager.ts';
import { AudioMixer } from './systems/audio-mixer.ts';

// ─── Dependencies from Parts 1-7 (passed in from main.ts) ───────────────────

export interface Parts1to7Systems {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  districtRegistry: any; // DistrictRegistry from Part 1
  playerController: any; // PlayerController
  interactionSystem: any; // InteractionSystem
  networkManager: any; // NetworkManager
  consentManager: any; // InteractionConsentManager
  npcSystem: any; // NPCSystem
  musicSystem: any; // MusicSystem
  activityAreaSystem: any; // ActivityAreaSystem
  eventManager: any; // EventManager
  worldConfig: any; // WorldConfig
  showNotification: (msg: string) => void;
}

// ─── Initialized Systems (exported for debug access) ─────────────────────────

export interface Parts8to12Systems {
  // Part 8
  districtLoader: DistrictLoader;
  districtTransition: DistrictTransitionManager;
  // Part 9
  sharedActivitySystem: SharedActivitySystem;
  photoboothRegistry: PhotoboothRegistry;
  // Part 10
  contentPackManager: ContentPackManager;
  seasonalLayerManager: SeasonalLayerManager;
  availabilityScheduler: AvailabilityScheduler;
  // Part 11
  performanceProfiler: PerformanceProfiler;
  errorRecovery: ErrorRecoverySystem;
  stressTest: MultiplayerStressTest;
  analytics: AnonymousAnalytics;
  // Part 12
  onboarding: OnboardingSystem;
  accessibility: AccessibilityManager;
  audioMixer: AudioMixer;
  // Utilities
  runPrivacyAudit: () => any;
}

// ─── Initialization ──────────────────────────────────────────────────────────

export function initializeParts8to12(deps: Parts1to7Systems): Parts8to12Systems {
  const { scene, renderer, networkManager, consentManager, showNotification } = deps;

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 11: Error Recovery (initialize first to catch errors from other init)
  // ═══════════════════════════════════════════════════════════════════════════

  const errorRecovery = new ErrorRecoverySystem();
  errorRecovery.setCallbacks({
    onUserFeedback: (feedback) => {
      showNotification(feedback.message);
    },
    onReconnectNeeded: () => {
      networkManager.connect();
    },
    onSystemDisabled: (system) => {
      console.warn(`[OCC Live] System disabled: ${system}`);
    },
  });
  installGlobalErrorBoundary(errorRecovery);

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 11: Performance Profiler
  // ═══════════════════════════════════════════════════════════════════════════

  const performanceProfiler = new PerformanceProfiler();
  performanceProfiler.setRenderer(renderer);
  performanceProfiler.enable();

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 12: Accessibility Manager (early init for OS preference detection)
  // ═══════════════════════════════════════════════════════════════════════════

  const accessibility = new AccessibilityManager();
  accessibility.setCallbacks({
    onReducedMotionChanged: (enabled) => {
      console.log(`[Accessibility] Reduced motion: ${enabled}`);
    },
    onVolumeChanged: (category, volume) => {
      audioMixer.setCategoryVolume(category as any, volume);
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 12: Audio Mixer
  // ═══════════════════════════════════════════════════════════════════════════

  const audioMixer = new AudioMixer();
  audioMixer.applyAccessibilityVolumes(accessibility.getConfig());

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 8: District Loader & Transition System
  // ═══════════════════════════════════════════════════════════════════════════

  const districtLoader = new DistrictLoader(scene);
  districtLoader.setCallbacks({
    onLoadStarted: (id) => console.log(`[District] Loading: ${id}`),
    onLoadComplete: (id) => console.log(`[District] Loaded: ${id}`),
    onLoadError: (id, error) => {
      errorRecovery.handleError('district', 'warning', `Failed to load district: ${id}`, error);
    },
  });

  const districtTransition = new DistrictTransitionManager(scene, districtLoader);
  districtTransition.setCallbacks({
    onTransitionStart: (from, to) => {
      console.log(`[District] Transitioning: ${from} → ${to}`);
    },
    onTransitionComplete: (id) => {
      showNotification(`Welcome to ${getFullDistrictConfig(id)?.name ?? id}`);
    },
    onTransitionError: (id, error) => {
      showNotification(`Couldn't enter that area. Try again.`);
      errorRecovery.handleError('district', 'warning', error);
    },
    onTeleportPlayer: (position, _rotation) => {
      deps.playerController.setPosition(position[0], position[1], position[2]);
    },
    onDistrictActivated: (config) => {
      // Register district zones, interactions, NPCs when activated
      if (config.zones) deps.interactionSystem.registerAll(config.interactions ?? []);
      if (config.npcPreset) deps.npcSystem.registerAll(config.npcPreset.npcs, config.npcPreset.population);
    },
    onDistrictDeactivated: (_districtId) => {
      // Cleanup handled by DistrictLoader.unloadDistrict
    },
    onDistrictChanged: (sessionId, districtId) => {
      console.log(`[District] Player ${sessionId.slice(0, 8)} now in: ${districtId}`);
    },
  });

  // Wire portal interactions to district transitions
  deps.districtRegistry.onPortalEntry((district: any) => {
    const fullConfig = getFullDistrictConfig(district.id);
    if (fullConfig) {
      const sessionId = networkManager.getSessionId();
      if (sessionId) {
        districtTransition.transitionTo(fullConfig, sessionId);
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 9: Shared Activity System
  // ═══════════════════════════════════════════════════════════════════════════

  const sharedActivitySystem = new SharedActivitySystem();
  sharedActivitySystem.registerAll(sharedActivityConfigs);
  sharedActivitySystem.setConsentChecker((sessionId, interaction) => {
    return consentManager.checkInteraction(sessionId, interaction);
  });
  sharedActivitySystem.setCallbacks({
    onPlayerJoined: (activityId, _sessionId, count) => {
      console.log(`[Activity] Joined ${activityId} (${count} participants)`);
    },
    onPlayerLeft: (activityId, _sessionId, count) => {
      console.log(`[Activity] Left ${activityId} (${count} participants)`);
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 9: Photobooth Registry (replaces individual session maps)
  // ═══════════════════════════════════════════════════════════════════════════

  const photoboothRegistry = new PhotoboothRegistry();
  photoboothRegistry.initializeAll();
  photoboothRegistry.setCallbacks({
    onPlayerEnteredQueue: (boothId, _sessionId, position) => {
      console.log(`[Photobooth] Queue joined: ${boothId} (position ${position})`);
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 10: Content Pack Manager
  // ═══════════════════════════════════════════════════════════════════════════

  const contentPackManager = new ContentPackManager(scene);
  contentPackManager.registerAll(contentPacks);
  contentPackManager.setCallbacks({
    onPackActivated: (id) => console.log(`[Content] Pack activated: ${id}`),
    onPackDeactivated: (id) => console.log(`[Content] Pack deactivated: ${id}`),
    onMusicOverride: (zoneId, playlist, _volume) => {
      console.log(`[Content] Music override: ${zoneId} → ${playlist}`);
    },
    onActivityOverride: (areaId, enabled) => {
      deps.activityAreaSystem.setAreaState(areaId, enabled ? 'open' : 'closed');
    },
    onActivityRestore: (areaId) => {
      deps.activityAreaSystem.setAreaState(areaId, 'open');
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 10: Seasonal Layer Manager
  // ═══════════════════════════════════════════════════════════════════════════

  const seasonalLayerManager = new SeasonalLayerManager(scene);
  seasonalLayerManager.registerAll(seasonalLayers);
  seasonalLayerManager.setReducedMotion(accessibility.isReducedMotion());
  seasonalLayerManager.setCallbacks({
    onLayerActivated: (id, theme) => {
      console.log(`[Seasonal] Activated: ${id} (${theme})`);
      showNotification(`Seasonal theme active!`);
    },
    onLayerDeactivated: (id) => {
      console.log(`[Seasonal] Deactivated: ${id}`);
    },
  });

  // Wire accessibility to seasonal layers
  accessibility.setCallbacks({
    onReducedMotionChanged: (enabled: boolean) => {
      seasonalLayerManager.setReducedMotion(enabled);
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 10: Availability Scheduler
  // ═══════════════════════════════════════════════════════════════════════════

  const availabilityScheduler = new AvailabilityScheduler();
  availabilityScheduler.setContentPackManager(contentPackManager);
  availabilityScheduler.setSeasonalLayerManager(seasonalLayerManager);
  availabilityScheduler.setDistrictConfigs(allDistrictConfigs);
  availabilityScheduler.setCallbacks({
    onDistrictScheduleOpen: (districtId) => {
      deps.districtRegistry.setStatus(districtId, 'OPEN');
      console.log(`[Scheduler] District opened: ${districtId}`);
    },
    onDistrictScheduleClose: (districtId) => {
      deps.districtRegistry.setStatus(districtId, 'CLOSED');
      console.log(`[Scheduler] District closed: ${districtId}`);
    },
    onScheduleEvent: (msg) => console.log(`[Scheduler] ${msg}`),
  });
  availabilityScheduler.start();

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 11: Stress Test
  // ═══════════════════════════════════════════════════════════════════════════

  const stressTest = new MultiplayerStressTest();
  stressTest.setProfiler(performanceProfiler);

  // ═══════════════════════════════════════════════════════════════════════════
  // Anonymous Analytics
  // ═══════════════════════════════════════════════════════════════════════════

  const analytics = new AnonymousAnalytics();
  analytics.setCallbacks({
    onFlush: (snapshot) => {
      // Send aggregate snapshot to server for storage
      // Server aggregates across all clients — never stores individual trails
      if (networkManager.isConnected()) {
        console.log(`[Analytics] Flush: ${snapshot.totalSessions} session, peak=${snapshot.peakConcurrent}, duration=${snapshot.avgSessionDuration}s`);
      }
    },
    onPeakUpdate: (peak) => {
      console.log(`[Analytics] New peak concurrent: ${peak}`);
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 12: Onboarding
  // ═══════════════════════════════════════════════════════════════════════════

  const onboarding = new OnboardingSystem();
  onboarding.setCallbacks({
    onCompleted: () => console.log('[Onboarding] Tutorial completed'),
    onSkipped: () => console.log('[Onboarding] Tutorial skipped'),
  });

  // Start onboarding after a short delay (let world load first)
  setTimeout(() => {
    onboarding.start();
  }, 2000);

  // ═══════════════════════════════════════════════════════════════════════════
  // Logging
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('[OCC Live] Parts 8-12 initialized:');
  console.log('  Part 8: Districts & World Expansion (5 districts, lazy loading, transitions)');
  console.log('  Part 9: Social & Community (shared activities, expanded emotes, photobooth registry)');
  console.log('  Part 10: Content Management (packs, seasonal layers, scheduler)');
  console.log('  Part 11: Stress Testing (profiler, error recovery, privacy audit)');
  console.log('  Part 12: Polish & Launch (onboarding, accessibility, audio mixer)');
  console.log('[OCC Live] Dev tools: window.__OCC_LIVE__.accessibility.showSettingsPanel()');
  console.log('[OCC Live] Privacy audit: window.__OCC_LIVE__.runPrivacyAudit()');
  console.log('[OCC Live] Stress test: window.__OCC_LIVE__.stressTest.startScenario(...)');

  return {
    districtLoader,
    districtTransition,
    sharedActivitySystem,
    photoboothRegistry,
    contentPackManager,
    seasonalLayerManager,
    availabilityScheduler,
    performanceProfiler,
    errorRecovery,
    stressTest,
    analytics,
    onboarding,
    accessibility,
    audioMixer,
    runPrivacyAudit: runPrivacyAuditAndLog,
  };
}

/**
 * Update function for Parts 8-12 systems.
 * Call from the main render loop.
 */
export function updateParts8to12(systems: Parts8to12Systems, dt: number): void {
  // Performance profiler frame tracking
  systems.performanceProfiler.beginFrame();

  // Audio mixer fade interpolation
  systems.audioMixer.update(dt);

  // Performance profiler end frame (captures total frame time)
  // Note: call endFrame at the actual end of the render loop in main.ts
}

/**
 * Cleanup function for Parts 8-12 systems.
 * Call on beforeunload.
 */
export function disposeParts8to12(systems: Parts8to12Systems): void {
  systems.analytics.dispose();
  systems.availabilityScheduler.dispose();
  systems.contentPackManager.dispose();
  systems.seasonalLayerManager.dispose();
  systems.districtTransition.dispose();
  systems.sharedActivitySystem.dispose();
  systems.photoboothRegistry.dispose();
  systems.onboarding.dispose();
  systems.accessibility.dispose();
  systems.audioMixer.dispose();
}
