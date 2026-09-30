import type { PlanetId } from '../astronomy/solar-system';

export type ViewMode = 'sun' | 'space' | 'galaxy';
export type PlaybackSpeed = 'day' | 'month' | 'year' | 'decade';
export type CameraBookmark = 'hero' | 'inner' | 'outer' | 'path' | 'ecliptic' | 'full';
export type QualityPreference = 'auto' | 'high' | 'balanced' | 'low';
export type SelectableBody = 'sun' | PlanetId;

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

export interface ExperienceState {
  readonly startTimeMs: number;
  readonly endTimeMs: number;
  readonly currentTimeMs: number;
  readonly isPlaying: boolean;
  readonly speed: PlaybackSpeed;
  readonly frame: ViewMode;
  readonly selectedBody: SelectableBody | null;
  readonly followedPlanet: PlanetId | null;
  readonly cameraBookmark: CameraBookmark;
  readonly cameraRevision: number;
  readonly viewOptions: ViewOptions;
  readonly reducedMotion: boolean;
  readonly quality: QualityPreference;
  readonly trailRevision: number;
  readonly journeyComplete: boolean;
  readonly tour: TourState;
}

export type ExperienceAction =
  | { readonly type: 'play' }
  | { readonly type: 'pause' }
  | { readonly type: 'advance'; readonly realSeconds: number }
  | { readonly type: 'set-speed'; readonly speed: PlaybackSpeed }
  | { readonly type: 'scrub'; readonly timeMs: number }
  | { readonly type: 'return-today'; readonly today: Date }
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

export const PLAYBACK_DAYS_PER_SECOND: Readonly<Record<PlaybackSpeed, number>> = {
  day: 1,
  month: 30.4375,
  year: 365.25,
  decade: 3_652.5,
};

export function createInitialExperienceState(today: Date): ExperienceState {
  const startTimeMs = today.getTime();
  if (Number.isNaN(startTimeMs)) throw new RangeError('A valid UTC instant is required.');

  return {
    startTimeMs,
    endTimeMs: startTimeMs + JOURNEY_DAYS * MILLISECONDS_PER_DAY,
    currentTimeMs: startTimeMs,
    isPlaying: false,
    speed: 'month',
    frame: 'sun',
    selectedBody: null,
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
    tour: { status: 'idle', chapter: 0 },
  };
}

function clampTime(state: ExperienceState, timeMs: number): number {
  return Math.min(state.endTimeMs, Math.max(state.startTimeMs, timeMs));
}

export function updateExperience(state: ExperienceState, action: ExperienceAction): ExperienceState {
  switch (action.type) {
    case 'play':
      return state.journeyComplete ? state : { ...state, isPlaying: true };
    case 'pause':
      return { ...state, isPlaying: false };
    case 'advance': {
      if (!state.isPlaying || action.realSeconds <= 0) return state;
      const requestedTime =
        state.currentTimeMs +
        action.realSeconds * PLAYBACK_DAYS_PER_SECOND[state.speed] * MILLISECONDS_PER_DAY;
      const currentTimeMs = clampTime(state, requestedTime);
      const journeyComplete = currentTimeMs >= state.endTimeMs;
      return {
        ...state,
        currentTimeMs,
        journeyComplete,
        isPlaying: journeyComplete ? false : state.isPlaying,
      };
    }
    case 'set-speed':
      return { ...state, speed: action.speed };
    case 'scrub': {
      const currentTimeMs = clampTime(state, action.timeMs);
      return {
        ...state,
        currentTimeMs,
        journeyComplete: currentTimeMs >= state.endTimeMs,
      };
    }
    case 'return-today': {
      const currentTimeMs = clampTime(state, action.today.getTime());
      return { ...state, currentTimeMs, journeyComplete: false };
    }
    case 'set-frame':
      return action.frame === state.frame
        ? state
        : {
            ...state,
            frame: action.frame,
            selectedBody: action.frame === 'galaxy' ? null : state.selectedBody,
            followedPlanet: null,
            trailRevision: state.trailRevision + 1,
            cameraBookmark: action.frame === 'galaxy' ? 'full' : state.cameraBookmark,
            cameraRevision: state.cameraRevision + 1,
          };
    case 'select':
      if (state.frame === 'galaxy' && action.body !== null) return state;
      return {
        ...state,
        selectedBody: action.body,
        followedPlanet: action.body === state.selectedBody ? state.followedPlanet : null,
      };
    case 'toggle-planet-follow':
      if (state.selectedBody !== action.planet || state.frame === 'galaxy') return state;
      if (state.followedPlanet === action.planet) return { ...state, followedPlanet: null };
      if (state.frame === 'space' && state.cameraBookmark === 'full') {
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
      return { ...state, isPlaying: false, followedPlanet: null };
    case 'set-bookmark':
      return {
        ...state,
        followedPlanet: null,
        cameraBookmark: action.bookmark,
        cameraRevision: state.cameraRevision + 1,
      };
    case 'set-view-option':
      return {
        ...state,
        viewOptions: { ...state.viewOptions, [action.option]: action.enabled },
      };
    case 'set-reduced-motion':
      return {
        ...state,
        reducedMotion: action.enabled,
        viewOptions: action.enabled ? { ...state.viewOptions, trails: false } : state.viewOptions,
      };
    case 'set-quality':
      return { ...state, quality: action.quality };
    case 'start-tour':
      return {
        ...state,
        isPlaying: false,
        currentTimeMs: state.startTimeMs,
        journeyComplete: false,
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
      return {
        ...state,
        currentTimeMs: state.startTimeMs,
        journeyComplete: false,
        isPlaying: false,
        frame: 'sun',
        followedPlanet: null,
        cameraBookmark: 'inner',
        cameraRevision: state.cameraRevision + 1,
        tour: { status: 'running', chapter: 0 },
      };
  }
}
