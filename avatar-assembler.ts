/**
 * OCC Live - Avatar Assembler (Part 2)
 * Builds a modular avatar character from an AvatarConfig.
 * Each slot (body, skin, hair, top, bottom, shoes, accessories) is
 * represented as a separate child object within the avatar group.
 * Placeholder geometry is used until Meshy .glb assets are available.
 * Replacing the asset file in config regenerates the slot without
 * touching gameplay code.
 */

import * as THREE from 'three';
import type { AvatarConfig } from '../types/avatar.ts';

/** Color palettes for placeholder avatar construction */
const SKIN_PALETTE: Record<string, number> = {
  skin_01: 0xfde7c8,
  skin_02: 0xf5c9a0,
  skin_03: 0xd4a373,
  skin_04: 0xb07c4f,
  skin_05: 0x8b5e34,
  skin_06: 0x6b4226,
  skin_07: 0x4a2c17,
  skin_08: 0xffe0bd,
};

const HAIR_PALETTE: Record<string, number> = {
  hair_01: 0x2c1b0e,  // dark brown
  hair_02: 0x8b4513,  // medium brown
  hair_03: 0xdaa520,  // golden blonde
  hair_04: 0x1a1a1a,  // black
  hair_05: 0xb22222,  // red
  hair_06: 0xf5deb3,  // light blonde
  hair_07: 0x6b238e,  // purple
  hair_08: 0x4169e1,  // blue
};

const TOP_PALETTE: Record<string, number> = {
  top_01: 0x4488cc,  // blue tee
  top_02: 0xcc4444,  // red tee
  top_03: 0x44cc44,  // green tee
  top_04: 0xcc8844,  // orange hoodie
  top_05: 0x8844cc,  // purple sweater
  top_06: 0xffffff,  // white tee
  top_07: 0x333333,  // black tee
  top_08: 0xff69b4,  // pink
};

const BOTTOM_PALETTE: Record<string, number> = {
  bottom_01: 0x2c3e50,  // dark jeans
  bottom_02: 0x5c84a8,  // light jeans
  bottom_03: 0x2f4f4f,  // dark pants
  bottom_04: 0x8b4513,  // brown pants
  bottom_05: 0x556b2f,  // olive
  bottom_06: 0x191970,  // navy
};

const SHOE_PALETTE: Record<string, number> = {
  shoes_01: 0xffffff,  // white sneakers
  shoes_02: 0x333333,  // black shoes
  shoes_03: 0xcc4444,  // red sneakers
  shoes_04: 0x8b4513,  // brown boots
  shoes_05: 0x4488cc,  // blue sneakers
};

/** Body type proportions */
const BODY_TYPES: Record<string, { torsoWidth: number; torsoHeight: number; legWidth: number }> = {
  body_01: { torsoWidth: 0.28, torsoHeight: 0.55, legWidth: 0.12 },
  body_02: { torsoWidth: 0.32, torsoHeight: 0.52, legWidth: 0.14 },
  body_03: { torsoWidth: 0.26, torsoHeight: 0.58, legWidth: 0.11 },
  body_04: { torsoWidth: 0.34, torsoHeight: 0.50, legWidth: 0.15 },
};

/**
 * Assembles a THREE.Group representing the full avatar from config.
 * Each slot is a named child group for easy replacement.
 */
export class AvatarAssembler {

  /** Build a complete avatar mesh group from config */
  assemble(config: AvatarConfig): THREE.Group {
    const avatar = new THREE.Group();
    avatar.name = 'avatar';
    avatar.userData = { isAvatar: true, config: { ...config } };

    const bodyType = BODY_TYPES[config.body] ?? BODY_TYPES['body_01'];
    const skinColor = SKIN_PALETTE[config.skin] ?? SKIN_PALETTE['skin_01'];

    // Body slot
    const bodyGroup = this.buildBody(bodyType, skinColor);
    bodyGroup.name = 'slot_body';
    avatar.add(bodyGroup);

    // Face (eyes + mouth on head)
    const faceGroup = this.buildFace(config.eyes, config.mouth);
    faceGroup.name = 'slot_face';
    faceGroup.position.y = 1.55;
    avatar.add(faceGroup);

    // Hair
    const hairGroup = this.buildHair(config.hair);
    hairGroup.name = 'slot_hair';
    hairGroup.position.y = 1.65;
    avatar.add(hairGroup);

    // Top (shirt/hoodie)
    const topGroup = this.buildTop(config.top, bodyType);
    topGroup.name = 'slot_top';
    avatar.add(topGroup);

    // Bottom (pants/shorts)
    const bottomGroup = this.buildBottom(config.bottom, bodyType);
    bottomGroup.name = 'slot_bottom';
    avatar.add(bottomGroup);

    // Shoes
    const shoesGroup = this.buildShoes(config.shoes);
    shoesGroup.name = 'slot_shoes';
    avatar.add(shoesGroup);

    // Accessories
    const accessoriesGroup = this.buildAccessories(config.accessories);
    accessoriesGroup.name = 'slot_accessories';
    avatar.add(accessoriesGroup);

    // Apply scale
    avatar.scale.set(config.scale[0], config.scale[1], config.scale[2]);

    return avatar;
  }

  /** Replace a single slot on an existing avatar */
  replaceSlot(avatar: THREE.Group, slotName: string, newMesh: THREE.Group): void {
    const existing = avatar.getObjectByName(slotName);
    if (existing) {
      avatar.remove(existing);
    }
    newMesh.name = slotName;
    avatar.add(newMesh);
  }

  // ─── Slot Builders (Placeholder Geometry) ──────────────────────────────

  private buildBody(bodyType: { torsoWidth: number; torsoHeight: number; legWidth: number }, skinColor: number): THREE.Group {
    const group = new THREE.Group();

    // Head
    const headGeo = new THREE.SphereGeometry(0.22, 14, 14);
    const headMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.55;
    head.name = 'head';
    group.add(head);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.12, 8);
    const neckMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const neck = new THREE.Mesh(neckGeo, neckMat);
    neck.position.y = 1.32;
    group.add(neck);

    // Arms (skin-colored)
    const armGeo = new THREE.CapsuleGeometry(0.07, 0.4, 4, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });

    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-(bodyType.torsoWidth + 0.1), 1.05, 0);
    leftArm.rotation.z = 0.15;
    leftArm.name = 'arm_left';
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(bodyType.torsoWidth + 0.1, 1.05, 0);
    rightArm.rotation.z = -0.15;
    rightArm.name = 'arm_right';
    group.add(rightArm);

    // Hands
    const handGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const handMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });

    const leftHand = new THREE.Mesh(handGeo, handMat);
    leftHand.position.set(-(bodyType.torsoWidth + 0.12), 0.78, 0);
    group.add(leftHand);

    const rightHand = new THREE.Mesh(handGeo, handMat);
    rightHand.position.set(bodyType.torsoWidth + 0.12, 0.78, 0);
    group.add(rightHand);

    return group;
  }

  private buildFace(eyesId: string, mouthId: string): THREE.Group {
    const group = new THREE.Group();

    // Eyes (two small dark spheres)
    const eyeGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.07, 0.02, 0.18);
    leftEye.name = 'eye_left';
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.07, 0.02, 0.18);
    rightEye.name = 'eye_right';
    group.add(rightEye);

    // Eye whites (slightly larger, behind)
    const eyeWhiteGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const leftWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    leftWhite.position.set(-0.07, 0.02, 0.16);
    group.add(leftWhite);

    const rightWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    rightWhite.position.set(0.07, 0.02, 0.16);
    group.add(rightWhite);

    // Mouth (small curved shape)
    const mouthGeo = new THREE.TorusGeometry(0.04, 0.015, 8, 12, Math.PI);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0xcc6666 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.07, 0.18);
    mouth.rotation.x = Math.PI;
    mouth.name = 'mouth';
    group.add(mouth);

    group.userData = { eyesId, mouthId };
    return group;
  }

  private buildHair(hairId: string): THREE.Group {
    const group = new THREE.Group();
    const color = HAIR_PALETTE[hairId] ?? HAIR_PALETTE['hair_01'];

    // Base hair volume on head
    const hairGeo = new THREE.SphereGeometry(0.24, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const hairMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 0.04;
    group.add(hair);

    // Style variation based on ID
    const styleIndex = parseInt(hairId.replace('hair_', '')) || 1;
    if (styleIndex >= 3) {
      // Longer hair - add back piece
      const backGeo = new THREE.CapsuleGeometry(0.12, 0.25, 4, 8);
      const back = new THREE.Mesh(backGeo, hairMat);
      back.position.set(0, -0.15, -0.1);
      group.add(back);
    }
    if (styleIndex >= 5) {
      // Even longer / more volume
      const sideGeo = new THREE.CapsuleGeometry(0.08, 0.15, 4, 8);
      const leftSide = new THREE.Mesh(sideGeo, hairMat);
      leftSide.position.set(-0.15, -0.1, 0);
      group.add(leftSide);
      const rightSide = new THREE.Mesh(sideGeo, hairMat);
      rightSide.position.set(0.15, -0.1, 0);
      group.add(rightSide);
    }

    group.userData = { hairId };
    return group;
  }

  private buildTop(topId: string, bodyType: { torsoWidth: number; torsoHeight: number }): THREE.Group {
    const group = new THREE.Group();
    const color = TOP_PALETTE[topId] ?? TOP_PALETTE['top_01'];

    // Torso clothing
    const torsoGeo = new THREE.CapsuleGeometry(bodyType.torsoWidth, bodyType.torsoHeight, 4, 8);
    const torsoMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.05;
    torso.name = 'torso';
    group.add(torso);

    // Sleeves
    const sleeveGeo = new THREE.CapsuleGeometry(0.085, 0.18, 4, 8);
    const sleeveMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });

    const leftSleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
    leftSleeve.position.set(-(bodyType.torsoWidth + 0.08), 1.15, 0);
    leftSleeve.rotation.z = 0.15;
    group.add(leftSleeve);

    const rightSleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
    rightSleeve.position.set(bodyType.torsoWidth + 0.08, 1.15, 0);
    rightSleeve.rotation.z = -0.15;
    group.add(rightSleeve);

    group.userData = { topId };
    return group;
  }

  private buildBottom(bottomId: string, bodyType: { legWidth: number }): THREE.Group {
    const group = new THREE.Group();
    const color = BOTTOM_PALETTE[bottomId] ?? BOTTOM_PALETTE['bottom_01'];

    // Left leg
    const legGeo = new THREE.CapsuleGeometry(bodyType.legWidth, 0.4, 4, 8);
    const legMat = new THREE.MeshStandardMaterial({ color, roughness: 0.75 });

    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.1, 0.42, 0);
    leftLeg.name = 'leg_left';
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.1, 0.42, 0);
    rightLeg.name = 'leg_right';
    group.add(rightLeg);

    group.userData = { bottomId };
    return group;
  }

  private buildShoes(shoesId: string): THREE.Group {
    const group = new THREE.Group();
    const color = SHOE_PALETTE[shoesId] ?? SHOE_PALETTE['shoes_01'];

    const shoeGeo = new THREE.BoxGeometry(0.12, 0.08, 0.2);
    const shoeMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });

    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(-0.1, 0.04, 0.03);
    group.add(leftShoe);

    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0.1, 0.04, 0.03);
    group.add(rightShoe);

    group.userData = { shoesId };
    return group;
  }

  private buildAccessories(accessoryIds: string[]): THREE.Group {
    const group = new THREE.Group();

    for (const id of accessoryIds) {
      if (id.startsWith('glasses')) {
        const glassesGroup = this.buildGlasses();
        glassesGroup.name = `accessory_${id}`;
        glassesGroup.position.y = 1.56;
        group.add(glassesGroup);
      } else if (id.startsWith('headphones')) {
        const hpGroup = this.buildHeadphones();
        hpGroup.name = `accessory_${id}`;
        hpGroup.position.y = 1.6;
        group.add(hpGroup);
      } else if (id.startsWith('hat')) {
        const hatGroup = this.buildHat();
        hatGroup.name = `accessory_${id}`;
        hatGroup.position.y = 1.75;
        group.add(hatGroup);
      }
    }

    group.userData = { accessoryIds };
    return group;
  }

  private buildGlasses(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const lensGeo = new THREE.RingGeometry(0.035, 0.045, 12);

    const leftLens = new THREE.Mesh(lensGeo, mat);
    leftLens.position.set(-0.065, 0, 0.2);
    group.add(leftLens);

    const rightLens = new THREE.Mesh(lensGeo, mat);
    rightLens.position.set(0.065, 0, 0.2);
    group.add(rightLens);

    // Bridge
    const bridgeGeo = new THREE.BoxGeometry(0.05, 0.01, 0.01);
    const bridge = new THREE.Mesh(bridgeGeo, mat);
    bridge.position.set(0, 0, 0.2);
    group.add(bridge);

    return group;
  }

  private buildHeadphones(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 });

    // Band
    const bandGeo = new THREE.TorusGeometry(0.2, 0.02, 8, 16, Math.PI);
    const band = new THREE.Mesh(bandGeo, mat);
    band.rotation.z = Math.PI;
    band.position.y = 0.05;
    group.add(band);

    // Ear cups
    const cupGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12);
    const leftCup = new THREE.Mesh(cupGeo, mat);
    leftCup.position.set(-0.2, -0.02, 0);
    leftCup.rotation.z = Math.PI / 2;
    group.add(leftCup);

    const rightCup = new THREE.Mesh(cupGeo, mat);
    rightCup.position.set(0.2, -0.02, 0);
    rightCup.rotation.z = Math.PI / 2;
    group.add(rightCup);

    return group;
  }

  private buildHat(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x2f4f4f, roughness: 0.7 });

    // Cap dome
    const domeGeo = new THREE.SphereGeometry(0.23, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const dome = new THREE.Mesh(domeGeo, mat);
    group.add(dome);

    // Brim
    const brimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.02, 16);
    const brim = new THREE.Mesh(brimGeo, mat);
    brim.position.set(0, -0.01, 0.08);
    group.add(brim);

    return group;
  }
}
