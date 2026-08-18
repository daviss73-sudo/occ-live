/**
 * OCC Live - Pre-Entry Consent Screen
 * Full-screen overlay displayed before entering OCC Live.
 * All interactions default to OFF. Player must actively opt in.
 * Preferences are locked on ENTER and cannot be changed after.
 * Returns a Promise that resolves with the chosen preferences.
 */

import {
  CONSENT_INTERACTIONS,
  createDefaultConsentPreferences,
} from '../types/consent.ts';
import type { ConsentPreferences, PhysicalInteractionType } from '../types/consent.ts';

/**
 * Show the pre-entry consent screen. Blocks until player clicks ENTER.
 * Returns the selected consent preferences.
 */
export function showConsentScreen(): Promise<ConsentPreferences> {
  return new Promise((resolve) => {
    const preferences = createDefaultConsentPreferences();

    // ─── Create overlay ────────────────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.id = 'consent-screen';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #ffffff;
      overflow-y: auto;
      padding: 24px;
    `;

    // ─── Content container ─────────────────────────────────────────────
    const container = document.createElement('div');
    container.style.cssText = `
      max-width: 600px;
      width: 100%;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 16px;
      padding: 40px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    `;

    // ─── Title ─────────────────────────────────────────────────────────
    const title = document.createElement('h1');
    title.textContent = 'Choose Your Interaction Preferences';
    title.style.cssText = `
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 12px 0;
      color: #ffffff;
    `;
    container.appendChild(title);

    // ─── Description ───────────────────────────────────────────────────
    const desc = document.createElement('p');
    desc.textContent = 'OCC Live includes optional avatar-to-avatar interactions. You control which interactions you\'re comfortable participating in.';
    desc.style.cssText = `
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
      margin: 0 0 8px 0;
      line-height: 1.5;
    `;
    container.appendChild(desc);

    const lockNotice = document.createElement('p');
    lockNotice.textContent = 'Your choices are locked for this session. If you want to change them, you\'ll need to leave OCC Live and choose your preferences again when you re-enter.';
    lockNotice.style.cssText = `
      font-size: 13px;
      color: rgba(255, 200, 100, 0.8);
      margin: 0 0 24px 0;
      line-height: 1.4;
      font-style: italic;
    `;
    container.appendChild(lockNotice);

    // ─── Consent label ─────────────────────────────────────────────────
    const consentLabel = document.createElement('p');
    consentLabel.textContent = 'I consent to:';
    consentLabel.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 16px 0;
    `;
    container.appendChild(consentLabel);

    // ─── Physical Contact section ──────────────────────────────────────
    const physicalHeader = document.createElement('h2');
    physicalHeader.textContent = 'Physical Contact';
    physicalHeader.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(255, 255, 255, 0.5);
      margin: 0 0 12px 0;
    `;
    container.appendChild(physicalHeader);

    const physicalInteractions = CONSENT_INTERACTIONS.filter(i => i.category === 'physical_contact');
    for (const interaction of physicalInteractions) {
      container.appendChild(createCheckbox(interaction.id, interaction.label, preferences));
    }

    // ─── Shared Activities section ─────────────────────────────────────
    const activityHeader = document.createElement('h2');
    activityHeader.textContent = 'Shared Physical Activities';
    activityHeader.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(255, 255, 255, 0.5);
      margin: 20px 0 12px 0;
    `;
    container.appendChild(activityHeader);

    const activityInteractions = CONSENT_INTERACTIONS.filter(i => i.category === 'shared_activity');
    for (const interaction of activityInteractions) {
      container.appendChild(createCheckbox(interaction.id, interaction.label, preferences));
    }

    // ─── Enter button ──────────────────────────────────────────────────
    const enterBtn = document.createElement('button');
    enterBtn.textContent = 'ENTER OCC LIVE';
    enterBtn.style.cssText = `
      display: block;
      width: 100%;
      margin-top: 28px;
      padding: 16px 32px;
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      background: linear-gradient(135deg, #7c4dff, #536dfe);
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 4px 12px rgba(124, 77, 255, 0.3);
    `;
    enterBtn.onmouseenter = () => {
      enterBtn.style.transform = 'translateY(-2px)';
      enterBtn.style.boxShadow = '0 6px 20px rgba(124, 77, 255, 0.5)';
    };
    enterBtn.onmouseleave = () => {
      enterBtn.style.transform = 'translateY(0)';
      enterBtn.style.boxShadow = '0 4px 12px rgba(124, 77, 255, 0.3)';
    };
    enterBtn.onclick = () => {
      overlay.remove();
      resolve({ ...preferences });
    };
    container.appendChild(enterBtn);

    // ─── Footer disclaimer ─────────────────────────────────────────────
    const footer = document.createElement('p');
    footer.textContent = 'I understand that another player\'s consent does not give me permission to initiate an interaction with them. An interaction can only occur when the applicable interaction is permitted for both players.';
    footer.style.cssText = `
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);
      margin: 20px 0 0 0;
      line-height: 1.5;
      text-align: center;
    `;
    container.appendChild(footer);

    overlay.appendChild(container);
    document.body.appendChild(overlay);
  });
}

// ─── Checkbox Builder ────────────────────────────────────────────────────────

function createCheckbox(
  id: PhysicalInteractionType,
  label: string,
  preferences: ConsentPreferences
): HTMLElement {
  const wrapper = document.createElement('label');
  wrapper.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    margin-bottom: 6px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
  `;
  wrapper.onmouseenter = () => {
    wrapper.style.background = 'rgba(255, 255, 255, 0.08)';
  };
  wrapper.onmouseleave = () => {
    wrapper.style.background = 'rgba(255, 255, 255, 0.03)';
  };

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = false; // ALL default OFF
  checkbox.style.cssText = `
    width: 20px;
    height: 20px;
    accent-color: #7c4dff;
    cursor: pointer;
    flex-shrink: 0;
  `;
  checkbox.onchange = () => {
    preferences[id] = checkbox.checked;
  };

  const text = document.createElement('span');
  text.textContent = label;
  text.style.cssText = `
    font-size: 15px;
    color: rgba(255, 255, 255, 0.9);
  `;

  wrapper.appendChild(checkbox);
  wrapper.appendChild(text);
  return wrapper;
}
