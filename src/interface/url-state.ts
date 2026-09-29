import { PLANET_IDS } from '../astronomy/planet-data';
import type {
  CameraBookmark,
  SelectableBody,
  ViewMode,
} from '../experience/experience-state';

export interface ShareableView {
  readonly timeMs: number;
  readonly frame: ViewMode;
  readonly selectedBody: SelectableBody | null;
  readonly cameraBookmark: CameraBookmark;
}

const VIEW_MODES: readonly ViewMode[] = ['sun', 'space', 'galaxy'];
const CAMERA_BOOKMARKS: readonly CameraBookmark[] = ['hero', 'inner', 'outer', 'path', 'ecliptic', 'full'];
const SELECTABLE_BODIES: readonly SelectableBody[] = ['sun', ...PLANET_IDS];

function includes<T extends string>(values: readonly T[], value: string | null): value is T {
  return value !== null && values.includes(value as T);
}

export function encodeSharedView(view: ShareableView): URLSearchParams {
  const params = new URLSearchParams({
    date: new Date(view.timeMs).toISOString(),
    view: view.frame,
    camera: view.cameraBookmark,
  });
  if (view.selectedBody) params.set('body', view.selectedBody);
  return params;
}

export function decodeSharedView(input: URLSearchParams | string): Partial<ShareableView> {
  const params = typeof input === 'string' ? new URLSearchParams(input) : input;
  const decoded: {
    timeMs?: number;
    frame?: ViewMode;
    selectedBody?: SelectableBody;
    cameraBookmark?: CameraBookmark;
  } = {};
  const timeMs = Date.parse(params.get('date') ?? '');
  const frame = params.get('view');
  const selectedBody = params.get('body');
  const cameraBookmark = params.get('camera');

  if (Number.isFinite(timeMs)) decoded.timeMs = timeMs;
  if (includes(VIEW_MODES, frame)) decoded.frame = frame;
  if (includes(SELECTABLE_BODIES, selectedBody)) decoded.selectedBody = selectedBody;
  if (includes(CAMERA_BOOKMARKS, cameraBookmark)) decoded.cameraBookmark = cameraBookmark;

  return decoded;
}
