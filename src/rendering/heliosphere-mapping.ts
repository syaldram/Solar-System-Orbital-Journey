import type { PlanetId, Vector3Au } from '../astronomy/solar-system';

// Design parameters in illustrative scene units, never scientific constants.
export const HELIOSPHERE_SUN_RADIUS = 4;
export const TERMINATION_SHOCK_RADIUS = 112;
export const HELIOPAUSE_RADIUS = 145;
const BODY_RADII: Readonly<Record<PlanetId, number>> = {
  mercury: 1, venus: 1.3, earth: 1.4, mars: 1.1,
  jupiter: 3, saturn: 2.5, uranus: 2, neptune: 2,
};
export function heliosphereBodyRadius(id: PlanetId): number { return BODY_RADII[id]; }
export function heliosphereDistance(radiusAu: number): number { return 22 * radiusAu ** 0.4; }

/** Preserve the complete heliocentric direction (including orbital inclination). */
export function mapHeliospherePosition(position: Vector3Au): { readonly x: number; readonly y: number; readonly z: number } {
  const radius = Math.hypot(position.x, position.y, position.z);
  const scale = radius === 0 ? 0 : heliosphereDistance(radius) / radius;
  return { x: position.x * scale, y: position.z * scale, z: position.y * scale };
}
