import type { QualityPreference } from '../experience/experience-state';
import { resolveQualityTier, type QualityTier } from '../experience/quality';

export interface RenderingQualityProfile {
  readonly pixelRatioCap: number;
  readonly localStarCount: number;
  readonly galaxyForegroundStarCount: number;
  readonly galaxyStarCount: number;
  readonly solarCoronaLayerCount: number;
  readonly showAtmospheres: boolean;
  readonly showEarthClouds: boolean;
  readonly ringOpacityFactor: number;
  readonly galaxyDiskOpacity: number;
  readonly galaxyHazeOpacity: number;
  readonly galaxyCoronaScale: number;
  readonly galaxyCoronaOpacity: number;
  readonly pathMarkerSpacingAu: number;
}

const RENDERING_QUALITY_PROFILES: Readonly<Record<QualityTier, RenderingQualityProfile>> = {
  high: {
    pixelRatioCap: 2,
    localStarCount: 7_500,
    galaxyForegroundStarCount: 450,
    galaxyStarCount: 1_200,
    solarCoronaLayerCount: 3,
    showAtmospheres: true,
    showEarthClouds: true,
    ringOpacityFactor: 1,
    galaxyDiskOpacity: 0.92,
    galaxyHazeOpacity: 0.22,
    galaxyCoronaScale: 7,
    galaxyCoronaOpacity: 0.58,
    pathMarkerSpacingAu: 4,
  },
  balanced: {
    pixelRatioCap: 1.5,
    localStarCount: 4_500,
    galaxyForegroundStarCount: 260,
    galaxyStarCount: 700,
    solarCoronaLayerCount: 2,
    showAtmospheres: true,
    showEarthClouds: false,
    ringOpacityFactor: 0.82,
    galaxyDiskOpacity: 0.92,
    galaxyHazeOpacity: 0.14,
    galaxyCoronaScale: 6,
    galaxyCoronaOpacity: 0.42,
    pathMarkerSpacingAu: 7,
  },
  low: {
    pixelRatioCap: 1,
    localStarCount: 2_300,
    galaxyForegroundStarCount: 120,
    galaxyStarCount: 320,
    solarCoronaLayerCount: 1,
    showAtmospheres: false,
    showEarthClouds: false,
    ringOpacityFactor: 0.65,
    galaxyDiskOpacity: 0.78,
    galaxyHazeOpacity: 0.08,
    galaxyCoronaScale: 4.8,
    galaxyCoronaOpacity: 0.26,
    pathMarkerSpacingAu: 12,
  },
};

export function getRenderingQualityProfile(preference: QualityPreference): RenderingQualityProfile {
  return RENDERING_QUALITY_PROFILES[resolveQualityTier(preference)];
}
