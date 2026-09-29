export type PlanetId =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

export interface Vector3Au {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface OrbitalElements {
  readonly source: OrbitalModelSource;
  readonly units: typeof ORBITAL_ELEMENT_UNITS;
  readonly semiMajorAxisAu: readonly [number, number];
  readonly eccentricity: readonly [number, number];
  readonly inclinationDegrees: readonly [number, number];
  readonly meanLongitudeDegrees: readonly [number, number];
  readonly perihelionLongitudeDegrees: readonly [number, number];
  readonly ascendingNodeLongitudeDegrees: readonly [number, number];
  readonly periodicTerms?: Readonly<{
    b: number;
    c: number;
    s: number;
    f: number;
  }>;
}

export interface OrbitalModelSource {
  readonly organization: 'NASA/JPL';
  readonly url: string;
  readonly retrievedAt: '2026-09-29';
  readonly validFrom: '3000 BC';
  readonly validThrough: 'AD 3000';
}

const JULIAN_DATE_UNIX_EPOCH = 2_440_587.5;
const JULIAN_DATE_J2000 = 2_451_545;
const DAYS_PER_JULIAN_CENTURY = 36_525;
const MILLISECONDS_PER_DAY = 86_400_000;
const ASTRONOMICAL_UNIT_KM = 149_597_870.7;

export const JPL_APPROXIMATE_ORBIT_SOURCE: OrbitalModelSource = {
  organization: 'NASA/JPL',
  url: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html',
  retrievedAt: '2026-09-29',
  validFrom: '3000 BC',
  validThrough: 'AD 3000',
};

const ORBITAL_ELEMENT_UNITS = {
  semiMajorAxis: 'au and au/Julian-century',
  eccentricity: 'dimensionless and dimensionless/Julian-century',
  angles: 'degrees and degrees/Julian-century',
  periodicCorrection: 'degrees',
} as const;

const JPL_ORBITAL_METADATA = {
  source: JPL_APPROXIMATE_ORBIT_SOURCE,
  units: ORBITAL_ELEMENT_UNITS,
} as const;

const ORBITAL_ELEMENTS: Readonly<Record<PlanetId, OrbitalElements>> = {
  mercury: {
    ...JPL_ORBITAL_METADATA,
    semiMajorAxisAu: [0.38709843, 0],
    eccentricity: [0.20563661, 0.00002123],
    inclinationDegrees: [7.00559432, -0.00590158],
    meanLongitudeDegrees: [252.25166724, 149_472.67486623],
    perihelionLongitudeDegrees: [77.45771895, 0.15940013],
    ascendingNodeLongitudeDegrees: [48.33961819, -0.12214182],
  },
  venus: {
    ...JPL_ORBITAL_METADATA,
    semiMajorAxisAu: [0.72332102, -0.00000026],
    eccentricity: [0.00676399, -0.00005107],
    inclinationDegrees: [3.39777545, 0.00043494],
    meanLongitudeDegrees: [181.9797085, 58_517.8156026],
    perihelionLongitudeDegrees: [131.76755713, 0.05679648],
    ascendingNodeLongitudeDegrees: [76.67261496, -0.27274174],
  },
  earth: {
    ...JPL_ORBITAL_METADATA,
    semiMajorAxisAu: [1.00000018, -0.00000003],
    eccentricity: [0.01673163, -0.00003661],
    inclinationDegrees: [-0.00054346, -0.01337178],
    meanLongitudeDegrees: [100.46691572, 35_999.37306329],
    perihelionLongitudeDegrees: [102.93005885, 0.3179526],
    ascendingNodeLongitudeDegrees: [-5.11260389, -0.24123856],
  },
  mars: {
    ...JPL_ORBITAL_METADATA,
    semiMajorAxisAu: [1.52371243, 0.00000097],
    eccentricity: [0.09336511, 0.00009149],
    inclinationDegrees: [1.85181869, -0.00724757],
    meanLongitudeDegrees: [-4.56813164, 19_140.29934243],
    perihelionLongitudeDegrees: [-23.91744784, 0.45223625],
    ascendingNodeLongitudeDegrees: [49.71320984, -0.26852431],
  },
  jupiter: {
    ...JPL_ORBITAL_METADATA,
    semiMajorAxisAu: [5.20248019, -0.00002864],
    eccentricity: [0.0485359, 0.00018026],
    inclinationDegrees: [1.29861416, -0.00322699],
    meanLongitudeDegrees: [34.33479152, 3_034.90371757],
    perihelionLongitudeDegrees: [14.27495244, 0.18199196],
    ascendingNodeLongitudeDegrees: [100.29282654, 0.13024619],
    periodicTerms: { b: -0.00012452, c: 0.0606406, s: -0.35635438, f: 38.35125 },
  },
  saturn: {
    ...JPL_ORBITAL_METADATA,
    semiMajorAxisAu: [9.54149883, -0.00003065],
    eccentricity: [0.05550825, -0.00032044],
    inclinationDegrees: [2.49424102, 0.00451969],
    meanLongitudeDegrees: [50.07571329, 1_222.11494724],
    perihelionLongitudeDegrees: [92.86136063, 0.54179478],
    ascendingNodeLongitudeDegrees: [113.63998702, -0.25015002],
    periodicTerms: { b: 0.00025899, c: -0.13434469, s: 0.87320147, f: 38.35125 },
  },
  uranus: {
    ...JPL_ORBITAL_METADATA,
    semiMajorAxisAu: [19.18797948, -0.00020455],
    eccentricity: [0.0468574, -0.0000155],
    inclinationDegrees: [0.77298127, -0.00180155],
    meanLongitudeDegrees: [314.20276625, 428.49512595],
    perihelionLongitudeDegrees: [172.43404441, 0.09266985],
    ascendingNodeLongitudeDegrees: [73.96250215, 0.05739699],
    periodicTerms: { b: 0.00058331, c: -0.97731848, s: 0.17689245, f: 7.67025 },
  },
  neptune: {
    ...JPL_ORBITAL_METADATA,
    semiMajorAxisAu: [30.06952752, 0.00006447],
    eccentricity: [0.00895439, 0.00000818],
    inclinationDegrees: [1.7700552, 0.000224],
    meanLongitudeDegrees: [304.22289287, 218.46515314],
    perihelionLongitudeDegrees: [46.68158724, 0.01009938],
    ascendingNodeLongitudeDegrees: [131.78635853, -0.00606302],
    periodicTerms: { b: -0.00041348, c: 0.68346318, s: -0.10162547, f: 7.67025 },
  },
};

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function normalizeRadians(angle: number): number {
  const turn = Math.PI * 2;
  return ((angle + Math.PI) % turn + turn) % turn - Math.PI;
}

function atCentury([base, rate]: readonly [number, number], centuries: number): number {
  return base + rate * centuries;
}

function solveEccentricAnomaly(meanAnomaly: number, eccentricity: number): number {
  let eccentricAnomaly = meanAnomaly + eccentricity * Math.sin(meanAnomaly);

  for (let iteration = 0; iteration < 12; iteration += 1) {
    const delta =
      (meanAnomaly - (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly))) /
      (1 - eccentricity * Math.cos(eccentricAnomaly));
    eccentricAnomaly += delta;
    if (Math.abs(delta) < 1e-12) break;
  }

  return eccentricAnomaly;
}

export function calculateHeliocentricPosition(planet: PlanetId, instant: Date): Vector3Au {
  if (Number.isNaN(instant.getTime())) throw new RangeError('A valid UTC instant is required.');

  const elements = ORBITAL_ELEMENTS[planet];
  const julianDate = instant.getTime() / MILLISECONDS_PER_DAY + JULIAN_DATE_UNIX_EPOCH;
  const centuries = (julianDate - JULIAN_DATE_J2000) / DAYS_PER_JULIAN_CENTURY;
  const a = atCentury(elements.semiMajorAxisAu, centuries);
  const e = atCentury(elements.eccentricity, centuries);
  const inclination = degreesToRadians(atCentury(elements.inclinationDegrees, centuries));
  const meanLongitude = atCentury(elements.meanLongitudeDegrees, centuries);
  const perihelionLongitude = atCentury(elements.perihelionLongitudeDegrees, centuries);
  const ascendingNode = degreesToRadians(
    atCentury(elements.ascendingNodeLongitudeDegrees, centuries),
  );
  const argumentOfPerihelion = degreesToRadians(perihelionLongitude) - ascendingNode;
  const periodicCorrection = elements.periodicTerms
    ? elements.periodicTerms.b * centuries * centuries +
      elements.periodicTerms.c * Math.cos(degreesToRadians(elements.periodicTerms.f * centuries)) +
      elements.periodicTerms.s * Math.sin(degreesToRadians(elements.periodicTerms.f * centuries))
    : 0;
  const meanAnomaly = normalizeRadians(
    degreesToRadians(meanLongitude - perihelionLongitude + periodicCorrection),
  );
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, e);
  const xPrime = a * (Math.cos(eccentricAnomaly) - e);
  const yPrime = a * Math.sqrt(1 - e * e) * Math.sin(eccentricAnomaly);

  const cosOmega = Math.cos(ascendingNode);
  const sinOmega = Math.sin(ascendingNode);
  const cosArgument = Math.cos(argumentOfPerihelion);
  const sinArgument = Math.sin(argumentOfPerihelion);
  const cosInclination = Math.cos(inclination);
  const sinInclination = Math.sin(inclination);

  return {
    x:
      (cosArgument * cosOmega - sinArgument * sinOmega * cosInclination) * xPrime +
      (-sinArgument * cosOmega - cosArgument * sinOmega * cosInclination) * yPrime,
    y:
      (cosArgument * sinOmega + sinArgument * cosOmega * cosInclination) * xPrime +
      (-sinArgument * sinOmega + cosArgument * cosOmega * cosInclination) * yPrime,
    z: sinArgument * sinInclination * xPrime + cosArgument * sinInclination * yPrime,
  };
}

export function calculatePerihelionDistanceAu(planet: PlanetId, instant: Date): number {
  if (Number.isNaN(instant.getTime())) throw new RangeError('A valid UTC instant is required.');

  const elements = ORBITAL_ELEMENTS[planet];
  const julianDate = instant.getTime() / MILLISECONDS_PER_DAY + JULIAN_DATE_UNIX_EPOCH;
  const centuries = (julianDate - JULIAN_DATE_J2000) / DAYS_PER_JULIAN_CENTURY;
  const semiMajorAxisAu = atCentury(elements.semiMajorAxisAu, centuries);
  const eccentricity = atCentury(elements.eccentricity, centuries);
  return semiMajorAxisAu * (1 - eccentricity);
}

export function calculateOrbitalSpeedKmPerSecond(planet: PlanetId, instant: Date): number {
  const halfWindowMs = 30 * 60 * 1_000;
  const before = calculateHeliocentricPosition(planet, new Date(instant.getTime() - halfWindowMs));
  const after = calculateHeliocentricPosition(planet, new Date(instant.getTime() + halfWindowMs));
  const distanceAu = Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z);
  return (distanceAu * ASTRONOMICAL_UNIT_KM) / ((halfWindowMs * 2) / 1_000);
}

export function calculateOrbitPath(
  planet: PlanetId,
  instant: Date,
  samples = 192,
): readonly Vector3Au[] {
  if (!Number.isInteger(samples) || samples < 8) {
    throw new RangeError('Orbit paths require at least eight samples.');
  }

  const orbitalPeriodDays =
    (360 / Math.abs(ORBITAL_ELEMENTS[planet].meanLongitudeDegrees[1])) * DAYS_PER_JULIAN_CENTURY;
  const first = calculateHeliocentricPosition(planet, instant);
  const path: Vector3Au[] = [first];
  for (let index = 1; index < samples; index += 1) {
    const sampleTime = new Date(
      instant.getTime() + (index / samples) * orbitalPeriodDays * MILLISECONDS_PER_DAY,
    );
    path.push(calculateHeliocentricPosition(planet, sampleTime));
  }
  path.push(first);
  return path;
}
