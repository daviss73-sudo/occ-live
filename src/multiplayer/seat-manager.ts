/**
 * OCC Live - Seat Manager (Part 3)
 * Manages multiplayer seating rules:
 * - No seat-kicking (occupied seats stay occupied)
 * - 10-minute inactive release (server-driven)
 * - Track occupied/available seats
 * - Dynamic availability awareness
 */

import type { SeatState } from '../types/multiplayer.ts';

export class SeatManager {
  private seats: Map<string, SeatState> = new Map();
  private localSessionId: string | null = null;

  constructor() {}

  /** Set the local player's session ID */
  setLocalSession(sessionId: string): void {
    this.localSessionId = sessionId;
  }

  /** Update seat state from server */
  updateSeat(seat: SeatState): void {
    this.seats.set(seat.seatId, seat);
  }

  /** Bulk update seats from world state */
  updateAll(seats: SeatState[]): void {
    for (const seat of seats) {
      this.seats.set(seat.seatId, seat);
    }
  }

  /** Check if a seat is available */
  isAvailable(seatId: string): boolean {
    const seat = this.seats.get(seatId);
    if (!seat) return true; // Unknown seat = available
    return seat.occupiedBy === null;
  }

  /** Check if the local player occupies a seat */
  isLocalPlayerSeated(seatId: string): boolean {
    const seat = this.seats.get(seatId);
    return seat?.occupiedBy === this.localSessionId;
  }

  /** Check if any seat is occupied by local player */
  getLocalPlayerSeat(): SeatState | null {
    for (const seat of this.seats.values()) {
      if (seat.occupiedBy === this.localSessionId) {
        return seat;
      }
    }
    return null;
  }

  /** Get all seats in a zone */
  getSeatsInZone(zoneId: string): SeatState[] {
    return Array.from(this.seats.values()).filter(s => s.zoneId === zoneId);
  }

  /** Get available seats in a zone */
  getAvailableSeatsInZone(zoneId: string): SeatState[] {
    return this.getSeatsInZone(zoneId).filter(s => s.occupiedBy === null);
  }

  /** Get total seat count */
  getTotalSeats(): number {
    return this.seats.size;
  }

  /** Get occupied seat count */
  getOccupiedCount(): number {
    let count = 0;
    for (const seat of this.seats.values()) {
      if (seat.occupiedBy !== null) count++;
    }
    return count;
  }

  /** Get a seat by ID */
  getSeat(seatId: string): SeatState | undefined {
    return this.seats.get(seatId);
  }

  /** Clear all seat data */
  clear(): void {
    this.seats.clear();
  }
}
