import * as THREE from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GalaxyPresentation } from './galaxy-presentation';
import { getRenderingQualityProfile } from './quality-profile';
import { createGalaxyTexture, createGlowTexture } from './procedural-materials';
vi.mock('./procedural-materials', () => ({ createGalaxyTexture: vi.fn(() => new THREE.Texture()), createGlowTexture: vi.fn(() => new THREE.Texture()), seededRandom: () => () => 0.5 }));
afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks(); });
it('defers artwork, keeps anchors, applies current progress/quality and owns disposal exactly once', () => {
  const galaxy = new GalaxyPresentation();
  const root = galaxy.root;
  const marker = galaxy.sunMarker;
  const state = { nowMs: 0, progress: 0.25, reducedMotion: false, visible: false, quality: getRenderingQualityProfile('low') };
  galaxy.render(state);
  galaxy.render({ ...state, nowMs: 1000 });
  expect(createGalaxyTexture).not.toHaveBeenCalled();
  galaxy.render({ ...state, nowMs: 1016, visible: true });
  expect(createGalaxyTexture).toHaveBeenCalledTimes(1);
  expect(galaxy.root).toBe(root);
  expect(galaxy.sunMarker).toBe(marker);
  expect(marker.position.z).toBeCloseTo(65);
  const stars = root.children.find((child) => child instanceof THREE.Points);
  expect(stars?.geometry.drawRange.count).toBe(320);
  galaxy.render({ ...state, visible: false, nowMs: 50000 });
  galaxy.render({ ...state, visible: true, nowMs: 50016 });
  expect(createGalaxyTexture).toHaveBeenCalledTimes(1);
  const resources = new Set<{ dispose(): void }>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points || object instanceof THREE.Sprite) {
      resources.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) resources.add(material);
    }
  });
  resources.add(vi.mocked(createGalaxyTexture).mock.results[0]?.value ?? new THREE.Texture());
  resources.add(vi.mocked(createGlowTexture).mock.results[0]?.value ?? new THREE.Texture());
  const disposals = [...resources].map((resource) => vi.spyOn(resource, 'dispose'));
  galaxy.dispose(); galaxy.dispose();
  disposals.forEach((dispose) => expect(dispose).toHaveBeenCalledTimes(1));
  expect(root.children).toHaveLength(0);
});

it('disposes uninitialized anchors exactly once without generating textures or reviving artwork', () => {
  const galaxy = new GalaxyPresentation();
  const parent = new THREE.Group();
  parent.add(galaxy.root);
  const geometryDispose = vi.spyOn(galaxy.sunMarker.geometry, 'dispose');
  const material = galaxy.sunMarker.material;
  if (Array.isArray(material)) throw new Error('Expected one anchor material');
  const materialDispose = vi.spyOn(material, 'dispose');
  galaxy.dispose();
  galaxy.dispose();
  galaxy.render({ nowMs: 100, progress: .5, reducedMotion: false, visible: true, quality: getRenderingQualityProfile('high') });
  expect(geometryDispose).toHaveBeenCalledTimes(1);
  expect(materialDispose).toHaveBeenCalledTimes(1);
  expect(createGalaxyTexture).not.toHaveBeenCalled();
  expect(createGlowTexture).not.toHaveBeenCalled();
  expect(galaxy.root.children).toHaveLength(0);
  expect(galaxy.root.parent).toBeNull();
});

it('retains original clamped corona phase, reduced-motion freeze and hidden-time anchor on reentry', () => {
  vi.spyOn(performance, 'now').mockReturnValue(0);
  const galaxy = new GalaxyPresentation();
  const quality = getRenderingQualityProfile('balanced');
  const render = (nowMs: number, visible: boolean, reducedMotion = false) => galaxy.render({ nowMs, visible, reducedMotion, progress: .3, quality });
  let phase = 0;
  const scaleAtPhase = () => quality.galaxyCoronaScale * (1 + Math.sin(phase) * .035);
  render(1000, false); phase += .05 * .45;
  render(1016, true); phase += .016 * .45;
  const corona = galaxy.sunMarker.children.find((child) => child instanceof THREE.Sprite);
  if (!(corona instanceof THREE.Sprite)) throw new Error('Missing actual corona');
  expect(corona.scale.x).toBeCloseTo(scaleAtPhase(), 12);
  render(2016, true); phase += .05 * .45; // original elapsed clamp
  expect(corona.scale.x).toBeCloseTo(scaleAtPhase(), 12);
  render(3016, true, true);
  expect(corona.scale.x).toBe(quality.galaxyCoronaScale); // original reduced-motion pulse
  render(4016, false, true); // reduced motion freezes retained phase even while hidden
  render(4032, true); phase += .016 * .45;
  expect(corona.scale.x).toBeCloseTo(scaleAtPhase(), 12);
  render(13032, false); phase += .05 * .45;
  render(13048, false); phase += .016 * .45;
  render(13064, true); phase += .016 * .45;
  expect(corona.scale.x).toBeCloseTo(scaleAtPhase(), 12);
  galaxy.dispose();
});
