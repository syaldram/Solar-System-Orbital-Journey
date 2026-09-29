import { describe, expect, it } from 'vitest';

import { calculateAxialRotation, getPlanetProfile, PLANET_IDS } from './planet-data';

describe('planet physical data', () => {
  it('exposes sourced profiles for all eight planets', () => {
    expect(PLANET_IDS).toHaveLength(8);
    expect(getPlanetProfile('earth')).toMatchObject({
      meanRadiusKm: 6371.0084,
      siderealRotationDays: 0.99726968,
      obliquityDegrees: 23.4,
    });
    expect(getPlanetProfile('neptune').siderealOrbitYears).toBeCloseTo(164.79132, 5);
  });

  it('uses the physical pole instead of double-reversing retrograde planets', () => {
    expect(getPlanetProfile('venus').obliquityDegrees).toBe(177.4);
    expect(getPlanetProfile('venus').siderealRotationDays).toBe(-243.018);

    const epoch = new Date('2000-01-01T12:00:00.000Z');
    const oneVenusRotationLater = new Date(epoch.getTime() + 243.018 * 86_400_000);
    expect(calculateAxialRotation('venus', oneVenusRotationLater, epoch)).toBeCloseTo(0, 8);
  });
});
