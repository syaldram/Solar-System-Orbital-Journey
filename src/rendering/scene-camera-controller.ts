import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import type { PlanetId } from '../astronomy/solar-system';
import type { CameraBookmark, SelectableBody, ViewMode } from '../experience/experience-state';
import { SUN_DISPLAY_RADIUS, planetDisplayRadius } from './display-scale';

const CAMERA_TWEEN_DURATION_MS = 800;

export interface SceneCameraState {
  readonly bookmark: CameraBookmark;
  readonly cameraRevision: number;
  readonly followedPlanet: PlanetId | null;
  readonly frame: ViewMode;
  readonly reducedMotion: boolean;
}

export class SceneCameraController {
  readonly controls: OrbitControls;

  private currentState: SceneCameraState | null = null;
  private currentBookmark: CameraBookmark | null = null;
  private currentFrame: ViewMode | null = null;
  private currentCameraRevision = -1;
  private followedPlanet: PlanetId | null = null;
  private lastFollowPosition: THREE.Vector3 | null = null;
  private pendingFocus: {
    readonly body: SelectableBody;
    readonly source: 'command' | 'follow';
  } | null = null;
  private cameraTween: {
    readonly start: THREE.Vector3;
    readonly end: THREE.Vector3;
    readonly startTarget: THREE.Vector3;
    readonly endTarget: THREE.Vector3;
    readonly startedAt: number;
    readonly source: 'composition' | 'command' | 'follow';
  } | null = null;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
    private readonly sun: THREE.Mesh,
    private readonly planets: ReadonlyMap<PlanetId, THREE.Mesh>,
  ) {
    this.camera.position.set(10, 24, 65);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;
    this.controls.minDistance = 0.025;
    this.controls.maxDistance = 2_500;
    this.controls.enablePan = true;
    this.controls.addEventListener('start', () => {
      this.cameraTween = null;
    });
  }

  render(state: SceneCameraState, nowMs: number): void {
    this.currentState = state;
    this.syncFollowState(state.followedPlanet);
    this.applyConstraints(state.frame);
    this.applyComposition(state, nowMs);
    this.applyPendingFocus(nowMs);
    this.updateTween(state.reducedMotion, nowMs);
    this.applyFollow(state.followedPlanet, state.frame);
    this.controls.update();
  }

  focus(body: SelectableBody): void {
    this.pendingFocus = { body, source: 'command' };
  }

  reset(): void {
    this.lastFollowPosition = null;
    this.pendingFocus = null;
    this.currentCameraRevision = -1;
  }

  private applyComposition(state: SceneCameraState, nowMs: number): void {
    if (
      state.bookmark === this.currentBookmark
      && state.frame === this.currentFrame
      && state.cameraRevision === this.currentCameraRevision
    ) return;
    const isInitialComposition = this.currentFrame === null;
    this.currentBookmark = state.bookmark;
    this.currentFrame = state.frame;
    this.currentCameraRevision = state.cameraRevision;
    let position = new THREE.Vector3(18, 28, 70);
    let target = new THREE.Vector3(0, 0, 0);
    const narrowViewport = this.camera.aspect < 0.72;
    if (state.frame === 'galaxy') {
      position = narrowViewport ? new THREE.Vector3(0, 360, 520) : new THREE.Vector3(0, 115, 155);
    } else if (state.frame === 'space' && state.bookmark === 'full') {
      position = narrowViewport ? new THREE.Vector3(0, 600, 650) : new THREE.Vector3(380, 240, 500);
    } else {
      switch (state.bookmark) {
        case 'inner':
          position = new THREE.Vector3(12, 18, 34);
          break;
        case 'outer':
          position = new THREE.Vector3(380, 400, 760);
          break;
        case 'path':
          position = new THREE.Vector3(55, 22, 100);
          break;
        case 'ecliptic':
          position = new THREE.Vector3(0, 850, 0.01);
          break;
        case 'hero':
          position = new THREE.Vector3(14, 24, 62);
          target = new THREE.Vector3(6, 0, 0);
          break;
        case 'full':
          position = narrowViewport
            ? new THREE.Vector3(0, 600, 650)
            : new THREE.Vector3(380, 240, 500);
          break;
      }
    }

    this.startMove(
      position,
      target,
      nowMs,
      state.reducedMotion || isInitialComposition,
      'composition',
    );
  }

  private applyPendingFocus(nowMs: number): void {
    if (!this.pendingFocus || !this.currentState) return;
    const isWideView = this.currentState.frame === 'galaxy'
      || (this.currentState.frame === 'space' && this.currentState.bookmark === 'full');
    if (isWideView) return;
    const { body, source } = this.pendingFocus;
    const object = body === 'sun' ? this.sun : this.planets.get(body);
    if (!object?.visible) return;
    const world = new THREE.Vector3();
    object.getWorldPosition(world);
    const radius = body === 'sun' ? SUN_DISPLAY_RADIUS : planetDisplayRadius(body);
    const distance = radius * (body === 'sun' ? 6 : 8);
    const offset = new THREE.Vector3(1, 0.55, 1).normalize().multiplyScalar(distance);
    this.startMove(world.clone().add(offset), world, nowMs, this.currentState.reducedMotion, source);
    this.pendingFocus = null;
  }

  private startMove(
    position: THREE.Vector3,
    target: THREE.Vector3,
    nowMs: number,
    reducedMotion: boolean,
    source: 'composition' | 'command' | 'follow',
  ): void {
    this.cameraTween = {
      start: this.camera.position.clone(),
      end: position,
      startTarget: this.controls.target.clone(),
      endTarget: target,
      startedAt: reducedMotion ? nowMs - CAMERA_TWEEN_DURATION_MS : nowMs,
      source,
    };
  }

  private updateTween(reducedMotion: boolean, nowMs: number): void {
    if (!this.cameraTween) return;
    const duration = reducedMotion ? 1 : CAMERA_TWEEN_DURATION_MS;
    const progress = Math.min(1, (nowMs - this.cameraTween.startedAt) / duration);
    const eased = progress < 0.5
      ? 4 * progress ** 3
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    this.camera.position.lerpVectors(this.cameraTween.start, this.cameraTween.end, eased);
    this.controls.target.lerpVectors(this.cameraTween.startTarget, this.cameraTween.endTarget, eased);
    if (progress >= 1) this.cameraTween = null;
  }

  private applyFollow(planet: PlanetId | null, frame: ViewMode): void {
    if (!planet || frame === 'galaxy') return;
    const object = this.planets.get(planet);
    if (!object?.visible) return;
    const current = new THREE.Vector3();
    object.getWorldPosition(current);
    if (this.cameraTween) {
      this.lastFollowPosition = current;
      return;
    }
    if (this.lastFollowPosition) {
      const delta = current.clone().sub(this.lastFollowPosition);
      this.camera.position.add(delta);
      this.controls.target.add(delta);
    } else {
      this.controls.target.copy(current);
    }
    this.lastFollowPosition = current;
  }

  private syncFollowState(planet: PlanetId | null): void {
    if (planet === this.followedPlanet) return;
    if (planet === null) {
      if (this.pendingFocus?.source === 'follow') this.pendingFocus = null;
      if (this.cameraTween?.source === 'follow') this.cameraTween = null;
    } else {
      this.pendingFocus = { body: planet, source: 'follow' };
    }
    this.followedPlanet = planet;
    this.lastFollowPosition = null;
  }

  private applyConstraints(frame: ViewMode): void {
    const isGalaxy = frame === 'galaxy';
    this.controls.enablePan = !isGalaxy;
    this.controls.minDistance = isGalaxy ? 100 : 0.025;
    this.controls.maxDistance = isGalaxy ? 650 : 2_500;
    this.controls.minPolarAngle = isGalaxy ? 0.45 : 0.05;
    this.controls.maxPolarAngle = isGalaxy ? 1.25 : Math.PI - 0.05;
  }
}
