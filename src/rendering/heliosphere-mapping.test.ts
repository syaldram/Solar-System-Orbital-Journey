import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { calculateSystemSnapshot } from '../astronomy/reference-frames';
import { PLANET_IDS } from '../astronomy/planet-data';
import { calculateOrbitPath } from '../astronomy/solar-system';
import { heliosphereDistance, mapHeliospherePosition, heliosphereBodyRadius, TERMINATION_SHOCK_RADIUS } from './heliosphere-mapping';
import { HeliospherePresentation } from './heliosphere-presentation';

describe('heliosphere display contract', () => {
  it('is strictly increasing and preserves the original three-dimensional direction', () => {
    let previous = 0;
    for (let r = 0.001; r < 100; r *= 1.1) {
      const distance = heliosphereDistance(r);
      expect(distance).toBeGreaterThan(previous);
      const position = { x: r * 0.6, y: r * 0.8, z: r * 0.02 };
      const mapped = mapHeliospherePosition(position);
      expect(mapped.z / mapped.x).toBeCloseTo(position.y / position.x, 12);
      expect(mapped.y / mapped.x).toBeCloseTo(position.z / position.x, 12);
      previous = distance;
    }
    expect(mapHeliospherePosition({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0 });
  });
  it('contains complete planet surfaces and all orbit paths inside the minimum shock envelope over the timeline', () => {
    const today = new Date('2026-10-29T00:00:00Z');
    for (let years = 0; years <= 165; years += 5) {
      const instant = new Date(today.getTime() + years * 365.25 * 86400000);
      const snapshot = calculateSystemSnapshot(instant, today, 'sun');
      for (const { id, position } of snapshot.planets) {
        const mapped = mapHeliospherePosition(position);
        // Conservative inscribed sphere of the 98% shock, including vertical compression.
        expect(Math.hypot(mapped.x, mapped.y, mapped.z) + heliosphereBodyRadius(id) * (id === 'saturn' ? 2.35 : 1.1)).toBeLessThan(TERMINATION_SHOCK_RADIUS * 0.98 * 0.85);
      }
      for (const id of PLANET_IDS) for (const point of calculateOrbitPath(id, instant)) {
        const mapped = mapHeliospherePosition(point);
        expect(Math.hypot(mapped.x, mapped.y, mapped.z)).toBeLessThan(TERMINATION_SHOCK_RADIUS * 0.98 * 0.85);
      }
    }
  });
  it('allocates nested cutaway shells with an extended tail and releases each resource', () => {
    const presentation = new HeliospherePresentation();
    const meshes = presentation.root.children.filter((object) => object instanceof THREE.Mesh);
    const extents = meshes.map((mesh) => {
      mesh.geometry.computeBoundingBox();
      if (!mesh.geometry.boundingBox) throw new Error('Missing geometry bounds');
      return mesh.geometry.boundingBox;
    });
    const [outer, middle, shock] = extents;
    if (!outer || !middle || !shock) throw new Error('Missing shells');
    expect(outer.min.x).toBeLessThan(middle.min.x);
    expect(middle.min.x).toBeLessThan(shock.min.x);
    expect(Math.abs(outer.min.x) / outer.max.x).toBeCloseTo(2.5);
    const spies = presentation.root.children.flatMap((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return [];
      return [vi.spyOn(object.geometry, 'dispose'), vi.spyOn(object.material as THREE.Material, 'dispose')];
    });
    presentation.dispose();
    spies.forEach((spy) => expect(spy).toHaveBeenCalledOnce());
    expect(presentation.root.children).toHaveLength(0);
  });
});
