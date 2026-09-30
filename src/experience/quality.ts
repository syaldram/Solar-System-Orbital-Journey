import type { QualityPreference } from './experience-state';

export type QualityTier = Exclude<QualityPreference, 'auto'>;

const EFFECTIVE_QUALITY: Readonly<Record<QualityPreference, QualityTier>> = {
  auto: 'high',
  high: 'high',
  balanced: 'balanced',
  low: 'low',
};

export const QUALITY_CORONA_DETAIL: Readonly<Record<QualityTier, string>> = {
  high: 'full',
  balanced: 'reduced',
  low: 'simplified',
};

export function resolveQualityTier(preference: QualityPreference): QualityTier {
  return EFFECTIVE_QUALITY[preference];
}
