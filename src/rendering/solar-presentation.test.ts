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
