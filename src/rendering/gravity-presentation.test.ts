import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { GravityPresentation } from './gravity-presentation';
import { gravitySurfaceHeight } from './gravity-mapping';
import { getRenderingQualityProfile } from './quality-profile';

describe('reusable gravity sheet', () => {
  it('caches identical centers per density and matches solar/local heights at every quality tier', () => {
    const sheet = new GravityPresentation();
    const centers = [{ id: 'earth', x: 0, z: 31.25 }] as const;
    for (const tier of ['high', 'balanced', 'low'] as const) {
      const quality = getRenderingQualityProfile(tier);
      sheet.render(centers, quality);
      const grid = sheet.root.children.find((child): child is THREE.LineSegments => child instanceof THREE.LineSegments && child.visible);
      if (!grid) throw new Error('No visible grid');
      const positions = grid.geometry.getAttribute('position');
      if (!(positions instanceof THREE.BufferAttribute)) throw new Error('Expected a direct position buffer');
      const version = positions.version;
      sheet.render(centers.map((center) => ({ ...center })), quality);
      expect(positions.version).toBe(version);
      let localIndex = -1;
      let solarIndex = -1;
      for (let index = 0; index < positions.count; index += 1) {
        if (positions.getX(index) === 0 && positions.getZ(index) === 0) solarIndex = index;
        if (positions.getX(index) === 0 && positions.getZ(index) === 31.25) localIndex = index;
      }
      expect(solarIndex).toBeGreaterThanOrEqual(0);
      expect(localIndex).toBeGreaterThanOrEqual(0);
      expect(positions.getY(solarIndex)).toBeCloseTo(gravitySurfaceHeight(0, 0, centers), 5);
      const localHeight = positions.getY(localIndex);
      expect(localHeight).toBeCloseTo(gravitySurfaceHeight(0, 31.25, centers), 5);
      const moved = [{ id: 'earth', x: 12, z: 31.25 }] as const;
      sheet.render(moved, quality);
      expect(positions.version).toBe(version + 1);
      expect(positions.getY(localIndex)).toBeGreaterThan(localHeight + 1);
      expect(positions.getY(localIndex)).toBeCloseTo(gravitySurfaceHeight(0, 31.25, moved), 5);
      expect(positions.getY(solarIndex)).toBeCloseTo(gravitySurfaceHeight(0, 0, moved), 5);
      sheet.render(centers, quality);
    }
    // Each inactive density retains its own last snapshot when switching back.
    for (const tier of ['high', 'balanced', 'low'] as const) {
      const grid = sheet.root.children.find((child): child is THREE.LineSegments => child instanceof THREE.LineSegments && child.geometry.getAttribute('position').count === 4 * getRenderingQualityProfile(tier).gravityGridDensity * (getRenderingQualityProfile(tier).gravityGridDensity + 1));
      if (!grid) throw new Error('Missing density');
      const positions = grid.geometry.getAttribute('position');
      if (!(positions instanceof THREE.BufferAttribute)) throw new Error('Expected a direct position buffer');
      const version = positions.version;
      sheet.render(centers, getRenderingQualityProfile(tier));
      expect(positions.version).toBe(version);
    }
    sheet.dispose();
  });

  it('changes density and deforms finite bounded buffers without reallocating geometry', () => {
    const sheet = new GravityPresentation();
    const grids = sheet.root.children.filter((child): child is THREE.LineSegments => child instanceof THREE.LineSegments);
    const geometries = grids.map((grid) => grid.geometry);
    const attributes = geometries.map((geometry) => geometry.getAttribute('position'));
    for (const tier of ['high', 'balanced', 'low'] as const) {
      for (let visit = 0; visit < 3; visit += 1) {
        sheet.render([{ id: 'earth', x: visit * 2, z: 28 }], getRenderingQualityProfile(tier));
        expect(grids.filter((grid) => grid.visible)).toHaveLength(1);
        expect(grids.map((grid) => grid.geometry)).toEqual(geometries);
        expect(geometries.map((geometry) => geometry.getAttribute('position'))).toEqual(attributes);
        const visible = grids.find((grid) => grid.visible);
        if (!visible) throw new Error('No visible grid');
        const positions = visible.geometry.getAttribute('position');
        expect([...positions.array].every(Number.isFinite)).toBe(true);
        expect(visible.geometry.boundingSphere?.radius).toBeGreaterThan(180);
      }
    }
    const disposals = geometries.map((geometry) => vi.spyOn(geometry, 'dispose'));
    sheet.dispose();
    for (const dispose of disposals) expect(dispose).toHaveBeenCalledOnce();
  });
});
