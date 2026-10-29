import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { HeliosphereBackground } from './heliosphere-background';
import { getRenderingQualityProfile } from './quality-profile';

it('owns deterministic, static sky geometry and reduces actual draw density for quality and CSS phone width', () => {
  const background = new HeliosphereBackground();
  const other = new HeliosphereBackground();
  const stars = background.root.getObjectByName('heliosphere-distant-stars');
  const otherStars = other.root.getObjectByName('heliosphere-distant-stars');
  const band = background.root.getObjectByName('heliosphere-milky-way-band');
  if (!(stars instanceof THREE.Points) || !(otherStars instanceof THREE.Points) || !(band instanceof THREE.Mesh) || !(band.material instanceof THREE.ShaderMaterial)) throw new Error('Missing sky');
  expect(stars.geometry.getAttribute('position').array).toEqual(otherStars.geometry.getAttribute('position').array);
  expect(band.material.uniforms).toEqual({});
  expect(band.material.depthWrite).toBe(false);
  expect(band.material.side).toBe(THREE.BackSide);
  expect(stars.material.color.getHex()).toBe(0x485063);
  expect(stars.material.transparent).toBe(false);
  expect(stars.material.depthTest).toBe(false);
  expect(stars.renderOrder).toBeLessThan(0);
  expect(background.root.visible).toBe(false);
  for (const [quality, width, count] of [['high', 1280, 900], ['balanced', 1280, 550], ['low', 1280, 280], ['high', 700, 405], ['high', 701, 900], ['low', 390, 126]] as const) {
    background.setDensity(getRenderingQualityProfile(quality), width);
    expect(stars.geometry.drawRange.count).toBe(count);
  }
  // Max zoom plus a distant panned target cannot put the camera outside the sky.
  background.placeAroundCamera(new THREE.Vector3(9_000, 2_500, -8_000));
  background.root.updateMatrixWorld(true);
  expect(background.root.position.toArray()).toEqual([9_000, 2_500, -8_000]);
  expect(background.root.quaternion.toArray()).toEqual([0, 0, 0, 1]);
  expect(band.renderOrder).toBeLessThan(stars.renderOrder);
  const resources = [band.geometry, band.material, stars.geometry, stars.material];
  const disposed = resources.map((resource) => vi.spyOn(resource, 'dispose'));
  background.dispose();
  disposed.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
  other.dispose();
});
