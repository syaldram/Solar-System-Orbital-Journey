import * as THREE from 'three';

import { PLANET_IDS, getPlanetProfile } from '../astronomy/planet-data';
import type { PlanetId } from '../astronomy/solar-system';
import type { CameraBookmark, SelectableBody, ViewMode, ViewOptions } from '../experience/experience-state';
import { SUN_DISPLAY_RADIUS, planetDisplayRadius } from './display-scale';

const MARKER_VISIBILITY_THRESHOLD_PX = 6;

interface SceneLabelObjects {
  readonly sun: THREE.Mesh;
  readonly solarGroup: THREE.Group;
  readonly galaxyRoot: THREE.Group;
  readonly galaxySun: THREE.Mesh;
  readonly planets: ReadonlyMap<PlanetId, THREE.Mesh>;
}

export interface SceneLabelsState {
  readonly frame: ViewMode;
  readonly bookmark: CameraBookmark;
  readonly selectedBody: SelectableBody | null;
  readonly viewOptions: ViewOptions;
}

export class SceneLabels {
  private readonly bodyMarkers = new Map<SelectableBody, HTMLButtonElement>();
  private readonly markerScreenPositions = new Map<SelectableBody, THREE.Vector2>();
  private readonly solarSystemLabel: HTMLDivElement;
  private readonly galaxyCenterLabel: HTMLDivElement;
  private hoveredBody: SelectableBody | null = null;

  constructor(
    labelLayer: HTMLElement,
    private readonly objects: SceneLabelObjects,
    onSelect: (body: SelectableBody) => void,
  ) {
    this.createBodyMarker(labelLayer, 'sun', 'Sun', onSelect);
    for (const id of PLANET_IDS) {
      this.createBodyMarker(labelLayer, id, getPlanetProfile(id).name, onSelect);
    }
    this.solarSystemLabel = document.createElement('div');
    this.solarSystemLabel.className = 'solar-system-label';
    this.solarSystemLabel.textContent = 'Solar System';
    this.solarSystemLabel.setAttribute('role', 'note');
    this.solarSystemLabel.hidden = true;
    labelLayer.append(this.solarSystemLabel);
    this.galaxyCenterLabel = document.createElement('div');
    this.galaxyCenterLabel.className = 'galaxy-center-label';
    this.galaxyCenterLabel.textContent = 'Galactic center';
    this.galaxyCenterLabel.setAttribute('role', 'note');
    this.galaxyCenterLabel.hidden = true;
    labelLayer.append(this.galaxyCenterLabel);
  }

  hitTest(clientX: number, clientY: number, bounds: DOMRect): SelectableBody | null {
    const pointer = new THREE.Vector2(clientX - bounds.left, clientY - bounds.top);
    let nearest: { body: SelectableBody; distance: number } | null = null;
    for (const [body, position] of this.markerScreenPositions) {
      const distance = pointer.distanceTo(position);
      if (distance <= 22 && (!nearest || distance < nearest.distance)) nearest = { body, distance };
    }
    return nearest?.body ?? null;
  }

  updateHover(clientX: number, clientY: number, bounds: DOMRect): void {
    this.hoveredBody = this.hitTest(clientX, clientY, bounds);
  }

  clearHover(): void {
    this.hoveredBody = null;
  }

  render(
    state: SceneLabelsState,
    camera: THREE.PerspectiveCamera,
    cameraTarget: THREE.Vector3,
    width: number,
    height: number,
  ): void {
    const isFullJourney = state.frame === 'space' && state.bookmark === 'full';
    const fullSunScreen = new THREE.Vector2();
    if (isFullJourney) {
      const sunWorld = new THREE.Vector3();
      this.objects.sun.getWorldPosition(sunWorld);
      sunWorld.project(camera);
      fullSunScreen.set((sunWorld.x * 0.5 + 0.5) * width, (-sunWorld.y * 0.5 + 0.5) * height);
    }
    this.markerScreenPositions.clear();
    for (const [id, marker] of this.bodyMarkers) {
      const object = id === 'sun' && state.frame === 'galaxy'
        ? this.objects.galaxySun
        : id === 'sun'
          ? this.objects.sun
          : this.objects.planets.get(id);
      const available = Boolean(object?.visible) && (state.frame !== 'galaxy' || id === 'sun');
      marker.hidden = !available;
      if (!object || !available) continue;

      const world = new THREE.Vector3();
      object.getWorldPosition(world);
      const projected = world.clone().project(camera);
      const behind = projected.z < -1 || projected.z > 1;
      marker.hidden = behind;
      if (behind) continue;

      const actualX = (projected.x * 0.5 + 0.5) * width;
      const actualY = (-projected.y * 0.5 + 0.5) * height;
      let x = actualX;
      let y = actualY;
      const leader = marker.querySelector<HTMLElement>('.body-marker__leader');
      if (isFullJourney && id !== 'sun') {
        const index = PLANET_IDS.indexOf(id);
        const actualDelta = new THREE.Vector2(actualX - fullSunScreen.x, actualY - fullSunScreen.y);
        const fallbackAngle = (index / PLANET_IDS.length) * Math.PI * 2 - Math.PI / 2;
        const direction = actualDelta.lengthSq() > 0.01
          ? actualDelta.normalize()
          : new THREE.Vector2(Math.cos(fallbackAngle), Math.sin(fallbackAngle));
        const minimumDistance = 27 + index * 4.5;
        const actualDistance = Math.hypot(actualX - fullSunScreen.x, actualY - fullSunScreen.y);
        const displayDistance = Math.max(minimumDistance, actualDistance);
        x = fullSunScreen.x + direction.x * displayDistance;
        y = fullSunScreen.y + direction.y * displayDistance;
        if (leader) {
          const backX = actualX - x;
          const backY = actualY - y;
          leader.hidden = false;
          leader.style.width = `${Math.hypot(backX, backY)}px`;
          leader.style.transform = `rotate(${Math.atan2(backY, backX)}rad)`;
        }
      } else if (leader) {
        leader.hidden = true;
      }
      const localRadius = id === 'sun'
        ? state.frame === 'galaxy' ? 1.05 : SUN_DISPLAY_RADIUS
        : planetDisplayRadius(id);
      const worldScale = new THREE.Vector3();
      object.getWorldScale(worldScale);
      const worldRadius = localRadius * Math.max(worldScale.x, worldScale.y, worldScale.z);
      const distance = Math.max(0.0001, camera.position.distanceTo(world));
      const pixelsPerWorldUnit = height / (
        2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance
      );
      const projectedRadius = worldRadius * pixelsPerWorldUnit;
      const revealOnly = (isFullJourney && id !== 'sun')
        || (camera.position.distanceTo(cameraTarget) > 180 && ['mercury', 'venus', 'earth', 'mars'].includes(id));

      marker.style.left = `${x}px`;
      marker.style.top = `${y}px`;
      marker.dataset.markerVisible = String(
        projectedRadius < MARKER_VISIBILITY_THRESHOLD_PX || isFullJourney || state.frame === 'galaxy',
      );
      const labelEnabled = state.viewOptions.labels || (isFullJourney && id === 'sun');
      marker.dataset.labelMode = !labelEnabled ? 'hidden' : revealOnly ? 'reveal' : 'persistent';
      marker.dataset.hovered = String(this.hoveredBody === id);
      marker.setAttribute('aria-current', String(state.selectedBody === id));
      this.markerScreenPositions.set(id, new THREE.Vector2(x, y));
    }

    this.solarSystemLabel.hidden = !isFullJourney;
    if (isFullJourney) {
      const solarSystemPosition = new THREE.Vector3();
      this.objects.solarGroup.getWorldPosition(solarSystemPosition);
      solarSystemPosition.project(camera);
      const behind = solarSystemPosition.z < -1 || solarSystemPosition.z > 1;
      this.solarSystemLabel.hidden = behind;
      if (!behind) {
        this.solarSystemLabel.style.left = `${(solarSystemPosition.x * 0.5 + 0.5) * width}px`;
        this.solarSystemLabel.style.top = `${(-solarSystemPosition.y * 0.5 + 0.5) * height - 34}px`;
      }
    }

    this.galaxyCenterLabel.hidden = state.frame !== 'galaxy';
    if (state.frame === 'galaxy') {
      const galacticCenter = new THREE.Vector3();
      this.objects.galaxyRoot.getWorldPosition(galacticCenter);
      galacticCenter.project(camera);
      const behind = galacticCenter.z < -1 || galacticCenter.z > 1;
      this.galaxyCenterLabel.hidden = behind;
      if (!behind) {
        this.galaxyCenterLabel.style.left = `${(galacticCenter.x * 0.5 + 0.5) * width}px`;
        this.galaxyCenterLabel.style.top = `${(-galacticCenter.y * 0.5 + 0.5) * height}px`;
      }
    }
  }

  private createBodyMarker(
    labelLayer: HTMLElement,
    id: SelectableBody,
    text: string,
    onSelect: (body: SelectableBody) => void,
  ): void {
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'body-marker';
    marker.setAttribute('aria-label', `Select ${text}`);
    marker.dataset.body = id;
    const markerColor = id === 'sun' ? 0xffcf7b : getPlanetProfile(id).color;
    marker.style.setProperty('--body-color', `#${markerColor.toString(16).padStart(6, '0')}`);
    const leader = document.createElement('span');
    leader.className = 'body-marker__leader';
    leader.setAttribute('aria-hidden', 'true');
    leader.hidden = true;
    const ring = document.createElement('span');
    ring.className = 'body-marker__ring';
    ring.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.className = 'body-marker__name';
    name.textContent = text;
    marker.append(leader, ring, name);
    marker.addEventListener('click', () => onSelect(id));
    labelLayer.append(marker);
    this.bodyMarkers.set(id, marker);
  }
}
