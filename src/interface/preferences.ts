import type { QualityPreference } from '../experience/experience-state';

export interface SavedPreferences {
  readonly reducedMotion?: boolean;
  readonly quality?: QualityPreference;
  readonly labels?: boolean;
  readonly trails?: boolean;
}

/** External storage is untrusted; return a new allowlisted object. */
export function parsePreferences(value: unknown): SavedPreferences {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: { reducedMotion?: boolean; quality?: QualityPreference; labels?: boolean; trails?: boolean } = {};
  if ('reducedMotion' in value && typeof value.reducedMotion === 'boolean') result.reducedMotion = value.reducedMotion;
  if ('labels' in value && typeof value.labels === 'boolean') result.labels = value.labels;
  if ('trails' in value && typeof value.trails === 'boolean') result.trails = value.trails;
  if ('quality' in value && (value.quality === 'auto' || value.quality === 'high' || value.quality === 'balanced' || value.quality === 'low')) result.quality = value.quality;
  return result;
}
