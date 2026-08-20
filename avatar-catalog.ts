/**
 * OCC Live - Avatar Catalog (Part 5)
 * Production avatar library with 117 complete avatar models.
 * Each avatar is a self-contained character — no assembly required.
 * Players select from visual thumbnails only; no names or labels exposed.
 *
 * Architecture supports 100+ avatars. Adding new avatars requires only
 * appending entries to this catalog — no core system changes needed.
 */

import type { AvatarModelEntry } from '../types/pipeline.ts';

// ─── Source File Mapping ─────────────────────────────────────────────────────
// Maps internal avatar IDs (1-117) to their original GLB source filenames.
// This is used internally for development reference only.

const SOURCE_FILE_MAP: Record<number, string> = {
  1: 'Smiling_Granny_with_Walker',
  2: 'Grandma_and_dog',
  3: 'Grandmother_Fi',
  4: 'Gentle_Grandpa',
  5: 'manual_Silver_Wheelchair',
  6: 'Cozy_Grandpa_Miniatur',
  7: 'electric_wheelchair',
  8: 'Smiling_Forest_Grandp',
  9: 'millenial_woman_Spider_tshirt',
  10: 'adult_male_Blue_Paisley',
  11: 'older_male',
  12: 'older_woman',
  13: 'older_man',
  14: 'older_man_0810182708',
  15: 'older_man_0810182734',
  16: 'blk_male_0810182811',
  17: 'older_woman_0810182851',
  18: 'older_woman_0810182915',
  19: 'lumberjack_male',
  20: 'older_male_0810183112',
  21: 'male_0810183148',
  22: 'blk_male_Island_Buddy',
  23: 'older_w_male_0810183245',
  24: 'older_blk_wmn_0810183317',
  25: 'older_ poc_male',
  26: 'older_blk_male_0810183509',
  27: 'male_poc',
  28: 'blk_male_0810183610',
  29: 'older_blk_wmn_0810183747',
  30: 'older_male_0810183843',
  31: 'older_wmn',
  32: 'poc_male_0810184047',
  33: 'w_wmn',
  34: 'poc_male_0810184215',
  35: 'older_blk_man',
  36: 'young_alt',
  37: 'young_alt_girl',
  38: 'young_w_0810184514',
  39: 'young_blk_m_0810184547',
  40: 'young_blk_m_0810184633',
  41: 'blk_girl_Blue_Sky_Wave',
  42: 'young_fem_Peaceful_Joy',
  43: 'young_poc_male_Star_Hoodie_Smile',
  44: 'adult_wmn',
  45: 'adult_poc_male_0810185102',
  46: 'adult_blk_wmn_Charm',
  47: 'adult_bald_blk_male',
  48: 'adult_wmn_poc',
  49: 'adult_w_wmn_Pink_Sweater',
  50: 'adult_poc_male_0810185409',
  51: 'young_blk_male',
  52: 'young_fem_Hijab_Avatar',
  53: 'young_poc_Cap',
  54: 'young_poc_fem',
  55: 'adult_blk_Cap',
  56: 'adult_fem_Hijab_Avatar',
  57: 'young_male_poc_Hoodie',
  58: 'adult_blk_male_Flat_Cap',
  59: 'young_fem_Hijab_Doll',
  60: 'older_adult_wmn',
  61: 'older_blk_male__0810190237',
  62: 'older_blk_male_0810190339',
  63: 'older_w_male_0810190408',
  64: 'older_w_male_0810190436',
  65: 'poc_walking_aid_male',
  66: 'young_blk_fem',
  67: 'young_poc_male_0810190634',
  68: 'young_blk_male_crutches',
  69: 'blk_wmn_artificial_leg',
  70: 'young_w_male',
  71: 'poc_young_fem',
  72: 'young_blk_male_Pokémon_Fan',
  73: 'young_w_fem_w_laptop',
  74: 'young_poc_male-0810191110',
  75: 'alt_poc_male_young',
  76: 'Meshy_AI_Smoothie_Stroll',
  77: 'Meshy_AI_Campus_Cool_Spark',
  78: 'Meshy_AI_Sunshine_Stroll_0812134825',
  79: 'Meshy_AI_LA_Cool_Girl',
  80: 'Meshy_AI_Bright_Scholar',
  81: 'Meshy_AI_Chill_Vibes_Ava',
  82: 'Meshy_AI_Sunshine_Stroll_0812134900',
  83: 'Meshy_AI_Joyful_Style',
  84: 'Meshy_AI_Coffee_Stroll',
  85: 'Meshy_AI_Peaceful_Smile',
  86: 'Meshy_AI_Braided_Joy',
  87: 'Meshy_AI_Denim_Smile',
  88: 'Meshy_AI_Little_Dreamer',
  89: 'Meshy_AI_Smiling_Plaid_Avatar',
  90: 'Meshy_AI_Milo',
  91: 'Meshy_AI_Smiling_Scholar',
  92: 'Meshy_AI_Smiling_Dreadlocked_A',
  93: 'Meshy_AI_Smiling_Cardigan_Avat',
  94: 'Meshy_AI_Denim_Dreadlock_Smile',
  95: 'Meshy_AI_Smiling_Varsity_Vibes',
  96: 'Meshy_AI_Smiling_Mini_Gentlema',
  97: 'Meshy_AI_Smiling_Braided_Explo',
  98: 'Meshy_AI_Smiling_Blond_Avatar',
  99: 'Meshy_AI_Redhead_Wanderer',
  100: 'Meshy_AI_Sunny_Island_Smile',
  101: 'Meshy_AI_Smiling_Boba_Buddy',
  102: 'Meshy_AI_Smiling_Summer_Boy',
  103: 'Meshy_AI_Smiling_Plaid_Shirt_A',
  104: 'Meshy_AI_Little_Explorer',
  105: 'Meshy_AI_Maya',
  106: 'Meshy_AI_Sunny_Stroll',
  107: 'Meshy_AI_Campus_Cuddlebot',
  108: 'Meshy_AI_Bun_Blossom_Miniature',
  109: 'Meshy_AI_Braided_Summer_Smile',
  110: 'Meshy_AI_Sunny_Denim_Doll',
  111: 'Meshy_AI_Sunny_Skater_Avatar',
  112: 'Meshy_AI_Skater_in_Bloom',
  113: 'Meshy_AI_Skater_Sunshine',
  114: 'Meshy_AI_Sunny_Skater_Kid',
  115: 'Meshy_AI_Sunny_Wanderer',
  116: 'Meshy_AI_Sunny_Denim_Doll',
  117: 'Meshy_AI_Sunny_Skater_Avatar',
};

// ─── Mobility Type Inference ─────────────────────────────────────────────────
// Avatars that use non-walking mobility types, inferred from source filenames.

const WHEELCHAIR_INDICES = [5, 7];       // manual wheelchair, electric wheelchair
const WALKING_AID_INDICES = [1, 65, 68]; // walker, walking aid, crutches

/**
 * Infer the mobility type for an avatar based on its index.
 * Most avatars are 'walking'. Wheelchair avatars are explicitly tagged.
 */
function inferMobility(index: number): 'walking' | 'wheelchair' {
  if (WHEELCHAIR_INDICES.includes(index)) return 'wheelchair';
  return 'walking';
}

// ─── Tags for Filtering (Internal Development Use) ───────────────────────────
// Tags are never shown to players. They assist developers and future features.

function inferTags(index: number): string[] {
  const tags: string[] = [];
  const source = SOURCE_FILE_MAP[index] ?? '';

  // Age indicators
  if (source.includes('older') || source.includes('Grandp') || source.includes('Grandm') || source.includes('Granny')) {
    tags.push('older');
  } else if (source.includes('young') || source.includes('alt_poc_male_young')) {
    tags.push('young');
  } else if (source.includes('adult') || source.includes('millenial')) {
    tags.push('adult');
  }

  // Accessibility indicators
  if (WHEELCHAIR_INDICES.includes(index)) tags.push('wheelchair');
  if (WALKING_AID_INDICES.includes(index)) tags.push('mobility_aid');
  if (source.includes('artificial_leg')) tags.push('prosthetic');

  // Cultural indicators
  if (source.includes('Hijab')) tags.push('hijab');

  return tags;
}

// ─── Thumbnail Mapping ───────────────────────────────────────────────────────
// 190 PNG thumbnails map to 117 GLB models.
// Some avatars have multiple thumbnail angles/views.
// The primary thumbnail for each GLB is its index (1-117).
// Additional thumbnails (118-190) are alternate views assigned round-robin.

/**
 * Get the primary thumbnail index for a given avatar model index.
 * Each avatar model gets at least one dedicated thumbnail matching its index.
 */
function getPrimaryThumbnailIndex(avatarIndex: number): number {
  return avatarIndex; // 1:1 mapping for indices 1-117
}

/**
 * Get all thumbnail indices for a given avatar model index.
 * Includes the primary plus any alternates from the 118-190 range.
 */
function getAllThumbnailIndices(avatarIndex: number): number[] {
  const indices = [avatarIndex];
  // Alternate thumbnails (118-190) cycle across the 117 avatars
  const EXTRA_THUMBNAILS = 190 - 117; // 73 extra
  const extraStart = 118;

  for (let i = 0; i < EXTRA_THUMBNAILS; i++) {
    const mappedAvatar = (i % 117) + 1;
    if (mappedAvatar === avatarIndex) {
      indices.push(extraStart + i);
    }
  }
  return indices;
}

// ─── Catalog Builder ─────────────────────────────────────────────────────────

/** Total number of production avatar models */
const TOTAL_AVATARS = 117;

/** Total number of available thumbnail images */
export const TOTAL_THUMBNAILS = 190;

/**
 * Build the complete avatar catalog from the 117 production GLBs.
 * Each entry is a complete, self-contained character.
 * No assembly or customization required by the player.
 */
function buildCatalog(): AvatarModelEntry[] {
  const catalog: AvatarModelEntry[] = [];

  for (let i = 1; i <= TOTAL_AVATARS; i++) {
    const id = `avatar_${i.toString().padStart(3, '0')}`;
    const thumbnailIndex = getPrimaryThumbnailIndex(i);

    catalog.push({
      id,
      file: `https://pub-c8d7825ef99c46e28cb31aee23b53d38.r2.dev`,
      thumbnail: `https://pub-c8d7825ef99c46e28cb31aee23b53d38.r2.dev`,
      mobility: inferMobility(i),
      tags: inferTags(i),
    });
  }

  return catalog;
}

// ─── Exported Catalog & Utilities ────────────────────────────────────────────

/** The complete production avatar catalog — all 117 selectable avatars */
export const avatarCatalog: AvatarModelEntry[] = buildCatalog();

/** Get an avatar entry by its ID (e.g. 'avatar_017') */
export function getAvatarById(id: string): AvatarModelEntry | undefined {
  return avatarCatalog.find(a => a.id === id);
}

/** Get an avatar entry by its numeric index (1-based) */
export function getAvatarByIndex(index: number): AvatarModelEntry | undefined {
  if (index < 1 || index > TOTAL_AVATARS) return undefined;
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

/** Get the source reference filename for an avatar (dev use only) */
export function getSourceReference(index: number): string {
  return SOURCE_FILE_MAP[index] ?? 'unknown';
}

/** Get all thumbnail paths for an avatar (primary + alternates) */
export function getThumbnailPaths(avatarIndex: number): string[] {
  return getAllThumbnailIndices(avatarIndex).map(
    idx => `/assets/avatars/thumbnails/${idx}.png`
  );
}
