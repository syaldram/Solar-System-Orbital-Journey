import { describe, expect, it } from 'vitest';

import { getPlanetProfile, SUN_MEAN_RADIUS } from '../astronomy/planet-data';
import { GALACTIC_MODEL } from '../astronomy/reference-frames';
import { calculatePerihelionDistanceAu } from '../astronomy/solar-system';
import {
  AU_SCALE,
  FULL_JOURNEY_AU_SCALE,
  FULL_JOURNEY_GROUP_SCALE,
  FULL_JOURNEY_LENGTH,
  SUN_DISPLAY_RADIUS,
  planetDisplayRadius,
} from './display-scale';

describe('rendering display scale', () => {
  it('places the enhanced Sun at one-third of Mercury perihelion', () => {
    const perihelion = calculatePerihelionDistanceAu('mercury', new Date('2000-01-01T12:00:00.000Z'));
    expect(SUN_DISPLAY_RADIUS).toBeCloseTo((perihelion * AU_SCALE) / 3, 10);
  });

  it('preserves physical body-to-body radius ratios', () => {
    const earthToSun = planetDisplayRadius('earth') / SUN_DISPLAY_RADIUS;
    const jupiterToEarth = planetDisplayRadius('jupiter') / planetDisplayRadius('earth');

    expect(earthToSun).toBeCloseTo(getPlanetProfile('earth').meanRadiusKm / SUN_MEAN_RADIUS.value, 10);
    expect(jupiterToEarth).toBeCloseTo(
      getPlanetProfile('jupiter').meanRadiusKm / getPlanetProfile('earth').meanRadiusKm,
      10,
    );
  });

  it('maps the sourced 165-year distance onto the full journey path', () => {
    expect(FULL_JOURNEY_AU_SCALE * GALACTIC_MODEL.fullJourneyDistance.value).toBeCloseTo(FULL_JOURNEY_LENGTH, 10);
    expect(FULL_JOURNEY_GROUP_SCALE).toBeCloseTo(FULL_JOURNEY_AU_SCALE / AU_SCALE, 10);
  });
});
