import type { SystemSnapshot } from '../astronomy/reference-frames';
import type { PlanetId, Vector3Au } from '../astronomy/solar-system';

// Illustrative scene units only: these values are never astronomical inputs.
export const GRAVITY_EXTENT = 125;
export const GRAVITY_SUN_RADIUS = 4;
const BODY_RADII: Readonly<Record<PlanetId, number>> = {
  mercury: 0.9, venus: 1.2, earth: 1.3, mars: 1,
  jupiter: 2.8, saturn: 2.2, uranus: 1.8, neptune: 1.8,
};
const DIP_DEPTHS: Readonly<Record<PlanetId, number>> = {
  mercury: 1.4, venus: 1.8, earth: 2, mars: 1.5,
  jupiter: 5, saturn: 4, uranus: 3, neptune: 3,
};
export interface GravityCenter {
  readonly id: PlanetId;
  readonly x: number;
  readonly z: number;
}
export interface GravityPosition extends GravityCenter { readonly y: number }

export function gravityBodyRadius(id: PlanetId): number { return BODY_RADII[id]; }

export function compressGravityPosition(position: Vector3Au): { readonly x: number; readonly z: number } {
  const radius = Math.hypot(position.x, position.y);
  if (radius === 0) return { x: 0, z: 0 };
  const scale = 28 * radius ** 0.36 / radius;
  return { x: position.x * scale, z: position.y * scale };
}

export function gravitySurfaceHeight(x: number, z: number, centers: readonly GravityCenter[]): number {
  let height = -32 * Math.exp(-(x * x + z * z) / (2 * 19 ** 2));
  for (const center of centers) {
    const width = 2.2 + BODY_RADII[center.id] * 0.8;
    const distanceSquared = (x - center.x) ** 2 + (z - center.z) ** 2;
    height -= DIP_DEPTHS[center.id] * Math.exp(-distanceSquared / (2 * width ** 2));
  }
  return height;
}

export function gravityCenters(snapshot: SystemSnapshot): readonly GravityCenter[] {
  return snapshot.planets.map(({ id, position }) => ({ id, ...compressGravityPosition(position) }));
}

export function gravityBodyPosition(center: GravityCenter, centers: readonly GravityCenter[]): GravityPosition {
  return { ...center, y: gravitySurfaceHeight(center.x, center.z, centers) + BODY_RADII[center.id] * 0.75 };
}
