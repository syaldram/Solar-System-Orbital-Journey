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
  readonly gravity?: boolean;
  readonly heliosphere?: boolean;
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
    const isFullJourney = !(state.gravity || state.heliosphere) && state.frame === 'space' && state.bookmark === 'full';
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
      const name = marker.querySelector<HTMLElement>('.body-marker__name');
      if (name && !(state.gravity || state.heliosphere)) { name.hidden = false; name.style.left = ''; name.style.top = ''; name.style.transform = ''; }
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
        || (!(state.gravity || state.heliosphere) && camera.position.distanceTo(cameraTarget) > 180 && ['mercury', 'venus', 'earth', 'mars'].includes(id));

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

    if (state.gravity || state.heliosphere) this.layoutGravityLabels(width, height);

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

  private layoutGravityLabels(width: number, height: number): void {
    const occupied: { x: number; y: number; width: number; height: number }[] = [];
    for (const [id, position] of this.markerScreenPositions) {
      const marker = this.bodyMarkers.get(id);
      const name = marker?.querySelector<HTMLElement>('.body-marker__name');
      const leader = marker?.querySelector<HTMLElement>('.body-marker__leader');
      if (!marker || !name || !leader || marker.dataset.labelMode === 'hidden') continue;
      name.hidden = position.x < 0 || position.x > width || position.y < 0 || position.y > height;
      if (name.hidden) { leader.hidden = true; continue; }
      const labelWidth = name.offsetWidth;
      const labelHeight = name.offsetHeight;
      let best: { x: number; y: number; cost: number } | null = null;
      for (const vertical of [0, -24, 24, -48, 48, -72, 72, -96, 96]) {
        for (const horizontal of [14, -labelWidth - 14, 38, -labelWidth - 38]) {
          const x = Math.min(width - labelWidth - 8, Math.max(8, position.x + horizontal));
          const y = Math.min(height - labelHeight - 8, Math.max(8, position.y + vertical - labelHeight / 2));
          const overlaps = occupied.filter((box) => x < box.x + box.width + 4 && x + labelWidth + 4 > box.x && y < box.y + box.height + 4 && y + labelHeight + 4 > box.y).length;
          const coversBody = [...this.markerScreenPositions.values()].filter((body) => body.x > x - 10 && body.x < x + labelWidth + 10 && body.y > y - 10 && body.y < y + labelHeight + 10).length;
          const cost = overlaps * 10_000 + coversBody * 5_000 + Math.hypot(x + labelWidth / 2 - position.x, y + labelHeight / 2 - position.y);
          if (!best || cost < best.cost) best = { x, y, cost };
        }
      }
      if (!best) continue;
      occupied.push({ x: best.x, y: best.y, width: labelWidth, height: labelHeight });
      name.style.left = `${22 + best.x - position.x}px`;
      name.style.top = `${22 + best.y - position.y}px`;
      name.style.transform = 'none';
      const endX = Math.max(best.x, Math.min(best.x + labelWidth, position.x)) - position.x;
      const endY = Math.max(best.y, Math.min(best.y + labelHeight, position.y)) - position.y;
      leader.hidden = false;
      leader.style.width = `${Math.hypot(endX, endY)}px`;
      leader.style.transform = `rotate(${Math.atan2(endY, endX)}rad)`;
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
