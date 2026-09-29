import { GALACTIC_MODEL } from '../astronomy/reference-frames';
import {
  updateExperience,
  type CameraBookmark,
  type ExperienceState,
  type PlaybackSpeed,
  type ViewMode,
} from './experience-state';

export interface TourChapter {
  readonly title: string;
  readonly copy: string;
  readonly frame: ViewMode;
  readonly bookmark: CameraBookmark;
  readonly speed: PlaybackSpeed;
  readonly play: boolean;
}

export const TOUR_CHAPTERS: readonly TourChapter[] = [
  {
    title: 'Meet the Solar System',
    copy: 'Eight worlds circle one star. Their sizes are enhanced so you can see them, while the spacing between their orbits remains proportional.',
    frame: 'sun',
    bookmark: 'inner',
    speed: 'month',
    play: false,
  },
  {
    title: 'Set Time in Motion',
    copy: 'One clock drives every orbit. The inner planets race ahead while the outer planets trace much longer years.',
    frame: 'sun',
    bookmark: 'outer',
    speed: 'year',
    play: true,
  },
  {
    title: 'Change Your Point of View',
    copy: 'In a Sun-centered frame, the paths look familiar. Change the reference frame and the same accurate motion tells a different visual story.',
    frame: 'space',
    bookmark: 'path',
    speed: 'month',
    play: false,
  },
  {
    title: 'The Sun Is Moving Too',
    copy: `The Sun carries the planets along a local tangent to its galactic orbit at an adopted ${GALACTIC_MODEL.localSpeed.value} kilometers per second. Short trails reveal motion without inventing a vortex.`,
    frame: 'space',
    bookmark: 'path',
    speed: 'year',
    play: true,
  },
  {
    title: 'Our Place in the Milky Way',
    copy: `Pull back to a schematic galaxy. The Sun lies about ${GALACTIC_MODEL.distanceFromCenter.value.toLocaleString('en')} light-years from the center and completes one circuit in roughly ${GALACTIC_MODEL.approximatePeriod.value} million years.`,
    frame: 'galaxy',
    bookmark: 'full',
    speed: 'year',
    play: false,
  },
];

export function applyCurrentTourChapter(state: ExperienceState): ExperienceState {
  if (state.tour.status !== 'running') return state;
  const chapter = TOUR_CHAPTERS[state.tour.chapter];
  if (!chapter) return state;

  let next = updateExperience(state, { type: 'set-frame', frame: chapter.frame });
  next = updateExperience(next, { type: 'set-bookmark', bookmark: chapter.bookmark });
  next = updateExperience(next, { type: 'set-speed', speed: chapter.speed });
  return updateExperience(next, { type: chapter.play && !state.reducedMotion ? 'play' : 'pause' });
}
