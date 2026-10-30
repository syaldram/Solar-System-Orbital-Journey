import { expect, it } from 'vitest';
import baseline from '../../_bmad-output/implementation-artifacts/story-1-6-science-baseline.json';
import { PLANET_IDS, getPlanetProfile } from './planet-data';
import { calculateHeliocentricPosition, calculateOrbitalSpeedKmPerSecond, SCIENTIFIC_CONVERSIONS, ORBITAL_ELEMENT_UNITS } from './solar-system';
import { createInitialExperienceState, updateExperience } from '../experience/experience-state';
import { mapHeliospherePosition } from '../rendering/heliosphere-mapping';

// Frozen application outputs at c7ca33e, not independent JPL Horizons truth.
// Tolerances (1e-10 AU, 1e-9 km/s) allow negligible cross-runtime floating
// variation, far below the precision of this approximate scientific model.
for (const sample of baseline.samples) for (const frame of ['sun', 'space'] as const) for (const speed of ['day', 'month', 'year', 'decade'] as const) for (const quality of ['high', 'balanced', 'low'] as const) {
  it(`retains frozen ${sample.label} science from ${frame}, ${speed}, ${quality}`, () => {
    let state = createInitialExperienceState(new Date(baseline.anchorUtc));
    state = updateExperience(state, { type: 'set-frame', frame });
    state = updateExperience(state, { type: 'set-speed', speed });
    state = updateExperience(state, { type: 'set-quality', quality });
    state = updateExperience(state, { type: 'scrub', timeMs: Date.parse(sample.instantUtc) });
    state = updateExperience(state, { type: 'enter-heliosphere' });
    expect(state.currentTimeMs).toBe(Date.parse(sample.instantUtc));
    for (const id of PLANET_IDS) {
      const position = calculateHeliocentricPosition(id, new Date(state.currentTimeMs));
      const expected = sample.planets[id];
      for (const axis of ['x', 'y', 'z'] as const) expect(Math.abs(position[axis] - expected.positionAu[axis])).toBeLessThanOrEqual(1e-10);
      expect(Math.abs(calculateOrbitalSpeedKmPerSecond(id, new Date(state.currentTimeMs)) - expected.speedKmPerSecond)).toBeLessThanOrEqual(1e-9);
      const physicalRadius = Math.hypot(expected.positionAu.x, expected.positionAu.y, expected.positionAu.z);
      const expectedRadius = 22 * physicalRadius ** .4;
      const displayed = mapHeliospherePosition(position);
      expect(Math.abs(Math.hypot(displayed.x, displayed.y, displayed.z) - expectedRadius)).toBeLessThanOrEqual(1e-8);
      // Rendering puts ecliptic height on scene Y, and ecliptic Y on scene Z.
      for (const [sceneAxis, physicalAxis] of [['x', 'x'], ['y', 'z'], ['z', 'y']] as const) expect(Math.abs(displayed[sceneAxis] / expectedRadius - expected.positionAu[physicalAxis] / physicalRadius)).toBeLessThanOrEqual(1e-9);
      const profile = getPlanetProfile(id);
      for (const measurement of Object.values(profile.measurements)) {
        expect(measurement.unit).toBeTruthy();
        expect(measurement.source.organization).toMatch(/NASA/);
        expect(measurement.source.url).toMatch(/^https:/);
        expect(measurement.source.retrievedAt).toBe('2026-09-29');
      }
    }
  });
}
it('records sourced conversion units and exact Julian interval without changing existing values', () => {
  expect(Date.parse(baseline.samples[2]?.instantUtc ?? '') - Date.parse(baseline.anchorUtc)).toBe(165 * 365.25 * 86400000);
  expect(SCIENTIFIC_CONVERSIONS.astronomicalUnit).toMatchObject({ value: 149597870.7, unit: 'km' });
  for (const record of Object.values(SCIENTIFIC_CONVERSIONS)) {
    expect(record.source.url).toMatch(/^https:/);
    expect(record.source.retrievedAt).toBe('2026-10-30');
    expect(record.unit).toBeTruthy();
  }
});

it('describes the unlike Table 2b coefficient units separately', () => {
  expect(ORBITAL_ELEMENT_UNITS.periodicCorrection).toEqual({ b: 'degrees/Julian-century²', c: 'degrees', s: 'degrees', f: 'degrees/Julian-century' });
});
