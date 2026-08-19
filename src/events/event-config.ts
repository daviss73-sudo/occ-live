/**
 * OCC Live - Event Configuration (Part 7)
 * Sample event configurations for testing and development.
 * These demonstrate how to create events from templates and
 * provide developer preview controls.
 *
 * In production, events would be loaded from a configuration
 * service or file. For Part 7, they're defined here.
 */

import type { EventConfig } from './event-types.ts';
import { createEventFromTemplate, semesterKickoffTemplate, musicEventTemplate, socialEventTemplate } from './event-templates.ts';

// ─── Sample Events ───────────────────────────────────────────────────────────

/** Test Semester Kickoff — can be previewed immediately via dev controls */
export const testKickoffEvent: EventConfig = createEventFromTemplate(
  semesterKickoffTemplate,
  {
    id: 'test_spring_kickoff_2026',
    name: 'Spring Semester Kickoff',
    description: 'Welcome to Spring 2026! Dance, explore, and hang out at the Main Stage.',
    schedule: {
      startTime: '2026-09-01T19:00:00',
      endTime: '2026-09-01T21:00:00',
      timeZone: 'America/Los_Angeles',
      recurrence: null,
    },
  }
);

/** Test Music Night — high-energy DJ event */
export const testMusicNightEvent: EventConfig = createEventFromTemplate(
  musicEventTemplate,
  {
    id: 'test_music_night',
    name: 'Friday Night Live',
    description: 'High-energy music event at the Main Stage. Dance the night away!',
    schedule: {
      startTime: '2026-09-05T20:00:00',
      endTime: '2026-09-05T22:00:00',
      timeZone: 'America/Los_Angeles',
      recurrence: null,
    },
  }
);

/** Test Social Event — casual gathering */
export const testSocialEvent: EventConfig = createEventFromTemplate(
  socialEventTemplate,
  {
    id: 'test_chill_night',
    name: 'Chill Night',
    description: 'Relax and hang out. Cafe open, music playing, no pressure.',
    schedule: {
      startTime: '2026-09-10T18:00:00',
      endTime: '2026-09-10T20:00:00',
      timeZone: 'America/Los_Angeles',
      recurrence: null,
    },
  }
);

// ─── All Sample Events ───────────────────────────────────────────────────────

export const sampleEvents: EventConfig[] = [
  testKickoffEvent,
  testMusicNightEvent,
  testSocialEvent,
];

// ─── Developer Event Controls ────────────────────────────────────────────────

/**
 * Create a quick preview event that starts immediately.
 * Used by developer controls to test event configurations.
 */
export function createPreviewEvent(
  templateId: string,
  name?: string
): EventConfig | null {
  const templates = [semesterKickoffTemplate, musicEventTemplate, socialEventTemplate];
  const template = templates.find(t => t.id === templateId);
  if (!template) return null;

  const now = new Date();
  const end = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now

  return createEventFromTemplate(template, {
    id: `preview_${templateId}_${Date.now()}`,
    name: name ?? `Preview: ${template.name}`,
    description: `Developer preview of ${template.name}`,
    schedule: {
      startTime: now.toISOString(),
      endTime: end.toISOString(),
      timeZone: 'America/Los_Angeles',
      recurrence: null,
    },
  });
}
