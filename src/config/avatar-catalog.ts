/**
 * OCC Live - Avatar Catalog
 * Production avatar library with 90 avatar models hosted on Cloudflare R2.
 * Each avatar is a self-contained character — no assembly required.
 * Players select from visual thumbnails only; no names or labels exposed.
 *
 * Adding new avatars: append to AVATAR_FILES array below.
 * No other code changes needed.
 *
 * Thumbnails: same filename with " thumbnail.png" appended (space before thumbnail).
 * Example: "SomeFile_123456.gltf" → "SomeFile_123456 thumbnail.png"
 */

import type { AvatarModelEntry } from '../types/pipeline.ts';

// ─── Asset Base URL ──────────────────────────────────────────────────────────
// Points to the Cloudflare R2 bucket where GLTF/PNG assets are hosted.
// Bucket: occliveassests

const ASSET_BASE_URL = 'https://pub-c8d7825ef99c46e28cb31aee23b53d38.r2.dev';

// ─── Avatar File List ────────────────────────────────────────────────────────
// Exact filenames as they exist in the R2 bucket (90 avatars).

const AVATAR_FILES: string[] = [
  '-Hir8wbgmsDzHB-ildwOn_1787588227829.gltf',
  '-f8gHnvy_Sck1Gwx_Cf1o_1787588119045.gltf',
  '-mxbOhJmdfZ26AGLXfsyq_1787240481906.gltf',
  '-pRV3ePnTyICQbM9NCwMT_1787237999997.gltf',
  '06PruzdjDwqkwLp3tGczd_1787598059427.gltf',
  '0QNJI8oYC1-GyqUNxrAPd_1787238272469.gltf',
  '1FEWOPVB5pZWmfYX9-srh_1787240584218.gltf',
  '2SzD5Il4TILByIAjsN3eA_1787238339639.gltf',
  '3yv7I6f3T_3EXwHx66QKD_1787584963431.gltf',
  '4HF16uNsNm6IPwXQzAoyr_1787591022849.gltf',
  '4NK6WMgrHI_tilyYpgVYv_1787240816455.gltf',
  '4WxGm6xlH_-bkpjxO-Gly_1787240760981.gltf',
  '4XH7ClIM2trAdAAPunHHr_1787592056456.gltf',
  '4iWZv9Pibp6TcCkS2ValC_1787594232537.gltf',
  '4m3U2YmOsVWwQsP6uGgnA_1787240438818.gltf',
  '5UhaHNrnC_v-25FLsNLtH_1787586760731.gltf',
  '69BHZQqgrCSD7raXb_bHh_1787240712356.gltf',
  '6xnjk11NDqgOZE-P1JF-N_1787238853248.gltf',
  '7E_FZamphhXbaLcvLs849_1787240311650.gltf',
  '7PAwEO7-al-UYpEsedOtl_1787237583086.gltf',
  '7ZNTO1fV075HYzpt8xjT__1787676861934.gltf',
  'AIKRYxFuYI7stAI8oIJ4q_1787237668845.gltf',
  'CVb6BzShi_Ui231Zmm_vi_1787591534567.gltf',
  'CZZG0ETs6BSykrhw5X8z1_1787583800626.gltf',
  'DGSBZZVhuIJVjBFHcAvBZ_1787590187105.gltf',
  'DwLU4HMD7AY3728dER_4m_1787592319352.gltf',
  'EanEt85-X7M3MI5JHw_qO_1787238393726.gltf',
  'FbcMawxfILpXWehcaaMo-_1787598225759.gltf',
  'GeLC7F_vIbfa0prvnWUiQ_1787597298361.gltf',
  'H1RvFWEcw-rWnLt6HGs4n_1787676354348.gltf',
  'KDCW8I14ySbkuFpSKYTYl_1787597096240.gltf',
  'KcIaCFGlySsQgQ-dwQ6tH_1787590345946.gltf',
  'L2Hv3wSEL1JwD58OVkOwN_1787237943908.gltf',
  'M52aAtfuz3A2RTcXBG3XM_1787589009301.gltf',
  'N-UVkdormwN214fyUq7Xc_1787586442187.gltf',
  'NOedV97C5dCHGMima7ibZ_1787589372989.gltf',
  'NP6HQO1nJudvY5TNU0hou_1787587322383.gltf',
  'NoERRYY6DgfxGWiqzQMdc_1787589192295.gltf',
  'ORtVtJnnz8jkwYm_foQ85_1787587103747.gltf',
  'OiTyokmco7n9cxhFmzfjP_1787240107919.gltf',
  'OiWBGWAO6fmrkCyrYq2mk_1787237511540.gltf',
  'P9E1shFR1MkalQHJyl1SK_1787237846308.gltf',
  'PJ4djfqbswhGL14ej9awK_1787597754229.gltf',
  'PXsdMT8v3LJ8sGLhVfPGz_1787593062188.gltf',
  'PmECIR2Kie626oPxLigIX_1787240401870.gltf',
  'R6141Rq-57elQif-eKYCF_1787593819224.gltf',
  'RLGF1VIsDHMk51uReGB7R_1787596152762.gltf',
  'RUVEJzaP4ljrQ3wk4m0s0_1787593698187.gltf',
  'RqbYFkN_VmBMIqCpj7AOZ_1787585211209.gltf',
  'V-T3B01rEQ2A_A6bad7b4_1787240522223.gltf',
  'VSIKpFE63xXk_kY0815DX_1787596456072.gltf',
  'WjiXb38eYwzKh_f5x_ppu_1787595718700.gltf',
  'XIGftsfzaoMu1ucpj92zg_1787238129806.gltf',
  'Xr79k4jDCSRK64P05tnfT_1787594512463.gltf',
  'ZHAi0MbB-1P__8pmx6m29_1787588766491.gltf',
  'ZNkBBm95fGBjYZXYykYMh_1787590555658.gltf',
  '_cFK1TOwS-1btJAZj3Ktv_1787584494052.gltf',
  'aHFlpRagRDOdpfkbVPF1F_1787676612835.gltf',
  'b6j5h9SdbV9pW4c1e_L4c_1787595096884.gltf',
  'cqKjnW7kXwdXtGQ2nfk_F_1787594653373.gltf',
  'cwfC5-kgzxWTwXGCjcAjW_1787596091532.gltf',
  'dP3pZNOC87DCX7VEXlmKp_1787584674871.gltf',
  'derGH7w74vVTVt4Q9X2xu_1787596784580.gltf',
  'h3yZ3zmnwn7HjFfSxZc70_1787238192757.gltf',
  'j72G1AC3b3Q05M-EE4U___1787238572210.gltf',
  'jCqRh7zhhk5BhYE9yhvof_1787587525644.gltf',
  'jiQB2KHgCDncYxvcUYPkO_1787238774787.gltf',
  'jvmkZRy5teNXLSttOtYyq_1787586177150.gltf',
  'kT9MuHjU4SID2eI8a6ZCA_1787237433992.gltf',
  'lxQON0gwyOLpRL8aKkalw_1787597397977.gltf',
  'mFB62DEs6p05i4FimGRJG_1787240657158.gltf',
  'mSDxtM6YmRG8m7Idrc2kg_1787594721004.gltf',
  'mxIM_lheoWhCKMZRVsDj7_1787237789776.gltf',
  'n8UC-9M5qCP5TXZuUCDqd_1787238630475.gltf',
  'nm6jQxnB_FGpZwKbUZoWJ_1787588696819.gltf',
  'on7EAA8yyZl8VsxYq7W20_1787596847200.gltf',
  'pQj3wYHbM4uq-eyAW-8rE_1787595399243.gltf',
  'q__bAGO0hVe9Buo_E76o1_1787237367342.gltf',
  's-FhhmBUP4IxQ2a1g6ZdA_1787596510717.gltf',
  'sUYOJcO4MMUfpjTyBLOTj_1787591346065.gltf',
  'szjSL9to3EL05WIo1s6qd_1787585891965.gltf',
  'tC_vjGGxbPZGryVSn12u9_1787598507733.gltf',
  'tmrbOlan5c_Ug5bMVWpre_1787592832485.gltf',
  'uO67faXebYPu58yzsaark_1787238470209.gltf',
  'uVw93OwjjiFxEdSwJMv8-_1787597697037.gltf',
  'vM7tQbZRkX42iXehcAoL__1787587884067.gltf',
  'vOYLVsvC7kHEuDRxQrrqw_1787238067823.gltf',
  'xxYLrhUkoekdu-0us4V8q_1787237288771.gltf',
  'yCb8b5Km8HzF9sFI48I0D_1787598134598.gltf',
  'yaKS7lJlizSshkMzqTcxH_1787240616905.gltf',
  'zjxpk1dROGSgv9O55P7GT_1787592608607.gltf',
];

// ─── Thumbnail Filename Builder ──────────────────────────────────────────────
// Thumbnail pattern: same base name (without .gltf) + " thumbnail.png"
// Example: "_cFK1TOwS-1btJAZj3Ktv_1787584494052.gltf"
//        → "_cFK1TOwS-1btJAZj3Ktv_1787584494052 thumbnail.png"

function getThumbnailFilename(gltfFilename: string): string {
  const baseName = gltfFilename.replace('.gltf', '');
  return `${baseName} thumbnail.png`;
}

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
      file: `${ASSET_BASE_URL}/${encodeURIComponent(filename)}`,
      thumbnail: `${ASSET_BASE_URL}/${encodeURIComponent(getThumbnailFilename(filename))}`,
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
