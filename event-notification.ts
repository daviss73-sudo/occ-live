/**
 * OCC Live - Event Notification (Part 7)
 * Lightweight, dismissible event announcement that appears when a
 * player enters during an active event. Also updates the Information
 * Kiosk with event details.
 *
 * Design:
 * - Non-intrusive: auto-dismisses after a few seconds
 * - Player does NOT need to acknowledge it
 * - No forced interaction or registration
 * - Shows event name, time, and what's happening
 * - Anonymous: never asks for or displays player information
 */

import type { EventConfig } from './event-types.ts';
import type { EventNotificationController } from './event-manager.ts';
import type { InformationKiosk } from '../systems/information-kiosk.ts';

export class EventNotificationImpl implements EventNotificationController {
  private overlayElement: HTMLElement | null = null;
  private dismissTimer: number | null = null;
  private kiosk: InformationKiosk | null = null;
  private autoDismissMs: number = 6000;

  constructor(kiosk?: InformationKiosk) {
    this.kiosk = kiosk ?? null;
  }

  /** Wire the information kiosk for event content updates */
  setKiosk(kiosk: InformationKiosk): void {
    this.kiosk = kiosk;
  }

  /** Show a dismissible event notification */
  showEventNotification(event: EventConfig): void {
    // Remove any existing notification
    this.hideEventNotification();

    this.overlayElement = document.createElement('div');
    this.overlayElement.id = 'event-notification';
    this.overlayElement.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, rgba(124, 77, 255, 0.95), rgba(83, 109, 254, 0.95));
      color: #ffffff;
      padding: 16px 28px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 15px;
      z-index: 300;
      pointer-events: auto;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px rgba(124, 77, 255, 0.4);
      text-align: center;
      max-width: 400px;
      animation: eventNotifSlideIn 0.4s ease;
      cursor: pointer;
    `;

    // Inject animation keyframes
    if (!document.getElementById('event-notif-styles')) {
      const style = document.createElement('style');
      style.id = 'event-notif-styles';
      style.textContent = `
        @keyframes eventNotifSlideIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes eventNotifSlideOut {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
      `;
      document.head.appendChild(style);
    }

    this.overlayElement.innerHTML = `
      <div style="font-size:18px;font-weight:700;margin-bottom:4px">${event.name}</div>
      <div style="font-size:13px;opacity:0.85">${event.description}</div>
      <div style="font-size:11px;opacity:0.6;margin-top:6px">Tap to dismiss</div>
    `;

    // Click to dismiss
    this.overlayElement.addEventListener('click', () => {
      this.hideEventNotification();
    });

    document.body.appendChild(this.overlayElement);

    // Auto-dismiss after timeout
    this.dismissTimer = window.setTimeout(() => {
      this.hideEventNotification();
    }, this.autoDismissMs);
  }

  /** Hide the event notification */
  hideEventNotification(): void {
    if (this.dismissTimer !== null) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }

    if (this.overlayElement) {
      // Animate out
      this.overlayElement.style.animation = 'eventNotifSlideOut 0.3s ease forwards';
      const el = this.overlayElement;
      setTimeout(() => el.remove(), 300);
      this.overlayElement = null;
    }
  }

  /** Update the Information Kiosk with event information */
  updateKiosk(event: EventConfig | null): void {
    if (!this.kiosk) return;

    if (event) {
      // Add/update the events page with current event info
      this.kiosk.updatePage('events', {
        content: `
          <h3>Current Event</h3>
          <div style="background:rgba(124,77,255,0.15);padding:12px;border-radius:8px;border:1px solid rgba(124,77,255,0.3);margin-bottom:12px">
            <div style="font-size:16px;font-weight:600;color:#c4b5fd">${event.name}</div>
            <div style="margin-top:4px">${event.description}</div>
          </div>
          <p><strong>What's happening:</strong></p>
          <ul>
            ${event.stage.mode !== 'inactive' ? '<li>Main Stage is active</li>' : ''}
            ${event.stage.danceAreaRadius > 0 ? '<li>Dance floor open near the stage</li>' : ''}
            ${event.npcs.spawnCrowdNPCs ? '<li>Extra ambient activity</li>' : ''}
          </ul>
          <p style="opacity:0.6;font-size:12px">No registration or sign-up required. Just enjoy the space.</p>
        `,
      });
    } else {
      // Restore default events page
      this.kiosk.updatePage('events', {
        content: `
          <h3>Upcoming Events</h3>
          <p>Check back soon for scheduled events at the Main Stage!</p>
          <p>The Main Union is always open — no event required to enjoy the space.</p>
        `,
      });
    }
  }
}
