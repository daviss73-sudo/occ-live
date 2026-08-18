---
inclusion: fileMatch
fileMatchPattern: "**/photobooth*"
---

# OCC Live Photobooth — Queue, Solo/Group Selection & Invitation System

These rules apply to **all photobooths** in OCC Live. They are mandatory and cannot be weakened, bypassed, or overridden by any feature request or optimization.

---

## 1. Core Design Principle

No player is automatically included in another player's photograph.

Three distinct states exist:

1. **Waiting** for the photobooth (in queue)
2. **Taking a solo photograph**
3. **Invited to participate** in a group photograph

Being in the queue does NOT mean the player has agreed to appear in someone else's photo.  
Being inside or near the photobooth does NOT mean the player has agreed to appear in someone else's photo.  
Players must actively choose to participate.

---

## 2. Queue Rules

- Players join a FIFO queue when they choose to use a photobooth.
- Display queue position to the player (avatar-only, no names or identifying info about others).
- Queue updates automatically as players enter and leave.
- The queue determines who gets **first choice**, not who automatically appears in the photo.
- Declining a group invitation does NOT remove a player from the queue or change their position.
- Leaving the photobooth releases the player's position.
- Configurable max queue length (default: 10).

---

## 3. Front Player Choice

When a player reaches the front, present two options — do NOT immediately start the camera:

- **Just Me** — solo photo, no invitations sent.
- **Invite Others** — send individual invitations to eligible waiting players.

The player must actively select one. Never assume "group" by default.

---

## 4. Solo Photo

- Begin individual photobooth experience.
- Do NOT invite or allow waiting players into the photo.
- Remove the solo photographer from the queue; next player remains.
- After capture, the photobooth becomes available to the next player.

---

## 5. Group Invitation

When the front player selects "Invite Others":

- Do NOT automatically add everyone waiting.
- Send individual notifications to each eligible waiting player.
- Each invited player independently chooses **Join Photo** or **Stay in Line**.
- Only players with photography consent are eligible for invitation.

---

## 6. Invitation Responses

- **Join Photo** — move player from queue to participants list.
- **Stay in Line** — player declines; they keep their original queue position unchanged.
- Declining does NOT penalize the player or remove them from the queue.
- A player who declines does not receive another invitation for the same photo session.

---

## 7. Invitation Timeout

- Configurable response window (default: 15 seconds).
- If a player does not respond, treat as declined — keep them in queue, do not include them.
- Display remaining time clearly without pressuring beyond indicating expiration.

---

## 8. Group Capacity

- Configurable maximum (default: 6 avatars, constant `PHOTOBOOTH_MAX_AVATARS` or `maxGroupSize`).
- Once capacity is reached, stop accepting additional participants.
- Display "This photo is full!" to remaining players.
- Players who remain in the queue retain their position.

---

## 9. First Player Role

The first player controls whether the photo is solo or open to group. However, once others accept:

- All participants have equal rights within the group-photo experience.
- The first player does NOT gain permission to:
  - Physically interact with another avatar
  - Force another avatar into a pose
  - Override another player's consent settings
  - Choose an unapproved pose
  - Manipulate another player's avatar outside the approved system

---

## 10. Photography Consent

- Photography consent (from the pre-entry consent screen) is **mandatory** before participating.
- A player who has not consented to photography cannot join a group photo.
- Do NOT reveal another player's consent status. Use a generic message: "This player isn't available for this photo."
- Photography consent and group-invitation acceptance are **separate concepts**:
  - Consenting to photography does not auto-accept a specific invitation.
  - Declining an invitation does not revoke photography consent.

---

## 11. Physical-Contact Consent Remains Separate

- Group-photo participation does NOT grant permission for any physical interaction (hugs, high-fives, daps, handshakes, shoulder touching, dancing/contact, frisbee/contact, etc.).
- Poses requiring physical contact must verify the appropriate consent via `InteractionConsentManager` before becoming available.
- All interactions must pass through the centralized consent system per `occ-live-security.md`.

---

## 12. Pre-Approved Pose System

- Only pre-approved OCC Live poses are available. No unrestricted body-position manipulation.
- Poses adapt to group size (min/max participants).
- Poses requiring physical contact are restricted based on participant consent states.
- Players cannot force another avatar into a pose.
- Preview before activation when applicable.

---

## 13. Pose Slots

Each group pose contains predefined slots defining:
- Position, rotation, animation, scale/depth
- Facial expression (if supported)
- Whether physical contact occurs
- Which other slots have contact

No participant can manually force another avatar into a slot or pose.

---

## 14. Countdown Lock

Once the countdown begins:
- Lock the participant list (no new players can enter).
- Prevent non-participants from entering the active photo area.
- Prevent participants from leaving until capture completes or countdown is canceled.
- After capture: unlock, restore normal movement.

---

## 15. Post-Photo Flow

- After the session ends, the next player in queue becomes the primary user.
- That player receives their own solo/group choice. The cycle repeats.
- All participants can independently preview and download the photo.

---

## 16. Privacy Requirements

Photographs must:
- Be processed locally (canvas `toDataURL`).
- NOT be uploaded to Firebase, Firestore, or Firebase Storage.
- NOT be stored in a persistent OCC Live gallery.
- NOT be associated with student names, IDs, or any PII.
- NOT be sent to analytics.
- NOT require login or identifying information to download.

Each participant downloads their own copy directly to their device.  
Camera resources are released when the photobooth session closes.

---

## 17. Key Implementation Files

| File | Purpose |
|------|---------|
| `src/photobooth/photobooth-types.ts` | Type definitions and state machine |
| `src/photobooth/photobooth-queue.ts` | FIFO queue management |
| `src/photobooth/photobooth-invitation.ts` | Voluntary invitation system |
| `src/photobooth/photobooth-session.ts` | Central session orchestrator |
| `src/photobooth/photobooth-poses.ts` | Pre-approved pose library |
| `src/photobooth/photobooth-capture.ts` | Local-only photo capture |
| `src/photobooth/photobooth-ui.ts` | UI overlays (queue, choice, invite, pose picker, countdown, preview) |
| `src/photobooth/photobooth-sync.ts` | Multiplayer state synchronization |
| `src/photobooth/photobooth-config.ts` | Per-booth configuration and registration |

---

## 18. Adding New Photobooths

Register new photobooths in `src/photobooth/photobooth-config.ts`. All rules above apply universally — no per-booth exceptions to consent, privacy, or invitation mechanics.

---

## 19. Acceptance Criteria Summary

A photobooth implementation is complete only when:

- Queue is FIFO with position maintained through declined invitations
- Front player is asked solo vs. group — never assumed
- Solo prevents other players from joining
- Group sends individual invitations; never auto-adds
- Each invited player independently chooses join or stay
- Declining preserves queue position
- Invitation timeout is configurable (default 15s)
- Max group size is configurable (default 6)
- Photography consent verified before participation
- Consent status never revealed to others
- Physical-contact consent remains separate and enforced
- Only approved poses available, adapted to group size and consent
- Contact-requiring poses restricted appropriately
- Participant list locks during countdown
- Photo captured, previewed, and downloadable by each participant
- Photos remain local — no server upload, no PII
- Next player gets their own choice after session ends
- Camera resources released on close
- System does not interfere with normal OCC Live movement
