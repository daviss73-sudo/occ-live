/**
 * Three.js type declarations
 * Using ambient module declarations until @types/three is installed.
 * Run: npm install --save-dev @types/three
 * Then this file can be deleted.
 */

declare module 'three' {
  export class Vector3 {
    x: number; y: number; z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    copy(v: Vector3): this;
    clone(): Vector3;
    add(v: Vector3): this;
    sub(v: Vector3): this;
    normalize(): this;
    distanceTo(v: Vector3): number;
    length(): number;
    lengthSq(): number;
    lerp(v: Vector3, alpha: number): this;
    setScalar(s: number): this;
  }

  export class Euler {
    x: number; y: number; z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    clone(): Euler;
    copy(euler: Euler): this;
  }

  export class Color {
    constructor(color?: number | string);
    setHSL(h: number, s: number, l: number): this;
    setHex(hex: number): this;
    getHex(): number;
  }

  export class Object3D {
    parent: Object3D | null;
    position: Vector3;
    rotation: Euler;
    scale: Vector3;
    name: string;
    uuid: string;
    userData: Record<string, any>;
    visible: boolean;
    children: Object3D[];
    castShadow: boolean;
    receiveShadow: boolean;
    add(...objects: Object3D[]): this;
    remove(...objects: Object3D[]): this;
    getObjectByName(name: string): Object3D | undefined;
    clone(recursive?: boolean): this;
    traverse(callback: (child: Object3D) => void): void;
  }

  export class Group extends Object3D {
    constructor();
    clone(recursive?: boolean): this;
  }

  export class Scene extends Object3D {
    background: Color | null;
    fog: Fog | null;
  }

  export class Fog {
    color: Color;
    near: number;
    far: number;
    constructor(color: number, near: number, far: number);
  }

  export class Mesh extends Object3D {
    constructor(geometry?: BufferGeometry, material?: Material | Material[]);
    geometry: BufferGeometry;
    material: Material | Material[];
    isMesh: boolean;
  }

  export class SkinnedMesh extends Mesh {
    isSkinnedMesh: boolean;
    skeleton: { bones: Object3D[] } | null;
  }

  export class Sprite extends Object3D {
    constructor(material?: SpriteMaterial);
  }

  export class Camera extends Object3D {}

  export class PerspectiveCamera extends Camera {
    constructor(fov?: number, aspect?: number, near?: number, far?: number);
    aspect: number;
    updateProjectionMatrix(): void;
    lookAt(target: Vector3): void;
    lookAt(x: number, y: number, z: number): void;
  }

  export class WebGLRenderer {
    constructor(params?: { antialias?: boolean; alpha?: boolean; canvas?: HTMLCanvasElement });
    domElement: HTMLCanvasElement;
    shadowMap: { enabled: boolean; type: any };
    toneMapping: any;
    toneMappingExposure: number;
    info: {
      render: { calls: number; triangles: number; points: number; lines: number };
      memory: { geometries: number; textures: number };
      programs: any[] | null;
    };
    setSize(width: number, height: number): void;
    setPixelRatio(ratio: number): void;
    setClearColor(color: number, alpha?: number): void;
    render(scene: Scene, camera: Camera): void;
    dispose(): void;
  }

  export class BufferGeometry {
    boundingBox: Box3 | null;
    dispose(): void;
    setFromPoints(points: Vector3[]): this;
    computeBoundingBox(): void;
  }

  export class PlaneGeometry extends BufferGeometry {
    constructor(width?: number, height?: number, widthSegments?: number, heightSegments?: number);
  }

  export class CircleGeometry extends BufferGeometry {
    constructor(radius?: number, segments?: number);
  }

  export class RingGeometry extends BufferGeometry {
    constructor(innerRadius?: number, outerRadius?: number, thetaSegments?: number);
  }

  export class BoxGeometry extends BufferGeometry {
    constructor(width?: number, height?: number, depth?: number);
  }

  export class SphereGeometry extends BufferGeometry {
    constructor(radius?: number, widthSegments?: number, heightSegments?: number, phiStart?: number, phiLength?: number, thetaStart?: number, thetaLength?: number);
  }

  export class CapsuleGeometry extends BufferGeometry {
    constructor(radius?: number, length?: number, capSegments?: number, radialSegments?: number);
  }

  export class CylinderGeometry extends BufferGeometry {
    constructor(radiusTop?: number, radiusBottom?: number, height?: number, radialSegments?: number, heightSegments?: number, openEnded?: boolean);
  }

  export class TorusGeometry extends BufferGeometry {
    constructor(radius?: number, tube?: number, radialSegments?: number, tubularSegments?: number, arc?: number);
  }

  export class Material {
    uuid: string;
    name: string;
    dispose(): void;
    clone(): this;
    transparent: boolean;
    opacity: number;
    color: Color;
    side: number;
    needsUpdate: boolean;
  }

  export class MeshStandardMaterial extends Material {
    constructor(params?: {
      color?: number | Color;
      roughness?: number;
      metalness?: number;
      transparent?: boolean;
      opacity?: number;
      wireframe?: boolean;
      side?: number;
      emissive?: number | Color;
      emissiveIntensity?: number;
    });
    roughness: number;
    metalness: number;
    wireframe: boolean;
    emissive: Color;
    emissiveIntensity: number;
    map: Texture | null;
    normalMap: Texture | null;
    roughnessMap: Texture | null;
    metalnessMap: Texture | null;
    emissiveMap: Texture | null;
  }

  export class MeshBasicMaterial extends Material {
    constructor(params?: {
      color?: number;
      transparent?: boolean;
      opacity?: number;
      side?: number;
      wireframe?: boolean;
    });
  }

  export class SpriteMaterial extends Material {
    constructor(params?: { map?: Texture; transparent?: boolean });
  }

  export class ShaderMaterial extends Material {
    constructor(params?: {
      uniforms?: Record<string, { value: any }>;
      vertexShader?: string;
      fragmentShader?: string;
      side?: number;
    });
  }

  export class Texture {
    dispose(): void;
  }

  export class CanvasTexture extends Texture {
    constructor(canvas: HTMLCanvasElement);
  }

  export class Sphere {
    center: Vector3;
    radius: number;
    constructor(center?: Vector3, radius?: number);
    containsPoint(point: Vector3): boolean;
  }

  export class DirectionalLight extends Object3D {
    constructor(color?: number, intensity?: number);
    castShadow: boolean;
    shadow: {
      mapSize: Vector2Like;
      camera: { near: number; far: number; left: number; right: number; top: number; bottom: number };
    };
  }

  export class AmbientLight extends Light {
    constructor(color?: number, intensity?: number);
  }

  export class HemisphereLight extends Object3D {
    constructor(skyColor?: number, groundColor?: number, intensity?: number);
  }

  interface Vector2Like {
    set(x: number, y: number): void;
  }

  export class Light extends Object3D {
    constructor(color?: number, intensity?: number);
    castShadow: boolean;
    intensity: number;
    color: Color;
  }

  export class PointLight extends Light {
    constructor(color?: number, intensity?: number, distance?: number);
  }

  export class Box3 {
    min: Vector3;
    max: Vector3;
    constructor();
    setFromObject(obj: Object3D): this;
    getCenter(target: Vector3): Vector3;
    getSize(target: Vector3): Vector3;
  }

  export class Line extends Object3D {
    constructor(geometry?: BufferGeometry, material?: Material);
  }

  export class LineBasicMaterial extends Material {
    constructor(params?: { color?: number; transparent?: boolean; opacity?: number });
  }

  export const DoubleSide: number;
  export const BackSide: number;
  export const PCFSoftShadowMap: any;
  export const ACESFilmicToneMapping: any;

  export namespace MathUtils {
    function clamp(value: number, min: number, max: number): number;
  }
}

declare module 'three/addons/loaders/GLTFLoader.js' {
  import { Group } from 'three';

  export interface GLTF {
    scene: Group;
    scenes: Group[];
    animations: any[];
    cameras: any[];
    asset: any;
  }

  export class GLTFLoader {
    constructor();
    load(url: string, onLoad: (gltf: GLTF) => void, onProgress?: (event: ProgressEvent) => void, onError?: (error: Error) => void): void;
    loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<GLTF>;
  }
}

declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
  export { GLTFLoader, GLTF } from 'three/addons/loaders/GLTFLoader.js';
}
