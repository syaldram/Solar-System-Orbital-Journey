import * as THREE from 'three';
import { GRAVITY_EXTENT, gravitySurfaceHeight, type GravityCenter } from './gravity-mapping';
import type { RenderingQualityProfile } from './quality-profile';

// Allocate each density once; switching quality or navigating never rebuilds buffers.
export class GravityPresentation {
  readonly root = new THREE.Group();
  private readonly grids = new Map<number, THREE.LineSegments>();
  private readonly lastCenters = new Map<number, readonly GravityCenter[]>();

  constructor() {
    // Schematic fill makes textures/rings readable from either side of the sheet.
    this.root.add(new THREE.AmbientLight(0xb9d2ff, 1.3));
    for (const density of [64, 96, 128]) {
      const coordinates: number[] = [];
      const colors: number[] = [];
      for (let axis = 0; axis < 2; axis += 1) {
        for (let line = 0; line <= density; line += 1) {
          for (let segment = 0; segment < density; segment += 1) {
            for (let endpoint = 0; endpoint < 2; endpoint += 1) {
              const fixed = -GRAVITY_EXTENT + 2 * GRAVITY_EXTENT * line / density;
              const along = -GRAVITY_EXTENT + 2 * GRAVITY_EXTENT * (segment + endpoint) / density;
              const x = axis === 0 ? fixed : along;
              const z = axis === 0 ? along : fixed;
              coordinates.push(x, 0, z);
              const fade = Math.max(0, 1 - (Math.hypot(x, z) / (GRAVITY_EXTENT * 1.12)) ** 4);
              colors.push(0.12 * fade, 0.5 * fade, 0.95 * fade);
            }
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(coordinates, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -20, 0), 190);
      const line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false,
      }));
      this.grids.set(density, line);
      this.root.add(line);
    }
    this.root.visible = false;
  }

  render(centers: readonly GravityCenter[], quality: RenderingQualityProfile): void {
    for (const [density, grid] of this.grids) {
      grid.visible = density === quality.gravityGridDensity;
      if (!grid.visible) continue;
      const previous = this.lastCenters.get(density);
      if (previous?.length === centers.length && centers.every((center, index) => {
        const prior = previous[index];
        return prior?.id === center.id && prior.x === center.x && prior.z === center.z;
      })) continue;
      const positions = grid.geometry.getAttribute('position');
      for (let index = 0; index < positions.count; index += 1) {
        positions.setY(index, gravitySurfaceHeight(positions.getX(index), positions.getZ(index), centers));
      }
      positions.needsUpdate = true;
      this.lastCenters.set(density, centers.map((center) => ({ ...center })));
    }
  }

  dispose(): void {
    for (const grid of this.grids.values()) {
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
    }
    this.root.removeFromParent();
  }
}
