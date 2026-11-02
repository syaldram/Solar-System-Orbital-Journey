import * as THREE from 'three';
import type { RenderingQualityProfile } from './quality-profile';

// Illustrative scene units only. The guide axis deliberately differs from the
// artwork's tail axis; it asserts no measured Galactic/interstellar alignment.
const CAPACITY = 48;
const VERTICES_PER_MARKER = 6;
const DEPTH = 864;
const CADENCE = 12;

/** Passing background reference crosses for a stable tracking composition. */
export class HeliosphereTravelPresentation {
  readonly root = new THREE.Group();
  private readonly guides = new THREE.LineSegments(
    new THREE.BufferGeometry()
      .setAttribute('position', new THREE.BufferAttribute(new Float32Array(CAPACITY * VERTICES_PER_MARKER * 3), 3).setUsage(THREE.DynamicDrawUsage))
      .setAttribute('color', new THREE.BufferAttribute(new Float32Array(CAPACITY * VERTICES_PER_MARKER * 4), 4).setUsage(THREE.DynamicDrawUsage)),
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.48, depthWrite: false }),
  );
  private sampledPhase: number | null = null;

  constructor() {
    this.root.name = 'heliosphere-travel';
    this.guides.name = 'heliosphere-travel-guides';
    this.guides.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(-125, 0, 0), 600);
    // Background reference guides intentionally draw behind every translucent
    // envelope for readability, not as depth-correct physical markers or stars.
    this.guides.renderOrder = -500;
    this.root.add(this.guides);
    this.render(0);
    this.root.visible = false;
  }

  setDensity(quality: RenderingQualityProfile, viewportWidth: number): void {
    const count = quality.solarCoronaLayerCount * 12 + 12;
    this.guides.geometry.setDrawRange(0, (viewportWidth <= 700 ? count / 2 : count) * VERTICES_PER_MARKER);
  }

  /** Pure sampling of Experience's retained phase; no accumulated travel offset. */
  render(phaseSeconds: number): void {
    const phase = Number.isFinite(phaseSeconds) && phaseSeconds >= 0 ? phaseSeconds : 0;
    if (this.sampledPhase === phase) return;
    this.sampledPhase = phase;
    const positions = this.guides.geometry.getAttribute('position');
    const colors = this.guides.geometry.getAttribute('color');
    for (let index = 0; index < CAPACITY; index += 1) {
      // Prefixes cover all sides so lower density preserves the same identities.
      const angle = index * 2.399963229728653;
      const x = -125 + Math.cos(angle) * 340;
      const y = Math.sin(angle) * 205;
      const distance = ((index * 137.31 - (phase % (DEPTH / CADENCE)) * CADENCE) % DEPTH + DEPTH) % DEPTH;
      const z = distance - DEPTH / 2;
      // Invisible at wrap, with gradual fade instead of popping or streaking.
      const edge = Math.min(1, distance / 90, (DEPTH - distance) / 90);
      const fade = edge * edge * (3 - 2 * edge);
      for (let vertex = 0; vertex < VERTICES_PER_MARKER; vertex += 1) {
        const axis = Math.floor(vertex / 2);
        const offset = vertex % 2 === 0 ? -4 : 4;
        const target = index * VERTICES_PER_MARKER + vertex;
        positions.setXYZ(target, x + (axis === 0 ? offset : 0), y + (axis === 1 ? offset : 0), z + (axis === 2 ? offset : 0));
        colors.setXYZW(target, 0.3, 0.72, 0.85, fade);
      }
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  }

  dispose(): void {
    this.guides.geometry.dispose();
    this.guides.material.dispose();
    this.root.clear();
    this.root.removeFromParent();
  }
}
