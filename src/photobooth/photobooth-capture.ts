/**
 * OCC Live - Photobooth Capture System
 * Captures the photobooth scene as a local image.
 *
 * Privacy:
 * - Photos processed locally only (canvas toDataURL)
 * - Not uploaded to Firebase, Firestore, or any server
 * - Not stored in a persistent gallery
 * - Not associated with student names/IDs/emails
 * - Each participant downloads their own copy directly
 * - Camera resources released when done
 */

import * as THREE from 'three';
import type { PhotoCaptureResult, PhotoboothConfig } from './photobooth-types.ts';

export class PhotoboothCapture {
  private config: PhotoboothConfig;
  private captureCamera: THREE.PerspectiveCamera | null = null;

  constructor(config: PhotoboothConfig) {
    this.config = config;
  }

  /**
   * Capture the photobooth scene from the configured camera angle.
   * Returns a local-only PhotoCaptureResult with base64 PNG data.
   */
  capture(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    poseId: string,
    participantCount: number
  ): PhotoCaptureResult {
    if (!this.captureCamera) {
      this.captureCamera = new THREE.PerspectiveCamera(50, 4 / 3, 0.1, 100);
    }

    const camPos = this.config.cameraPosition;
    const camTarget = this.config.cameraTarget;
    const boothPos = this.config.position;

    this.captureCamera.position.set(
      boothPos[0] + camPos[0],
      boothPos[1] + camPos[1],
      boothPos[2] + camPos[2]
    );
    this.captureCamera.lookAt(new THREE.Vector3(
      boothPos[0] + camTarget[0],
      boothPos[1] + camTarget[1],
      boothPos[2] + camTarget[2]
    ));

    // Render at photo quality resolution
    const width = 1200;
    const height = 900;
    const prevWidth = renderer.domElement.width;
    const prevHeight = renderer.domElement.height;

    renderer.setSize(width, height);
    renderer.render(scene, this.captureCamera);

    const imageDataUrl = renderer.domElement.toDataURL('image/png');

    // Restore original size
    renderer.setSize(prevWidth, prevHeight);

    return {
      captureId: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      imageDataUrl,
      capturedAt: Date.now(),
      participantCount,
      poseId,
      photoboothId: this.config.id,
    };
  }

  /** Trigger local download — no server upload */
  downloadPhoto(result: PhotoCaptureResult): void {
    const link = document.createElement('a');
    link.href = result.imageDataUrl;
    link.download = `occ-live-photo-${result.captureId}.png`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /** Release camera resources */
  dispose(): void {
    this.captureCamera = null;
  }
}
