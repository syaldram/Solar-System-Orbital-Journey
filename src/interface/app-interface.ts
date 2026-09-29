import type { PlanetProfile } from '../astronomy/planet-data';
import { GALACTIC_MODEL } from '../astronomy/reference-frames';
import type {
  ExperienceAction,
  ExperienceState,
  SelectableBody,
  ViewMode,
  ViewOptions,
} from '../experience/experience-state';
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
  readonly onFollow: (body: SelectableBody) => void;
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
    status: 'Planet sizes enhanced · orbital distances proportional',
    html: `<p>The camera travels with the Sun, so it appears fixed while each planet follows its calculated Keplerian orbit.</p>
      <ul><li>Orbital distances and eccentricities remain proportional.</li><li>Planet radii are enlarged for visibility.</li><li>The pale plane is the <em>ecliptic</em>: Earth’s orbital plane used as a Solar-System reference.</li></ul>`,
  },
  space: {
    title: 'Watch from Space',
    status: 'Rolling local window · straight tangent approximation',
    html: `<p>This is a rolling window in a local galactic coordinate frame. The abstract grid—not the decorative stars—provides the stationary reference.</p>
      <ul><li>The Sun moves at an adopted ${GALACTIC_MODEL.localSpeed.value} km/s.</li><li>Across 165 years it travels about ${GALACTIC_MODEL.fullJourneyDistance.value.toLocaleString('en')} AU.</li><li>The true galactic path curves too little to detect here, so this segment is rendered as a straight local tangent.</li></ul>`,
  },
  galaxy: {
    title: 'Galaxy Overview',
    status: 'Schematic · not a star-by-star map',
    html: `<p>This orientation view locates the Sun roughly ${GALACTIC_MODEL.distanceFromCenter.value.toLocaleString('en')} light-years from the Milky Way’s center.</p>
      <ul><li>The circular path and spiral structure are schematic.</li><li>One galactic orbit takes roughly ${GALACTIC_MODEL.approximatePeriod.value} million years.</li><li>Vertical and radial oscillations are omitted.</li></ul>`,
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
  private readonly toast = element<HTMLElement>('toast');
  private selectedBody: SelectableBody | null = null;
  private toastTimer = 0;
  private entered = false;

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
    element<HTMLSelectElement>('speed-select').addEventListener('change', (event) => {
      const speed = (event.currentTarget as HTMLSelectElement).value as ExperienceState['speed'];
      this.options.dispatch({ type: 'set-speed', speed });
    });
    this.timeline.addEventListener('input', () => {
      const start = Number(this.timeline.dataset.start);
      const end = Number(this.timeline.dataset.end);
      const progress = Number(this.timeline.value) / Number(this.timeline.max);
      this.options.dispatch({ type: 'scrub', timeMs: start + (end - start) * progress });
    });
    element<HTMLButtonElement>('today-button').addEventListener('click', () => {
      this.options.dispatch({ type: 'return-today', today: new Date() });
    });
    element<HTMLButtonElement>('share-button').addEventListener('click', options.onShare);
    element<HTMLButtonElement>('tour-next').addEventListener('click', () => this.options.dispatch({ type: 'next-chapter' }));
    element<HTMLButtonElement>('tour-skip').addEventListener('click', () => this.options.dispatch({ type: 'skip-tour' }));
    element<HTMLButtonElement>('close-planet').addEventListener('click', () => this.options.dispatch({ type: 'select', body: null }));
    element<HTMLButtonElement>('focus-planet').addEventListener('click', () => {
      if (this.selectedBody) options.onFocus(this.selectedBody);
    });
    element<HTMLButtonElement>('follow-planet').addEventListener('click', () => {
      if (this.selectedBody) options.onFollow(this.selectedBody);
    });
    element<HTMLButtonElement>('replay-button').addEventListener('click', () => this.options.dispatch({ type: 'replay' }));
    element<HTMLButtonElement>('continue-button').addEventListener('click', () => {
      this.completion.hidden = true;
      this.options.dispatch({ type: 'pause' });
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

  render(state: ExperienceState): void {
    this.timeline.dataset.start = String(state.startTimeMs);
    this.timeline.dataset.end = String(state.endTimeMs);
    this.timeline.value = String(
      Math.round(((state.currentTimeMs - state.startTimeMs) / (state.endTimeMs - state.startTimeMs)) * Number(this.timeline.max)),
    );
    element<HTMLElement>('current-date').textContent = formatDate(state.currentTimeMs);
    const play = element<HTMLButtonElement>('play-toggle');
    play.setAttribute('aria-pressed', String(state.isPlaying));
    play.setAttribute('aria-label', state.isPlaying ? 'Pause simulation' : 'Play simulation');
    const playIcon = play.firstElementChild;
    if (playIcon) playIcon.textContent = state.isPlaying ? 'Ⅱ' : '▶';
    element<HTMLSelectElement>('speed-select').value = state.speed;
    element<HTMLSelectElement>('quality-select').value = state.quality;
    element<HTMLInputElement>('reduced-motion').checked = state.reducedMotion;

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
    element<HTMLElement>('scene-status').innerHTML = `<span class="scene-status__dot" aria-hidden="true"></span><div><strong>${explanation.title}</strong><small>${explanation.status}${rotationNote}</small></div>`;
    element<HTMLElement>('explain-title').textContent = explanation.title;
    element<HTMLElement>('explain-copy').innerHTML = explanation.html;

    this.selectedBody = state.selectedBody;
    this.planetCard.hidden = state.selectedBody === null || state.selectedBody === 'sun';
    this.renderTour(state);
    this.completion.hidden = !state.journeyComplete;
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
