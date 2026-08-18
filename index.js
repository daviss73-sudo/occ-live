/**
 * OCC Live - Multiplayer WebSocket Server (Part 3)
 * Lightweight relay server for anonymous real-time presence.
 * No accounts, no names, no persistent data, no IP collection.
 * Ephemeral sessions only.
 *
 * Run: node server/index.js
 * Default port: 3001 (configurable via PORT env)
 */

import { WebSocketServer } from 'ws';

// ─── Configuration ───────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3001', 10);
const MAX_PLAYERS = parseInt(process.env.MAX_PLAYERS || '50', 10);
const SEAT_INACTIVE_RELEASE_MS = 10 * 60 * 1000; // 10 minutes
const IDLE_TIMEOUT_MS = 120 * 1000;    // 2 minutes
const AFK_TIMEOUT_MS = 300 * 1000;     // 5 minutes
const DISCONNECT_TIMEOUT_MS = 10 * 1000; // 10 seconds
const WORLD_STATE_INTERVAL_MS = 5000;   // Full state broadcast every 5s

// ─── State ───────────────────────────────────────────────────────────────────

/** @type {Map<string, {ws: any, state: any, lastActivity: number}>} */
const players = new Map();

/** @type {Map<string, {seatId: string, zoneId: string, position: number[], occupiedBy: string|null, occupiedSince: number|null, lastActivity: number|null}>} */
const seats = new Map();

// ─── Session ID Generation ───────────────────────────────────────────────────

function generateSessionId() {
  const bytes = new Uint8Array(12);
  for (let i = 0; i < 12; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Server ──────────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ port: PORT });

console.log(`[OCC Live Server] Listening on ws://localhost:${PORT}`);
console.log(`[OCC Live Server] Max players: ${MAX_PLAYERS}`);

wss.on('connection', (ws) => {
  let sessionId = null;

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case 'join':
        handleJoin(ws, msg);
        break;
      case 'state_update':
        handleStateUpdate(ws, msg);
        break;
      case 'leave':
        handleLeave(ws);
        break;
      case 'seat_claim':
        handleSeatClaim(ws, msg);
        break;
      case 'seat_release':
        handleSeatRelease(ws, msg);
        break;
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });

  ws.on('error', () => {
    handleDisconnect(ws);
  });

  // ─── Message Handlers ────────────────────────────────────────────────

  function handleJoin(ws, msg) {
    if (players.size >= MAX_PLAYERS) {
      send(ws, { type: 'error', message: 'Server full. Try again later.' });
      ws.close();
      return;
    }

    sessionId = generateSessionId();
    ws._sessionId = sessionId;

    const playerState = {
      sessionId,
      position: msg.spawnPosition || [0, 0, 5],
      rotation: [0, 0, 0],
      animationState: 'idle',
      presenceState: 'ONLINE',
      activityState: 'ACTIVE',
      avatarConfig: msg.avatarConfig,
      consentPreferences: msg.consentPreferences || {},
      interactionState: null,
      timestamp: Date.now(),
    };

    players.set(sessionId, {
      ws,
      state: playerState,
      lastActivity: Date.now(),
    });

    // Send welcome with current world state
    const existingPlayers = [];
    for (const [id, p] of players) {
      if (id !== sessionId) {
        existingPlayers.push(p.state);
      }
    }

    send(ws, {
      type: 'welcome',
      sessionId,
      players: existingPlayers,
      seats: Array.from(seats.values()),
    });

    // Notify existing players
    broadcast({
      type: 'player_joined',
      player: playerState,
    }, sessionId);

    console.log(`[+] Player joined: ${sessionId.slice(0, 8)}... (${players.size} online)`);
  }

  function handleStateUpdate(ws, msg) {
    const sid = ws._sessionId;
    if (!sid) return;

    const player = players.get(sid);
    if (!player) return;

    player.lastActivity = Date.now();
    player.state.position = msg.position;
    player.state.rotation = msg.rotation;
    player.state.animationState = msg.animationState;
    player.state.interactionState = msg.interactionState;
    player.state.activityState = 'ACTIVE';
    player.state.timestamp = Date.now();

    // Relay to other players
    broadcast({
      type: 'player_state',
      sessionId: sid,
      position: msg.position,
      rotation: msg.rotation,
      animationState: msg.animationState,
      interactionState: msg.interactionState,
      activityState: 'ACTIVE',
    }, sid);

    // Update seat activity if player is seated
    for (const seat of seats.values()) {
      if (seat.occupiedBy === sid) {
        seat.lastActivity = Date.now();
      }
    }
  }

  function handleLeave(ws) {
    handleDisconnect(ws);
  }

  function handleSeatClaim(ws, msg) {
    const sid = ws._sessionId;
    if (!sid) return;

    const seatId = msg.seatId;
    const existing = seats.get(seatId);

    // Check if seat is already occupied by someone else
    if (existing && existing.occupiedBy && existing.occupiedBy !== sid) {
      send(ws, { type: 'error', message: 'Seat is occupied.' });
      return;
    }

    const seatState = {
      seatId,
      zoneId: msg.zoneId,
      position: msg.position,
      occupiedBy: sid,
      occupiedSince: Date.now(),
      lastActivity: Date.now(),
    };

    seats.set(seatId, seatState);

    // Broadcast seat update to all
    broadcastAll({
      type: 'seat_update',
      seat: seatState,
    });
  }

  function handleSeatRelease(ws, msg) {
    const sid = ws._sessionId;
    if (!sid) return;

    const seat = seats.get(msg.seatId);
    if (seat && seat.occupiedBy === sid) {
      seat.occupiedBy = null;
      seat.occupiedSince = null;
      seat.lastActivity = null;

      broadcastAll({
        type: 'seat_update',
        seat,
      });
    }
  }

  function handleDisconnect(ws) {
    const sid = ws._sessionId;
    if (!sid) return;

    // Release any seats
    for (const seat of seats.values()) {
      if (seat.occupiedBy === sid) {
        seat.occupiedBy = null;
        seat.occupiedSince = null;
        seat.lastActivity = null;
        broadcastAll({ type: 'seat_update', seat });
      }
    }

    players.delete(sid);
    ws._sessionId = null;

    broadcast({ type: 'player_left', sessionId: sid });

    console.log(`[-] Player left: ${sid.slice(0, 8)}... (${players.size} online)`);
  }
});

// ─── Utilities ───────────────────────────────────────────────────────────────

function send(ws, msg) {
  if (ws.readyState === 1) { // OPEN
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(msg, excludeSessionId) {
  const data = JSON.stringify(msg);
  for (const [id, player] of players) {
    if (id !== excludeSessionId && player.ws.readyState === 1) {
      player.ws.send(data);
    }
  }
}

function broadcastAll(msg) {
  const data = JSON.stringify(msg);
  for (const player of players.values()) {
    if (player.ws.readyState === 1) {
      player.ws.send(data);
    }
  }
}

// ─── Periodic Tasks ──────────────────────────────────────────────────────────

// Activity state management
setInterval(() => {
  const now = Date.now();

  for (const [sid, player] of players) {
    const elapsed = now - player.lastActivity;

    if (elapsed >= AFK_TIMEOUT_MS && player.state.activityState !== 'AFK') {
      player.state.activityState = 'AFK';
      broadcast({
        type: 'player_state',
        sessionId: sid,
        position: player.state.position,
        rotation: player.state.rotation,
        animationState: player.state.animationState,
        interactionState: player.state.interactionState,
        activityState: 'AFK',
      });
    } else if (elapsed >= IDLE_TIMEOUT_MS && elapsed < AFK_TIMEOUT_MS && player.state.activityState !== 'IDLE') {
      player.state.activityState = 'IDLE';
      broadcast({
        type: 'player_state',
        sessionId: sid,
        position: player.state.position,
        rotation: player.state.rotation,
        animationState: player.state.animationState,
        interactionState: player.state.interactionState,
        activityState: 'IDLE',
      });
    }
  }

  // 10-minute seat release for inactive players
  for (const seat of seats.values()) {
    if (seat.occupiedBy && seat.lastActivity) {
      const seatElapsed = now - seat.lastActivity;
      if (seatElapsed >= SEAT_INACTIVE_RELEASE_MS) {
        const sid = seat.occupiedBy;
        seat.occupiedBy = null;
        seat.occupiedSince = null;
        seat.lastActivity = null;
        broadcastAll({ type: 'seat_update', seat });
        console.log(`[Seat] Released inactive seat ${seat.seatId} from ${sid.slice(0, 8)}...`);
      }
    }
  }
}, 10000);

// Periodic full world state (recovery/consistency)
setInterval(() => {
  const allPlayers = [];
  for (const p of players.values()) {
    allPlayers.push(p.state);
  }

  broadcastAll({
    type: 'world_state',
    players: allPlayers,
    seats: Array.from(seats.values()),
    playerCount: players.size,
  });
}, WORLD_STATE_INTERVAL_MS);
