import { getPlanetProfile, SUN_MEAN_RADIUS } from '../astronomy/planet-data';
import { GALACTIC_MODEL } from '../astronomy/reference-frames';
import { calculatePerihelionDistanceAu, type PlanetId } from '../astronomy/solar-system';

export const AU_SCALE = 10;
export const FULL_JOURNEY_LENGTH = 700;

const J2000 = new Date('2000-01-01T12:00:00.000Z');
const mercuryPerihelionSceneUnits = calculatePerihelionDistanceAu('mercury', J2000) * AU_SCALE;

export const SUN_DISPLAY_RADIUS = mercuryPerihelionSceneUnits / 3;
export const BODY_SCALE_SCENE_UNITS_PER_KM = SUN_DISPLAY_RADIUS / SUN_MEAN_RADIUS.value;
export const FULL_JOURNEY_AU_SCALE = FULL_JOURNEY_LENGTH / GALACTIC_MODEL.fullJourneyDistance.value;
export const FULL_JOURNEY_GROUP_SCALE = FULL_JOURNEY_AU_SCALE / AU_SCALE;

export function planetDisplayRadius(id: PlanetId): number {
  return getPlanetProfile(id).meanRadiusKm * BODY_SCALE_SCENE_UNITS_PER_KM;
}
