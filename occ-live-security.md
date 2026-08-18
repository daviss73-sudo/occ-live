# OCC Live Security and Deployment Rules

These rules are **mandatory** for all OCC Live development. They cannot be overridden, weakened, or bypassed by any feature request, optimization, or refactoring task.

---

## 1. Safety System Protection

1. Never remove, weaken, bypass, or modify an existing safety, consent, privacy, moderation, or interaction-protection mechanism without explicit approval from the project owner.
2. Never remove or bypass interaction safety checks in order to implement a new feature.
3. Before modifying interaction, networking, avatar, privacy, or moderation code, inspect the existing safety architecture and identify affected safeguards.
4. Every change affecting safety or privacy must include corresponding tests.

## 2. Consent Requirements

5. Physical avatar interactions — including high-fives, daps, frisbee, or any future physical interactions — must require explicit user consent.
6. Consent must never be assumed because two avatars are nearby.
7. A user must always be able to decline, cancel, or disable physical interactions.
8. Consent to one interaction does not imply consent to another interaction.
9. All interactions default to OFF. Players must actively opt in.
10. Consent preferences are session-locked after entry and cannot be changed inside the space.
11. Do not introduce anonymous peer-to-peer interactions that bypass the existing consent system.

## 3. Interaction Safety Layer

12. Every physical/social avatar interaction must pass through the centralized `InteractionConsentManager` (`src/systems/interaction-consent-manager.ts`).
13. Before any two-player physical interaction executes, the system must verify:
    - Does the initiating player consent to THIS specific interaction?
    - Does the receiving player consent to THIS specific interaction?
    - Is this interaction currently enabled in the system?
    - Are both players within appropriate interaction range?
14. Client-side state must never be treated as the sole authority for safety-critical interaction decisions.
15. For networked interactions, the server must validate consent state before relaying interaction execution.

## 4. Personal Space

16. Every avatar has an enforced minimum personal-space boundary that normal movement cannot violate.
17. Personal space is only temporarily suspended during a mutually-consented, server-validated interaction.
18. Completing one interaction does not authorize entry into personal space for another interaction.

## 5. Privacy Requirements

19. Do not intentionally collect IP addresses, names, nicknames, usernames, emails, student IDs, phone numbers, school information, course information, academic information, or social media identities.
20. Do not introduce analytics or tracking systems without explicit project owner approval.
21. Session identifiers must be ephemeral, randomly generated, non-user-facing, non-persistent, and unrelated to student identity.
22. Do not create persistent user profiles, social graphs, friend lists, or message histories.

## 6. Deployment and Code Integrity

23. All production code changes must originate from the Kiro OCC Live development workspace.
24. Do not directly modify production code through GitHub's web editor.
25. Do not deploy changes directly to production from an unreviewed development branch.
26. Before deployment, verify that all OCC Live safety requirements remain intact.
27. Only approved code from the protected GitHub main branch can reach production.
28. Do not create any mechanism that allows production code to bypass the approved GitHub workflow.

## 7. Safety-Critical Files

The following files and systems are safety-critical. Any modification requires safety review:

| File/System | Purpose |
|---|---|
| `src/systems/interaction-consent-manager.ts` | Centralized consent authority |
| `src/systems/consent-screen.ts` | Pre-entry consent collection UI |
| `src/systems/personal-space.ts` | Avatar boundary enforcement |
| `src/systems/physical-interaction-trigger.ts` | Two-player interaction gating |
| `src/types/consent.ts` | Consent type definitions and defaults |
| `src/multiplayer/network-manager.ts` | Network communication (consent relay) |
| `src/avatar/session-manager.ts` | Anonymous session management |
| `server/index.js` | Server-side state relay and validation |
| `.github/workflows/deploy.yml` | Deployment pipeline |
| `.kiro/steering/occ-live-security.md` | This security policy |

## 8. Prohibited Actions

- Do NOT add a "select all" or "consent to everything" shortcut
- Do NOT add hidden keyboard shortcuts, console commands, URL parameters, or client-side state changes that bypass consent
- Do NOT auto-enable new interactions for existing sessions
- Do NOT allow one player's consent to authorize actions on another player
- Do NOT store interaction consent beyond the current session
- Do NOT implement chat, voice, direct messaging, friend requests, or persistent social identity
- Do NOT bypass the `InteractionConsentManager` for any interaction between two players

## 9. When Adding New Interactions

Any new physical or proximity-based interaction added in the future must:

1. Be added to `CONSENT_INTERACTIONS` in `src/types/consent.ts`
2. Default to OFF for all players
3. Appear as a separate consent option on the pre-entry screen
4. Pass through `InteractionConsentManager.checkInteraction()` before execution
5. Include corresponding safety tests
6. Not automatically consent players who previously consented to other interactions
