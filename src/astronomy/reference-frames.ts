import {
  calculateHeliocentricPosition,
  type PlanetId,
  type Vector3Au,
} from './solar-system';

export type ReferenceFrame = 'sun' | 'space';

export interface PlanetPosition {
  readonly id: PlanetId;
  readonly position: Vector3Au;
}

export interface SystemSnapshot {
  readonly instant: Date;
  readonly frame: ReferenceFrame;
  readonly sun: Vector3Au;
  readonly planets: readonly PlanetPosition[];
}

const PLANET_IDS: readonly PlanetId[] = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
];

interface SourcedConstant<Unit extends string> {
  readonly value: number;
  readonly unit: Unit;
  readonly source: Readonly<{
    organization: string;
    url: string;
    retrievedAt: '2026-09-29';
  }>;
}

const JPL_FRAME_SOURCE = {
  organization: 'NASA/JPL',
  url: 'https://tmo.jpl.nasa.gov/2000-2009/progress_report/42-161/161L.pdf',
  retrievedAt: '2026-09-29',
} as const;

const ESA_GALACTIC_SOURCE = {
  organization: 'ESA/Gaia',
  url: 'https://www.cosmos.esa.int/web/gaia/edr3-acceleration-solar-system',
  retrievedAt: '2026-09-29',
} as const;

export const GALACTIC_MODEL = {
  localSpeed: {
    value: 220,
    unit: 'km/s',
    source: ESA_GALACTIC_SOURCE,
  } satisfies SourcedConstant<'km/s'>,
  distanceFromCenter: {
    value: 26_000,
    unit: 'light-years',
    source: ESA_GALACTIC_SOURCE,
  } satisfies SourcedConstant<'light-years'>,
  approximatePeriod: {
    value: 230,
    unit: 'million Earth years',
    source: {
      organization: 'NASA Science',
      url: 'https://science.nasa.gov/sun/facts/',
      retrievedAt: '2026-09-29',
    },
  } satisfies SourcedConstant<'million Earth years'>,
  eclipticGalacticInclination: {
    value: 60.19,
    unit: 'degrees',
    source: JPL_FRAME_SOURCE,
  } satisfies SourcedConstant<'degrees'>,
  fullJourneyDistance: {
    value: 7_657,
    unit: 'au',
    source: ESA_GALACTIC_SOURCE,
  } satisfies SourcedConstant<'au'>,
} as const;

const ASTRONOMICAL_UNIT = {
  value: 149_597_870.7,
  unit: 'km',
  source: {
    organization: 'NASA/JPL',
    url: 'https://ssd.jpl.nasa.gov/astro_par.html',
    retrievedAt: '2026-09-29',
  },
} satisfies SourcedConstant<'km'>;

const J2000_OBLIQUITY = {
  value: 23.43928,
  unit: 'degrees',
  source: JPL_FRAME_SOURCE,
} satisfies SourcedConstant<'degrees'>;

const EQUATORIAL_TO_GALACTIC = {
  value: [
    [-0.0548755604, -0.8734370902, -0.4838350155],
    [0.4941094279, -0.44482963, 0.7469822445],
    [-0.867666149, -0.1980763734, 0.4559837762],
  ],
  unit: 'dimensionless',
  source: JPL_FRAME_SOURCE,
} as const;

export function eclipticToGalactic(vector: Vector3Au): Vector3Au {
  const obliquityRadians = (J2000_OBLIQUITY.value * Math.PI) / 180;
  const cosObliquity = Math.cos(obliquityRadians);
  const sinObliquity = Math.sin(obliquityRadians);
  const equatorial = {
    x: vector.x,
    y: cosObliquity * vector.y - sinObliquity * vector.z,
    z: sinObliquity * vector.y + cosObliquity * vector.z,
  };

  return {
    x:
      EQUATORIAL_TO_GALACTIC.value[0][0] * equatorial.x +
      EQUATORIAL_TO_GALACTIC.value[0][1] * equatorial.y +
      EQUATORIAL_TO_GALACTIC.value[0][2] * equatorial.z,
    y:
      EQUATORIAL_TO_GALACTIC.value[1][0] * equatorial.x +
      EQUATORIAL_TO_GALACTIC.value[1][1] * equatorial.y +
      EQUATORIAL_TO_GALACTIC.value[1][2] * equatorial.z,
    z:
      EQUATORIAL_TO_GALACTIC.value[2][0] * equatorial.x +
      EQUATORIAL_TO_GALACTIC.value[2][1] * equatorial.y +
      EQUATORIAL_TO_GALACTIC.value[2][2] * equatorial.z,
  };
}

function localSunPosition(instant: Date, epoch: Date): Vector3Au {
  const elapsedSeconds = (instant.getTime() - epoch.getTime()) / 1_000;
  const distanceAu = (elapsedSeconds * GALACTIC_MODEL.localSpeed.value) / ASTRONOMICAL_UNIT.value;
  return { x: 0, y: distanceAu, z: 0 };
}

export function calculateSystemSnapshot(
  instant: Date,
  epoch: Date,
  frame: ReferenceFrame,
): SystemSnapshot {
  const sun = frame === 'sun' ? { x: 0, y: 0, z: 0 } : localSunPosition(instant, epoch);
  const planets = PLANET_IDS.map((id) => {
    const heliocentric = calculateHeliocentricPosition(id, instant);
    const relative = frame === 'sun' ? heliocentric : eclipticToGalactic(heliocentric);
    return {
      id,
      position: {
        x: relative.x + sun.x,
        y: relative.y + sun.y,
        z: relative.z + sun.z,
      },
    };
  });

  return { instant, frame, sun, planets };
}
