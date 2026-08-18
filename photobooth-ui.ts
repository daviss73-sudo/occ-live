/**
 * OCC Live - Photobooth UI System
 * All photobooth overlays: queue status, solo/group choice, invitation,
 * pose picker, countdown, and preview with download.
 *
 * No identifying information displayed. Avatar-only representation.
 */

import type {
  QueuePositionMessage,
  PhotoInvitation,
  PoseDefinition,
  PhotoCaptureResult,
  PhotoModeChoice,
} from './photobooth-types.ts';

export interface PhotoboothUICallbacks {
  onChoiceMade?: (choice: PhotoModeChoice) => void;
  onInvitationResponse?: (accept: boolean) => void;
  onPoseSelected?: (poseId: string) => void;
  onPreviewDismissed?: () => void;
  onDownloadRequested?: () => void;
  onLeaveQueue?: () => void;
}

export class PhotoboothUI {
  private callbacks: PhotoboothUICallbacks = {};
  private activeOverlay: HTMLElement | null = null;
  private styleElement: HTMLElement | null = null;

  constructor() { this.injectStyles(); }

  setCallbacks(callbacks: PhotoboothUICallbacks): void { this.callbacks = callbacks; }

  // ─── Queue Position ────────────────────────────────────────────────────

  showQueuePosition(msg: QueuePositionMessage): void {
    this.removeOverlay();
    const el = this.createOverlay('pb-queue-ui');
    el.innerHTML = `<div class="pb-panel"><div class="pb-title">Photobooth Queue</div><div class="pb-message">${msg.message}</div><button class="pb-btn pb-btn-secondary" id="pb-leave-queue">Leave Queue</button></div>`;
    document.body.appendChild(el);
    this.activeOverlay = el;
    el.querySelector('#pb-leave-queue')?.addEventListener('click', () => { this.callbacks.onLeaveQueue?.(); this.removeOverlay(); });
  }

  // ─── Solo/Group Choice ─────────────────────────────────────────────────

  showChoicePrompt(): void {
    this.removeOverlay();
    const el = this.createOverlay('pb-choice-ui');
    el.innerHTML = `
      <div class="pb-panel pb-center">
        <div class="pb-title">What kind of photo?</div>
        <div class="pb-btns">
          <button class="pb-btn pb-btn-primary" id="pb-solo"><span class="pb-icon">\u{1F4F7}</span><strong>Just Me</strong><br><small>Take a solo photo.</small></button>
          <button class="pb-btn pb-btn-primary" id="pb-group"><span class="pb-icon">\u{1F465}</span><strong>Invite Others</strong><br><small>Allow others to join.</small></button>
        </div>
      </div>`;
    document.body.appendChild(el);
    this.activeOverlay = el;
    el.querySelector('#pb-solo')?.addEventListener('click', () => { this.callbacks.onChoiceMade?.('solo'); this.removeOverlay(); });
    el.querySelector('#pb-group')?.addEventListener('click', () => { this.callbacks.onChoiceMade?.('group'); this.removeOverlay(); });
  }

  // ─── Invitation Prompt ─────────────────────────────────────────────────

  showInvitationPrompt(invitation: PhotoInvitation): void {
    this.removeOverlay();
    const el = this.createOverlay('pb-invite-ui');
    el.innerHTML = `
      <div class="pb-panel pb-center">
        <div class="pb-title">Group Photo Invitation</div>
        <div class="pb-message">A group photo is forming at the Photobooth.<br>Would you like to join?</div>
        <div class="pb-timer" id="pb-timer"></div>
        <div class="pb-btns">
          <button class="pb-btn pb-btn-primary" id="pb-join">Join Photo</button>
          <button class="pb-btn pb-btn-secondary" id="pb-decline">Stay in Line</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    this.activeOverlay = el;

    const timerEl = el.querySelector('#pb-timer') as HTMLElement;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((invitation.expiresAt - Date.now()) / 1000));
      if (timerEl) timerEl.textContent = `Expires in ${rem}s`;
      if (rem > 0 && this.activeOverlay === el) requestAnimationFrame(tick);
    };
    tick();

    el.querySelector('#pb-join')?.addEventListener('click', () => { this.callbacks.onInvitationResponse?.(true); this.removeOverlay(); });
    el.querySelector('#pb-decline')?.addEventListener('click', () => { this.callbacks.onInvitationResponse?.(false); this.removeOverlay(); });
  }

  // ─── Group Full ────────────────────────────────────────────────────────

  showGroupFull(): void {
    this.showStatus('This photo is full! You\'ll keep your place in line.', 3000);
  }

  // ─── Pose Selector ─────────────────────────────────────────────────────

  showPoseSelector(poses: PoseDefinition[]): void {
    this.removeOverlay();
    const el = this.createOverlay('pb-pose-ui');
    const cards = poses.map(p => `<button class="pb-pose-card" data-id="${p.id}"><strong>${p.name}</strong><br><small>${p.description}</small><br><span class="pb-pose-count">${p.minParticipants}–${p.maxParticipants} players</span></button>`).join('');
    el.innerHTML = `<div class="pb-panel pb-large"><div class="pb-title">Choose Your Pose</div><div class="pb-pose-grid">${cards}</div></div>`;
    document.body.appendChild(el);
    this.activeOverlay = el;
    el.querySelectorAll('.pb-pose-card').forEach(c => c.addEventListener('click', () => {
      const id = (c as HTMLElement).dataset.id;
      if (id) { this.callbacks.onPoseSelected?.(id); this.removeOverlay(); }
    }));
  }

  // ─── Countdown ─────────────────────────────────────────────────────────

  showCountdown(seconds: number): void {
    this.removeOverlay();
    const el = this.createOverlay('pb-countdown-ui');
    el.innerHTML = `<div class="pb-countdown"><span id="pb-cd-num">${seconds}</span></div>`;
    document.body.appendChild(el);
    this.activeOverlay = el;
  }

  updateCountdown(seconds: number): void {
    const n = document.getElementById('pb-cd-num');
    if (n) n.textContent = seconds <= 0 ? 'SNAP!' : String(seconds);
  }

  // ─── Preview & Download ────────────────────────────────────────────────

  showPreview(result: PhotoCaptureResult): void {
    this.removeOverlay();
    const el = this.createOverlay('pb-preview-ui');
    el.innerHTML = `
      <div class="pb-panel pb-large pb-center">
        <div class="pb-title">Your Photo</div>
        <img src="${result.imageDataUrl}" alt="Photo" style="max-width:100%;max-height:50vh;border-radius:8px;margin:12px 0" />
        <div class="pb-btns">
          <button class="pb-btn pb-btn-primary" id="pb-dl">Download Photo</button>
          <button class="pb-btn pb-btn-secondary" id="pb-done">Done</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    this.activeOverlay = el;
    el.querySelector('#pb-dl')?.addEventListener('click', () => this.callbacks.onDownloadRequested?.());
    el.querySelector('#pb-done')?.addEventListener('click', () => { this.callbacks.onPreviewDismissed?.(); this.removeOverlay(); });
  }

  // ─── Status Message ────────────────────────────────────────────────────

  showStatus(message: string, autoHideMs: number = 3000): void {
    this.removeOverlay();
    const el = this.createOverlay('pb-status-ui');
    el.innerHTML = `<div class="pb-panel pb-center"><div class="pb-message">${message}</div></div>`;
    document.body.appendChild(el);
    this.activeOverlay = el;
    if (autoHideMs > 0) setTimeout(() => { if (this.activeOverlay === el) this.removeOverlay(); }, autoHideMs);
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────

  removeOverlay(): void { if (this.activeOverlay) { this.activeOverlay.remove(); this.activeOverlay = null; } }
  dispose(): void { this.removeOverlay(); this.styleElement?.remove(); }

  // ─── Private ───────────────────────────────────────────────────────────

  private createOverlay(id: string): HTMLElement {
    const el = document.createElement('div'); el.id = id; el.className = 'pb-overlay'; el.setAttribute('role', 'dialog'); return el;
  }

  private injectStyles(): void {
    if (document.getElementById('pb-styles')) return;
    const s = document.createElement('style'); s.id = 'pb-styles';
    s.textContent = `
      .pb-overlay{position:fixed;inset:0;z-index:6000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fff}
      .pb-panel{background:linear-gradient(135deg,#1a0a2e,#2d1b4e);border-radius:16px;border:1px solid rgba(124,77,255,.3);padding:24px;max-width:520px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.5)}
      .pb-large{max-width:660px;max-height:80vh;overflow-y:auto}
      .pb-center{text-align:center}
      .pb-title{font-size:20px;font-weight:700;margin-bottom:12px}
      .pb-message{font-size:14px;color:rgba(255,255,255,.8);line-height:1.5;margin-bottom:16px}
      .pb-timer{font-size:12px;color:rgba(255,255,255,.5);margin-bottom:12px}
      .pb-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
      .pb-btn{padding:12px 20px;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;transition:transform .15s}
      .pb-btn:hover{transform:scale(1.03)}
      .pb-btn-primary{background:linear-gradient(135deg,#7c4dff,#536dfe);color:#fff}
      .pb-btn-secondary{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.2)}
      .pb-icon{font-size:24px;display:block;margin-bottom:4px}
      .pb-pose-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-top:12px}
      .pb-pose-card{background:rgba(255,255,255,.05);border:2px solid rgba(255,255,255,.1);border-radius:10px;padding:12px;cursor:pointer;text-align:center;color:#fff;transition:border-color .15s,transform .15s}
      .pb-pose-card:hover{border-color:rgba(124,77,255,.6);transform:scale(1.03)}
      .pb-pose-count{font-size:10px;opacity:.5}
      .pb-countdown{display:flex;align-items:center;justify-content:center}
      .pb-countdown span{font-size:96px;font-weight:900;text-shadow:0 4px 20px rgba(124,77,255,.6);animation:pb-pulse 1s ease infinite}
      @keyframes pb-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
    `;
    document.head.appendChild(s);
    this.styleElement = s;
  }
}
