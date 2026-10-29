import type { PlanetId } from '../astronomy/solar-system';
import { calculateLocalTravelDistance, GALACTIC_MODEL } from '../astronomy/reference-frames';

export type ViewMode = 'sun' | 'space' | 'galaxy';
export type PlaybackSpeed = 'day' | 'month' | 'year' | 'decade';
export type GalacticPlaybackSpeed = 1 | 5 | 10 | 25;
export type CameraBookmark = 'hero' | 'inner' | 'outer' | 'path' | 'ecliptic' | 'full';
export type QualityPreference = 'auto' | 'high' | 'balanced' | 'low';
export type SelectableBody = 'sun' | PlanetId;

export const HELIOSPHERE_REGIONS = ['solar-wind', 'termination-shock', 'heliosheath', 'heliopause', 'interstellar-space'] as const;
export type HeliosphereRegion = typeof HELIOSPHERE_REGIONS[number];
export type Selection = { readonly kind: 'body'; readonly body: SelectableBody } | { readonly kind: 'region'; readonly region: HeliosphereRegion } | { readonly kind: 'none' };
export interface HeliosphereLayers {
  readonly outerHeliosphere: boolean;
  readonly terminationShock: boolean;
  readonly orbitPaths: boolean;
  readonly labels: boolean;
}
export function defaultHeliosphereLayers(): HeliosphereLayers {
  return { outerHeliosphere: true, terminationShock: true, orbitPaths: true, labels: true };
}
export function selectedBody(state: Pick<ExperienceState, 'selection'>): SelectableBody | null {
  return state.selection.kind === 'body' ? state.selection.body : null;
}

export interface ViewOptions {
  readonly orbitPaths: boolean;
  readonly labels: boolean;
  readonly trails: boolean;
  readonly planeOverlays: boolean;
}

export interface TourState {
  readonly status: 'idle' | 'running' | 'complete' | 'skipped';
  readonly chapter: number;
}

export interface ScientificReturnContext {
  readonly frame: Exclude<ViewMode, 'galaxy'>;
  readonly selectedBody: SelectableBody | null;
  readonly bookmark: CameraBookmark;
}

export type PresentationState =
  | { readonly kind: 'scientific' }
  | {
      readonly kind: 'gravity';
      readonly sessionId: number;
      readonly returnContext: ScientificReturnContext;
    }
  | {
      readonly kind: 'heliosphere';
      readonly sessionId: number;
      readonly returnContext: ScientificReturnContext;
      readonly layers: HeliosphereLayers;
    };

export type PresentationHandoff = {
  readonly kind: 'enter' | 'back' | 'discard';
  readonly presentation: 'gravity' | 'heliosphere';
  readonly sessionId: number;
};

export interface ExperienceState {
  readonly startTimeMs: number;
  readonly endTimeMs: number;
  readonly currentTimeMs: number;
  readonly isPlaying: boolean;
  readonly speed: PlaybackSpeed;
  readonly galacticElapsedMillionYears: number;
  readonly galacticEndMillionYears: number;
  readonly galacticSpeed: GalacticPlaybackSpeed;
  readonly galacticJourneyComplete: boolean;
  readonly galacticCompletionDismissed: boolean;
  readonly presentation: PresentationState;
  readonly nextPresentationSessionId: number;
  readonly frame: ViewMode;
  readonly selection: Selection;
  readonly followedPlanet: PlanetId | null;
  readonly cameraBookmark: CameraBookmark;
  readonly cameraRevision: number;
  readonly viewOptions: ViewOptions;
  readonly reducedMotion: boolean;
  readonly quality: QualityPreference;
  readonly trailRevision: number;
  readonly journeyComplete: boolean;
  readonly journeyCompletionDismissed: boolean;
  readonly tour: TourState;
}

export type AlongPathGuideFlow = 'continuous' | 'stabilized' | 'stepped';

export interface AlongPathMotion {
  readonly distanceAu: number;
  readonly distanceLightYears: number;
  readonly guideFlow: AlongPathGuideFlow;
  readonly apparentGuideAuPerSecond: number;
  readonly isPlaying: boolean;
}

export interface GalacticOrbitPresentation {
  readonly progress: number;
  readonly progressPercent: number;
  readonly phase: 'present' | 'in-progress' | 'complete';
}

export type ExperienceAction =
  | { readonly type: 'select-region'; readonly region: HeliosphereRegion }
  | { readonly type: 'set-heliosphere-layer'; readonly layer: keyof HeliosphereLayers; readonly enabled: boolean }
  | { readonly type: 'enter-heliosphere' }
  | { readonly type: 'leave-heliosphere' }
  | { readonly type: 'enter-gravity' }
  | { readonly type: 'leave-gravity' }
  | { readonly type: 'play' }
  | { readonly type: 'pause' }
  | { readonly type: 'advance'; readonly realSeconds: number }
  | { readonly type: 'set-speed'; readonly speed: PlaybackSpeed }
  | { readonly type: 'set-galactic-speed'; readonly speed: GalacticPlaybackSpeed }
  | { readonly type: 'scrub'; readonly timeMs: number }
  | { readonly type: 'scrub-galactic'; readonly elapsedMillionYears: number }
  | { readonly type: 'return-today'; readonly today: Date }
  | { readonly type: 'return-present' }
  | { readonly type: 'replay-solar' }
  | { readonly type: 'replay-galactic' }
  | { readonly type: 'dismiss-completion' }
  | { readonly type: 'set-frame'; readonly frame: ViewMode }
  | { readonly type: 'select'; readonly body: SelectableBody | null }
  | { readonly type: 'toggle-planet-follow'; readonly planet: PlanetId }
  | { readonly type: 'focus-camera' }
  | { readonly type: 'reset-camera' }
  | { readonly type: 'return-home' }
  | { readonly type: 'set-bookmark'; readonly bookmark: CameraBookmark }
  | { readonly type: 'set-view-option'; readonly option: keyof ViewOptions; readonly enabled: boolean }
  | { readonly type: 'set-reduced-motion'; readonly enabled: boolean }
  | { readonly type: 'set-quality'; readonly quality: QualityPreference }
  | { readonly type: 'start-tour' }
  | { readonly type: 'next-chapter' }
  | { readonly type: 'skip-tour' }
  | { readonly type: 'replay' };

const MILLISECONDS_PER_DAY = 86_400_000;
const JOURNEY_DAYS = 165 * 365.25;
const LAST_TOUR_CHAPTER = 4;
const MAX_GUIDE_FLOW_AU_PER_SECOND = 12;
const REDUCED_MOTION_GUIDE_FLOW_AU_PER_SECOND = 1.5;

export const PLAYBACK_DAYS_PER_SECOND: Readonly<Record<PlaybackSpeed, number>> = {
  day: 1,
  month: 30.4375,
  year: 365.25,
  decade: 3_652.5,
};

export function getAlongPathMotion(state: ExperienceState): AlongPathMotion {
  const distance = calculateLocalTravelDistance(
    new Date(state.currentTimeMs),
    new Date(state.startTimeMs),
  );
  const uncappedGuideAuPerSecond = calculateLocalTravelDistance(
    new Date(PLAYBACK_DAYS_PER_SECOND[state.speed] * MILLISECONDS_PER_DAY),
    new Date(0),
  ).astronomicalUnits;
  const apparentGuideAuPerSecond = Math.min(
    uncappedGuideAuPerSecond,
    state.reducedMotion ? REDUCED_MOTION_GUIDE_FLOW_AU_PER_SECOND : MAX_GUIDE_FLOW_AU_PER_SECOND,
  );

  return {
    distanceAu: distance.astronomicalUnits,
    distanceLightYears: distance.lightYears,
    guideFlow: state.reducedMotion
      ? 'stepped'
      : uncappedGuideAuPerSecond > MAX_GUIDE_FLOW_AU_PER_SECOND
        ? 'stabilized'
        : 'continuous',
    apparentGuideAuPerSecond,
    isPlaying: state.isPlaying,
  };
}

export function getGalacticOrbitPresentation(state: ExperienceState): GalacticOrbitPresentation {
  const progress = Math.min(
    1,
    Math.max(0, state.galacticElapsedMillionYears / state.galacticEndMillionYears),
  );
  return {
    progress,
    progressPercent: Math.round(progress * 100),
    phase: progress >= 1 || state.galacticJourneyComplete
      ? 'complete'
      : progress === 0
        ? 'present'
        : 'in-progress',
  };
}

export const GALACTIC_PLAYBACK_SPEEDS: readonly GalacticPlaybackSpeed[] = [1, 5, 10, 25];

export function createInitialExperienceState(today: Date): ExperienceState {
  const startTimeMs = today.getTime();
  if (Number.isNaN(startTimeMs)) throw new RangeError('A valid UTC instant is required.');

  return {
    startTimeMs,
    endTimeMs: startTimeMs + JOURNEY_DAYS * MILLISECONDS_PER_DAY,
    currentTimeMs: startTimeMs,
    isPlaying: false,
    speed: 'month',
    galacticElapsedMillionYears: 0,
    galacticEndMillionYears: GALACTIC_MODEL.approximatePeriod.value,
    galacticSpeed: 5,
    galacticJourneyComplete: false,
    galacticCompletionDismissed: false,
    presentation: { kind: 'scientific' },
    nextPresentationSessionId: 1,
    frame: 'sun',
    selection: { kind: 'none' },
    followedPlanet: null,
    cameraBookmark: 'hero',
    cameraRevision: 0,
    viewOptions: {
      orbitPaths: true,
      labels: true,
      trails: false,
      planeOverlays: false,
    },
    reducedMotion: false,
    quality: 'auto',
    trailRevision: 0,
    journeyComplete: false,
    journeyCompletionDismissed: false,
    tour: { status: 'idle', chapter: 0 },
  };
}

function clampTime(state: ExperienceState, timeMs: number): number {
  return Math.min(state.endTimeMs, Math.max(state.startTimeMs, timeMs));
}

function clampGalacticElapsedTime(state: ExperienceState, elapsedMillionYears: number): number {
  return Math.min(state.galacticEndMillionYears, Math.max(0, Math.round(elapsedMillionYears)));
}

function discardPresentation(state: ExperienceState): ExperienceState {
  return {
    ...state,
    presentation: { kind: 'scientific' },
    selection: state.selection.kind === 'region' ? { kind: 'none' } : state.selection,
    isPlaying: false,
    followedPlanet: null,
    trailRevision: state.trailRevision + 1,
    cameraRevision: state.cameraRevision + 1,
  };
}

/** Accepted lifecycle effects, delivered synchronously to both adapters by dispatch. */
export function transitionExperience(state: ExperienceState, action: ExperienceAction): {
  readonly state: ExperienceState;
  readonly handoff: PresentationHandoff | null;
} {
  const next = updateExperience(state, action);
  const before = state.presentation;
  const after = next.presentation;
  const handoff: PresentationHandoff | null = before.kind === 'scientific' && after.kind !== 'scientific'
    ? { kind: 'enter', presentation: after.kind, sessionId: after.sessionId }
    : before.kind !== 'scientific' && after.kind === 'scientific'
      ? { kind: (action.type === 'leave-gravity' || action.type === 'leave-heliosphere') ? 'back' : 'discard', presentation: before.kind, sessionId: before.sessionId }
      : null;
  return { state: next, handoff };
}

export function updateExperience(state: ExperienceState, action: ExperienceAction): ExperienceState {
  switch (action.type) {
    case 'enter-heliosphere':
    case 'enter-gravity':
      if (state.presentation.kind !== 'scientific' || state.frame === 'galaxy' || state.tour.status === 'running') return state;
      return {
        ...state,
        presentation: {
          ...(action.type === 'enter-gravity' ? { kind: 'gravity' as const } : { kind: 'heliosphere' as const, layers: defaultHeliosphereLayers() }),
          sessionId: state.nextPresentationSessionId,
          returnContext: { frame: state.frame, selectedBody: selectedBody(state), bookmark: state.cameraBookmark },
        },
        nextPresentationSessionId: state.nextPresentationSessionId + 1,
        isPlaying: false,
        followedPlanet: null,
        trailRevision: state.trailRevision + 1,
      };
    case 'leave-heliosphere':
    case 'leave-gravity':
      if (state.presentation.kind !== (action.type === 'leave-gravity' ? 'gravity' : 'heliosphere')) return state;
      return {
        ...state,
        frame: state.presentation.returnContext.frame,
        selection: state.presentation.returnContext.selectedBody ? { kind: 'body', body: state.presentation.returnContext.selectedBody } : { kind: 'none' },
        cameraBookmark: state.presentation.returnContext.bookmark,
        presentation: { kind: 'scientific' },
        isPlaying: false,
        followedPlanet: null,
        trailRevision: state.trailRevision + 1,
      };
    case 'play':
      return state.frame === 'galaxy'
        ? state.galacticJourneyComplete ? state : { ...state, isPlaying: true }
        : state.journeyComplete ? state : { ...state, isPlaying: true };
    case 'pause':
      return { ...state, isPlaying: false };
    case 'advance': {
      if (!state.isPlaying || action.realSeconds <= 0) return state;
      if (state.frame === 'galaxy') {
        const galacticElapsedMillionYears = Math.min(
          state.galacticEndMillionYears,
          state.galacticElapsedMillionYears + action.realSeconds * state.galacticSpeed,
        );
        const galacticJourneyComplete = galacticElapsedMillionYears >= state.galacticEndMillionYears;
        return {
          ...state,
          galacticElapsedMillionYears,
          galacticJourneyComplete,
          galacticCompletionDismissed: false,
          isPlaying: !galacticJourneyComplete,
        };
      }
      const requestedTime =
        state.currentTimeMs +
        action.realSeconds * PLAYBACK_DAYS_PER_SECOND[state.speed] * MILLISECONDS_PER_DAY;
      const currentTimeMs = clampTime(state, requestedTime);
      const journeyComplete = currentTimeMs >= state.endTimeMs;
      return {
        ...state,
        currentTimeMs,
        journeyComplete,
        journeyCompletionDismissed: false,
        isPlaying: journeyComplete ? false : state.isPlaying,
      };
    }
    case 'set-speed':
      return { ...state, speed: action.speed };
    case 'set-galactic-speed':
      return { ...state, galacticSpeed: action.speed };
    case 'scrub': {
      const currentTimeMs = clampTime(state, action.timeMs);
      return {
        ...state,
        currentTimeMs,
        isPlaying: state.presentation.kind === 'heliosphere' ? false : state.isPlaying,
        journeyComplete: currentTimeMs >= state.endTimeMs,
        journeyCompletionDismissed: false,
      };
    }
    case 'scrub-galactic': {
      const galacticElapsedMillionYears = clampGalacticElapsedTime(state, action.elapsedMillionYears);
      return {
        ...state,
        galacticElapsedMillionYears,
        galacticJourneyComplete: galacticElapsedMillionYears >= state.galacticEndMillionYears,
        galacticCompletionDismissed: false,
        isPlaying: false,
      };
    }
    case 'return-today': {
      const currentTimeMs = clampTime(state, action.today.getTime());
      return {
        ...state,
        currentTimeMs,
        journeyComplete: false,
        journeyCompletionDismissed: false,
      };
    }
    case 'return-present':
      return {
        ...state,
        galacticElapsedMillionYears: 0,
        galacticJourneyComplete: false,
        galacticCompletionDismissed: false,
        isPlaying: false,
      };
    case 'replay-solar':
      return {
        ...state,
        currentTimeMs: state.startTimeMs,
        journeyComplete: false,
        journeyCompletionDismissed: false,
        isPlaying: true,
      };
    case 'replay-galactic':
      return {
        ...state,
        galacticElapsedMillionYears: 0,
        galacticJourneyComplete: false,
        galacticCompletionDismissed: false,
        isPlaying: true,
      };
    case 'dismiss-completion':
      return state.frame === 'galaxy'
        ? { ...state, galacticCompletionDismissed: true, isPlaying: false }
        : {
            ...state,
            journeyCompletionDismissed: state.journeyComplete,
            isPlaying: false,
          };
    case 'set-frame':
      if (state.presentation.kind !== 'scientific') return updateExperience(discardPresentation(state), action);
      return action.frame === state.frame
        ? state
        : {
            ...state,
            frame: action.frame,
            selection: action.frame === 'galaxy' ? { kind: 'none' } : state.selection,
            followedPlanet: null,
            isPlaying: false,
            trailRevision: state.trailRevision + 1,
            cameraBookmark: action.frame === 'galaxy' ? 'full' : state.cameraBookmark,
            cameraRevision: state.cameraRevision + 1,
          };
    case 'select':
      if (state.frame === 'galaxy' && action.body !== null) return state;
      return {
        ...state,
        selection: action.body ? { kind: 'body', body: action.body } : { kind: 'none' },
        followedPlanet: action.body === selectedBody(state) ? state.followedPlanet : null,
      };
    case 'select-region':
      if (state.presentation.kind !== 'heliosphere') return state;
      return { ...state, selection: { kind: 'region', region: action.region }, followedPlanet: null };
    case 'set-heliosphere-layer':
      if (state.presentation.kind !== 'heliosphere') return state;
      return { ...state, presentation: { ...state.presentation, layers: { ...state.presentation.layers, [action.layer]: action.enabled } } };
    case 'toggle-planet-follow':
      if (selectedBody(state) !== action.planet || state.frame === 'galaxy') return state;
      if (state.followedPlanet === action.planet) return { ...state, followedPlanet: null };
      if (state.presentation.kind === 'scientific' && state.frame === 'space' && state.cameraBookmark === 'full') {
        return {
          ...state,
          followedPlanet: action.planet,
          cameraBookmark: 'path',
          cameraRevision: state.cameraRevision + 1,
        };
      }
      return {
        ...state,
        followedPlanet: action.planet,
      };
    case 'focus-camera':
    case 'reset-camera':
      return { ...state, followedPlanet: null };
    case 'return-home':
      if (state.presentation.kind !== 'scientific') return updateExperience(discardPresentation(state), action);
      return { ...state, isPlaying: false, followedPlanet: null };
    case 'set-bookmark':
      return {
        ...state,
        followedPlanet: null,
        cameraBookmark: action.bookmark,
        cameraRevision: state.cameraRevision + 1,
      };
    case 'set-view-option':
      if (state.presentation.kind === 'heliosphere') return state;
      if (state.presentation.kind !== 'scientific' && (action.option === 'trails' || action.option === 'planeOverlays')) return state;
      return {
        ...state,
        viewOptions: { ...state.viewOptions, [action.option]: action.enabled },
      };
    case 'set-reduced-motion':
      return {
        ...state,
        reducedMotion: action.enabled,
        viewOptions: action.enabled && state.presentation.kind === 'scientific' ? { ...state.viewOptions, trails: false } : state.viewOptions,
      };
    case 'set-quality':
      return { ...state, quality: action.quality };
    case 'start-tour':
      if (state.presentation.kind !== 'scientific') return updateExperience(discardPresentation(state), action);
      return {
        ...state,
        isPlaying: false,
        currentTimeMs: state.startTimeMs,
        journeyComplete: false,
        journeyCompletionDismissed: false,
        galacticElapsedMillionYears: 0,
        galacticSpeed: 5,
        galacticJourneyComplete: false,
        galacticCompletionDismissed: false,
        frame: 'sun',
        followedPlanet: null,
        cameraBookmark: 'inner',
        cameraRevision: state.cameraRevision + 1,
        tour: { status: 'running', chapter: 0 },
      };
    case 'next-chapter': {
      if (state.tour.status !== 'running') return state;
      if (state.tour.chapter >= LAST_TOUR_CHAPTER) {
        return {
          ...state,
          isPlaying: false,
          followedPlanet: null,
          tour: { status: 'complete', chapter: LAST_TOUR_CHAPTER },
        };
      }
      return {
        ...state,
        followedPlanet: null,
        tour: { status: 'running', chapter: state.tour.chapter + 1 },
      };
    }
    case 'skip-tour':
      return { ...state, isPlaying: false, tour: { ...state.tour, status: 'skipped' } };
    case 'replay':
      if (state.presentation.kind !== 'scientific') return updateExperience(discardPresentation(state), action);
      return {
        ...state,
        currentTimeMs: state.startTimeMs,
        journeyComplete: false,
        journeyCompletionDismissed: false,
        galacticElapsedMillionYears: 0,
        galacticSpeed: 5,
        galacticJourneyComplete: false,
        galacticCompletionDismissed: false,
        isPlaying: false,
        frame: 'sun',
        followedPlanet: null,
        cameraBookmark: 'inner',
        cameraRevision: state.cameraRevision + 1,
        tour: { status: 'running', chapter: 0 },
      };
  }
}
