import { expect, it } from 'vitest';
import { parsePreferences } from './preferences';

it.each([null, [], 'low', 1, false, undefined])('ignores non-object preference input %j', (value) => {
  expect(parsePreferences(value)).toEqual({});
});
it('preserves only correctly typed allowlisted values in a fresh object', () => {
  const input = { quality: 'low', reducedMotion: false, labels: true, trails: false, privateId: 'secret', presentation: 'heliosphere' };
  expect(parsePreferences(input)).toEqual({ quality: 'low', reducedMotion: false, labels: true, trails: false });
  expect(parsePreferences(input)).not.toBe(input);
  expect(parsePreferences({ quality: 'ultra', labels: 1, reducedMotion: null, trails: 'true' })).toEqual({});
});
