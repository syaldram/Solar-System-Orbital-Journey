import './styles.css';

import { calculateAxialRotation, getPlanetProfile } from './astronomy/planet-data';
import { calculateSystemSnapshot } from './astronomy/reference-frames';
import {
  calculateOrbitalSpeedKmPerSecond,
  calculateOrbitPath,
  type PlanetId,
  type Vector3Au,
} from './astronomy/solar-system';
import {
  createInitialExperienceState,
  getAlongPathMotion,
  updateExperience,
  type ExperienceAction,
  type ExperienceState,
} from './experience/experience-state';
import { applyCurrentTourChapter } from './experience/tour';
import { AppInterface } from './interface/app-interface';
import { decodeSharedView, encodeSharedView } from './interface/url-state';
import { OrbitalScene } from './rendering/orbital-scene';

const PREFERENCES_KEY = 'orbital-journey:preferences:v1';

interface SavedPreferences {
  readonly reducedMotion?: boolean;
  readonly quality?: ExperienceState['quality'];
  readonly labels?: boolean;
  readonly trails?: boolean;
}

function readPreferences(): SavedPreferences {
  try {
    const stored = window.localStorage.getItem(PREFERENCES_KEY);
    return stored ? (JSON.parse(stored) as SavedPreferences) : {};
  } catch {
    return {};
  }
}

function persistPreferences(state: ExperienceState): void {
  const preferences: SavedPreferences = {
    reducedMotion: state.reducedMotion,
    quality: state.quality,
    labels: state.viewOptions.labels,
    trails: state.viewOptions.trails,
  };
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // The application remains fully usable when storage is disabled.
  }
}

function applyPreferences(state: ExperienceState, preferences: SavedPreferences): ExperienceState {
  let next = state;
  if (typeof preferences.reducedMotion === 'boolean') {
    next = updateExperience(next, { type: 'set-reduced-motion', enabled: preferences.reducedMotion });
  }
  if (preferences.quality && ['auto', 'high', 'balanced', 'low'].includes(preferences.quality)) {
    next = updateExperience(next, { type: 'set-quality', quality: preferences.quality });
  }
  for (const [option, value] of [
    ['labels', preferences.labels],
    ['trails', preferences.trails],
  ] as const) {
    if (typeof value === 'boolean') {
      next = updateExperience(next, {
        type: 'set-view-option',
        option,
        enabled: value,
      });
    }
  }
  return next;
}

function createOrbitPaths(instant: Date): Readonly<Record<PlanetId, readonly Vector3Au[]>> {
  return {
    mercury: calculateOrbitPath('mercury', instant),
    venus: calculateOrbitPath('venus', instant),
    earth: calculateOrbitPath('earth', instant),
    mars: calculateOrbitPath('mars', instant),
    jupiter: calculateOrbitPath('jupiter', instant),
    saturn: calculateOrbitPath('saturn', instant),
    uranus: calculateOrbitPath('uranus', instant),
    neptune: calculateOrbitPath('neptune', instant),
  };
}

const initialToday = new Date();
let state = applyPreferences(createInitialExperienceState(initialToday), readPreferences());
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches && !readPreferences().reducedMotion) {
  state = updateExperience(state, { type: 'set-reduced-motion', enabled: true });
}

const shared = decodeSharedView(window.location.search);
if (shared.timeMs !== undefined) state = updateExperience(state, { type: 'scrub', timeMs: shared.timeMs });
if (shared.frame) state = updateExperience(state, { type: 'set-frame', frame: shared.frame });
if (shared.selectedBody) state = updateExperience(state, { type: 'select', body: shared.selectedBody });
if (shared.cameraBookmark) state = updateExperience(state, { type: 'set-bookmark', bookmark: shared.cameraBookmark });

let scene: OrbitalScene | null = null;
let lastAnimationTime = performance.now();
let lastInterfaceRenderAt = 0;

const appInterface = new AppInterface({
  dispatch,
  onEnter: (mode) => {
    if (mode === 'tour') dispatch({ type: 'start-tour' });
    else {
      dispatch({ type: 'pause' });
      dispatch({ type: 'set-frame', frame: 'sun' });
      dispatch({ type: 'set-bookmark', bookmark: 'inner' });
    }
  },
  onShare: () => void shareCurrentView(),
  onFocus: (body) => {
    dispatch({ type: 'focus-camera' });
    if (state.frame === 'galaxy' || state.cameraBookmark === 'full') {
      dispatch({ type: 'set-frame', frame: 'space' });
      dispatch({ type: 'set-bookmark', bookmark: 'path' });
    }
    scene?.focus(body);
  },
  onFollow: (planet) => {
    dispatch({ type: 'toggle-planet-follow', planet });
  },
  onResetCamera: () => {
    dispatch({ type: 'reset-camera' });
    scene?.resetCamera();
  },
  onReturnHome: () => dispatch({ type: 'return-home' }),
});

if (Object.keys(shared).length > 0) appInterface.openSimulation();

try {
  scene = new OrbitalScene({
    canvas: document.getElementById('space-canvas') as HTMLCanvasElement,
    labelLayer: document.getElementById('label-layer') as HTMLElement,
    assetBase: import.meta.env.BASE_URL,
    onSelect: (body) => dispatch({ type: 'select', body }),
    onQualityAdapted: (quality) => {
      dispatch({ type: 'set-quality', quality });
      appInterface.showToast(`Visual quality adjusted to ${quality} to keep motion smooth.`);
    },
  });
  scene.setOrbitPaths(createOrbitPaths(initialToday));
} catch (error) {
  console.error('Unable to initialize WebGL.', error);
  appInterface.showFallback();
}

function dispatch(action: ExperienceAction): void {
  const previousState = state;
  const previousTourKey = `${state.tour.status}:${state.tour.chapter}`;
  let next = updateExperience(state, action);
  const nextTourKey = `${next.tour.status}:${next.tour.chapter}`;
  if (nextTourKey !== previousTourKey && next.tour.status === 'running') {
    next = applyCurrentTourChapter(next);
  }
  state = next;
  if (action.type === 'set-reduced-motion' || action.type === 'set-quality' || action.type === 'set-view-option') {
    persistPreferences(state);
  }
  const now = performance.now();
  if (action.type !== 'advance' || now - lastInterfaceRenderAt >= 100 || state.journeyComplete) {
    lastInterfaceRenderAt = now;
    renderInterface();
  }
  if (previousState.followedPlanet !== state.followedPlanet) {
    if (state.followedPlanet) {
      const name = getPlanetProfile(state.followedPlanet).name;
      const movedFromFullJourney = previousState.frame === 'space' && previousState.cameraBookmark === 'full';
      appInterface.showToast(movedFromFullJourney
        ? `Switched to the Along the Path camera to follow ${name}.`
        : `Camera is now following ${name}.`);
    } else if (previousState.followedPlanet) {
      const name = getPlanetProfile(previousState.followedPlanet).name;
      appInterface.showToast(`Stopped following ${name}. Camera position is unchanged.`);
    }
  }
}

function renderInterface(): void {
  appInterface.render(state, getAlongPathMotion(state));
  if (state.selectedBody && state.selectedBody !== 'sun') {
    const instant = new Date(state.currentTimeMs);
    const snapshot = calculateSystemSnapshot(
      instant,
      new Date(state.startTimeMs),
      state.frame === 'sun' ? 'sun' : 'space',
    );
    const planet = snapshot.planets.find(({ id }) => id === state.selectedBody);
    if (planet) {
      const distanceAu = Math.hypot(
        planet.position.x - snapshot.sun.x,
        planet.position.y - snapshot.sun.y,
        planet.position.z - snapshot.sun.z,
      );
      appInterface.renderPlanet({
        profile: getPlanetProfile(state.selectedBody),
        distanceAu,
        speedKmPerSecond: calculateOrbitalSpeedKmPerSecond(state.selectedBody, instant),
      });
    }
  } else {
    appInterface.renderPlanet(null);
  }
}

async function shareCurrentView(): Promise<void> {
  const params = encodeSharedView({
    timeMs: state.currentTimeMs,
    frame: state.frame,
    selectedBody: state.selectedBody,
    cameraBookmark: state.cameraBookmark,
  });
  const url = new URL(window.location.href);
  url.search = params.toString();
  window.history.replaceState({}, '', url);
  try {
    await navigator.clipboard.writeText(url.toString());
    appInterface.showToast('A link to this view was copied.');
  } catch {
    appInterface.showToast('This view is now encoded in the address bar.');
  }
}

function rotationsAt(instant: Date): Readonly<Record<PlanetId, number>> {
  return {
    mercury: calculateAxialRotation('mercury', instant, initialToday),
    venus: calculateAxialRotation('venus', instant, initialToday),
    earth: calculateAxialRotation('earth', instant, initialToday),
    mars: calculateAxialRotation('mars', instant, initialToday),
    jupiter: calculateAxialRotation('jupiter', instant, initialToday),
    saturn: calculateAxialRotation('saturn', instant, initialToday),
    uranus: calculateAxialRotation('uranus', instant, initialToday),
    neptune: calculateAxialRotation('neptune', instant, initialToday),
  };
}

function animate(now: number): void {
  const elapsedSeconds = Math.min(0.1, Math.max(0, (now - lastAnimationTime) / 1_000));
  lastAnimationTime = now;
  if (state.isPlaying) dispatch({ type: 'advance', realSeconds: elapsedSeconds });

  if (scene) {
    const instant = new Date(state.currentTimeMs);
    const snapshot = calculateSystemSnapshot(
      instant,
      new Date(state.startTimeMs),
      state.frame === 'sun' ? 'sun' : 'space',
    );
    scene.render(
      {
        snapshot,
        frame: state.frame,
        bookmark: state.cameraBookmark,
        cameraRevision: state.cameraRevision,
        selectedBody: state.selectedBody,
        followedPlanet: state.followedPlanet,
        viewOptions: state.viewOptions,
        quality: state.quality,
        reducedMotion: state.reducedMotion,
        rotations: rotationsAt(instant),
        rotationStabilized: state.speed === 'year' || state.speed === 'decade',
        trailRevision: state.trailRevision,
        journeyProgress: (state.currentTimeMs - state.startTimeMs) / (state.endTimeMs - state.startTimeMs),
        pathMotion: getAlongPathMotion(state),
        galacticProgress: state.galacticElapsedMillionYears / state.galacticEndMillionYears,
      },
      now,
    );
  }
  window.requestAnimationFrame(animate);
}

renderInterface();
window.requestAnimationFrame(animate);
