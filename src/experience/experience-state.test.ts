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

  it('starts the independent Galactic elapsed time journey at the present anchor', () => {
    const state = createInitialExperienceState(TODAY);

    expect(state.galacticElapsedMillionYears).toBe(0);
    expect(state.galacticEndMillionYears).toBe(230);
    expect(state.galacticSpeed).toBe(5);
    expect(state.galacticJourneyComplete).toBe(false);
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

  it('enters Galaxy Overview paused without changing the Solar-System clock', () => {
    let state = createInitialExperienceState(TODAY);
    state = updateExperience(state, { type: 'set-speed', speed: 'year' });
    state = updateExperience(state, { type: 'play' });
    state = updateExperience(state, { type: 'advance', realSeconds: 2 });
    const solarTime = state.currentTimeMs;

    state = updateExperience(state, { type: 'set-frame', frame: 'galaxy' });

    expect(state.frame).toBe('galaxy');
    expect(state.isPlaying).toBe(false);
    expect(state.currentTimeMs).toBe(solarTime);
    expect(state.speed).toBe('year');
    expect(state.galacticElapsedMillionYears).toBe(0);
  });

  it.each([1, 5, 10, 25] as const)('advances Galactic elapsed time at %i million years per second', (speed) => {
    let state = createInitialExperienceState(TODAY);
    const solarTime = state.currentTimeMs;
    state = updateExperience(state, { type: 'set-frame', frame: 'galaxy' });
    state = updateExperience(state, { type: 'set-galactic-speed', speed });
    state = updateExperience(state, { type: 'play' });
    state = updateExperience(state, { type: 'advance', realSeconds: 2 });

    expect(state.galacticElapsedMillionYears).toBe(speed * 2);
    expect(state.currentTimeMs).toBe(solarTime);
    expect(state.isPlaying).toBe(true);
  });

  it('scrubs Galactic elapsed time to a clamped whole-million-year value and pauses', () => {
    let state = createInitialExperienceState(TODAY);
    state = updateExperience(state, { type: 'set-frame', frame: 'galaxy' });
    state = updateExperience(state, { type: 'play' });
    state = updateExperience(state, { type: 'scrub-galactic', elapsedMillionYears: 42.7 });

    expect(state.galacticElapsedMillionYears).toBe(43);
    expect(state.galacticJourneyComplete).toBe(false);
    expect(state.isPlaying).toBe(false);

    state = updateExperience(state, { type: 'scrub-galactic', elapsedMillionYears: -10 });
    expect(state.galacticElapsedMillionYears).toBe(0);

    state = updateExperience(state, { type: 'scrub-galactic', elapsedMillionYears: 500 });
    expect(state.galacticElapsedMillionYears).toBe(230);
    expect(state.galacticJourneyComplete).toBe(true);
  });

  it('returns or replays Galactic elapsed time from the present without changing its selected speed', () => {
    let state = createInitialExperienceState(TODAY);
    state = updateExperience(state, { type: 'set-frame', frame: 'galaxy' });
    state = updateExperience(state, { type: 'set-galactic-speed', speed: 25 });
    state = updateExperience(state, { type: 'scrub-galactic', elapsedMillionYears: 230 });
    state = updateExperience(state, { type: 'return-present' });

    expect(state.galacticElapsedMillionYears).toBe(0);
    expect(state.galacticSpeed).toBe(25);
    expect(state.galacticJourneyComplete).toBe(false);
    expect(state.isPlaying).toBe(false);

    state = updateExperience(state, { type: 'scrub-galactic', elapsedMillionYears: 230 });
    state = updateExperience(state, { type: 'replay-galactic' });
    expect(state.galacticElapsedMillionYears).toBe(0);
    expect(state.galacticSpeed).toBe(25);
    expect(state.isPlaying).toBe(true);
  });

  it('dismisses Galactic completion while remaining paused at the completed orbit', () => {
    let state = createInitialExperienceState(TODAY);
    state = updateExperience(state, { type: 'set-frame', frame: 'galaxy' });
    state = updateExperience(state, { type: 'scrub-galactic', elapsedMillionYears: 230 });

    state = updateExperience(state, { type: 'dismiss-completion' });

    expect(state.galacticElapsedMillionYears).toBe(230);
    expect(state.galacticJourneyComplete).toBe(true);
    expect(state.galacticCompletionDismissed).toBe(true);
    expect(state.isPlaying).toBe(false);
  });

  it('stops Galactic playback at one orbit and never loops', () => {
    let state = createInitialExperienceState(TODAY);
    state = updateExperience(state, { type: 'set-frame', frame: 'galaxy' });
    state = updateExperience(state, { type: 'set-galactic-speed', speed: 25 });
    state = updateExperience(state, { type: 'scrub-galactic', elapsedMillionYears: 229 });
    state = updateExperience(state, { type: 'play' });
    state = updateExperience(state, { type: 'advance', realSeconds: 1 });

    expect(state.galacticElapsedMillionYears).toBe(230);
    expect(state.galacticJourneyComplete).toBe(true);
    expect(state.isPlaying).toBe(false);

    state = updateExperience(state, { type: 'advance', realSeconds: 20 });
    expect(state.galacticElapsedMillionYears).toBe(230);
  });

  it('preserves Galactic progress in memory while only the active Solar-System clock advances', () => {
    let state = createInitialExperienceState(TODAY);
    state = updateExperience(state, { type: 'set-frame', frame: 'galaxy' });
    state = updateExperience(state, { type: 'set-galactic-speed', speed: 10 });
    state = updateExperience(state, { type: 'scrub-galactic', elapsedMillionYears: 80 });
    state = updateExperience(state, { type: 'set-frame', frame: 'sun' });
    state = updateExperience(state, { type: 'play' });
    state = updateExperience(state, { type: 'advance', realSeconds: 1 });

    expect(state.currentTimeMs).toBeGreaterThan(state.startTimeMs);
    expect(state.galacticElapsedMillionYears).toBe(80);
    expect(state.galacticSpeed).toBe(10);

    state = updateExperience(state, { type: 'set-frame', frame: 'galaxy' });
    expect(state.galacticElapsedMillionYears).toBe(80);
    expect(state.isPlaying).toBe(false);
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

  it.each(['start-tour', 'replay'] as const)('%s resets Galactic elapsed time and speed for a deterministic tour', (type) => {
    let state = createInitialExperienceState(TODAY);
    state = updateExperience(state, { type: 'set-frame', frame: 'galaxy' });
    state = updateExperience(state, { type: 'set-galactic-speed', speed: 25 });
    state = updateExperience(state, { type: 'scrub-galactic', elapsedMillionYears: 120 });

    state = updateExperience(state, { type });

    expect(state.galacticElapsedMillionYears).toBe(0);
    expect(state.galacticSpeed).toBe(5);
    expect(state.galacticJourneyComplete).toBe(false);
  });

  it('applies each chapter through normal experience actions', () => {
    let state = updateExperience(createInitialExperienceState(TODAY), { type: 'start-tour' });
    state = updateExperience(state, { type: 'next-chapter' });
    state = applyCurrentTourChapter(state);

    expect(state.cameraBookmark).toBe('outer');
    expect(state.speed).toBe('year');
    expect(state.isPlaying).toBe(true);
  });

  it('enters the guided Galaxy Overview chapter paused at the present anchor', () => {
    let state = updateExperience(createInitialExperienceState(TODAY), { type: 'start-tour' });
    for (let chapter = 0; chapter < 4; chapter += 1) {
      state = updateExperience(state, { type: 'next-chapter' });
      state = applyCurrentTourChapter(state);
    }

    expect(state.frame).toBe('galaxy');
    expect(state.galacticElapsedMillionYears).toBe(0);
    expect(state.galacticSpeed).toBe(5);
    expect(state.isPlaying).toBe(false);
  });

  it('reapplies a camera bookmark when the same bookmark is selected again', () => {
    const initial = createInitialExperienceState(TODAY);
    const first = updateExperience(initial, { type: 'set-bookmark', bookmark: 'path' });
    const repeated = updateExperience(first, { type: 'set-bookmark', bookmark: 'path' });

    expect(repeated.cameraBookmark).toBe('path');
    expect(repeated.cameraRevision).toBe(first.cameraRevision + 1);
  });
});
