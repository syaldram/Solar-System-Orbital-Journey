import { describe, expect, it } from 'vitest';

import {
  createInitialExperienceState,
  getAlongPathMotion,
  getGalacticOrbitPresentation,
  updateExperience,
  transitionExperience,
  type ExperienceAction,
} from './experience-state';
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

  it('distinguishes the present anchor from a completed orbit at the same marker position', () => {
    let state = createInitialExperienceState(TODAY);

    expect(getGalacticOrbitPresentation(state)).toEqual({
      progress: 0,
      progressPercent: 0,
      phase: 'present',
    });

    state = updateExperience(state, { type: 'set-frame', frame: 'galaxy' });
    state = updateExperience(state, { type: 'scrub-galactic', elapsedMillionYears: 115 });
    expect(getGalacticOrbitPresentation(state)).toEqual({
      progress: 0.5,
      progressPercent: 50,
      phase: 'in-progress',
    });

    state = updateExperience(state, { type: 'scrub-galactic', elapsedMillionYears: 230 });
    expect(getGalacticOrbitPresentation(state)).toEqual({
      progress: 1,
      progressPercent: 100,
      phase: 'complete',
    });
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

  it('replays a completed Solar-System journey without starting the guided tour', () => {
    let state = createInitialExperienceState(TODAY);
    state = updateExperience(state, { type: 'set-speed', speed: 'decade' });
    state = updateExperience(state, { type: 'skip-tour' });
    state = updateExperience(state, { type: 'scrub', timeMs: state.endTimeMs });

    state = updateExperience(state, { type: 'replay-solar' });

    expect(state.currentTimeMs).toBe(state.startTimeMs);
    expect(state.speed).toBe('decade');
    expect(state.journeyComplete).toBe(false);
    expect(state.isPlaying).toBe(true);
    expect(state.tour.status).toBe('skipped');
  });

  it('dismisses Solar-System completion without changing its completed endpoint', () => {
    let state = createInitialExperienceState(TODAY);
    state = updateExperience(state, { type: 'scrub', timeMs: state.endTimeMs });

    state = updateExperience(state, { type: 'dismiss-completion' });

    expect(state.currentTimeMs).toBe(state.endTimeMs);
    expect(state.journeyComplete).toBe(true);
    expect(state.journeyCompletionDismissed).toBe(true);
    expect(state.isPlaying).toBe(false);
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

  it('restores the preserved Solar-System clock paused after Galactic playback', () => {
    let state = createInitialExperienceState(TODAY);
    state = updateExperience(state, { type: 'set-speed', speed: 'year' });
    state = updateExperience(state, { type: 'scrub', timeMs: TODAY.getTime() + 10 * 86_400_000 });
    const solarTime = state.currentTimeMs;

    state = updateExperience(state, { type: 'set-frame', frame: 'galaxy' });
    state = updateExperience(state, { type: 'set-galactic-speed', speed: 10 });
    state = updateExperience(state, { type: 'play' });
    state = updateExperience(state, { type: 'advance', realSeconds: 3 });
    state = updateExperience(state, { type: 'set-frame', frame: 'space' });

    expect(state.currentTimeMs).toBe(solarTime);
    expect(state.speed).toBe('year');
    expect(state.isPlaying).toBe(false);
    expect(state.galacticElapsedMillionYears).toBe(30);
    expect(state.galacticSpeed).toBe(10);
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

  it('toggles Planet follow only for the planet whose card is open', () => {
    let state = updateExperience(createInitialExperienceState(TODAY), { type: 'select', body: 'saturn' });

    state = updateExperience(state, { type: 'toggle-planet-follow', planet: 'saturn' });
    expect(state.followedPlanet).toBe('saturn');

    const cameraRevisionWhileFollowing = state.cameraRevision;
    state = updateExperience(state, { type: 'toggle-planet-follow', planet: 'saturn' });
    expect(state.followedPlanet).toBeNull();
    expect(state.cameraRevision).toBe(cameraRevisionWhileFollowing);

    state = updateExperience(state, { type: 'toggle-planet-follow', planet: 'mars' });
    expect(state.followedPlanet).toBeNull();
  });

  it('ends Planet follow when its card closes or another planet is selected', () => {
    const selected = updateExperience(createInitialExperienceState(TODAY), { type: 'select', body: 'saturn' });
    const following = updateExperience(selected, { type: 'toggle-planet-follow', planet: 'saturn' });

    expect(updateExperience(following, { type: 'select', body: null }).followedPlanet).toBeNull();
    expect(updateExperience(following, { type: 'select', body: 'mars' }).followedPlanet).toBeNull();
    expect(updateExperience(following, { type: 'select', body: 'saturn' }).followedPlanet).toBe('saturn');
  });

  it('routes Planet follow from the Full Journey overview to the Along the Path camera', () => {
    let state = updateExperience(createInitialExperienceState(TODAY), { type: 'set-frame', frame: 'space' });
    state = updateExperience(state, { type: 'set-bookmark', bookmark: 'full' });
    state = updateExperience(state, { type: 'select', body: 'saturn' });

    const following = updateExperience(state, { type: 'toggle-planet-follow', planet: 'saturn' });

    expect(following.frame).toBe('space');
    expect(following.cameraBookmark).toBe('path');
    expect(following.cameraRevision).toBe(state.cameraRevision + 1);
    expect(following.followedPlanet).toBe('saturn');
  });

  it('ends Planet follow for focus, reset, and Home camera commands', () => {
    const selected = updateExperience(createInitialExperienceState(TODAY), { type: 'select', body: 'saturn' });
    const following = updateExperience(selected, { type: 'toggle-planet-follow', planet: 'saturn' });

    expect(updateExperience(following, { type: 'focus-camera' }).followedPlanet).toBeNull();
    expect(updateExperience(following, { type: 'reset-camera' }).followedPlanet).toBeNull();
    expect(updateExperience(following, { type: 'return-home' }).followedPlanet).toBeNull();
  });

  it('ends Planet follow when the view, bookmark, or guided-tour chapter changes', () => {
    const selected = updateExperience(createInitialExperienceState(TODAY), { type: 'select', body: 'saturn' });
    const following = updateExperience(selected, { type: 'toggle-planet-follow', planet: 'saturn' });

    expect(updateExperience(following, { type: 'set-frame', frame: 'space' }).followedPlanet).toBeNull();
    expect(updateExperience(following, { type: 'set-bookmark', bookmark: 'outer' }).followedPlanet).toBeNull();
    expect(updateExperience(following, { type: 'start-tour' }).followedPlanet).toBeNull();
    expect(updateExperience(following, { type: 'replay' }).followedPlanet).toBeNull();

    let touring = updateExperience(createInitialExperienceState(TODAY), { type: 'start-tour' });
    touring = updateExperience(touring, { type: 'select', body: 'saturn' });
    touring = updateExperience(touring, { type: 'toggle-planet-follow', planet: 'saturn' });
    expect(updateExperience(touring, { type: 'next-chapter' }).followedPlanet).toBeNull();
  });

  it('preserves Planet follow while playback and the timeline are adjusted', () => {
    let state = updateExperience(createInitialExperienceState(TODAY), { type: 'select', body: 'saturn' });
    state = updateExperience(state, { type: 'toggle-planet-follow', planet: 'saturn' });
    state = updateExperience(state, { type: 'play' });
    state = updateExperience(state, { type: 'advance', realSeconds: 1 });
    state = updateExperience(state, { type: 'pause' });
    state = updateExperience(state, { type: 'set-speed', speed: 'year' });
    state = updateExperience(state, { type: 'scrub', timeMs: TODAY.getTime() + 86_400_000 });

    expect(state.followedPlanet).toBe('saturn');
  });

  it('clears unavailable planet selection when Galaxy Overview opens', () => {
    let state = updateExperience(createInitialExperienceState(TODAY), { type: 'select', body: 'saturn' });
    state = updateExperience(state, { type: 'toggle-planet-follow', planet: 'saturn' });

    const galaxy = updateExperience(state, { type: 'set-frame', frame: 'galaxy' });

    expect(galaxy.selectedBody).toBeNull();
    expect(galaxy.followedPlanet).toBeNull();
    expect(updateExperience(galaxy, { type: 'select', body: 'saturn' }).selectedBody).toBeNull();
  });

  it('keeps Along the Path distance accurate while stabilizing only high-speed guide flow', () => {
    let state = createInitialExperienceState(TODAY);
    state = updateExperience(state, { type: 'set-speed', speed: 'decade' });
    state = updateExperience(state, { type: 'play' });
    state = updateExperience(state, { type: 'advance', realSeconds: 1 });

    const motion = getAlongPathMotion(state);

    expect(motion.distanceAu).toBeCloseTo(464.1, 1);
    expect(motion.distanceLightYears).toBeCloseTo(0.00734, 5);
    expect(motion.guideFlow).toBe('stabilized');
    expect(motion.apparentGuideAuPerSecond).toBe(12);
  });

  it('uses subdued stepped guides without changing the numerical distance in reduced motion', () => {
    let state = createInitialExperienceState(TODAY);
    state = updateExperience(state, { type: 'set-speed', speed: 'year' });
    state = updateExperience(state, { type: 'play' });
    state = updateExperience(state, { type: 'advance', realSeconds: 1 });
    const ordinaryDistance = getAlongPathMotion(state).distanceAu;

    state = updateExperience(state, { type: 'set-reduced-motion', enabled: true });
    const reduced = getAlongPathMotion(state);

    expect(reduced.guideFlow).toBe('stepped');
    expect(reduced.distanceAu).toBe(ordinaryDistance);
    expect(reduced.apparentGuideAuPerSecond).toBe(1.5);
  });
});

describe('Sun’s Gravity session', () => {
  it('captures either scientific origin once and restores context paused at explored time/speed', () => {
    for (const frame of ['sun', 'space'] as const) {
      let state = updateExperience(createInitialExperienceState(TODAY), { type: 'set-frame', frame });
      state = updateExperience(state, { type: 'set-bookmark', bookmark: 'full' });
      state = updateExperience(state, { type: 'select', body: 'earth' });
      state = updateExperience(state, { type: 'play' });
      const entered = updateExperience(state, { type: 'enter-gravity' });
      expect(entered.isPlaying).toBe(false);
      expect(entered.followedPlanet).toBeNull();
      expect(updateExperience(entered, { type: 'enter-gravity' })).toBe(entered);
      const playing = updateExperience(entered, { type: 'play' });
      state = updateExperience(playing, { type: 'select', body: 'saturn' });
      expect(state.isPlaying).toBe(true);
      expect(state.cameraRevision).toBe(playing.cameraRevision);
      expect(state.cameraBookmark).toBe(playing.cameraBookmark);
      state = updateExperience(state, { type: 'toggle-planet-follow', planet: 'saturn' });
      expect(state.cameraBookmark).toBe('full');
      state = updateExperience(state, { type: 'set-speed', speed: 'decade' });
      state = updateExperience(state, { type: 'play' });
      state = updateExperience(state, { type: 'advance', realSeconds: 2 });
      const date = state.currentTimeMs;
      state = updateExperience(state, { type: 'scrub', timeMs: date + 1_000 });
      expect(state.isPlaying).toBe(true);
      state = updateExperience(state, { type: 'leave-gravity' });
      expect(state).toMatchObject({ frame, selectedBody: 'earth', cameraBookmark: 'full', currentTimeMs: date + 1_000, speed: 'decade', followedPlanet: null, presentation: { kind: 'scientific' }, isPlaying: false, galacticElapsedMillionYears: 0, galacticSpeed: 5 });
      expect(state.trailRevision).toBe(entered.trailRevision + 1);
    }
  });

  it('rejects excluded entry and cleans up Home/tour transitions and unavailable overlays', () => {
    const initial = createInitialExperienceState(TODAY);
    for (const state of [updateExperience(initial, { type: 'set-frame', frame: 'galaxy' }), updateExperience(initial, { type: 'start-tour' })]) {
      expect(updateExperience(state, { type: 'enter-gravity' })).toBe(state);
    }
    const withTrails = updateExperience(initial, { type: 'set-view-option', option: 'trails', enabled: true });
    const selected = updateExperience(withTrails, { type: 'select', body: 'earth' });
    const following = updateExperience(selected, { type: 'toggle-planet-follow', planet: 'earth' });
    expect(updateExperience(following, { type: 'enter-gravity' }).followedPlanet).toBeNull();
    const entered = updateExperience(withTrails, { type: 'enter-gravity' });
    expect(updateExperience(entered, { type: 'set-view-option', option: 'trails', enabled: false })).toBe(entered);
    for (const action of [{ type: 'return-home' }, { type: 'start-tour' }, { type: 'replay' }] as const) {
      expect(updateExperience(entered, action).presentation.kind).toBe('scientific');
    }
    expect(updateExperience(entered, { type: 'leave-gravity' }).viewOptions.trails).toBe(true);
    const reduced = updateExperience(entered, { type: 'set-reduced-motion', enabled: true });
    expect(updateExperience(reduced, { type: 'leave-gravity' }).viewOptions.trails).toBe(true);
    let state = updateExperience(entered, { type: 'scrub', timeMs: entered.endTimeMs });
    state = updateExperience(state, { type: 'play' });
    expect(state.isPlaying).toBe(false);
    state = updateExperience(state, { type: 'replay-solar' });
    expect(state).toMatchObject({ isPlaying: true, currentTimeMs: state.startTimeMs, galacticElapsedMillionYears: 0 });
  });
});


describe('accepted presentation lifecycle intent', () => {
  it('emits every accepted handoff in order with monotonically fresh session IDs', () => {
    let state = createInitialExperienceState(TODAY);
    const handoffs = [];
    for (const type of ['enter-gravity', 'enter-gravity', 'leave-gravity', 'leave-gravity', 'enter-gravity', 'return-home', 'enter-gravity', 'leave-gravity'] as const) {
      const transition = transitionExperience(state, { type });
      state = transition.state;
      if (transition.handoff) handoffs.push(transition.handoff);
    }
    expect(handoffs).toEqual([
      { kind: 'enter', presentation: 'gravity', sessionId: 1 },
      { kind: 'back', presentation: 'gravity', sessionId: 1 },
      { kind: 'enter', presentation: 'gravity', sessionId: 2 },
      { kind: 'discard', presentation: 'gravity', sessionId: 2 },
      { kind: 'enter', presentation: 'gravity', sessionId: 3 },
      { kind: 'back', presentation: 'gravity', sessionId: 3 },
    ]);
  });

  it('emits no intent for rejected entry or Back without a session', () => {
    const initial = createInitialExperienceState(TODAY);
    for (const state of [initial, updateExperience(initial, { type: 'set-frame', frame: 'galaxy' }), updateExperience(initial, { type: 'start-tour' })]) {
      expect(transitionExperience(state, { type: 'leave-gravity' }).handoff).toBeNull();
      if (state !== initial) expect(transitionExperience(state, { type: 'enter-gravity' }).handoff).toBeNull();
    }
    const entered = updateExperience(initial, { type: 'enter-gravity' });
    expect(transitionExperience(entered, { type: 'enter-gravity' })).toEqual({ state: entered, handoff: null });
  });

  it.each<ExperienceAction>([{ type: 'return-home' }, { type: 'start-tour' }, { type: 'replay' }, { type: 'set-frame', frame: 'galaxy' }, { type: 'set-frame', frame: 'sun' }])('discards rather than restoring on $type', (action) => {
    let state = updateExperience(createInitialExperienceState(TODAY), { type: 'select', body: 'earth' });
    state = updateExperience(state, { type: 'enter-gravity' });
    state = updateExperience(state, { type: 'select', body: 'saturn' });
    const transition = transitionExperience(state, action);
    expect(transition.handoff).toEqual({ kind: 'discard', presentation: 'gravity', sessionId: 1 });
    expect(transition.state.presentation).toEqual({ kind: 'scientific' });
    expect(transition.state.selectedBody).toBe(action.type === 'set-frame' && action.frame === 'galaxy' ? null : 'saturn');
    expect(transition.state.followedPlanet).toBeNull();
    expect(transition.state.trailRevision).toBeGreaterThan(state.trailRevision);
    expect(transitionExperience(transition.state, { type: 'leave-gravity' }).handoff).toBeNull();
  });
});

describe('Heliosphere session', () => {
  it('captures either scientific origin once and restores context paused at explored time/speed', () => {
    for (const frame of ['sun', 'space'] as const) {
      let state = updateExperience(createInitialExperienceState(TODAY), { type: 'set-frame', frame });
      state = updateExperience(state, { type: 'set-bookmark', bookmark: 'full' });
      state = updateExperience(state, { type: 'select', body: 'earth' });
      state = updateExperience(state, { type: 'play' });
      const entered = updateExperience(state, { type: 'enter-heliosphere' });
      expect(entered.isPlaying).toBe(false);
      expect(entered.followedPlanet).toBeNull();
      expect(updateExperience(entered, { type: 'enter-heliosphere' })).toBe(entered);
      const playing = updateExperience(entered, { type: 'play' });
      state = updateExperience(playing, { type: 'select', body: 'saturn' });
      expect(state.isPlaying).toBe(true);
      expect(state.cameraRevision).toBe(playing.cameraRevision);
      expect(state.cameraBookmark).toBe(playing.cameraBookmark);
      state = updateExperience(state, { type: 'toggle-planet-follow', planet: 'saturn' });
      expect(state.cameraBookmark).toBe('full');
      state = updateExperience(state, { type: 'set-speed', speed: 'decade' });
      state = updateExperience(state, { type: 'play' });
      state = updateExperience(state, { type: 'advance', realSeconds: 2 });
      const date = state.currentTimeMs;
      state = updateExperience(state, { type: 'scrub', timeMs: date + 1_000 });
      expect(state.isPlaying).toBe(false);
      state = updateExperience(state, { type: 'leave-heliosphere' });
      expect(state).toMatchObject({ frame, selectedBody: 'earth', cameraBookmark: 'full', currentTimeMs: date + 1_000, speed: 'decade', followedPlanet: null, presentation: { kind: 'scientific' }, isPlaying: false, galacticElapsedMillionYears: 0, galacticSpeed: 5 });
      expect(state.trailRevision).toBe(entered.trailRevision + 1);
    }
  });

  it('rejects excluded entry and cleans up Home/tour transitions and unavailable overlays', () => {
    const initial = createInitialExperienceState(TODAY);
    for (const state of [updateExperience(initial, { type: 'set-frame', frame: 'galaxy' }), updateExperience(initial, { type: 'start-tour' })]) {
      expect(updateExperience(state, { type: 'enter-heliosphere' })).toBe(state);
    }
    const withTrails = updateExperience(initial, { type: 'set-view-option', option: 'trails', enabled: true });
    const selected = updateExperience(withTrails, { type: 'select', body: 'earth' });
    const following = updateExperience(selected, { type: 'toggle-planet-follow', planet: 'earth' });
    expect(updateExperience(following, { type: 'enter-heliosphere' }).followedPlanet).toBeNull();
    const entered = updateExperience(withTrails, { type: 'enter-heliosphere' });
    expect(updateExperience(entered, { type: 'set-view-option', option: 'trails', enabled: false })).toBe(entered);
    for (const action of [{ type: 'return-home' }, { type: 'start-tour' }, { type: 'replay' }] as const) {
      expect(updateExperience(entered, action).presentation.kind).toBe('scientific');
    }
    expect(updateExperience(entered, { type: 'leave-heliosphere' }).viewOptions.trails).toBe(true);
    const reduced = updateExperience(entered, { type: 'set-reduced-motion', enabled: true });
    expect(updateExperience(reduced, { type: 'leave-heliosphere' }).viewOptions.trails).toBe(true);
    let state = updateExperience(entered, { type: 'scrub', timeMs: entered.endTimeMs });
    state = updateExperience(state, { type: 'play' });
    expect(state.isPlaying).toBe(false);
    state = updateExperience(state, { type: 'replay-solar' });
    expect(state).toMatchObject({ isPlaying: true, currentTimeMs: state.startTimeMs, galacticElapsedMillionYears: 0 });
  });
});


describe('accepted heliosphere lifecycle intent', () => {
  it('emits every accepted handoff in order with monotonically fresh session IDs', () => {
    let state = createInitialExperienceState(TODAY);
    const handoffs = [];
    for (const type of ['enter-heliosphere', 'enter-heliosphere', 'leave-heliosphere', 'leave-heliosphere', 'enter-heliosphere', 'return-home', 'enter-heliosphere', 'leave-heliosphere'] as const) {
      const transition = transitionExperience(state, { type });
      state = transition.state;
      if (transition.handoff) handoffs.push(transition.handoff);
    }
    expect(handoffs).toEqual([
      { kind: 'enter', presentation: 'heliosphere', sessionId: 1 },
      { kind: 'back', presentation: 'heliosphere', sessionId: 1 },
      { kind: 'enter', presentation: 'heliosphere', sessionId: 2 },
      { kind: 'discard', presentation: 'heliosphere', sessionId: 2 },
      { kind: 'enter', presentation: 'heliosphere', sessionId: 3 },
      { kind: 'back', presentation: 'heliosphere', sessionId: 3 },
    ]);
  });

  it('emits no intent for rejected entry or Back without a session', () => {
    const initial = createInitialExperienceState(TODAY);
    for (const state of [initial, updateExperience(initial, { type: 'set-frame', frame: 'galaxy' }), updateExperience(initial, { type: 'start-tour' })]) {
      expect(transitionExperience(state, { type: 'leave-heliosphere' }).handoff).toBeNull();
      if (state !== initial) expect(transitionExperience(state, { type: 'enter-heliosphere' }).handoff).toBeNull();
    }
    const entered = updateExperience(initial, { type: 'enter-heliosphere' });
    expect(transitionExperience(entered, { type: 'enter-heliosphere' })).toEqual({ state: entered, handoff: null });
  });

  it.each<ExperienceAction>([{ type: 'return-home' }, { type: 'start-tour' }, { type: 'replay' }, { type: 'set-frame', frame: 'galaxy' }, { type: 'set-frame', frame: 'sun' }])('discards rather than restoring on $type', (action) => {
    let state = updateExperience(createInitialExperienceState(TODAY), { type: 'select', body: 'earth' });
    state = updateExperience(state, { type: 'enter-heliosphere' });
    state = updateExperience(state, { type: 'select', body: 'saturn' });
    const transition = transitionExperience(state, action);
    expect(transition.handoff).toEqual({ kind: 'discard', presentation: 'heliosphere', sessionId: 1 });
    expect(transition.state.presentation).toEqual({ kind: 'scientific' });
    expect(transition.state.selectedBody).toBe(action.type === 'set-frame' && action.frame === 'galaxy' ? null : 'saturn');
    expect(transition.state.followedPlanet).toBeNull();
    expect(transition.state.trailRevision).toBeGreaterThan(state.trailRevision);
    expect(transitionExperience(transition.state, { type: 'leave-heliosphere' }).handoff).toBeNull();
  });
});
