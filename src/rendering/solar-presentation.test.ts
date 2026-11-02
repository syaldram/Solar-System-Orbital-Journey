import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { SolarPresentation } from './solar-presentation';
import { getRenderingQualityProfile } from './quality-profile';

vi.mock('./procedural-materials', () => ({
  createCoronaTexture: () => new THREE.Texture(),
  createGlowTexture: () => new THREE.Texture(),
  createSunMaterial: () => new THREE.ShaderMaterial({ uniforms: { time: { value: 0 } } }),
}));

it('freezes every solar decorative transform and resumes without paused-time catch-up', () => {
  const solar = new SolarPresentation(new THREE.Group());
  const state = { reducedMotion: false, visible: true, quality: getRenderingQualityProfile('high') };
  const now = performance.now();
  solar.render({ ...state, nowMs: now });
  solar.render({ ...state, nowMs: now + 50 });
  const snapshot = () => solar.root.children.map((object) => ({
    scale: object.scale.toArray(), rotation: object.rotation.toArray(),
    material: object instanceof THREE.Sprite ? { rotation: object.material.rotation, opacity: object.material.opacity } : null,
    time: object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial ? object.material.uniforms.time?.value : null,
  }));
  const before = snapshot();
  solar.render({ ...state, nowMs: now + 10000, frozen: true });
  expect(snapshot()).toEqual(before);
  solar.render({ ...state, nowMs: now + 20000, frozen: true });
  expect(snapshot()).toEqual(before);
  solar.render({ ...state, nowMs: now + 20010 });
  expect(snapshot()).not.toEqual(before);
  const material = solar.mesh.material as THREE.ShaderMaterial;
  expect(material.uniforms.time?.value).toBeLessThan(0.1);
});

it('samples the complete Sun from explicit retained seconds independently of wall time', () => {
  const solar = new SolarPresentation(new THREE.Group());
  const state = { reducedMotion: false, visible: true, quality: getRenderingQualityProfile('high') };
  const snapshot = () => solar.root.children.map((object) => ({
    scale: object.scale.toArray(),
    material: object instanceof THREE.Sprite ? { rotation: object.material.rotation, opacity: object.material.opacity } : null,
    time: object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial ? object.material.uniforms.time?.value : null,
  }));
  solar.render({ ...state, nowMs: 0, phaseSeconds: 3 });
  const before = snapshot();
  solar.render({ ...state, nowMs: 9000000, phaseSeconds: 3 });
  expect(snapshot()).toEqual(before);
  solar.render({ ...state, nowMs: 9000001, phaseSeconds: 4 });
  const changed = snapshot();
  const sprites = solar.root.children.filter((object) => object instanceof THREE.Sprite && object.visible);
  expect(sprites).toHaveLength(4);
  for (const sprite of sprites) {
    const index = solar.root.children.indexOf(sprite);
    expect(changed[index]?.scale).not.toEqual(before[index]?.scale);
    if (sprite === sprites.at(-1)) {
      expect(changed[index]?.material?.opacity).not.toBe(before[index]?.material?.opacity);
    } else {
      expect(changed[index]?.material?.rotation).not.toBe(before[index]?.material?.rotation);
    }
  }
  solar.render({ ...state, nowMs: 9000002, phaseSeconds: 3 });
  expect(snapshot()).toEqual(before);
});
