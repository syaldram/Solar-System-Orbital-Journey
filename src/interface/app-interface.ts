import { getPlanetProfile, type PlanetProfile } from '../astronomy/planet-data';
import type { PlanetId } from '../astronomy/solar-system';
import { GALACTIC_MODEL } from '../astronomy/reference-frames';
import type {
  AlongPathMotion,
  ExperienceAction,
  ExperienceState,
  GalacticPlaybackSpeed,
  SelectableBody,
  ViewMode,
  ViewOptions,
} from '../experience/experience-state';
import { GALACTIC_PLAYBACK_SPEEDS } from '../experience/experience-state';
import { TOUR_CHAPTERS } from '../experience/tour';

export interface PlanetCardDetails {
  readonly profile: PlanetProfile;
  readonly distanceAu: number;
  readonly speedKmPerSecond: number;
}

export interface AppInterfaceOptions {
  readonly dispatch: (action: ExperienceAction) => void;
  readonly onEnter: (mode: 'tour' | 'free') => void;
  readonly onShare: () => void;
  readonly onFocus: (body: SelectableBody) => void;
  readonly onFollow: (planet: PlanetId) => void;
  readonly onResetCamera: () => void;
  readonly onReturnHome: () => void;
}

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing interface element #${id}`);
  return found as T;
}

function formatDate(timeMs: number): string {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(timeMs);
}

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('en', { maximumFractionDigits }).format(value);
}

const EXPLANATIONS: Readonly<Record<ViewMode, { title: string; html: string; status: string }>> = {
  sun: {
    title: 'Travel with Sun',
    status: 'Body ratios preserved · orbital distances proportional',
    html: `<p>The camera travels with the Sun, so it appears fixed while each planet follows its calculated Keplerian orbit.</p>
      <ul><li>Orbital distances and eccentricities remain proportional.</li><li>The Sun and planets preserve their physical radius ratios; hollow markers reveal unresolved bodies.</li><li>The pale plane is the <em>ecliptic</em>: Earth’s orbital plane used as a Solar-System reference.</li></ul>`,
  },
  space: {
    title: 'Watch from Space',
    status: 'Rolling local window · straight tangent approximation',
    html: `<p>This is a rolling window in a local galactic coordinate frame. Along the Path keeps the Sun stable while continuous coordinate guides, distance ticks, and sparse abstract depth markers move backward.</p>
      <ul><li>The Sun moves at an adopted ${GALACTIC_MODEL.localSpeed.value} km/s, and the numerical distance stays derived from simulated UTC time.</li><li>Across 165 years it travels about ${GALACTIC_MODEL.fullJourneyDistance.value.toLocaleString('en')} AU.</li><li>At high playback speeds, only the apparent guide flow is capped and its density adjusted to prevent strobing; simulated time, distance, and the Full Journey position remain accurate.</li><li>Reduced motion uses subdued stepped guide updates. The markers are abstract orientation cues, not a nearby-star catalog, stellar wake, or physical trail.</li><li>Full Journey preserves the real transverse scale and omits misleading century-long planet trails.</li><li>The true galactic path curves too little to detect here, so this segment is rendered as a straight local tangent.</li></ul>`,
  },
  galaxy: {
    title: 'Galaxy Overview',
    status: 'Schematic · not a star-by-star map',
    html: `<p>This orientation view locates the Sun roughly ${GALACTIC_MODEL.distanceFromCenter.value.toLocaleString('en')} light-years from the Milky Way’s center.</p>
      <ul><li>The diffuse disk, dust lanes, circular path, and spiral structure are schematic orientation artwork.</li><li>One galactic orbit takes roughly ${GALACTIC_MODEL.approximatePeriod.value} million years.</li><li>Vertical and radial oscillations are omitted.</li></ul>`,
  },
};

export class AppInterface {
  private readonly app = element<HTMLElement>('app');
  private readonly chrome = element<HTMLElement>('app-chrome');
  private readonly planetCard = element<HTMLElement>('planet-card');
  private readonly tourPanel = element<HTMLElement>('tour-panel');
  private readonly explainPanel = element<HTMLElement>('explain-panel');
  private readonly optionsPanel = element<HTMLElement>('options-panel');
  private readonly completion = element<HTMLElement>('journey-complete');
  private readonly sourcesDialog = element<HTMLDialogElement>('sources-dialog');
  private readonly timeline = element<HTMLInputElement>('timeline-range');
  private readonly speedSelect = element<HTMLSelectElement>('speed-select');
  private readonly toast = element<HTMLElement>('toast');
  private selectedBody: SelectableBody | null = null;
  private toastTimer = 0;
  private entered = false;
  private currentFrame: ViewMode = 'sun';
  private renderedTimelineFrame: ViewMode | null = null;

  constructor(private readonly options: AppInterfaceOptions) {
    element<HTMLButtonElement>('begin-journey').addEventListener('click', () => this.enter('tour'));
    element<HTMLButtonElement>('explore-freely').addEventListener('click', () => this.enter('free'));
    element<HTMLButtonElement>('brand-home').addEventListener('click', () => {
      this.entered = false;
      this.app.dataset.entered = 'false';
      this.chrome.setAttribute('aria-hidden', 'true');
      this.options.dispatch({ type: 'pause' });
      this.options.onReturnHome();
    });

    document.querySelectorAll<HTMLButtonElement>('[data-frame]').forEach((button) => {
      button.addEventListener('click', () => {
        const frame = button.dataset.frame as ViewMode;
        this.options.dispatch({ type: 'set-frame', frame });
      });
    });
    document.querySelectorAll<HTMLButtonElement>('[data-bookmark]').forEach((button) => {
      button.addEventListener('click', () => {
        const bookmark = button.dataset.bookmark as ExperienceState['cameraBookmark'];
        if (bookmark === 'path' || bookmark === 'full') {
          this.options.dispatch({ type: 'set-frame', frame: 'space' });
        } else {
          this.options.dispatch({ type: 'set-frame', frame: 'sun' });
        }
        this.options.dispatch({ type: 'set-bookmark', bookmark });
      });
    });
    document.querySelectorAll<HTMLInputElement>('[data-view-option]').forEach((input) => {
      input.addEventListener('change', () => {
        this.options.dispatch({
          type: 'set-view-option',
          option: input.dataset.viewOption as keyof ViewOptions,
          enabled: input.checked,
        });
      });
    });

    element<HTMLButtonElement>('play-toggle').addEventListener('click', () => this.togglePlayback());
    this.speedSelect.addEventListener('change', () => {
      if (this.currentFrame === 'galaxy') {
        const speed = GALACTIC_PLAYBACK_SPEEDS.find((candidate) => candidate === Number(this.speedSelect.value));
        if (speed !== undefined) this.options.dispatch({ type: 'set-galactic-speed', speed });
        return;
      }
      const speed = this.speedSelect.value as ExperienceState['speed'];
      this.options.dispatch({ type: 'set-speed', speed });
    });
    this.timeline.addEventListener('input', () => {
      if (this.currentFrame === 'galaxy') {
        this.options.dispatch({ type: 'scrub-galactic', elapsedMillionYears: Number(this.timeline.value) });
        return;
      }
      const start = Number(this.timeline.dataset.start);
      const end = Number(this.timeline.dataset.end);
      const progress = Number(this.timeline.value) / Number(this.timeline.max);
      this.options.dispatch({ type: 'scrub', timeMs: start + (end - start) * progress });
    });
    element<HTMLButtonElement>('today-button').addEventListener('click', () => {
      this.options.dispatch(this.currentFrame === 'galaxy'
        ? { type: 'return-present' }
        : { type: 'return-today', today: new Date() });
    });
    element<HTMLButtonElement>('share-button').addEventListener('click', options.onShare);
    element<HTMLButtonElement>('replay-journey').addEventListener('click', () => {
      this.options.dispatch({ type: 'replay' });
    });
    element<HTMLButtonElement>('tour-next').addEventListener('click', () => this.options.dispatch({ type: 'next-chapter' }));
    element<HTMLButtonElement>('tour-skip').addEventListener('click', () => this.options.dispatch({ type: 'skip-tour' }));
    element<HTMLButtonElement>('close-planet').addEventListener('click', () => this.options.dispatch({ type: 'select', body: null }));
    element<HTMLButtonElement>('focus-planet').addEventListener('click', () => {
      if (this.selectedBody) options.onFocus(this.selectedBody);
    });
    element<HTMLButtonElement>('follow-planet').addEventListener('click', () => {
      if (this.selectedBody && this.selectedBody !== 'sun') options.onFollow(this.selectedBody);
    });
    element<HTMLButtonElement>('reset-camera').addEventListener('click', options.onResetCamera);
    element<HTMLButtonElement>('replay-button').addEventListener('click', () => {
      this.options.dispatch(this.currentFrame === 'galaxy' ? { type: 'replay-galactic' } : { type: 'replay' });
    });
    element<HTMLButtonElement>('continue-button').addEventListener('click', () => {
      this.options.dispatch({ type: 'dismiss-completion' });
    });

    element<HTMLButtonElement>('explain-button').addEventListener('click', () => this.togglePanel(this.explainPanel));
    element<HTMLButtonElement>('options-button').addEventListener('click', () => this.togglePanel(this.optionsPanel));
    document.querySelectorAll<HTMLButtonElement>('[data-close-panel]').forEach((button) => {
      button.addEventListener('click', () => {
        const panelId = button.dataset.closePanel;
        if (panelId) element<HTMLElement>(panelId).hidden = true;
      });
    });
    for (const id of ['sources-open', 'fallback-sources']) {
      element<HTMLButtonElement>(id).addEventListener('click', () => this.sourcesDialog.showModal());
    }
    element<HTMLInputElement>('reduced-motion').addEventListener('change', (event) => {
      this.options.dispatch({ type: 'set-reduced-motion', enabled: (event.currentTarget as HTMLInputElement).checked });
    });
    element<HTMLSelectElement>('quality-select').addEventListener('change', (event) => {
      const quality = (event.currentTarget as HTMLSelectElement).value as ExperienceState['quality'];
      this.options.dispatch({ type: 'set-quality', quality });
    });

    document.addEventListener('keydown', (event) => {
      const target = event.target as HTMLElement;
      if (['INPUT', 'SELECT', 'BUTTON', 'SUMMARY'].includes(target.tagName)) return;
      if ((event.code === 'Space' || event.key === ' ') && this.entered) {
        event.preventDefault();
        this.togglePlayback();
      }
      if (event.key === 'Escape') {
        this.optionsPanel.hidden = true;
        this.explainPanel.hidden = true;
        this.options.dispatch({ type: 'select', body: null });
      }
    });
  }

  render(state: ExperienceState, pathMotion: AlongPathMotion): void {
    this.currentFrame = state.frame;
    const isGalaxy = state.frame === 'galaxy';
    this.renderTimelineOptions(state.frame);
    if (isGalaxy) {
      this.timeline.min = '0';
      this.timeline.max = String(state.galacticEndMillionYears);
      this.timeline.step = '1';
      this.timeline.value = String(Math.round(state.galacticElapsedMillionYears));
      element<HTMLElement>('timeline-heading').textContent = 'Galactic elapsed time';
      element<HTMLElement>('current-date').textContent = `${Math.round(state.galacticElapsedMillionYears)} million years`;
      element<HTMLElement>('timeline-range-label').textContent = 'Galactic elapsed time through one schematic orbit';
      element<HTMLElement>('timeline-start').textContent = 'Present';
      element<HTMLElement>('timeline-end').textContent = `Approximately ${state.galacticEndMillionYears} million years`;
      this.speedSelect.value = String(state.galacticSpeed);
      element<HTMLButtonElement>('today-button').textContent = 'Return to Present';
    } else {
      this.timeline.min = '0';
      this.timeline.max = '10000';
      this.timeline.step = '1';
      this.timeline.dataset.start = String(state.startTimeMs);
      this.timeline.dataset.end = String(state.endTimeMs);
      this.timeline.value = String(
        Math.round(((state.currentTimeMs - state.startTimeMs) / (state.endTimeMs - state.startTimeMs)) * Number(this.timeline.max)),
      );
      element<HTMLElement>('timeline-heading').textContent = 'Simulated date · UTC';
      element<HTMLElement>('current-date').textContent = formatDate(state.currentTimeMs);
      element<HTMLElement>('timeline-range-label').textContent = 'Simulated date across 165 years';
      element<HTMLElement>('timeline-start').textContent = 'Today';
      element<HTMLElement>('timeline-end').textContent = '+165 years';
      this.speedSelect.value = state.speed;
      element<HTMLButtonElement>('today-button').textContent = 'Return to Today';
    }
    const play = element<HTMLButtonElement>('play-toggle');
    play.setAttribute('aria-pressed', String(state.isPlaying));
    const playLabel = isGalaxy
      ? state.isPlaying
        ? 'Pause Galactic Orbit'
        : state.galacticElapsedMillionYears > 0
          ? 'Resume Galactic Orbit'
          : 'Play Galactic Orbit'
      : state.isPlaying ? 'Pause simulation' : 'Play simulation';
    play.setAttribute('aria-label', playLabel);
    const playIcon = play.firstElementChild;
    if (playIcon) playIcon.textContent = state.isPlaying ? 'Ⅱ' : '▶';
    element<HTMLSelectElement>('quality-select').value = state.quality;
    element<HTMLInputElement>('reduced-motion').checked = state.reducedMotion;

    const pathMotionPanel = element<HTMLElement>('path-motion');
    pathMotionPanel.hidden = state.frame !== 'space' || state.cameraBookmark !== 'path';
    pathMotionPanel.dataset.guideFlow = pathMotion.guideFlow;
    element<HTMLElement>('path-distance-au').textContent = `${formatNumber(
      pathMotion.distanceAu,
      pathMotion.distanceAu < 1 ? 2 : pathMotion.distanceAu < 100 ? 1 : 0,
    )} AU`;
    element<HTMLElement>('path-distance-light-years').textContent = `${formatNumber(
      pathMotion.distanceLightYears,
      3,
    )} light-years`;
    element<HTMLElement>('path-guide-status').textContent = pathMotion.guideFlow === 'stepped'
      ? 'Subdued stepped guide updates'
      : pathMotion.guideFlow === 'stabilized'
        ? 'Guide flow visually stabilized'
        : 'Continuous coordinate guides';

    document.querySelectorAll<HTMLButtonElement>('[data-frame]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.frame === state.frame));
    });
    document.querySelectorAll<HTMLButtonElement>('[data-bookmark]').forEach((button) => {
      button.disabled = state.frame === 'galaxy';
      if (button.dataset.bookmark === state.cameraBookmark) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    document.querySelectorAll<HTMLInputElement>('[data-view-option]').forEach((input) => {
      input.checked = state.viewOptions[input.dataset.viewOption as keyof ViewOptions];
    });

    const explanation = EXPLANATIONS[state.frame];
    const rotationNote = state.speed === 'year' || state.speed === 'decade' ? ' · surface rotation stabilized' : '';
    const status = state.frame === 'space' && state.cameraBookmark === 'full'
      ? 'Full 165-year path · current calculated positions'
      : explanation.status;
    element<HTMLElement>('scene-status').innerHTML = `<span class="scene-status__dot" aria-hidden="true"></span><div><strong>${explanation.title}</strong><small>${status}${rotationNote}</small></div>`;
    element<HTMLElement>('explain-title').textContent = explanation.title;
    element<HTMLElement>('explain-copy').innerHTML = explanation.html;

    this.selectedBody = state.selectedBody;
    this.planetCard.hidden = state.selectedBody === null || state.selectedBody === 'sun';
    const follow = element<HTMLButtonElement>('follow-planet');
    const isFollowing = state.followedPlanet !== null && state.followedPlanet === state.selectedBody;
    follow.setAttribute('aria-pressed', String(isFollowing));
    follow.textContent = isFollowing && state.followedPlanet
      ? `Stop Following ${getPlanetProfile(state.followedPlanet).name}`
      : 'Follow Planet';
    this.renderTour(state);
    element<HTMLButtonElement>('replay-journey').hidden = state.tour.status !== 'complete';
    const journeyComplete = isGalaxy ? state.galacticJourneyComplete : state.journeyComplete;
    this.completion.hidden = !journeyComplete || (isGalaxy && state.galacticCompletionDismissed);
    element<HTMLElement>('completion-kicker').textContent = isGalaxy ? 'Approximately 230 million years elapsed' : '165 Earth years later';
    element<HTMLElement>('completion-title').textContent = isGalaxy ? 'Schematic orbit complete' : 'Journey complete';
    element<HTMLElement>('completion-copy').textContent = isGalaxy
      ? 'The schematic Sun marker has completed one approximate orbit of the Milky Way.'
      : 'Neptune has completed one orbit. The Solar System has traveled about 0.12 light-years along its local galactic path.';
    element<HTMLButtonElement>('replay-button').textContent = isGalaxy ? 'Replay from Present' : 'Replay from Today';
  }

  openSimulation(): void {
    this.entered = true;
    this.app.dataset.entered = 'true';
    this.chrome.setAttribute('aria-hidden', 'false');
  }

  renderPlanet(details: PlanetCardDetails | null): void {
    if (!details) {
      this.planetCard.hidden = true;
      return;
    }
    const { profile } = details;
    this.planetCard.hidden = false;
    element<HTMLElement>('planet-name').textContent = profile.name;
    element<HTMLElement>('planet-identity').textContent = profile.identity;
    element<HTMLElement>('planet-distance').textContent = `${formatNumber(details.distanceAu, details.distanceAu < 2 ? 3 : 2)} AU`;
    element<HTMLElement>('planet-speed').textContent = `${formatNumber(details.speedKmPerSecond, 1)} km/s`;
    element<HTMLElement>('planet-period').textContent = profile.siderealOrbitYears < 1
      ? `${formatNumber(profile.siderealOrbitYears * 365.25, 1)} days`
      : `${formatNumber(profile.siderealOrbitYears, 2)} years`;
    element<HTMLElement>('planet-radius').textContent = `${formatNumber(profile.meanRadiusKm, 1)} km`;
    element<HTMLElement>('planet-tilt').textContent = `${formatNumber(profile.obliquityDegrees, 2)}°`;
  }

  showFallback(): void {
    element<HTMLElement>('webgl-fallback').hidden = false;
    element<HTMLElement>('hero').hidden = true;
  }

  showToast(message: string): void {
    window.clearTimeout(this.toastTimer);
    this.toast.textContent = message;
    this.toast.hidden = false;
    this.toastTimer = window.setTimeout(() => {
      this.toast.hidden = true;
    }, 2_600);
  }

  announce(message: string): void {
    element<HTMLElement>('sr-status').textContent = message;
  }

  private enter(mode: 'tour' | 'free'): void {
    this.openSimulation();
    this.options.onEnter(mode);
  }

  private togglePlayback(): void {
    const pressed = element<HTMLButtonElement>('play-toggle').getAttribute('aria-pressed') === 'true';
    this.options.dispatch({ type: pressed ? 'pause' : 'play' });
  }

  private renderTimelineOptions(frame: ViewMode): void {
    const timelineFrame: ViewMode = frame === 'galaxy' ? 'galaxy' : 'sun';
    if (this.renderedTimelineFrame === timelineFrame) return;
    this.renderedTimelineFrame = timelineFrame;
    const options: readonly { value: string; label: string }[] = timelineFrame === 'galaxy'
      ? GALACTIC_PLAYBACK_SPEEDS.map((speed: GalacticPlaybackSpeed) => ({
          value: String(speed),
          label: `${speed} million years/s`,
        }))
      : [
          { value: 'day', label: '1 day/s' },
          { value: 'month', label: '1 month/s' },
          { value: 'year', label: '1 year/s' },
          { value: 'decade', label: '10 years/s' },
        ];
    this.speedSelect.replaceChildren(...options.map(({ value, label }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      return option;
    }));
  }

  private togglePanel(panel: HTMLElement): void {
    const next = panel.hidden;
    this.optionsPanel.hidden = true;
    this.explainPanel.hidden = true;
    panel.hidden = !next;
  }

  private renderTour(state: ExperienceState): void {
    const running = state.tour.status === 'running';
    this.tourPanel.hidden = !running;
    if (!running) return;
    const chapter = TOUR_CHAPTERS[state.tour.chapter];
    if (!chapter) return;
    element<HTMLElement>('tour-kicker').textContent = `Chapter ${state.tour.chapter + 1} of ${TOUR_CHAPTERS.length}`;
    element<HTMLElement>('tour-title').textContent = chapter.title;
    element<HTMLElement>('tour-copy').textContent = chapter.copy;
    element<HTMLElement>('tour-progress').style.width = `${((state.tour.chapter + 1) / TOUR_CHAPTERS.length) * 100}%`;
    element<HTMLButtonElement>('tour-next').textContent = state.tour.chapter === TOUR_CHAPTERS.length - 1 ? 'Finish Journey' : 'Continue';
  }
}
