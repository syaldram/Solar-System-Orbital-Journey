import { describe, expect, it } from 'vitest';

import { calculateSystemSnapshot, eclipticToGalactic } from './reference-frames';

const START = new Date('2026-09-29T12:00:00.000Z');
const END = new Date(START.getTime() + 165 * 365.25 * 86_400_000);

describe('reference frames', () => {
  it('preserves vector length and the measured ecliptic-to-galactic inclination', () => {
    const galacticEclipticPole = eclipticToGalactic({ x: 0, y: 0, z: 1 });

    expect(Math.hypot(galacticEclipticPole.x, galacticEclipticPole.y, galacticEclipticPole.z)).toBeCloseTo(1, 8);
    expect(Math.acos(Math.abs(galacticEclipticPole.z)) * (180 / Math.PI)).toBeCloseTo(60.19, 2);
  });

  it('keeps the Sun fixed when traveling with it', () => {
    const snapshot = calculateSystemSnapshot(END, START, 'sun');

    expect(snapshot.sun).toEqual({ x: 0, y: 0, z: 0 });
    expect(snapshot.planets).toHaveLength(8);
  });

  it('moves the Sun about 7,657 AU in the local galactic frame over 165 Julian years', () => {
    const snapshot = calculateSystemSnapshot(END, START, 'space');

    expect(snapshot.sun.y).toBeCloseTo(7_657, -1);
    expect(snapshot.sun.x).toBe(0);
    expect(snapshot.sun.z).toBe(0);
  });
});
