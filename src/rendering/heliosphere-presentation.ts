import * as THREE from 'three';
import type { HeliosphereLayers, HeliosphereRegion } from '../experience/experience-state';
import { HELIOPAUSE_RADIUS, HELIOSPHERE_EXTENT, TERMINATION_SHOCK_RADIUS } from './heliosphere-mapping';

/** Open upper hemisphere: the long negative-X side is an illustrative tail. */
export class HeliospherePresentation {
  readonly root = new THREE.Group();
  readonly drawables: { readonly object: THREE.Object3D; readonly region: HeliosphereRegion; readonly layer: 'outerHeliosphere' | 'terminationShock' }[] = [];
  private readonly flow = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(240 * 3), 3)),
    new THREE.PointsMaterial({ color: 0x92dcff, size: 1.3, transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  private sampledPhase: number | null = null;
  private readonly baseOpacities = new Map<THREE.Material, number>();
  /** Pure sampling: wall time, speed and previous renders cannot alter appearance. */
  render(phaseSeconds: number): void {
    const phase = Number.isFinite(phaseSeconds) && phaseSeconds >= 0 ? phaseSeconds : 0;
    if (phase === this.sampledPhase) return;
    this.sampledPhase = phase;
    this.root.scale.setScalar(1 + 0.02 * Math.sin(phase * Math.PI / 10));
    for (const [material, opacity] of this.baseOpacities) {
      if (material instanceof THREE.MeshBasicMaterial || material instanceof THREE.LineBasicMaterial) {
        material.opacity = opacity * (1 + 0.07 * Math.sin(phase * 0.8));
      }
    }
    const positions = this.flow.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i += 1) {
      const angle = i * 2.399963229728653;
      const radius = 7 + ((i * 17.31 + phase * 2) % 97);
      const vertical = -0.08 - (i % 11) / 14;
      const horizontal = Math.sqrt(1 - vertical * vertical);
      const x = Math.cos(angle) * radius * horizontal;
      positions.setXYZ(i, x * (x < 0 ? 2.5 : 1), radius * vertical * 0.85, Math.sin(angle) * radius * horizontal);
    }
    positions.needsUpdate = true;
    this.flow.geometry.computeBoundingSphere();
    this.flow.material.opacity = 0.38 * (1 + 0.08 * Math.sin(phase * 0.8));
  }
  private add(object: THREE.Object3D, region: HeliosphereRegion, layer: 'outerHeliosphere' | 'terminationShock'): void {
    object.name = region;
    this.drawables.push({ object, region, layer });
    this.root.add(object);
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) this.baseOpacities.set(object.material, object.material.opacity);
  }
  setLayers(layers: HeliosphereLayers): void {
    for (const record of this.drawables) record.object.visible = layers[record.layer];
  }
  constructor() {
    for (const [radius, color, opacity] of [
      [HELIOPAUSE_RADIUS, 0x398be8, 0.15],
      [128, 0x2871b0, 0.09],
      [TERMINATION_SHOCK_RADIUS, 0x72d4ff, 0.19],
    ] as const) {
      const geometry = new THREE.SphereGeometry(radius, 80, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      const position = geometry.getAttribute('position');
      for (let i = 0; i < position.count; i += 1) {
        position.setX(i, position.getX(i) * (position.getX(i) < 0 ? 2.5 : 1));
        position.setY(i, position.getY(i) * 0.85);
      }
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      const region = radius === TERMINATION_SHOCK_RADIUS ? 'termination-shock' : radius === HELIOPAUSE_RADIUS ? 'heliopause' : 'heliosheath';
      const layer = region === 'termination-shock' ? 'terminationShock' : 'outerHeliosphere';
      this.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, opacity, transparent: true, side: THREE.DoubleSide, depthWrite: false })), region, layer);
      const points = Array.from({ length: 161 }, (_, i) => {
        const angle = i / 160 * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        return new THREE.Vector3(x * (x < 0 ? 2.5 : 1), 0, Math.sin(angle) * radius);
      });
      this.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, opacity: 0.65, transparent: true })), region, layer);
    }
    // Visible cut surfaces express volumes and narrow boundary rims. These are
    // actual explanatory artwork, shared by rendering and raycasting.
    for (const [region, inner, outer, color, opacity, layer] of [
      ['solar-wind', 5, 108, 0x51aab0, 0.12, 'outerHeliosphere'],
      ['termination-shock', 108, 114, 0x8be7ff, 0.55, 'terminationShock'],
      ['heliosheath', 114, 141, 0x367bb7, 0.25, 'outerHeliosphere'],
      ['heliopause', 141, 147, 0x77aaff, 0.6, 'outerHeliosphere'],
      ['interstellar-space', 147, HELIOSPHERE_EXTENT, 0x816fa9, 0.22, 'outerHeliosphere'],
    ] as const) {
      const geometry = new THREE.RingGeometry(inner, outer, 120);
      geometry.rotateX(-Math.PI / 2);
      const position = geometry.getAttribute('position');
      for (let i = 0; i < position.count; i += 1) {
        if (position.getX(i) < 0) position.setX(i, position.getX(i) * 2.5);
      }
      geometry.computeBoundingSphere();
      this.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, opacity, transparent: true, side: THREE.DoubleSide, depthWrite: false })), region, layer);
    }
    this.add(this.flow, 'solar-wind', 'outerHeliosphere');
    this.flow.name = 'solar-wind-flow';
    this.render(0);
    this.root.visible = false;
  }
  dispose(): void {
    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.root.clear();
    this.baseOpacities.clear();
    this.drawables.length = 0;
  }
}
