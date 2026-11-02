import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { HeliosphereTravelPresentation } from './heliosphere-travel-presentation';
import { getRenderingQualityProfile } from './quality-profile';

it('moves actual guides coherently, freezes repeated samples and fades recycled markers', () => {
  const travel = new HeliosphereTravelPresentation();
  const guides = travel.root.getObjectByName('heliosphere-travel-guides');
  if (!(guides instanceof THREE.LineSegments)) throw new Error('Missing guides');
  const positions = guides.geometry.getAttribute('position');
  const colors = guides.geometry.getAttribute('color');
  expect(positions.usage).toBe(THREE.DynamicDrawUsage);
  expect(colors.usage).toBe(THREE.DynamicDrawUsage);
  const before = Array.from(positions.array);
  travel.render(3);
  // Marker one does not wrap: all its vertices translate together, never stretch.
  for (let vertex = 6; vertex < 12; vertex += 1) {
    expect(positions.getX(vertex)).toBe(before[vertex * 3]);
    expect(positions.getY(vertex)).toBe(before[vertex * 3 + 1]);
    expect(positions.getZ(vertex)).toBeCloseTo(Number(before[vertex * 3 + 2]) - 36, 4);
  }
  const moved = Array.from(positions.array);
  const version = positions.version;
  travel.render(3);
  expect(Array.from(positions.array)).toEqual(moved);
  expect(positions.version).toBe(version);
  // Out-of-order sampling is deterministic, including long sessions.
  travel.render(72 * 1_000_000 + 3);
  expect(Array.from(positions.array)).toEqual(moved);
  travel.render(0);
  expect(Array.from(positions.array)).toEqual(before);
  expect(colors.getW(0)).toBe(0);
  travel.render(0.01);
  expect(colors.getW(0)).toBeLessThan(0.00001);
  for (const invalid of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    travel.render(invalid);
    expect(Array.from(positions.array)).toEqual(before);
  }
  expect(travel.root.position.toArray()).toEqual([0, 0, 0]);
  travel.dispose();
});

it('adapts rendered density without changing identity or phase and disposes bounded resources', () => {
  const travel = new HeliosphereTravelPresentation();
  const scene = new THREE.Scene();
  scene.add(travel.root);
  const guides = travel.root.children[0];
  if (!(guides instanceof THREE.LineSegments) || !(guides.material instanceof THREE.LineBasicMaterial)) throw new Error('Missing guides');
  const geometry = guides.geometry;
  const material = guides.material;
  expect(geometry.getAttribute('position').count).toBe(48 * 6);
  travel.render(17.3);
  const before = Array.from(geometry.getAttribute('position').array);
  for (const [quality, width, count] of [['high', 1280, 48], ['balanced', 1280, 36], ['low', 1280, 24], ['high', 700, 24], ['high', 701, 48], ['low', 390, 12]] as const) {
    travel.setDensity(getRenderingQualityProfile(quality), width);
    travel.render(17.3);
    expect(geometry.drawRange.count).toBe(count * 6);
    expect(guides.geometry).toBe(geometry);
    expect(guides.material).toBe(material);
    expect(Array.from(geometry.getAttribute('position').array)).toEqual(before);
  }
  const disposed = [geometry, material].map((resource) => vi.spyOn(resource, 'dispose'));
  travel.dispose();
  disposed.forEach((spy) => expect(spy).toHaveBeenCalledOnce());
  expect(travel.root.children).toHaveLength(0);
  expect(travel.root.parent).toBeNull();
});
