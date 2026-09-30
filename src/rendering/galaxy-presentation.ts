import * as THREE from 'three';

import { createGalaxyTexture, createGlowTexture, seededRandom } from './procedural-materials';
import type { RenderingQualityProfile } from './quality-profile';

export interface GalaxyPresentationState {
  readonly nowMs: number;
  readonly progress: number;
  readonly reducedMotion: boolean;
  readonly visible: boolean;
  readonly quality: RenderingQualityProfile;
}

export class GalaxyPresentation {
  readonly root = new THREE.Group();
  readonly sunMarker: THREE.Mesh;

  private readonly stars: THREE.Points;
  private readonly diskMaterial: THREE.MeshBasicMaterial;
  private readonly hazeMaterial: THREE.MeshBasicMaterial;
  private readonly sunCorona: THREE.Sprite;
  private readonly directionArrow: THREE.ArrowHelper;
  private readonly orbitProgress: THREE.Line;
  private coronaTime = 0;
  private lastAnimationAt = performance.now();

  constructor() {
    const galaxyTexture = createGalaxyTexture();
    this.diskMaterial = new THREE.MeshBasicMaterial({
      map: galaxyTexture,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.hazeMaterial = new THREE.MeshBasicMaterial({
      map: galaxyTexture,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const disk = new THREE.Mesh(new THREE.PlaneGeometry(215, 215), this.diskMaterial);
    disk.rotation.x = -Math.PI / 2;
    const haze = new THREE.Mesh(new THREE.PlaneGeometry(230, 230), this.hazeMaterial);
    haze.rotation.x = -Math.PI / 2;
    haze.position.y = -0.7;
    haze.scale.set(1, 1.08, 1);
    this.root.add(disk, haze);

    const random = seededRandom(8_111_995);
    const count = 1_200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const arm = index % 2;
      const radius = Math.pow(random(), 0.62) * 100;
      const baseAngle = arm * Math.PI + radius * 0.067;
      const scatter = (random() - 0.5) * (0.3 + radius * 0.012);
      const angle = baseAngle + scatter;
      const thickness = (random() - 0.5) * Math.max(0.4, 5.5 - radius * 0.045);
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = thickness;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
      const core = 1 - Math.min(1, radius / 100);
      colors[index * 3] = 0.56 + core * 0.44;
      colors[index * 3 + 1] = 0.68 + core * 0.2;
      colors[index * 3 + 2] = 0.98 - core * 0.2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.stars = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.42,
        vertexColors: true,
        transparent: true,
        opacity: 0.52,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.root.add(this.stars);

    const orbitPoints = Array.from({ length: 361 }, (_, index) => {
      const angle = (index / 360) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle) * 65, 0, Math.sin(angle) * 65);
    });
    const orbit = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(orbitPoints),
      new THREE.LineDashedMaterial({
        color: 0xf4b860,
        opacity: 0.32,
        transparent: true,
        dashSize: 2,
        gapSize: 1.7,
      }),
    );
    orbit.computeLineDistances();
    this.root.add(orbit);

    this.orbitProgress = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(orbitPoints),
      new THREE.LineBasicMaterial({
        color: 0xffcf7b,
        opacity: 0.92,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.root.add(this.orbitProgress);

    this.sunMarker = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 24, 12),
      new THREE.MeshBasicMaterial({ color: 0xffcf7b }),
    );
    this.sunMarker.position.set(65, 0, 0);
    this.sunCorona = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createGlowTexture(),
      color: 0xffb55c,
      opacity: 0.58,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    this.sunMarker.add(this.sunCorona);
    this.root.add(this.sunMarker);

    this.directionArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(65, 0, 0),
      8,
      0xf4b860,
      2.2,
      1.2,
    );
    this.root.add(this.directionArrow);
  }

  render(state: GalaxyPresentationState): void {
    this.root.visible = state.visible;
    const progress = Math.min(1, Math.max(0, state.progress));
    const angle = progress * Math.PI * 2;
    const markerPosition = new THREE.Vector3(Math.cos(angle) * 65, 0, Math.sin(angle) * 65);
    this.sunMarker.position.copy(markerPosition);
    this.directionArrow.position.copy(markerPosition);
    this.directionArrow.setDirection(new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)));
    this.orbitProgress.visible = progress > 0;
    this.orbitProgress.geometry.setDrawRange(0, Math.floor(progress * 360) + 1);

    this.stars.geometry.setDrawRange(0, state.quality.galaxyStarCount);
    this.diskMaterial.opacity = state.quality.galaxyDiskOpacity;
    this.hazeMaterial.opacity = state.quality.galaxyHazeOpacity;
    if (this.sunCorona.material instanceof THREE.SpriteMaterial) {
      this.sunCorona.material.opacity = state.quality.galaxyCoronaOpacity;
    }
    const elapsedSeconds = Math.min(0.05, Math.max(0, (state.nowMs - this.lastAnimationAt) / 1_000));
    this.lastAnimationAt = state.nowMs;
    if (!state.reducedMotion) this.coronaTime += elapsedSeconds * 0.45;
    const pulse = state.reducedMotion ? 1 : 1 + Math.sin(this.coronaTime) * 0.035;
    const scale = state.quality.galaxyCoronaScale * pulse;
    this.sunCorona.scale.set(scale, scale, 1);
  }
}
