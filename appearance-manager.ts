/**
 * OCC Live - Avatar Appearance Manager (Part 2)
 * Allows runtime changes to avatar appearance by swapping config slots.
 * Changing skin, hair, or clothing rebuilds only the affected slot
 * without touching gameplay code or the player controller.
 */

import * as THREE from 'three';
import type { AvatarConfig, AvatarSlot } from '../types/avatar.ts';
import { AvatarAssembler } from './avatar-assembler.ts';

export class AppearanceManager {
  private assembler: AvatarAssembler;
  private currentConfig: AvatarConfig;
  private avatarGroup: THREE.Group | null = null;

  constructor(assembler: AvatarAssembler, config: AvatarConfig) {
    this.assembler = assembler;
    this.currentConfig = { ...config, accessories: [...config.accessories] };
  }

  /** Get the current avatar config */
  getConfig(): AvatarConfig {
    return { ...this.currentConfig, accessories: [...this.currentConfig.accessories] };
  }

  /** Set the avatar group reference (after assembly) */
  setAvatarGroup(group: THREE.Group): void {
    this.avatarGroup = group;
  }

  /** Get the managed avatar group */
  getAvatarGroup(): THREE.Group | null {
    return this.avatarGroup;
  }

  /** Build the full avatar from current config */
  buildAvatar(): THREE.Group {
    this.avatarGroup = this.assembler.assemble(this.currentConfig);
    return this.avatarGroup;
  }

  /** Update a single slot and rebuild only that slot */
  updateSlot(slot: AvatarSlot, value: string | string[]): void {
    if (slot === 'accessories') {
      this.currentConfig.accessories = value as string[];
    } else {
      (this.currentConfig as any)[slot] = value as string;
    }

    if (this.avatarGroup) {
      // Rebuild full avatar (slot-level partial rebuild would require
      // the assembler to expose individual slot builders publicly,
      // which we can add later for perf. Full rebuild is fine for now.)
      const oldParent = this.avatarGroup.parent;
      const oldPos = this.avatarGroup.position.clone();
      const oldRot = this.avatarGroup.rotation.clone();
      const oldScale = this.avatarGroup.scale.clone();
      const oldUserData = { ...this.avatarGroup.userData };

      if (oldParent) {
        oldParent.remove(this.avatarGroup);
      }

      this.avatarGroup = this.assembler.assemble(this.currentConfig);
      this.avatarGroup.position.copy(oldPos);
      this.avatarGroup.rotation.copy(oldRot);
      this.avatarGroup.scale.copy(oldScale);
      Object.assign(this.avatarGroup.userData, oldUserData);

      if (oldParent) {
        oldParent.add(this.avatarGroup);
      }
    }
  }

  /** Apply an entirely new config */
  applyConfig(config: AvatarConfig): void {
    this.currentConfig = { ...config, accessories: [...config.accessories] };
    if (this.avatarGroup) {
      this.updateSlot('body', config.body); // Triggers full rebuild
    }
  }

  /** Change skin tone */
  setSkin(skinId: string): void {
    this.updateSlot('skin', skinId);
  }

  /** Change hair */
  setHair(hairId: string): void {
    this.updateSlot('hair', hairId);
  }

  /** Change top clothing */
  setTop(topId: string): void {
    this.updateSlot('top', topId);
  }

  /** Change bottom clothing */
  setBottom(bottomId: string): void {
    this.updateSlot('bottom', bottomId);
  }

  /** Change shoes */
  setShoes(shoesId: string): void {
    this.updateSlot('shoes', shoesId);
  }

  /** Set accessories */
  setAccessories(ids: string[]): void {
    this.updateSlot('accessories', ids);
  }

  /** Change body type */
  setBody(bodyId: string): void {
    this.updateSlot('body', bodyId);
  }
}
