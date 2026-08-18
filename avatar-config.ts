/**
 * OCC Live - Default Avatar Configuration (Part 2)
 * Data-driven avatar appearance. Change these values to modify the
 * player's visual without touching gameplay code.
 */

import type { AvatarConfig, AvatarAssetManifest } from '../types/avatar.ts';

/** Default avatar for a new anonymous session */
export const defaultAvatarConfig: AvatarConfig = {
  body: 'body_01',
  skin: 'skin_03',
  eyes: 'eyes_01',
  mouth: 'mouth_01',
  hair: 'hair_02',
  top: 'top_01',
  bottom: 'bottom_01',
  shoes: 'shoes_01',
  accessories: [],
  scale: [1, 1, 1],
  mobility: 'walking',
};

/** Generate a random avatar config for variety (NPC or random assign) */
export function generateRandomAvatarConfig(): AvatarConfig {
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  return {
    body: pick(['body_01', 'body_02', 'body_03', 'body_04']),
    skin: pick(['skin_01', 'skin_02', 'skin_03', 'skin_04', 'skin_05', 'skin_06', 'skin_07', 'skin_08']),
    eyes: pick(['eyes_01', 'eyes_02', 'eyes_03']),
    mouth: pick(['mouth_01', 'mouth_02']),
    hair: pick(['hair_01', 'hair_02', 'hair_03', 'hair_04', 'hair_05', 'hair_06', 'hair_07', 'hair_08']),
    top: pick(['top_01', 'top_02', 'top_03', 'top_04', 'top_05', 'top_06', 'top_07', 'top_08']),
    bottom: pick(['bottom_01', 'bottom_02', 'bottom_03', 'bottom_04', 'bottom_05', 'bottom_06']),
    shoes: pick(['shoes_01', 'shoes_02', 'shoes_03', 'shoes_04', 'shoes_05']),
    accessories: Math.random() > 0.7 ? [pick(['glasses_01', 'headphones_01', 'hat_01'])] : [],
    scale: [1, 1, 1],
    mobility: pick(['walking', 'walking', 'walking', 'walking', 'wheelchair']),
  };
}

/**
 * Avatar asset manifest — defines all available options per slot.
 * File is null for placeholder geometry; set to .glb path when Meshy assets arrive.
 */
export const avatarAssetManifest: AvatarAssetManifest = {
  bodies: [
    { id: 'body_01', slot: 'body', file: null, label: 'Type A' },
    { id: 'body_02', slot: 'body', file: null, label: 'Type B' },
    { id: 'body_03', slot: 'body', file: null, label: 'Type C' },
    { id: 'body_04', slot: 'body', file: null, label: 'Type D' },
  ],
  skins: [
    { id: 'skin_01', slot: 'skin', file: null, label: 'Skin 1' },
    { id: 'skin_02', slot: 'skin', file: null, label: 'Skin 2' },
    { id: 'skin_03', slot: 'skin', file: null, label: 'Skin 3' },
    { id: 'skin_04', slot: 'skin', file: null, label: 'Skin 4' },
    { id: 'skin_05', slot: 'skin', file: null, label: 'Skin 5' },
    { id: 'skin_06', slot: 'skin', file: null, label: 'Skin 6' },
    { id: 'skin_07', slot: 'skin', file: null, label: 'Skin 7' },
    { id: 'skin_08', slot: 'skin', file: null, label: 'Skin 8' },
  ],
  eyes: [
    { id: 'eyes_01', slot: 'eyes', file: null, label: 'Standard' },
    { id: 'eyes_02', slot: 'eyes', file: null, label: 'Round' },
    { id: 'eyes_03', slot: 'eyes', file: null, label: 'Narrow' },
  ],
  mouths: [
    { id: 'mouth_01', slot: 'mouth', file: null, label: 'Neutral' },
    { id: 'mouth_02', slot: 'mouth', file: null, label: 'Smile' },
  ],
  hairs: [
    { id: 'hair_01', slot: 'hair', file: null, label: 'Short Dark' },
    { id: 'hair_02', slot: 'hair', file: null, label: 'Medium Brown' },
    { id: 'hair_03', slot: 'hair', file: null, label: 'Golden Long' },
    { id: 'hair_04', slot: 'hair', file: null, label: 'Short Black' },
    { id: 'hair_05', slot: 'hair', file: null, label: 'Red Long' },
    { id: 'hair_06', slot: 'hair', file: null, label: 'Light Blonde' },
    { id: 'hair_07', slot: 'hair', file: null, label: 'Purple' },
    { id: 'hair_08', slot: 'hair', file: null, label: 'Blue' },
  ],
  tops: [
    { id: 'top_01', slot: 'top', file: null, label: 'Blue Tee' },
    { id: 'top_02', slot: 'top', file: null, label: 'Red Tee' },
    { id: 'top_03', slot: 'top', file: null, label: 'Green Tee' },
    { id: 'top_04', slot: 'top', file: null, label: 'Orange Hoodie' },
    { id: 'top_05', slot: 'top', file: null, label: 'Purple Sweater' },
    { id: 'top_06', slot: 'top', file: null, label: 'White Tee' },
    { id: 'top_07', slot: 'top', file: null, label: 'Black Tee' },
    { id: 'top_08', slot: 'top', file: null, label: 'Pink' },
  ],
  bottoms: [
    { id: 'bottom_01', slot: 'bottom', file: null, label: 'Dark Jeans' },
    { id: 'bottom_02', slot: 'bottom', file: null, label: 'Light Jeans' },
    { id: 'bottom_03', slot: 'bottom', file: null, label: 'Dark Pants' },
    { id: 'bottom_04', slot: 'bottom', file: null, label: 'Brown Pants' },
    { id: 'bottom_05', slot: 'bottom', file: null, label: 'Olive' },
    { id: 'bottom_06', slot: 'bottom', file: null, label: 'Navy' },
  ],
  shoes: [
    { id: 'shoes_01', slot: 'shoes', file: null, label: 'White Sneakers' },
    { id: 'shoes_02', slot: 'shoes', file: null, label: 'Black Shoes' },
    { id: 'shoes_03', slot: 'shoes', file: null, label: 'Red Sneakers' },
    { id: 'shoes_04', slot: 'shoes', file: null, label: 'Brown Boots' },
    { id: 'shoes_05', slot: 'shoes', file: null, label: 'Blue Sneakers' },
  ],
  accessories: [
    { id: 'glasses_01', slot: 'accessories', file: null, label: 'Glasses' },
    { id: 'headphones_01', slot: 'accessories', file: null, label: 'Headphones' },
    { id: 'hat_01', slot: 'accessories', file: null, label: 'Cap' },
  ],
};
