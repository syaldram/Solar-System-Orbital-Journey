import { describe, expect, it } from 'vitest';

import {
  calculateHeliocentricPosition,
  calculateOrbitalSpeedKmPerSecond,
  calculateOrbitPath,
} from './solar-system';

describe('calculateHeliocentricPosition', () => {
  it('tracks the independent JPL Horizons Earth barycenter vector at J2000', () => {
    const position = calculateHeliocentricPosition('earth', new Date('2000-01-01T12:00:00.000Z'));

    expect(position.x).toBeCloseTo(-0.177158784, 3);
    expect(position.y).toBeCloseTo(0.967219352, 3);
    expect(position.z).toBeCloseTo(-0.000001139, 3);
  });

  it('keeps every planet near its independent JPL Horizons J2000 vector', () => {
    const horizonsVectors = {
      mercury: [-0.130094, -0.447288, -0.024598],
      venus: [-0.718302, -0.032654, 0.041014],
      earth: [-0.177159, 0.967219, -0.000001],
      mars: [1.390716, -0.013416, -0.034468],
      jupiter: [4.001177, 2.938576, -0.101785],
      saturn: [6.406409, 6.56999, -0.369076],
      uranus: [14.431857, -13.734321, -0.238142],
      neptune: [16.812047, -24.991763, 0.127223],
    } as const;
    const documentedModelTolerancesAu: Record<keyof typeof horizonsVectors, number> = {
      mercury: 0.0015,
      venus: 0.002,
      earth: 0.002,
      mars: 0.005,
      jupiter: 0.03,
      saturn: 0.08,
      uranus: 0.25,
      neptune: 0.08,
    };

    for (const [planet, expected] of Object.entries(horizonsVectors)) {
      const actual = calculateHeliocentricPosition(
        planet as keyof typeof horizonsVectors,
        new Date('2000-01-01T12:00:00.000Z'),
      );
      const errorAu = Math.hypot(
        actual.x - expected[0],
        actual.y - expected[1],
        actual.z - expected[2],
      );

      expect(errorAu, planet).toBeLessThan(documentedModelTolerancesAu[planet as keyof typeof horizonsVectors]);
    }
  });

  it('derives the J2000 Earth orbital speed from the position model', () => {
    const speed = calculateOrbitalSpeedKmPerSecond('earth', new Date('2000-01-01T12:00:00.000Z'));

    expect(speed).toBeCloseTo(30.29, 1);
  });

  it('returns a closed sampled orbit for rendering without exposing orbital elements', () => {
    const path = calculateOrbitPath('mars', new Date('2026-09-29T12:00:00.000Z'), 64);

    expect(path).toHaveLength(65);
    expect(path[0]).toEqual(path.at(-1));
  });
});
