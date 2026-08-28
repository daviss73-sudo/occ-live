// force rebuild 3/**
 * OCC Live - Main Entry Point (Part 5 Updated)
 * Assembles the world framework, initializes all systems including
 * the production avatar library, avatar variation system, temporary
 * outfit system, and Lazy River wetsuit integration.
 *
 * Part 5 additions:
 * - Production avatar library (GLB loading for selected avatar)
 * - Avatar Variation System integrated with multiplayer
 * - Temporary Outfit System wired to Lazy River (wetsuit)
 * - No personal information collected at any point
 */

import * as THREE from 'three';
import { worldConfig } from './config/world-config.ts';
import { defaultAvatarConfig } from './config/avatar-config.ts';
import { avatarAssetManifest } from './config/avatar-config.ts';
import { AssetRegistry } from './core/asset-registry.ts';
import { ZoneManager } from './world/zone-manager.ts';
import { DistrictRegistry } from './world/district-registry.ts';
import { PlayerController } from './systems/player-controller.ts';
import { InteractionSystem } from './systems/interaction-system.ts';
import { NPCSystem } from './systems/npc-system.ts';
import { AudioZoneSystem } from './systems/audio-zone-system.ts';
import { WorldEventSystem } from './systems/world-event-system.ts';
import { WayfindingSystem } from './systems/wayfinding-system.ts';
import { SpawnSystem } from './systems/spawn-system.ts';
import { AvatarAssembler } from './avatar/avatar-assembler.ts';
import { AppearanceManager } from './avatar/appearance-manager.ts';
import { AnimationStateMachine } from './avatar/animation-state-machine.ts';
import { EmoteSystem } from './avatar/emote-system.ts';
import { AvatarAssetRegistry } from './avatar/avatar-asset-registry.ts';
import { SessionManager } from './avatar/session-manager.ts';
import { InteractionController } from './avatar/interaction-controller.ts';
import { multiplayerConfig } from './config/multiplayer-config.ts';
import { NetworkManager } from './multiplayer/network-manager.ts';
import { RemotePlayerManager } from './multiplayer/remote-player-manager.ts';
import { SeatManager } from './multiplayer/seat-manager.ts';
import type { InteractionSyncState } from './types/multiplayer.ts';
import { showConsentScreen } from './systems/consent-screen.ts';
import { InteractionConsentManager } from './systems/interaction-consent-manager.ts';
import { PersonalSpaceSystem } from './systems/personal-space.ts';
import type { ConsentPreferences } from './types/consent.ts';
import { PhysicalInteractionTrigger } from './systems/physical-interaction-trigger.ts';
import { showAvatarSelectionScreen } from './systems/avatar-selection-screen.ts';
import { avatarCatalog } from './config/avatar-catalog.ts';
import { EnergyWheelController } from './systems/energy-wheel-controller.ts';

// ─── Part 5 Imports ──────────────────────────────────────────────────────────

import type { AvatarModelEntry } from './types/pipeline.ts';
import { AvatarLibrary } from './avatar/avatar-library.ts';
import { AvatarVariationSystem } from './systems/avatar-variation-system.ts';
import { TemporaryOutfitSystem } from './systems/temporary-outfit.ts';
import { LazyRiverSystem } from './systems/lazy-river.ts';

// ─── Part 6 Imports ──────────────────────────────────────────────────────────

import { ActivityAreaSystem } from './systems/activity-area-system.ts';
import { MusicSystem } from './systems/music-system.ts';
import { IdleBehaviorSystem } from './systems/idle-behavior-system.ts';
import { BallPitSystem } from './systems/ball-pit-system.ts';
import { SwingSystem } from './systems/swing-system.ts';
import { InformationKiosk, createDefaultKioskConfig } from './systems/information-kiosk.ts';
import { StageEventSystem } from './systems/stage-event-system.ts';
import { MiniGameRegistry } from './systems/mini-game-framework.ts';
import { AmbientWorldMotion } from './systems/ambient-world-motion.ts';
import { activityAreas, npcZoneAttractions, swingConfig, stageConfig, musicPlaylists, ambienceConfigs, musicZoneConfigs } from './config/activity-areas.ts';

// ─── Part 7 Imports ──────────────────────────────────────────────────────────

import { EventManager } from './events/event-manager.ts';
import { EventMusicControllerImpl } from './events/event-music-controller.ts';
import { EventLightingControllerImpl } from './events/event-lighting-controller.ts';
import { EventDecorationSystemImpl } from './events/event-decoration-system.ts';
import { EventNotificationImpl } from './events/event-notification.ts';
import { EventAnalyticsHooksImpl } from './events/event-analytics-hooks.ts';
import { EventSyncSystem } from './events/event-sync.ts';
import { sampleEvents, createPreviewEvent } from './events/event-config.ts';

// ─── Photobooth Imports ──────────────────────────────────────────────────────

import { PhotoboothSession } from './photobooth/photobooth-session.ts';
import { PhotoboothCapture } from './photobooth/photobooth-capture.ts';
import { PhotoboothUI } from './photobooth/photobooth-ui.ts';
import { PhotoboothSync } from './photobooth/photobooth-sync.ts';
import { PhotoboothPoseLibrary } from './photobooth/photobooth-poses.ts';
import { photoboothConfigs } from './photobooth/photobooth-config.ts';

// ─── Entry Flow ──────────────────────────────────────────────────────────────
// Avatar selection → Consent → World initialization
// No personal information is collected at any point.

showAvatarSelectionScreen(avatarCatalog).then((selectedAvatar) => {
  return showConsentScreen().then((chosenPreferences: ConsentPreferences) => {
    initializeWorld(selectedAvatar, chosenPreferences);
  });
});

function initializeWorld(selectedAvatar: AvatarModelEntry, chosenPreferences: ConsentPreferences) {

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
document.getElementById('app')!.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60, window.innerWidth / window.innerHeight, 0.1, 500
);

// ─── Evening Atmosphere (Golden Hour) ────────────────────────────────────────

function setupLighting(): void {
  const sunLight = new THREE.DirectionalLight(0xffd0a0, 2.2);

  sunLight.position.set(-30, 20, -10);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 100;
  sunLight.shadow.camera.left = -50;
  sunLight.shadow.camera.right = 50;
  sunLight.shadow.camera.top = 50;
  sunLight.shadow.camera.bottom = -50;
  scene.add(sunLight);

  const ambientLight = new THREE.AmbientLight(0xfff0e0, 0.9);

  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.6);

  scene.add(hemiLight);

  scene.background = new THREE.Color(0x1a0a2e);
  scene.fog = new THREE.Fog(0x2d1b4e, 60, 150);

  const skyGeo = new THREE.SphereGeometry(200, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x1a0a2e) },
      bottomColor: { value: new THREE.Color(0xff6b35) },
      offset: { value: 20 },
      exponent: { value: 0.4 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);
    // Environment map so PBR materials (avatars) are properly lit
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x404860);
  const envTex = pmrem.fromScene(envScene, 0, 0.1, 100).texture;
  scene.environment = envTex;

}

// ─── Ground Plane ────────────────────────────────────────────────────────────

function createGround(): void {
  const groundGeo = new THREE.PlaneGeometry(120, 120, 20, 20);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x4a7c3f, roughness: 0.9, metalness: 0,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  scene.add(ground);

  const plazaGeo = new THREE.CircleGeometry(12, 32);
  const plazaMat = new THREE.MeshStandardMaterial({
    color: 0x8b7355, roughness: 0.85,
  });
  const plaza = new THREE.Mesh(plazaGeo, plazaMat);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.01;
  plaza.name = 'plaza_ground';
  scene.add(plaza);
}

// ─── System Initialization ───────────────────────────────────────────────────

setupLighting();
createGround();

// Spawn system
const spawnSystem = new SpawnSystem();
spawnSystem.registerAll(worldConfig.spawnPoints);

// Asset registry
const assetRegistry = new AssetRegistry(scene);
assetRegistry.registerAll(worldConfig.assets);
assetRegistry.placeAllPlaceholders();

// Zone manager
const zoneManager = new ZoneManager(scene);
zoneManager.registerAll(worldConfig.zones);

// District registry & portals
const districtRegistry = new DistrictRegistry(scene);
districtRegistry.registerAll(worldConfig.districts);
const portalZones = worldConfig.zones.filter(z => z.type === 'portal');
districtRegistry.createPortalVisuals(portalZones);

// ─── Avatar System (Parts 2 + 5) ────────────────────────────────────────────

// Avatar assembler & appearance (fallback for placeholder mode)
const avatarAssembler = new AvatarAssembler();
const appearanceManager = new AppearanceManager(avatarAssembler, defaultAvatarConfig);

// Part 5: Avatar Library — manages production GLB loading & caching
const avatarLibrary = new AvatarLibrary(avatarCatalog, {
  onAvatarLoaded: (id, _mesh) => {
    console.log(`[AvatarLibrary] Loaded: ${id}`);
  },
  onAvatarError: (id, error) => {
    console.warn(`[AvatarLibrary] Error loading ${id}: ${error}`);
  },
});

// Part 5: Avatar Variation System (transparent clothing-color duplicates)
const avatarVariationSystem = new AvatarVariationSystem();

// Part 5: Temporary Outfit System (wetsuit for Lazy River)
const temporaryOutfitSystem = new TemporaryOutfitSystem();
temporaryOutfitSystem.registerOutfit({
  id: 'wetsuit',
  file: '/assets/avatars/wetsuit/wetsuit.glb',
  activity: 'lazy_river',
  preserveSlots: ['head', 'face', 'hair', 'skin'],
  hideSlots: ['top', 'bottom', 'shoes'],
});

// Build initial avatar mesh (placeholder until GLB loads)
let avatarMesh = appearanceManager.buildAvatar();
appearanceManager.setAvatarGroup(avatarMesh);

// Animation state machine
const animStateMachine = new AnimationStateMachine();
animStateMachine.attach(avatarMesh);

// Emote system
const emoteSystem = new EmoteSystem(animStateMachine);

// Interaction controller (wires E key to avatar animations)
const interactionController = new InteractionController(animStateMachine);

// Avatar asset registry (for slot-based replacement)
const avatarAssetReg = new AvatarAssetRegistry(avatarAssetManifest);

// Session manager (anonymous, ephemeral — no personal info)
const sessionManager = new SessionManager(defaultAvatarConfig);
sessionManager.onPresenceStateChange((state) => {
  console.log(`[OCC Live] Presence: ${state}`);
});

// ─── Consent & Personal Space System ─────────────────────────────────────────

const consentManager = new InteractionConsentManager({
  radius: 1.2,
  pushForce: 0.8,
  interactionOverride: true,
});

const personalSpaceSystem = new PersonalSpaceSystem(
  consentManager.getPersonalSpaceConfig(),
  consentManager
);

const physicalInteractionTrigger = new PhysicalInteractionTrigger(
  consentManager,
  personalSpaceSystem,
  {
    onPermitted: (interaction, targetSessionId) => {
      console.log(`[OCC Live] Physical interaction permitted: ${interaction} with ${targetSessionId.slice(0, 8)}...`);
      showNotification(`${interaction.replace('_', ' ')} started!`);
    },
    onDenied: (_interaction, reason) => {
      showNotification(reason);
    },
    onComplete: (interaction, _targetSessionId) => {
      console.log(`[OCC Live] Physical interaction completed: ${interaction}`);
    },
  }
);

// ─── Player Controller (with avatar) ────────────────────────────────────────

const defaultSpawn = spawnSystem.getDefaultSpawn();
const spawnPos = defaultSpawn?.position ?? [0, 0, 5];
const playerController = new PlayerController(
  scene,
  camera,
  worldConfig.player,
  worldConfig.camera,
  spawnPos,
  avatarMesh
);
playerController.setPersonalSpaceSystem(personalSpaceSystem);
playerController.setMobilityType(selectedAvatar.mobility);

// Wire interaction controller prompt to interaction system
const interactionSystem = new InteractionSystem(scene);
interactionSystem.registerAll(worldConfig.interactions);
interactionController.onPromptUpdate((prompt) => {
  interactionSystem.setPromptOverride(prompt);
});
interactionSystem.onInteraction((interaction) => {
  if (interaction.interactionType === 'portal') {
    const zone = worldConfig.zones.find(z => z.id === interaction.zoneId);
    if (zone?.districtId) {
      const result = districtRegistry.attemptEntry(zone.districtId);
      showNotification(result.message);
    }
    return;
  }

  const result = interactionController.handleInteraction(interaction);
  sessionManager.recordInteracting();

  if (!result.animationAvailable && result.executed) {
    console.log(`[OCC Live] ${result.message}`);
  } else if (result.executed) {
    console.log(`[OCC Live] ${result.message}`);
  }
});

// NPC system
const npcSystem = new NPCSystem(scene);
npcSystem.registerAll(worldConfig.npcs, worldConfig.npcPopulation);

// Audio zone system
const audioZoneSystem = new AudioZoneSystem();
audioZoneSystem.registerAll(worldConfig.audioZones);
audioZoneSystem.onActiveZoneChange((zone) => {
  if (zone) {
    console.log(`[OCC Live] Audio zone: ${zone.id} (${zone.playlist ?? zone.ambience ?? 'silent'})`);
  }
});

// World event system
const worldEventSystem = new WorldEventSystem(worldConfig.state);

// Wayfinding system
const wayfindingSystem = new WayfindingSystem(scene);
wayfindingSystem.registerAll(worldConfig.wayfinding);
wayfindingSystem.createPlaceholderSign([-10, 0, 10], [0, 0.3, 0]);

// ─── Part 5: Load Production Avatar GLB ─────────────────────────────────────
// Load the player's selected avatar GLB asynchronously.
// The placeholder mesh is used until the production model is ready.

avatarLibrary.loadAvatar(selectedAvatar.id).then((result) => {
  if (result.state === 'loaded' && result.mesh) {
    // Replace placeholder with production GLB
    avatarMesh = result.mesh;
    playerController.setAvatarMesh(avatarMesh);
    appearanceManager.setAvatarGroup(avatarMesh);
    animStateMachine.attach(avatarMesh);

           // Brighten avatar materials (fix dark imports) — apply to the RENDERED mesh
    const renderedAvatar = playerController.getMesh();
    renderedAvatar.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          if (mat.metalness !== undefined) mat.metalness = 0;
          if (mat.roughness !== undefined) mat.roughness = 0.9;
          if (mat.emissive) { mat.emissive.set(0x555555); mat.emissiveIntensity = 1.0; }
          mat.needsUpdate = true;
        }
      }
    });
    // Register with AVS (after multiplayer assigns session ID)

    const sessionId = networkManager.getSessionId();

    if (sessionId) {
      const variation = avatarVariationSystem.registerPlayer(sessionId, selectedAvatar.id);
      if (variation) {
        avatarVariationSystem.applyVariationToMesh(sessionId, avatarMesh);
        console.log(`[AVS] Variation applied: top=0x${variation.topColor.toString(16)}, bottom=0x${variation.bottomColor.toString(16)}`);
      }
    }

    // Check animation compatibility (graceful — never blocks)
    const compat = avatarLibrary.checkAnimationCompatibility(selectedAvatar.id);
    if (compat.warnings.length > 0) {
      compat.warnings.forEach(w => console.warn(`[Animation] ${w}`));
    }

    console.log(`[OCC Live] Production avatar loaded: ${selectedAvatar.id}`);
  } else {
    console.warn(`[OCC Live] Failed to load avatar GLB, using placeholder: ${result.error}`);
  }
});

// ─── Part 5: Lazy River + Wetsuit Integration ────────────────────────────────

// Lazy River config (using world config if available, otherwise defaults)
const lazyRiverConfig = (worldConfig as any).lazyRiver ?? {
  segments: [],
  waypoints: [[0, 0, -20], [10, 0, -20], [10, 0, -30], [0, 0, -30]],
  loop: true,
  floatSpeed: 2.0,
  width: 4,
  entryPoints: [[0, 0, -18]],
  exitPoints: [[0, 0, -18]],
  audioZone: 'lazy_river_audio',
  wetsuitAsset: '/assets/avatars/wetsuit/wetsuit.glb',
};

const lazyRiverSystem = new LazyRiverSystem(scene, lazyRiverConfig);
lazyRiverSystem.placePlaceholders();

// Wire wetsuit outfit to Lazy River entry/exit
temporaryOutfitSystem.setOnOutfitChange((state) => {
  // Sync outfit state to other players via network
  if (networkManager.isConnected()) {
    // Activity state is sent with position updates
    console.log(`[Outfit] Sync: ${state.sessionId} ${state.isActive ? 'wearing' : 'removed'} ${state.outfitId}`);
  }
});

/** Enter the Lazy River: apply wetsuit, start floating */
async function enterLazyRiver(): Promise<void> {
  const sessionId = networkManager.getSessionId();
  if (!sessionId) return;
  if (lazyRiverSystem.isFloating(sessionId)) return;

  // Get current AVS colors (to preserve during wetsuit)
  const avsColors = avatarVariationSystem.getColors(sessionId);

  // Apply wetsuit
  const applied = await temporaryOutfitSystem.applyOutfit(
    'wetsuit',
    avatarMesh,
    sessionId,
    selectedAvatar.id,
    avsColors
  );

  if (applied) {
    // Enter the river (start floating)
    lazyRiverSystem.enterRiver(sessionId, avatarMesh);
    showNotification('Entering Lazy River');
    console.log(`[LazyRiver] Player entered. Wetsuit applied.`);
  }
}

/** Exit the Lazy River: remove wetsuit, restore original outfit */
function exitLazyRiver(): void {
  const sessionId = networkManager.getSessionId();
  if (!sessionId) return;
  if (!lazyRiverSystem.isFloating(sessionId)) return;

  // Exit river (stop floating)
  lazyRiverSystem.exitRiver(sessionId);

  // Remove wetsuit and restore original appearance
  const removed = temporaryOutfitSystem.removeOutfit(sessionId);
  if (removed) {
    // Re-apply AVS variation if the player had one
    if (temporaryOutfitSystem.hadVariation(sessionId) === false && avatarVariationSystem.hasVariation(sessionId)) {
      // Variation was active before wetsuit — re-apply to mesh
      avatarVariationSystem.applyVariationToMesh(sessionId, avatarMesh);
    }
    showNotification('Exiting Lazy River');
    console.log(`[LazyRiver] Player exited. Original outfit restored.`);
  }
}

// Lazy River exit callback
lazyRiverSystem.onExit((sessionId) => {
  if (sessionId === networkManager.getSessionId()) {
    temporaryOutfitSystem.removeOutfit(sessionId);
    if (avatarVariationSystem.hasVariation(sessionId)) {
      avatarVariationSystem.applyVariationToMesh(sessionId, avatarMesh);
    }
  }
});

// ─── Part 6: Social & Activity Systems ───────────────────────────────────────

// Activity Area System — manages all Main Union activity zones
const activityAreaSystem = new ActivityAreaSystem();
activityAreaSystem.registerAll(activityAreas);
activityAreaSystem.onTransition((event) => {
  console.log(`[Activity] ${event.sessionId.slice(0, 8)} ${event.type} ${event.areaId}`);
});

// Music System — continuous 24/7 spatial music
const musicSystem = new MusicSystem();
musicSystem.registerPlaylists(musicPlaylists);
musicSystem.registerAmbiences(ambienceConfigs);
musicSystem.registerZones(musicZoneConfigs);

// Idle Behavior System — prevents frozen avatars when sitting/stationary
const idleBehaviorSystem = new IdleBehaviorSystem();
idleBehaviorSystem.registerAvatar('local', avatarMesh);

// Ball Pit System
const ballPitSystem = new BallPitSystem(scene);
ballPitSystem.initialize();

// Swing System
const swingSystem = new SwingSystem(scene, swingConfig);

// Information Kiosk
const kioskConfig = createDefaultKioskConfig();
const informationKiosk = new InformationKiosk(kioskConfig);
informationKiosk.setOnClose(() => {
  console.log('[Kiosk] Closed');
});

// Stage Event System
const stageEventSystem = new StageEventSystem(scene, stageConfig);
stageEventSystem.setOnStateChange((state, event) => {
  console.log(`[Stage] State: ${state}${event ? ` (${event.name})` : ''}`);
  // Notify NPC system about stage events
  npcSystem.setStageEventActive(state === 'active' || state === 'warmup');
});

// Mini-Game Registry (framework ready, no games implemented in Part 6)
const miniGameRegistry = new MiniGameRegistry();

// Ambient World Motion — environmental animations
const ambientWorldMotion = new AmbientWorldMotion(scene);
ambientWorldMotion.initialize();

// Register NPC zone attractions for dynamic distribution
npcSystem.registerZoneAttractions(npcZoneAttractions);

// Wire info kiosk interaction
interactionSystem.onInteraction((interaction) => {
  if (interaction.id === 'info_kiosk') {
    informationKiosk.open();
  }
});

// Wire ball pit interaction
interactionSystem.onInteraction((interaction) => {
  if (interaction.id === 'ball_pit_enter') {
    const sessionId = networkManager.getSessionId();
    if (sessionId && !ballPitSystem.isInPit(sessionId)) {
      ballPitSystem.enterPit(sessionId);
      showNotification('Jumped in!');
    }
  }
  if (interaction.id === 'ball_pit_exit') {
    const sessionId = networkManager.getSessionId();
    if (sessionId && ballPitSystem.isInPit(sessionId)) {
      ballPitSystem.exitPit(sessionId);
      showNotification('Climbed out');
    }
  }
});

// Wire swing interaction
interactionSystem.onInteraction((interaction) => {
  if (interaction.interactionType === 'swing') {
    const sessionId = networkManager.getSessionId();
    if (!sessionId) return;
    if (swingSystem.isPlayerOnSwing(sessionId)) {
      swingSystem.exitSwing(sessionId);
    } else {
      const swingId = swingSystem.sitOnSwing(sessionId, interaction.id);
      if (swingId) {
        showNotification('Swinging!');
      } else {
        showNotification('All swings are occupied');
      }
    }
  }
});

// ─── Part 7: Event & Programming System ──────────────────────────────────────

// Event Manager — central event orchestration
const eventManager = new EventManager();

// Event sub-system controllers
const eventMusicController = new EventMusicControllerImpl(musicSystem);
const eventLightingController = new EventLightingControllerImpl(scene);
const eventDecorationSystem = new EventDecorationSystemImpl(scene);
const eventNotification = new EventNotificationImpl(informationKiosk);
const eventAnalytics = new EventAnalyticsHooksImpl();
const eventSyncSystem = new EventSyncSystem(eventManager);

// Wire controllers to event manager
eventManager.wireControllers({
  music: eventMusicController,
  lighting: eventLightingController,
  decorations: eventDecorationSystem,
  notifications: eventNotification,
  analytics: eventAnalytics,
  npcs: {
    applyEventBehavior: (config) => {
      npcSystem.setCustomDensity(config.npcs.densityMultiplier);
      npcSystem.setStageEventActive(config.npcs.stageAttraction > 0);
    },
    restoreNormalBehavior: () => {
      npcSystem.setDensityLevel('medium');
      npcSystem.setStageEventActive(false);
    },
  },
  stage: {
    setStageMode: (mode) => {
      if (mode === 'inactive') {
        stageEventSystem.endEvent();
      } else {
        stageEventSystem.forceState(mode === 'dj' ? 'active' : 'active');
      }
    },
    getStageMode: () => stageEventSystem.getState() === 'active' ? 'active' : 'inactive',
  },
  activities: {
    applyOverrides: (config) => {
      for (const override of config.activityOverrides) {
        if (override.enabled === false) {
          activityAreaSystem.setAreaState(override.areaId, 'closed');
        } else if (override.enabled === true) {
          activityAreaSystem.setAreaState(override.areaId, 'open');
        }
      }
    },
    removeOverrides: () => {
      activityAreaSystem.resetAll();
    },
  },
});

// Initialize event system with sample events
eventManager.initialize(sampleEvents);

// Event sync broadcasts (wired to network when available)
eventSyncSystem.setOnBroadcast((message) => {
  console.log(`[EventSync] Broadcast: ${message.state.state} (${message.state.eventName ?? 'none'})`);
});

// ─── Photobooth System ───────────────────────────────────────────────────────

const photoboothPoseLibrary = new PhotoboothPoseLibrary();
const photoboothSessions: Map<string, PhotoboothSession> = new Map();
const photoboothUIs: Map<string, PhotoboothUI> = new Map();
const photoboothCaptures: Map<string, PhotoboothCapture> = new Map();
const photoboothSyncs: Map<string, PhotoboothSync> = new Map();

// Initialize a session for each registered photobooth
for (const pbConfig of photoboothConfigs) {
  const session = new PhotoboothSession(pbConfig);
  const ui = new PhotoboothUI();
  const capture = new PhotoboothCapture(pbConfig);
  const sync = new PhotoboothSync(session, pbConfig.id);

  photoboothSessions.set(pbConfig.id, session);
  photoboothUIs.set(pbConfig.id, ui);
  photoboothCaptures.set(pbConfig.id, capture);
  photoboothSyncs.set(pbConfig.id, sync);
}

// Wire photobooth interactions (player presses E near photobooth)
interactionSystem.onInteraction((interaction) => {
  if (interaction.id === 'photobooth_main') {
    const sessionId = networkManager.getSessionId();
    if (!sessionId) return;
    const pbSession = photoboothSessions.get('main_union_photobooth');
    const pbUI = photoboothUIs.get('main_union_photobooth');
    if (!pbSession || !pbUI) return;

    // Join queue (requires photography consent)
    const position = pbSession.joinQueue(sessionId, true);
    if (position !== null) {
      const msg = pbSession.getQueue().getPositionMessage(sessionId);
      if (msg) pbUI.showQueuePosition(msg);
    }
  }
});

// ─── Multiplayer System (Parts 3 + 5) ───────────────────────────────────────

const seatManager = new SeatManager();
const remotePlayerManager = new RemotePlayerManager(scene, avatarAssembler, multiplayerConfig);
remotePlayerManager.setPersonalSpaceSystem(personalSpaceSystem);

const networkManager = new NetworkManager(multiplayerConfig, {
  onConnected: (sessionId, players, seats) => {
    console.log(`[Multiplayer] Connected. Session: ${sessionId.slice(0, 8)}... Players online: ${players.length + 1}`);
    seatManager.setLocalSession(sessionId);
    seatManager.updateAll(seats);

    // Part 5: Register local player with AVS
    const variation = avatarVariationSystem.registerPlayer(sessionId, selectedAvatar.id);
    if (variation && avatarMesh) {
      avatarVariationSystem.applyVariationToMesh(sessionId, avatarMesh);
      console.log(`[AVS] Local variation applied on connect`);
    }

    // Add existing remote players
    for (const p of players) {
      remotePlayerManager.addPlayer(p);
      if (p.consentPreferences) {
        consentManager.setRemotePlayerConsent(p.sessionId, p.consentPreferences);
      }
      // Part 5: Register remote players with AVS
      // (avatarConfig contains avatar info; use the id field if available)
      const remoteAvatarId = (p as any).avatarId ?? selectedAvatar.id;
      avatarVariationSystem.registerPlayer(p.sessionId, remoteAvatarId);
    }

    npcSystem.setPlayerCount(1 + players.length);
  },

  onPlayerJoined: (player) => {
    remotePlayerManager.addPlayer(player);
    if (player.consentPreferences) {
      consentManager.setRemotePlayerConsent(player.sessionId, player.consentPreferences);
    }

    // Part 5: Register new remote player with AVS
    const remoteAvatarId = (player as any).avatarId ?? 'avatar_001';
    avatarVariationSystem.registerPlayer(player.sessionId, remoteAvatarId);

    npcSystem.setPlayerCount(1 + remotePlayerManager.getPlayerCount());
    console.log(`[Multiplayer] Player joined (${remotePlayerManager.getPlayerCount() + 1} online)`);
  },

  onPlayerLeft: (sessionId) => {
    remotePlayerManager.removePlayer(sessionId);
    consentManager.removeRemotePlayer(sessionId);

    // Part 5: Remove from AVS
    avatarVariationSystem.removePlayer(sessionId);

    npcSystem.setPlayerCount(1 + remotePlayerManager.getPlayerCount());
    console.log(`[Multiplayer] Player left (${remotePlayerManager.getPlayerCount() + 1} online)`);
  },

  onPlayerState: (sessionId, position, rotation, animationState, interactionState, _activityState) => {
    remotePlayerManager.updatePlayerState(sessionId, position, rotation, animationState, interactionState);
  },

  onWorldState: (players, seats, playerCount) => {
    const localId = networkManager.getSessionId();
    const remotePlayers = players.filter(p => p.sessionId !== localId);
    remotePlayerManager.syncWorldState(remotePlayers);
    seatManager.updateAll(seats);
    npcSystem.setPlayerCount(playerCount);
  },

  onSeatUpdate: (seat) => {
    seatManager.updateSeat(seat);
  },

  onDisconnected: () => {
    console.log('[Multiplayer] Disconnected from server');
    remotePlayerManager.dispose();
  },

  onError: (message) => {
    console.warn(`[Multiplayer] Error: ${message}`);
  },
});

// Connect to multiplayer server and join
consentManager.setAllPreferences(chosenPreferences);
consentManager.lockPreferences();

networkManager.connect();
networkManager.join(
  { ...defaultAvatarConfig, mobility: selectedAvatar.mobility },
  chosenPreferences,
  spawnPos as [number, number, number]
);

console.log(`[OCC Live] Avatar: ${selectedAvatar.id}, Consent locked. Entering Main Union.`);
  // ─── Energy Wheel ────────────────────────────────────────────────────────────
const energyWheel = new EnergyWheelController(scene);
energyWheel.setCallbacks({
  getPlayerPosition: () => playerController.getPosition(),
  getSessionId: () => networkManager.getSessionId(),
  broadcastReaction: (msg) => {
    console.log('[EnergyWheel] Reaction: ' + msg.reactionId);
  },
  getCurrentZone: () => {
    const zone = zoneManager.getPrimaryZone(playerController.getPosition());
    return zone?.config.id ?? null;
  },
});

// ─── HUD / UI ────────────────────────────────────────────────────────────────

function createHUD(): void {
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.innerHTML = `
    <div id="hud-title">OCC Live — Main Union</div>
    <div id="hud-zone">Main Plaza</div>
    <div id="hud-anim">idle</div>
    <div id="hud-multiplayer">Connecting...</div>
    <div id="hud-controls">
      <span>WASD: Move</span> · <span>Shift: Run</span> · <span>Space: Jump</span> · <span>Right-click drag: Camera</span> · <span>Scroll: Zoom</span> · <span>E: Interact</span> · <span>1: Wave</span> · <span>2: Dance</span>
    </div>
  `;
  hud.style.cssText = `
    position: fixed;
    top: 16px;
    left: 16px;
    color: #ffffff;
    font-family: sans-serif;
    pointer-events: none;
    z-index: 100;
  `;

  const titleStyle = 'font-size: 20px; font-weight: bold; margin-bottom: 4px; text-shadow: 0 1px 3px rgba(0,0,0,0.8);';
  const zoneStyle = 'font-size: 14px; opacity: 0.8; margin-bottom: 4px; text-shadow: 0 1px 2px rgba(0,0,0,0.6);';
  const animStyle = 'font-size: 12px; opacity: 0.6; margin-bottom: 8px; text-shadow: 0 1px 2px rgba(0,0,0,0.6);';
  const controlsStyle = 'font-size: 12px; opacity: 0.6; text-shadow: 0 1px 2px rgba(0,0,0,0.6);';

  hud.querySelector('#hud-title')!.setAttribute('style', titleStyle);
  hud.querySelector('#hud-zone')!.setAttribute('style', zoneStyle);
  hud.querySelector('#hud-anim')!.setAttribute('style', animStyle);
  hud.querySelector('#hud-controls')!.setAttribute('style', controlsStyle);

  document.body.appendChild(hud);
}

createHUD();

// Notification system
function showNotification(message: string): void {
  const existing = document.getElementById('notification');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'notification';
  el.textContent = message;
  el.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.85);
    color: #ffffff;
    padding: 16px 32px;
    border-radius: 12px;
    font-family: sans-serif;
    font-size: 18px;
    z-index: 200;
    pointer-events: none;
    border: 1px solid rgba(255, 255, 255, 0.2);
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ─── Physical Interaction Keybind (F key) ────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 'f') return;
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

  const localPos = playerController.getPosition();
  const closest = personalSpaceSystem.getClosestRemote(localPos);
  if (!closest) return;

  const available = physicalInteractionTrigger.getAvailableInteractions(closest.sessionId);
  if (available.length === 0) {
    showNotification('No mutual interactions available with this player.');
    return;
  }

  physicalInteractionTrigger.requestInteraction({
    interaction: available[0],
    targetSessionId: closest.sessionId,
    localPosition: localPos,
    targetPosition: new THREE.Vector3(localPos.x + closest.distance * 0.5, localPos.y, localPos.z),
  });
});

// ─── Part 5: Lazy River Interaction Keybind (R key) ──────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 'r') return;
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

  const sessionId = networkManager.getSessionId();
  if (!sessionId) return;

  if (lazyRiverSystem.isFloating(sessionId)) {
    exitLazyRiver();
  } else {
    // Check if player is near a river entry point
    const playerPos = playerController.getPosition();
    const entryPoints = lazyRiverSystem.getEntryPoints();
    const nearEntry = entryPoints.some(ep => {
      const dist = Math.sqrt(
        (playerPos.x - ep[0]) ** 2 +
        (playerPos.z - ep[2]) ** 2
      );
      return dist < 5.0; // Within 5 units of entry
    });

    if (nearEntry) {
      enterLazyRiver();
    }
  }
});

// ─── Render Loop ─────────────────────────────────────────────────────────────

let lastTime = performance.now();
let presenceCheckTimer = 0;
const hudZoneEl = document.getElementById('hud-zone');
const hudAnimEl = document.getElementById('hud-anim');
const hudMultiplayerEl = document.getElementById('hud-multiplayer');

function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  // Update player controller
  playerController.update(dt);

  // Update animation state machine from movement
  const movementState = playerController.getMovementState();

  // If player starts moving while in a toggle interaction, exit it
  if (movementState.isMoving && interactionController.isInToggleState()) {
    interactionController.forceExit();
  }

  animStateMachine.update(dt, movementState);

  // Update presence based on movement
  if (movementState.isMoving) {
    sessionManager.recordMoving();
  }

  // ─── Part 5: Update Lazy River ─────────────────────────────────────────
  lazyRiverSystem.update(dt);

  // ─── Part 6: Update Social & Activity Systems ──────────────────────────
  const playerPos6 = playerController.getPosition();

  // Activity area tracking
  activityAreaSystem.updatePlayerPosition(
    networkManager.getSessionId() ?? 'local',
    playerPos6
  );

  // Music system spatial update
  musicSystem.updatePlayerPosition(playerPos6);

  // Idle behavior (notifies if player is moving)
  if (movementState.isMoving) {
    idleBehaviorSystem.notifyMoving('local');
  }
  idleBehaviorSystem.update(dt);

  // Ball pit physics
  ballPitSystem.update(dt);
  const localSession = networkManager.getSessionId();
  if (localSession && ballPitSystem.isInPit(localSession)) {
    ballPitSystem.updatePlayerPosition(localSession, playerPos6);
  }

  // Swing animation
  swingSystem.update(dt);

  // Stage event system
  stageEventSystem.update(dt);

  // Ambient world motion
  ambientWorldMotion.update(dt);

  // Mini-game registry
  miniGameRegistry.update(dt);
    // Energy Wheel reactions
  energyWheel.update(dt);

  // ─── Part 7: Update Event System ───────────────────────────────────────
  eventManager.update(dt);
  eventLightingController.update(dt);
  eventDecorationSystem.update(dt);

  // Periodic event sync broadcast (every 5 seconds)
  if (presenceCheckTimer >= 5) {
    eventSyncSystem.checkAndBroadcast();
  }

  // ─── Multiplayer: Send local state ─────────────────────────────────────
  if (networkManager.isConnected()) {
    const pos = playerController.getPosition();
    const mesh = playerController.getMesh();
    const currentAnimState = animStateMachine.getState();

    // Build interaction sync state
    let interactionSync: InteractionSyncState | null = null;
    if (interactionController.isInToggleState()) {
      const toggle = interactionController.getActiveToggle();
      if (toggle) {
        interactionSync = {
          interactionType: toggle,
          zoneId: '',
          isActive: true,
          props: toggle === 'roast_marshmallow' ? ['roasting_stick'] : [],
        };
      }
    }

    // Include lazy river floating state
    const sessionId = networkManager.getSessionId();
    if (sessionId && lazyRiverSystem.isFloating(sessionId)) {
      interactionSync = {
        interactionType: 'float',
        zoneId: 'lazy_river',
        isActive: true,
        props: [],
      };
    }

    networkManager.sendStateUpdate(
      [pos.x, pos.y, pos.z],
      [0, mesh.rotation.y, 0],
      currentAnimState as any,
      interactionSync
    );
  }

  // ─── Multiplayer: Update remote players ────────────────────────────────
  remotePlayerManager.update(dt);

  // Periodic presence timer check (every 5 seconds)
  presenceCheckTimer += dt;
  if (presenceCheckTimer >= 5) {
    presenceCheckTimer = 0;
    sessionManager.updatePresenceTimers();
  }

  // Update other systems
  const playerPos = playerController.getPosition();
  interactionSystem.update(playerPos);
  npcSystem.update(dt);
  audioZoneSystem.update(playerPos);

  // Update zone display in HUD
  const currentZone = zoneManager.getPrimaryZone(playerPos);
  if (hudZoneEl && currentZone) {
    hudZoneEl.textContent = currentZone.config.displayName;
    sessionManager.setCurrentZone(currentZone.config.id);
  }

  // Update animation state in HUD
  if (hudAnimEl) {
    hudAnimEl.textContent = `Animation: ${animStateMachine.getState()}`;
  }

  // Update multiplayer status in HUD
  if (hudMultiplayerEl) {
    const status = networkManager.getStatus();
    const count = 1 + remotePlayerManager.getPlayerCount();
    if (status === 'connected' && networkManager.isConnected()) {
      hudMultiplayerEl.textContent = `People here: ${count}`;
    } else {
      hudMultiplayerEl.textContent = status === 'disconnected' ? 'Offline (solo)' : 'Connecting...';
    }
  }

  renderer.render(scene, camera);
}

animate();

// ─── Resize Handler ──────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Session Cleanup ─────────────────────────────────────────────────────────

window.addEventListener('beforeunload', () => {
  networkManager.disconnect();
  sessionManager.endSession();
  avatarVariationSystem.clear();
  temporaryOutfitSystem.removeAll();
  musicSystem.dispose();
  eventManager.dispose();
});

// ─── Debug Exports ───────────────────────────────────────────────────────────

(window as any).__OCC_LIVE__ = {
  scene,
  camera,
  worldConfig,
  assetRegistry,
  zoneManager,
  districtRegistry,
  playerController,
  interactionSystem,
  npcSystem,
  audioZoneSystem,
  worldEventSystem,
  wayfindingSystem,
  spawnSystem,
  // Part 2 systems
  avatarAssembler,
  appearanceManager,
  animStateMachine,
  emoteSystem,
  interactionController,
  avatarAssetReg,
  sessionManager,
  // Part 3 systems
  networkManager,
  remotePlayerManager,
  seatManager,
  // Consent & Personal Space
  consentManager,
  personalSpaceSystem,
  physicalInteractionTrigger,
  showNotification,
  // Part 5 systems
  avatarLibrary,
  avatarVariationSystem,
  temporaryOutfitSystem,
  lazyRiverSystem,
  avatarCatalog,
  selectedAvatar,
  // Part 5 actions
  enterLazyRiver,
  exitLazyRiver,
  // Part 6 systems
  activityAreaSystem,
  musicSystem,
  idleBehaviorSystem,
  ballPitSystem,
  swingSystem,
  informationKiosk,
  stageEventSystem,
  miniGameRegistry,
  ambientWorldMotion,
  // Part 7 systems
  eventManager,
  eventMusicController,
  eventLightingController,
  eventDecorationSystem,
  eventNotification,
  eventAnalytics,
  eventSyncSystem,
  createPreviewEvent,
  // Photobooth system
  photoboothSessions,
  photoboothPoseLibrary,
    photoboothUIs,
  // Energy Wheel
  energyWheel,
};

console.log('[OCC Live] Main Union loaded. Part 7: Event & Programming System active.');
console.log('[OCC Live] Controls: 1=Wave, 2=Dance, WASD=Move, Shift=Run, Space=Jump, R=Lazy River, E=Interact');
console.log('[OCC Live] The Main Union is always open. Events layer over without interruption.');
console.log('[OCC Live] To test multiplayer: run "node server/index.js" then open two browser tabs');
console.log('[OCC Live] Preview events: window.__OCC_LIVE__.eventManager.previewEvent("test_spring_kickoff_2026")');
console.log('[OCC Live] Access debug API via window.__OCC_LIVE__');
console.log(`[OCC Live] Avatar Library: ${avatarCatalog.length} avatars | Events: ${sampleEvents.length} configured`);

} // end initializeWorld



