import type { PlanetId } from './solar-system';

export { type PlanetId } from './solar-system';

export type MeasurementUnit = 'km' | 'days' | 'degrees' | 'earth-years';

export interface ScientificSource {
  readonly organization: 'NASA/JPL' | 'NASA/NSSDC' | 'NASA Science';
  readonly url: string;
  readonly retrievedAt: '2026-09-29';
}

export interface SourcedMeasurement {
  readonly value: number;
  readonly unit: MeasurementUnit;
  readonly source: ScientificSource;
}

interface PlanetRecord {
  readonly name: string;
  readonly identity: string;
  readonly color: number;
  readonly meanRadius: SourcedMeasurement;
  readonly siderealRotation: SourcedMeasurement;
  readonly obliquity: SourcedMeasurement;
  readonly siderealOrbit: SourcedMeasurement;
  readonly descriptionSource: ScientificSource;
}

export interface PlanetProfile {
  readonly id: PlanetId;
  readonly name: string;
  readonly identity: string;
  readonly color: number;
  readonly meanRadiusKm: number;
  readonly siderealRotationDays: number;
  readonly obliquityDegrees: number;
  readonly siderealOrbitYears: number;
  readonly measurements: Readonly<{
    meanRadius: SourcedMeasurement;
    siderealRotation: SourcedMeasurement;
    obliquity: SourcedMeasurement;
    siderealOrbit: SourcedMeasurement;
  }>;
  readonly descriptionSource: ScientificSource;
}

const JPL_PHYSICAL: ScientificSource = {
  organization: 'NASA/JPL',
  url: 'https://ssd.jpl.nasa.gov/planets/phys_par.html',
  retrievedAt: '2026-09-29',
};

const NSSDC_FACT_SHEET: ScientificSource = {
  organization: 'NASA/NSSDC',
  url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/',
  retrievedAt: '2026-09-29',
};

const NASA_SUN_FACTS: ScientificSource = {
  organization: 'NASA Science',
  url: 'https://science.nasa.gov/sun/facts/',
  retrievedAt: '2026-09-29',
};

function nasaPlanetSource(slug: PlanetId): ScientificSource {
  return {
    organization: 'NASA Science',
    url: `https://science.nasa.gov/${slug}/facts/`,
    retrievedAt: '2026-09-29',
  };
}

function measurement(value: number, unit: MeasurementUnit, source: ScientificSource): SourcedMeasurement {
  return { value, unit, source };
}

export const SUN_MEAN_RADIUS = measurement(695_700, 'km', NASA_SUN_FACTS);

export const PLANET_IDS: readonly PlanetId[] = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
];

const PLANETS: Readonly<Record<PlanetId, PlanetRecord>> = {
  mercury: {
    name: 'Mercury',
    identity: 'The smallest planet and the quickest traveler around the Sun.',
    color: 0xaaa39a,
    meanRadius: measurement(2439.4, 'km', JPL_PHYSICAL),
    siderealRotation: measurement(58.6462, 'days', JPL_PHYSICAL),
    obliquity: measurement(0.034, 'degrees', NSSDC_FACT_SHEET),
    siderealOrbit: measurement(0.2408467, 'earth-years', JPL_PHYSICAL),
    descriptionSource: nasaPlanetSource('mercury'),
  },
  venus: {
    name: 'Venus',
    identity: 'A cloud-wrapped world with a slow, retrograde spin.',
    color: 0xd8b36a,
    meanRadius: measurement(6051.8, 'km', JPL_PHYSICAL),
    siderealRotation: measurement(-243.018, 'days', JPL_PHYSICAL),
    obliquity: measurement(177.4, 'degrees', NSSDC_FACT_SHEET),
    siderealOrbit: measurement(0.61519726, 'earth-years', JPL_PHYSICAL),
    descriptionSource: nasaPlanetSource('venus'),
  },
  earth: {
    name: 'Earth',
    identity: 'Our ocean world and the only known home of life.',
    color: 0x3f75bb,
    meanRadius: measurement(6371.0084, 'km', JPL_PHYSICAL),
    siderealRotation: measurement(0.99726968, 'days', JPL_PHYSICAL),
    obliquity: measurement(23.4, 'degrees', NSSDC_FACT_SHEET),
    siderealOrbit: measurement(1.0000174, 'earth-years', JPL_PHYSICAL),
    descriptionSource: nasaPlanetSource('earth'),
  },
  mars: {
    name: 'Mars',
    identity: 'A cold desert world marked by ancient rivers and giant volcanoes.',
    color: 0xb75d3c,
    meanRadius: measurement(3389.5, 'km', JPL_PHYSICAL),
    siderealRotation: measurement(1.02595676, 'days', JPL_PHYSICAL),
    obliquity: measurement(25.2, 'degrees', NSSDC_FACT_SHEET),
    siderealOrbit: measurement(1.8808476, 'earth-years', JPL_PHYSICAL),
    descriptionSource: nasaPlanetSource('mars'),
  },
  jupiter: {
    name: 'Jupiter',
    identity: 'The largest planet, wrapped in fast-moving bands and storms.',
    color: 0xc8986a,
    meanRadius: measurement(69_911, 'km', JPL_PHYSICAL),
    siderealRotation: measurement(0.41354, 'days', JPL_PHYSICAL),
    obliquity: measurement(3.1, 'degrees', NSSDC_FACT_SHEET),
    siderealOrbit: measurement(11.862615, 'earth-years', JPL_PHYSICAL),
    descriptionSource: nasaPlanetSource('jupiter'),
  },
  saturn: {
    name: 'Saturn',
    identity: 'A pale gas giant encircled by an immense system of icy rings.',
    color: 0xd8c08a,
    meanRadius: measurement(58_232, 'km', JPL_PHYSICAL),
    siderealRotation: measurement(0.44401, 'days', JPL_PHYSICAL),
    obliquity: measurement(26.7, 'degrees', NSSDC_FACT_SHEET),
    siderealOrbit: measurement(29.447498, 'earth-years', JPL_PHYSICAL),
    descriptionSource: nasaPlanetSource('saturn'),
  },
  uranus: {
    name: 'Uranus',
    identity: 'An ice giant rotating nearly on its side.',
    color: 0x8dd8de,
    meanRadius: measurement(25_362, 'km', JPL_PHYSICAL),
    siderealRotation: measurement(-0.71833, 'days', JPL_PHYSICAL),
    obliquity: measurement(97.8, 'degrees', NSSDC_FACT_SHEET),
    siderealOrbit: measurement(84.016846, 'earth-years', JPL_PHYSICAL),
    descriptionSource: nasaPlanetSource('uranus'),
  },
  neptune: {
    name: 'Neptune',
    identity: 'A distant blue ice giant swept by powerful winds.',
    color: 0x4267c7,
    meanRadius: measurement(24_622, 'km', JPL_PHYSICAL),
    siderealRotation: measurement(0.67125, 'days', JPL_PHYSICAL),
    obliquity: measurement(28.3, 'degrees', NSSDC_FACT_SHEET),
    siderealOrbit: measurement(164.79132, 'earth-years', JPL_PHYSICAL),
    descriptionSource: nasaPlanetSource('neptune'),
  },
};

export function getPlanetProfile(id: PlanetId): PlanetProfile {
  const planet = PLANETS[id];
  return {
    id,
    name: planet.name,
    identity: planet.identity,
    color: planet.color,
    meanRadiusKm: planet.meanRadius.value,
    siderealRotationDays: planet.siderealRotation.value,
    obliquityDegrees: planet.obliquity.value,
    siderealOrbitYears: planet.siderealOrbit.value,
    measurements: {
      meanRadius: planet.meanRadius,
      siderealRotation: planet.siderealRotation,
      obliquity: planet.obliquity,
      siderealOrbit: planet.siderealOrbit,
    },
    descriptionSource: planet.descriptionSource,
  };
}

export function calculateAxialRotation(id: PlanetId, instant: Date, epoch: Date): number {
  const periodDays = Math.abs(PLANETS[id].siderealRotation.value);
  const elapsedDays = (instant.getTime() - epoch.getTime()) / 86_400_000;
  const normalizedTurns = ((elapsedDays / periodDays) % 1 + 1) % 1;
  return normalizedTurns * Math.PI * 2;
}
