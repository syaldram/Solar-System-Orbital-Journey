import { describe, expect, it } from 'vitest';

import { createInitialExperienceState, updateExperience } from './experience-state';
import { applyCurrentTourChapter } from './tour';

const TODAY = new Date('2026-09-29T12:00:00.000Z');

describe('experience state', () => {
  it('starts paused today with a 165-Julian-year range', () => {
    const state = createInitialExperienceState(TODAY);

    expect(state.currentTimeMs).toBe(TODAY.getTime());
    expect(state.endTimeMs - state.startTimeMs).toBe(165 * 365.25 * 86_400_000);
    expect(state.isPlaying).toBe(false);
    expect(state.frame).toBe('sun');
  });

  it('advances at the named rate and stops instead of looping at the endpoint', () => {
    let state = createInitialExperienceState(TODAY);
    state = updateExperience(state, { type: 'set-speed', speed: 'decade' });
    state = updateExperience(state, { type: 'play' });
    state = updateExperience(state, { type: 'advance', realSeconds: 20 });

    expect(state.currentTimeMs).toBe(state.endTimeMs);
    expect(state.isPlaying).toBe(false);
    expect(state.journeyComplete).toBe(true);
  });

  it('resets trails whenever the reference frame changes', () => {
    const initial = createInitialExperienceState(TODAY);
    const changed = updateExperience(initial, { type: 'set-frame', frame: 'space' });

    expect(changed.frame).toBe('space');
    expect(changed.trailRevision).toBe(initial.trailRevision + 1);
  });

  it('moves through the skippable five-chapter tour', () => {
    let state = updateExperience(createInitialExperienceState(TODAY), { type: 'start-tour' });
    expect(state.tour).toEqual({ status: 'running', chapter: 0 });

    state = updateExperience(state, { type: 'next-chapter' });
    expect(state.tour.chapter).toBe(1);

    state = updateExperience(state, { type: 'skip-tour' });
    expect(state.tour.status).toBe('skipped');
    expect(state.isPlaying).toBe(false);
  });

  it('applies each chapter through normal experience actions', () => {
    let state = updateExperience(createInitialExperienceState(TODAY), { type: 'start-tour' });
    state = updateExperience(state, { type: 'next-chapter' });
    state = applyCurrentTourChapter(state);

    expect(state.cameraBookmark).toBe('outer');
    expect(state.speed).toBe('year');
    expect(state.isPlaying).toBe(true);
  });

  it('reapplies a camera bookmark when the same bookmark is selected again', () => {
    const initial = createInitialExperienceState(TODAY);
    const first = updateExperience(initial, { type: 'set-bookmark', bookmark: 'path' });
    const repeated = updateExperience(first, { type: 'set-bookmark', bookmark: 'path' });

    expect(repeated.cameraBookmark).toBe('path');
    expect(repeated.cameraRevision).toBe(first.cameraRevision + 1);
  });
});
