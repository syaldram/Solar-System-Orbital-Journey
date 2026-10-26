import { describe, expect, it } from 'vitest';
import { calculateSystemSnapshot } from '../astronomy/reference-frames';
import { compressGravityPosition, gravityCenters, gravityBodyPosition, gravitySurfaceHeight } from './gravity-mapping';

const epoch = new Date('2026-10-26T00:00:00Z');

describe('schematic display mapping', () => {
  it('compresses monotonically and preserves azimuth without introducing crossings', () => {
    let previous = 0;
    for (const radius of [0.3, 0.7, 1, 1.5, 5, 9, 19, 30, 31]) {
      const mapped = compressGravityPosition({ x: radius * 0.6, y: radius * 0.8, z: 0.1 });
      expect(Math.hypot(mapped.x, mapped.z)).toBeGreaterThan(previous);
      expect(mapped.z / mapped.x).toBeCloseTo(4 / 3);
      previous = Math.hypot(mapped.x, mapped.z);
    }
    expect(compressGravityPosition({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, z: 0 });
  });

  it('has bounded continuous wells and repeatable scrubs without mutating scientific snapshots', () => {
    const first = calculateSystemSnapshot(epoch, epoch, 'sun');
    const original = JSON.stringify(first);
    const initial = gravityCenters(first).map((center, _, centers) => gravityBodyPosition(center, centers));
    for (let year = 0; year <= 165; year += 1) {
      const snapshot = calculateSystemSnapshot(new Date(epoch.getTime() + year * 365.25 * 86_400_000), epoch, 'sun');
      const untouched = JSON.stringify(snapshot);
      const centers = gravityCenters(snapshot);
      expect(centers).toHaveLength(8);
      for (const center of centers) {
        const body = gravityBodyPosition(center, centers);
        expect(Object.values(body).filter((value) => typeof value === 'number').every(Number.isFinite)).toBe(true);
        const height = gravitySurfaceHeight(center.x, center.z, centers);
        expect(height).toBeGreaterThan(-60);
        expect(height).toBeLessThanOrEqual(0);
        expect(Math.abs(gravitySurfaceHeight(center.x + 0.0001, center.z, centers) - height)).toBeLessThan(0.001);
      }
      expect(JSON.stringify(snapshot)).toBe(untouched);
    }
    const returned = calculateSystemSnapshot(epoch, epoch, 'sun');
    expect(gravityCenters(returned).map((center, _, centers) => gravityBodyPosition(center, centers))).toEqual(initial);
    expect(JSON.stringify(first)).toBe(original);
    expect(gravitySurfaceHeight(0, 0, gravityCenters(first))).toBeLessThan(-32);
  });
});
