# OCC Live — Parts 8-12 Architecture & Acceptance Criteria

This steering file documents the systems introduced in Parts 8-12 and their acceptance criteria. It applies alongside `occ-live-security.md` and `photobooth-system.md`.

---

## Architecture Overview

Parts 8-12 are initialized via `src/init-parts-8-12.ts`, which exports:
- `initializeParts8to12(deps)` — wires all new systems using Parts 1-7 references
- `updateParts8to12(systems, dt)` — per-frame update for new systems
- `disposeParts8to12(systems)` — cleanup on session end

All new features are additive — Parts 1-7 remain intact and functional.

---

## Part 8: Districts & World Expansion

### Files
| File | Purpose |
|------|---------|
| `src/types/index.ts` | Extended DistrictConfig, DistrictLightingPreset, DistrictNPCPreset, DistrictAvailability |
| `src/world/district-loader.ts` | Lazy-loads district GLB assets on demand |
| `src/world/district-transition.ts` | Manages seamless transitions between districts |
| `src/config/district-configs.ts` | Full configs for 5 districts (Skyline, Pulse, Arcade, Throwback, Mystique) |
| `src/config/world-config.ts` | Updated district entries (all OPEN, lazyLoad: true) |

### Districts
- **Skyline** — Rooftop lounge, sunset vibes, jazz
- **Pulse** — High-energy nightclub, multiple dance floors
- **Arcade** — Retro gaming, neon, mini-game tables
- **80s/90s Throwback** — Roller rink, retro diner, vintage photobooth
- **Mystique** — Surreal exploration, crystals, floating gardens

### Rules
- Districts are extensions of OCC Live, not separate applications
- Players retain avatar, clothing variation, and anonymous session across transitions
- Only the active district's assets are loaded (lazy loading)
- Players always have a clear route back to Main Union (return portal)
- Districts can be enabled/disabled without rewriting core code
- No identifying information requested or displayed during transitions

### Acceptance Tests
- [ ] All five districts reachable when enabled
- [ ] Return navigation works reliably from every district
- [ ] Avatar and clothing variation persist across transitions
- [ ] Districts can be enabled/disabled via config
- [ ] Anonymous experience maintained (no identity prompts)

---

## Part 9: Social & Community Features

### Files
| File | Purpose |
|------|---------|
| `src/types/avatar.ts` | Expanded EmoteType and SocialAnimation |
| `src/avatar/emote-system.ts` | 12 emotes with keybinds 1-8, runtime registration |
| `src/systems/shared-activity-system.ts` | Multi-player activity framework |
| `src/config/shared-activities.ts` | 19 activity configs across all districts |
| `src/photobooth/photobooth-registry.ts` | Multi-booth management across districts |
| `src/photobooth/photobooth-config.ts` | Main Union + Throwback photobooth configs |

### Emotes (Non-Contact)
wave, dance, cheer, celebrate, clap, thumbsup, laugh, point, shrug, bow, meditate, sit

### Rules
- All emotes are non-contact gestures requiring no text input
- Shared activities require explicit join (never auto-join on proximity)
- Players can always leave activities (freeExit: true)
- Physical contact activities check consent via InteractionConsentManager
- No usernames above avatars; no profiles, friend lists, or identity-based features
- Photobooth rules from `photobooth-system.md` apply to all booths

### Acceptance Tests
- [ ] Multiple players can use non-contact emotes without disrupting movement
- [ ] Multiple players can use compatible activities without state corruption
- [ ] Solo and approved group-photo flows work at all photobooths
- [ ] No identifying information displayed or requested
- [ ] Players can leave social activities reliably

---

## Part 10: Content, Seasonal & Event Management

### Files
| File | Purpose |
|------|---------|
| `src/content/content-pack-manager.ts` | Reusable content pack lifecycle management |
| `src/content/seasonal-layer.ts` | Temporary visual/audio theme overlays |
| `src/content/availability-scheduler.ts` | Unified scheduling for all timed content |
| `src/config/content-packs.ts` | Sample packs (Welcome Week, Study Break, Concert Night) + 4 seasonal layers |

### Content Pack Structure
```
Content Pack
├── Pack ID / Display Name
├── Availability Dates
├── Target Locations
├── Decorations
├── Music Presets
├── Lighting Presets
├── NPC Presets
├── Activities
└── Enabled
```

### Rules
- Content packs layer over base world without permanent alteration
- Removing a pack/layer fully restores original state
- Uses Part 7 event architecture (no second event engine)
- Scheduled content stays in project but is inaccessible until activation date
- Developer preview mode allows testing before release
- No content feature introduces identity collection

### Acceptance Tests
- [ ] Content elements can be enabled/disabled without rewriting core systems
- [ ] Seasonal layers appear and disappear without damaging the base world
- [ ] Content packs can be reused by multiple events
- [ ] Future content can be previewed in dev mode before release
- [ ] No identity collection in any content feature

---

## Part 11: Multiplayer, Performance & Privacy Stress Testing

### Files
| File | Purpose |
|------|---------|
| `src/core/performance-profiler.ts` | FPS/frame time/draw call tracking, load scenarios |
| `src/multiplayer/stress-test.ts` | Player simulation, adaptive sync, spatial culling |
| `src/core/error-recovery.ts` | Categorized error handling, graceful degradation |
| `src/core/privacy-audit.ts` | Automated privacy verification (20 checks) |

### Load Scenarios
1. Solo + NPCs
2. 10 players
3. 25 players
4. 50 players
5. 100 players
6. ~130 players (capacity target)
7. Main Stage crowd (80 players concentrated)
8. All activities simultaneous (50 players)

### Optimization Techniques
- Relevance-based updates (near/far/culled distance tiers)
- Adaptive sync frequency (scales with player count)
- Delta compression for state updates
- NPC population scaling (fewer NPCs at higher player counts)
- Don't sync purely cosmetic effects
- Max concurrent district asset loads limited to 2

### Rules
- Failed asset or animation must not crash the app
- Recoverable network failures must not permanently corrupt player state
- Non-identifying error feedback only
- No identity prompts, Blackboard integration, or IP collection verified
- Analytics do not attach personal identity to metrics
- Developer tools not exposed to normal players
- Analytics are anonymous and aggregate only (see below)

### Anonymous Analytics (`src/core/anonymous-analytics.ts`)
Collects the following aggregate metrics — none tied to individual identity:
- Anonymous session counts (daily/weekly/monthly visitors)
- Session duration
- Peak concurrent users
- Entry/exit times (hour distribution, not per-user)
- Spaces visited (zone counts)
- Time spent per space (averages)
- Activities used (counts)
- Event attendance (counts and duration)
- District transitions (counts)
- Avatar selections (popularity, not who chose what)
- Photobooth usage (solo vs group ratio)
- Lazy River usage (entry counts)
- Technical errors/disconnects (category counts)

Data is flushed as aggregate snapshots — the server stores only totals, never individual session trails.

### Acceptance Tests
- [ ] Application remains usable under all load scenarios (or identifies limit)
- [ ] Simultaneous activity use does not corrupt shared state
- [ ] District transitions remain stable under multiplayer load
- [ ] Event activation/deactivation remains synchronized
- [ ] Recoverable failures do not crash the app
- [ ] Privacy audit passes (no PII collection detected)

---

## Part 12: V1 Polish, Accessibility & Launch Readiness

### Files
| File | Purpose |
|------|---------|
| `src/systems/onboarding-system.ts` | Short, skippable 6-step tutorial |
| `src/systems/accessibility-manager.ts` | Reduced motion, contrast, text scale, volume |
| `src/systems/audio-mixer.ts` | Per-category volume, smooth transitions, ducking |
| `src/init-parts-8-12.ts` | Unified initialization for all Part 8-12 systems |

### Onboarding (6 steps, < 60 seconds)
1. Welcome (no login needed)
2. Movement (WASD, Shift, Space)
3. Camera (right-click drag, scroll)
4. Interactions (E key)
5. Emotes (1-8 keys)
6. Explore (portals, activities)

### Accessibility
- Reduced motion (respects `prefers-reduced-motion`)
- High contrast mode
- Text scaling (0.8x - 2.0x)
- Text alternatives for icon-only prompts
- Disable flashing/strobing
- Per-category volume controls (master, music, effects, ambience)
- Settings panel accessible via keybind or menu

### Audio
- Master + per-category volume
- Smooth crossfades between zones (no sudden changes)
- Event transitions use configurable fade duration/easing
- Music ducking when important effects play
- Audio alone never sole source for critical information

### Rules
- Onboarding does not require completion
- No identifying information requested at any point
- Interaction prompts consistent across all areas
- Activities can always be exited and avatar states reset
- All OCC Live safety, consent, and privacy rules from Parts 1-7 preserved

### Acceptance Tests
- [ ] No critical placeholder, collision, or asset errors remain
- [ ] Core interactions work consistently
- [ ] First-time player can enter and understand basics without personal information
- [ ] Core interface and prompts are readable and understandable
- [ ] Music/environmental audio balanced
- [ ] Anonymous design verified (privacy audit passes)
- [ ] Parts 1-11 remain intact (regression)
- [ ] App can be deployed with production configuration

---

## Development Rule

Move to the next part only after the current part's acceptance tests pass and previously completed systems remain stable.

---

## Key Developer Commands

```
// Access all systems:
window.__OCC_LIVE__

// Accessibility settings panel:
window.__OCC_LIVE__.accessibility.showSettingsPanel()

// Privacy audit:
window.__OCC_LIVE__.runPrivacyAudit()

// Analytics snapshot:
window.__OCC_LIVE__.analytics.getSnapshot()

// Stress test:
window.__OCC_LIVE__.stressTest.startScenario(LOAD_SCENARIOS[5]) // ~130 players

// Content preview:
window.__OCC_LIVE__.availabilityScheduler.enableDevMode()
window.__OCC_LIVE__.availabilityScheduler.startPreview('season_winter_2026', 'seasonal_layer')

// District transition:
window.__OCC_LIVE__.districtTransition.transitionTo(config, sessionId)
window.__OCC_LIVE__.districtTransition.returnToMainUnion(sessionId)
```
