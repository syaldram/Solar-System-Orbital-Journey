import { afterEach, expect, it, vi } from 'vitest';
import { AdaptiveQualityMonitor } from './adaptive-quality-monitor';
afterEach(() => vi.restoreAllMocks());
it('adapts once after 180 sustained valid slow auto frames, ignoring stalls and invalid intervals', () => {
  vi.spyOn(performance, 'now').mockReturnValue(0);
  const monitor = new AdaptiveQualityMonitor();
  expect(monitor.sample('auto', 0)).toBeNull();
  expect(monitor.sample('auto', 1000)).toBeNull();
  for (const now of [NaN, Infinity, -Infinity]) expect(monitor.sample('auto', now)).toBeNull();
  expect(monitor.sample('auto', 1030)).toBeNull();
  expect(monitor.sample('auto', 1030)).toBeNull(); // duplicate after one valid sample
  expect(monitor.sample('auto', 1020)).toBeNull(); // backwards updates baseline per existing policy
  expect(monitor.sample('auto', 1050)).toBeNull(); // second valid sample
  for (let i = 3; i < 180; i++) expect(monitor.sample('auto', 990 + i * 30)).toBeNull();
  // Nonfinite samples cannot count toward the threshold or poison the last
  // valid timestamp: the next 30 ms sample must remain the 180th valid one.
  for (const now of [NaN, Infinity, -Infinity]) expect(monitor.sample('auto', now)).toBeNull();
  expect(monitor.sample('auto', 6390)).toBe('balanced');
  for (let i = 1; i <= 180; i++) expect(monitor.sample('auto', 6390 + i * 30)).toBeNull();
});
it.each(['high', 'balanced', 'low', 'auto'] as const)('retains %s on fast samples and manual preference on slow samples', (quality) => {
  vi.spyOn(performance, 'now').mockReturnValue(0);
  const monitor = new AdaptiveQualityMonitor();
  for (let i = 1; i <= 180; i++) expect(monitor.sample(quality, i * 16)).toBeNull();
  if (quality !== 'auto') for (let i = 1; i <= 180; i++) expect(monitor.sample(quality, 2880 + i * 30)).toBeNull();
});
