import * as THREE from 'three';
import type { HeliosphereLayers, HeliosphereRegion } from '../experience/experience-state';
import { HELIOPAUSE_RADIUS, HELIOSPHERE_EXTENT, TERMINATION_SHOCK_RADIUS } from './heliosphere-mapping';

// The same smooth visibility envelope drives fragment opacity and hit ranking.
// Cloud noise only modulates color, so dark wisps never create invisible targets.
const LIMB_POWER = 3;
const FOREGROUND_FACTOR = 0.24;

export function heliosphereHitStrength(hit: THREE.Intersection, ray: THREE.Ray): number {
  const object = hit.object;
  if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.ShaderMaterial)) return 0.12;
  const center = object.material.uniforms.centerOpacity?.value as number | undefined;
  if (center === undefined || !hit.face) return 0;
  const normal = (hit.normal ?? hit.face.normal).clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(object.matrixWorld));
  // Three's interpolated hit normal may face the ray; face.normal retains the
  // outward orientation needed to distinguish the front from the back surface.
  const outward = hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(object.matrixWorld));
  const facing = Math.abs(normal.dot(ray.direction));
  const foreground = outward.dot(ray.direction) < 0;
  return object.material.opacity * (center + Math.pow(1 - facing, LIMB_POWER)) * (foreground ? FOREGROUND_FACTOR : 1);
}

function cloudMaterial(color: number, centerOpacity: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: { tint: { value: new THREE.Color(color) }, phase: { value: 0 }, envelopeOpacity: { value: 0.58 }, centerOpacity: { value: centerOpacity } },
    vertexShader: `varying vec3 cloudPosition;
      varying vec3 viewNormal;
      varying vec3 viewPosition;
      void main() {
        cloudPosition = position / 100.0;
        viewNormal = normalize(normalMatrix * normal);
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        viewPosition = view.xyz;
        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: `uniform vec3 tint;
      uniform float phase;
      uniform float envelopeOpacity;
      uniform float centerOpacity;
      varying vec3 cloudPosition;
      varying vec3 viewNormal;
      varying vec3 viewPosition;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float noise(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                       mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                       mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      void main() {
        vec3 p = cloudPosition * vec3(3.8, 5.8, 5.8) + vec3(phase * 0.018, 0.0, 0.0);
        float broad = noise(p);
        float wisps = noise(p * 3.1 + broad * 2.4);
        float fine = noise(p * 8.3 + wisps);
        float cloud = smoothstep(0.28, 0.72, 0.48 * broad + 0.34 * wisps + 0.18 * fine);
        float limb = pow(1.0 - abs(dot(normalize(viewNormal), normalize(-viewPosition))), ${LIMB_POWER.toFixed(1)});
        float strength = envelopeOpacity * (centerOpacity + limb) * (gl_FrontFacing ? ${FOREGROUND_FACTOR} : 1.0);
        gl_FragColor = vec4(tint * (0.13 + 2.8 * cloud * cloud), strength);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

/** Complete translucent envelopes; the long negative-X side is an illustrative tail. */
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
      if (material instanceof THREE.ShaderMaterial) {
        material.opacity = opacity * (1 + 0.07 * Math.sin(phase * 0.8));
        const opacityUniform = material.uniforms.envelopeOpacity;
        const phaseUniform = material.uniforms.phase;
        if (opacityUniform) opacityUniform.value = material.opacity;
        if (phaseUniform) phaseUniform.value = phase;
      }
    }
    const positions = this.flow.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i += 1) {
      const angle = i * 2.399963229728653;
      const radius = 7 + ((i * 17.31 + phase * 2) % 97);
      const vertical = -0.9 + (i % 23) / 22 * 1.8;
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
    for (const [radius, color, region, center] of [
      [HELIOPAUSE_RADIUS, 0x448fe8, 'heliopause', 0.018],
      [128, 0x286fae, 'heliosheath', 0.018],
      [TERMINATION_SHOCK_RADIUS, 0x79d2fa, 'termination-shock', 0.018],
      [104, 0x4196b4, 'solar-wind', 0.085],
      [HELIOSPHERE_EXTENT, 0x696fa1, 'interstellar-space', 0.008],
    ] as const) {
      const geometry = new THREE.SphereGeometry(radius, 96, 64);
      const position = geometry.getAttribute('position');
      for (let i = 0; i < position.count; i += 1) {
        position.setX(i, position.getX(i) * (position.getX(i) < 0 ? 2.5 : 1));
        position.setY(i, position.getY(i) * 0.85);
      }
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      const material = cloudMaterial(color, center);
      material.opacity = 0.58;
      const mesh = new THREE.Mesh(geometry, material);
      // Back-to-front shell order is stable across camera orbits. Three draws
      // each double-sided transparent material's back faces before its front.
      mesh.renderOrder = -radius;
      this.add(mesh, region, region === 'termination-shock' ? 'terminationShock' : 'outerHeliosphere');
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
