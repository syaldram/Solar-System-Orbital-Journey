import * as THREE from 'three';

import { SUN_DISPLAY_RADIUS } from './display-scale';
import {
  createCoronaTexture,
  createGlowTexture,
  createSunMaterial,
} from './procedural-materials';
import type { RenderingQualityProfile } from './quality-profile';

export interface SolarPresentationState {
  readonly nowMs: number;
  readonly reducedMotion: boolean;
  readonly visible: boolean;
  readonly quality: RenderingQualityProfile;
}

export class SolarPresentation {
  readonly mesh: THREE.Mesh;

  private readonly material: THREE.ShaderMaterial;
  private readonly glow: THREE.Sprite;
  private readonly coronaLayers: readonly THREE.Sprite[];
  private animationTime = 0;
  private lastAnimationAt = performance.now();

  constructor(parent: THREE.Group) {
    this.material = createSunMaterial();
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(SUN_DISPLAY_RADIUS, 64, 40),
      this.material,
    );
    this.mesh.name = 'sun';
    parent.add(this.mesh);

    const coronaColors = [0xffd69b, 0xffaa5a, 0xff7d3a] as const;
    const coronaScales = [7.2, 8.7, 10.2] as const;
    this.coronaLayers = coronaScales.map((scale, index) => {
      const material = new THREE.SpriteMaterial({
        map: createCoronaTexture(index),
        color: coronaColors[index],
        opacity: 0.58 - index * 0.12,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        rotation: (index - 1) * 0.31,
      });
      material.userData.baseRotation = material.rotation;
      const corona = new THREE.Sprite(material);
      corona.scale.set(SUN_DISPLAY_RADIUS * scale, SUN_DISPLAY_RADIUS * scale, 1);
      corona.userData.baseScale = SUN_DISPLAY_RADIUS * scale;
      corona.userData.driftRate = [0.012, -0.008, 0.005][index] ?? 0;
      corona.userData.breathPhase = index * 1.9;
      parent.add(corona);
      return corona;
    });

    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createGlowTexture(),
      color: 0xffb55c,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    this.glow.scale.set(SUN_DISPLAY_RADIUS * 6.2, SUN_DISPLAY_RADIUS * 6.2, 1);
    parent.add(this.glow, new THREE.PointLight(0xffe4b4, 1150, 0, 1.45));
  }

  render(state: SolarPresentationState): void {
    const elapsedSeconds = Math.min(0.05, Math.max(0, (state.nowMs - this.lastAnimationAt) / 1_000));
    this.lastAnimationAt = state.nowMs;
    if (!state.reducedMotion) this.animationTime += elapsedSeconds * 0.22;

    this.mesh.visible = state.visible;
    this.glow.visible = state.visible;
    const timeUniform = this.material.uniforms.time;
    if (timeUniform) timeUniform.value = this.animationTime;

    const glowScale = SUN_DISPLAY_RADIUS * 6.2;
    const glowBreath = state.reducedMotion ? 1 : 1 + Math.sin(this.animationTime * 0.7) * 0.025;
    this.glow.scale.set(glowScale * glowBreath, glowScale * glowBreath, 1);
    if (this.glow.material instanceof THREE.SpriteMaterial) {
      this.glow.material.opacity = 0.72 * (
        state.reducedMotion ? 1 : 1 + Math.sin(this.animationTime * 0.63) * 0.055
      );
    }

    for (const [index, corona] of this.coronaLayers.entries()) {
      corona.visible = state.visible && index < state.quality.solarCoronaLayerCount;
      if (!(corona.material instanceof THREE.SpriteMaterial)) continue;
      const baseRotation = typeof corona.material.userData.baseRotation === 'number'
        ? corona.material.userData.baseRotation
        : 0;
      const driftRate = typeof corona.userData.driftRate === 'number' ? corona.userData.driftRate : 0;
      corona.material.rotation = baseRotation + this.animationTime * driftRate;
      const baseScale = typeof corona.userData.baseScale === 'number' ? corona.userData.baseScale : 1;
      const breathPhase = typeof corona.userData.breathPhase === 'number' ? corona.userData.breathPhase : 0;
      const breath = state.reducedMotion
        ? 1
        : 1 + Math.sin(this.animationTime * 0.31 + breathPhase) * 0.018;
      corona.scale.set(baseScale * breath, baseScale * breath, 1);
    }
  }
}
