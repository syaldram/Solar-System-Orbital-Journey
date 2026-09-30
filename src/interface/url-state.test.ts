import { describe, expect, it } from 'vitest';

import { decodeSharedView, encodeSharedView } from './url-state';

describe('shareable URL state', () => {
  it('round-trips the agreed shareable fields', () => {
    const shared = {
      timeMs: Date.parse('2042-03-14T12:30:00.000Z'),
      frame: 'space' as const,
      selectedBody: 'saturn' as const,
      cameraBookmark: 'path' as const,
    };

    expect(decodeSharedView(encodeSharedView(shared))).toEqual(shared);
  });

  it('rejects invalid values instead of leaking them into application state', () => {
    const invalid = new URLSearchParams({
      date: 'not-a-date',
      view: 'hyperspace',
      body: '<script>',
      camera: 'somewhere',
    });

    expect(decodeSharedView(invalid)).toEqual({});
  });

  it('ignores Galactic elapsed time and speed fields', () => {
    const decoded = decodeSharedView(new URLSearchParams({
      date: '2042-03-14T12:30:00.000Z',
      view: 'galaxy',
      camera: 'full',
      galacticElapsedMillionYears: '80',
      galacticSpeed: '25',
    }));

    expect(decoded).toEqual({
      timeMs: Date.parse('2042-03-14T12:30:00.000Z'),
      frame: 'galaxy',
      cameraBookmark: 'full',
    });
  });
});
