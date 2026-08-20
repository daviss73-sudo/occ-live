/**
 * OCC Live - Avatar Catalog
 * Production avatar library with 25 avatar models hosted on Cloudflare R2.
 * Each avatar is a self-contained character — no assembly required.
 * Players select from visual thumbnails only; no names or labels exposed.
 *
 * Adding new avatars: append to AVATAR_FILES array below.
 * No other code changes needed.
 */

import type { AvatarModelEntry } from '../types/pipeline.ts';

// ─── Asset Base URL ──────────────────────────────────────────────────────────
// Points to the Cloudflare R2 bucket where GLTF assets are hosted.
// Change this single value to update all avatar asset URLs.

const ASSET_BASE_URL = 'https://pub-c8d7825ef99c46e28cb31aee23b53d38.r2.dev';

// ─── Avatar File List ────────────────────────────────────────────────────────
// Exact filenames as they exist in the R2 bucket.

const AVATAR_FILES: string[] = [
  '-mxbOhJmdfZ26AGLXfsyq_1787240481906(1).gltf',
  '-pRV3ePnTyICQbM9NCwMT_1787237999997(1).gltf',
  '0QNJI8oYC1-GyqUNxrAPd_1787238272469(1).gltf',
  '1FEWOPVB5pZWmfYX9-srh_1787240584218.gltf',
  '2SzD5Il4TILByIAjsN3eA_1787238339639(1).gltf',
  '4NK6WMgrHI_tilyYpgVYv_1787240816455(1).gltf',
  '4WxGm6xlH_-bkpjxO-Gly_1787240760981.gltf',
  '4m3U2YmOsVWwQsP6uGgnA_1787240438818(1).gltf',
  '69BHZQqgrCSD7raXb_bHh_1787240712356.gltf',
  '6xnjk11NDqgOZE-P1JF-N_1787238853248.gltf',
  '7E_FZamphhXbaLcvLs849_1787240311650(1).gltf',
  '7PAwEO7-al-UYpEsedOtl_1787237583086(1).gltf',
  'AIKRYxFuYI7stAI8oIJ4q_1787237668845(1).gltf',
  'EanEt85-X7M3MI5JHw_qO_1787238393726(1).gltf',
  'L2Hv3wSEL1JwD58OVkOwN_1787237943908(1).gltf',
  'OiTyokmco7n9cxhFmzfjP_1787240107919.gltf',
  'OiWBGWAO6fmrkCyrYq2mk_1787237511540(1).gltf',
  'P9E1shFR1MkalQHJyl1SK_1787237846308(1).gltf',
  'PmECIR2Kie626oPxLigIX_1787240401870.gltf',
  'V-T3B01rEQ2A_A6bad7b4_1787240522223.gltf',
  'XIGftsfzaoMu1ucpj92zg_1787238129806.gltf',
  'h3yZ3zmnwn7HjFfSxZc70_1787238192757(1).gltf',
  'iI5MFU5AnPNgAC9yexuJX_1787236787161.gltf',
  'j72G1AC3b3Q05M-EE4U___1787238572210(1).gltf',
  'jiQB2KHgCDncYxvcUYPkO_1787238774787.gltf',
];

// ─── Mobility Type ───────────────────────────────────────────────────────────
// All current avatars are walking. Update this if wheelchair/mobility-aid
// avatars are added later.

function inferMobility(_index: number): 'walking' | 'wheelchair' {
  return 'walking';
}

// ─── Catalog Builder ─────────────────────────────────────────────────────────

function buildCatalog(): AvatarModelEntry[] {
  return AVATAR_FILES.map((filename, index) => {
    const id = `avatar_${(index + 1).toString().padStart(3, '0')}`;
    return {
      id,
      file: `${ASSET_BASE_URL}/${filename}`,
      thumbnail: `${ASSET_BASE_URL}/${filename}`,
      mobility: inferMobility(index),
      tags: [],
    };
  });
}

// ─── Exported Catalog & Utilities ────────────────────────────────────────────

/** The complete production avatar catalog */
export const avatarCatalog: AvatarModelEntry[] = buildCatalog();

/** Total number of available thumbnail images */
export const TOTAL_THUMBNAILS = AVATAR_FILES.length;

/** Get an avatar entry by its ID (e.g. 'avatar_017') */
export function getAvatarById(id: string): AvatarModelEntry | undefined {
  return avatarCatalog.find(a => a.id === id);
}

/** Get an avatar entry by its numeric index (1-based) */
export function getAvatarByIndex(index: number): AvatarModelEntry | undefined {
  if (index < 1 || index > AVATAR_FILES.length) return undefined;
  return avatarCatalog[index - 1];
}

/** Get total count of registered avatars */
export function getAvatarCount(): number {
  return avatarCatalog.length;
}

/** Get avatars filtered by mobility type */
export function getAvatarsByMobility(mobility: 'walking' | 'wheelchair'): AvatarModelEntry[] {
  return avatarCatalog.filter(a => a.mobility === mobility);
}

/** Get avatars filtered by tag */
export function getAvatarsByTag(tag: string): AvatarModelEntry[] {
  return avatarCatalog.filter(a => a.tags.includes(tag));
}
