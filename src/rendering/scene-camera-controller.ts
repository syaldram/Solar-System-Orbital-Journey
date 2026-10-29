import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import type { PlanetId } from '../astronomy/solar-system';
import type { CameraBookmark, PresentationHandoff, SelectableBody, ViewMode } from '../experience/experience-state';
import { HELIOPAUSE_RADIUS } from './heliosphere-mapping';
import { SUN_DISPLAY_RADIUS, planetDisplayRadius } from './display-scale';

const CAMERA_TWEEN_DURATION_MS = 800;

export interface SceneCameraState {
  readonly gravity?: boolean;
  readonly heliosphere?: boolean;
  readonly bookmark: CameraBookmark;
  readonly cameraRevision: number;
  readonly followedPlanet: PlanetId | null;
  readonly frame: ViewMode;
  readonly reducedMotion: boolean;
}

export type CameraNavigation = 'orbit-left' | 'orbit-right' | 'orbit-up' | 'orbit-down' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down' | 'zoom-in' | 'zoom-out';

export class SceneCameraController {
  readonly controls: OrbitControls;

  private returnPose: { position: THREE.Vector3; target: THREE.Vector3; sessionId: number } | null = null;
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
    if (state.heliosphere) this.preventBodyClipping();
  }

  handlePresentationHandoff(handoff: PresentationHandoff, state: SceneCameraState, nowMs: number): void {
    if (handoff.kind === 'enter' ? this.returnPose !== null : this.returnPose?.sessionId !== handoff.sessionId) return;

    // Preserve the visible pose before draining OrbitControls' private damping deltas.
    const position = this.camera.position.clone();
    const target = this.controls.target.clone();
    const damping = this.controls.enableDamping;
    this.controls.enableDamping = false;
    this.controls.update();
    this.camera.position.copy(position);
    this.controls.target.copy(target);
    this.controls.update();
    this.controls.enableDamping = damping;
    this.pendingFocus = null;
    this.cameraTween = null;
    this.lastFollowPosition = null;
    this.followedPlanet = null;
    this.currentState = state;
    this.applyConstraints(state.frame);

    if (handoff.kind === 'enter') {
      this.returnPose = { position, target, sessionId: handoff.sessionId };
    } else if (handoff.kind === 'back' && this.returnPose) {
      this.camera.position.copy(this.returnPose.position);
      this.controls.target.copy(this.returnPose.target);
      // A later render must not compose over the restored arbitrary camera pose.
      this.currentBookmark = state.bookmark;
      this.currentFrame = state.frame;
      this.currentCameraRevision = state.cameraRevision;
    }
    if (handoff.kind !== 'back') {
      this.currentCameraRevision = -1;
      this.applyComposition(state, nowMs);
      this.updateTween(state.reducedMotion, nowMs);
    }
    if (handoff.kind !== 'enter') this.returnPose = null;
    this.controls.update();
  }

  navigate(command: CameraNavigation): void {
    this.cameraTween = null;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const distance = offset.length();
    if (command.startsWith('orbit-')) {
      const spherical = new THREE.Spherical().setFromVector3(offset);
      if (command === 'orbit-left') spherical.theta -= 0.15;
      if (command === 'orbit-right') spherical.theta += 0.15;
      if (command === 'orbit-up') spherical.phi -= 0.15;
      if (command === 'orbit-down') spherical.phi += 0.15;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi, this.controls.minPolarAngle, this.controls.maxPolarAngle);
      this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    } else if (command.startsWith('zoom-')) {
      offset.setLength(THREE.MathUtils.clamp(distance * (command === 'zoom-in' ? 0.8 : 1.25), this.controls.minDistance, this.controls.maxDistance));
      this.camera.position.copy(this.controls.target).add(offset);
    } else {
      this.camera.updateMatrixWorld();
      const direction = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, command === 'pan-left' || command === 'pan-right' ? 0 : 1);
      direction.multiplyScalar(distance * 0.08 * (command === 'pan-left' || command === 'pan-down' ? -1 : 1));
      this.camera.position.add(direction);
      this.controls.target.add(direction);
    }
    this.controls.update();
    if (this.currentState?.heliosphere) this.preventBodyClipping();
  }

  private preventBodyClipping(): void {
    for (const [body, object] of [['sun', this.sun], ...this.planets.entries()] as const) {
      if (!object.visible) continue;
      const center = object.getWorldPosition(new THREE.Vector3());
      const scale = object.getWorldScale(new THREE.Vector3());
      const radius = (body === 'sun' ? SUN_DISPLAY_RADIUS : planetDisplayRadius(body)) * Math.max(scale.x, scale.y, scale.z) * (body === 'saturn' ? 2.35 : body === 'uranus' ? 2.05 : 1.25) + this.camera.near;
      const offset = this.camera.position.clone().sub(center);
      if (offset.length() < radius) {
        if (offset.lengthSq() === 0) offset.set(0, 1, 0);
        this.camera.position.copy(center).add(offset.setLength(radius));
      }
    }
    this.camera.lookAt(this.controls.target);
  }

  focus(body: SelectableBody): void {
    this.pendingFocus = { body, source: 'command' };
  }

  reset(): void {
    if (this.currentState?.heliosphere) {
      const damping = this.controls.enableDamping;
      this.controls.enableDamping = false;
      this.controls.update();
      this.controls.enableDamping = damping;
    }
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
    if (state.heliosphere) {
      position = narrowViewport ? new THREE.Vector3(-60, 530, 950) : new THREE.Vector3(70, 220, 440);
      target = new THREE.Vector3(-65, -10, 0);
      position = this.fitCutaway(position, target);
    } else if (state.gravity) {
      position = narrowViewport ? new THREE.Vector3(0, 300, 600) : new THREE.Vector3(115, 135, 225);
      target = new THREE.Vector3(0, -7, 0);
    } else if (state.frame === 'galaxy') {
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
      state.reducedMotion || isInitialComposition || Boolean(state.gravity || state.heliosphere),
      'composition',
    );
  }

  private fitCutaway(position: THREE.Vector3, target: THREE.Vector3): THREE.Vector3 {
    // Fit the outer shell's conservative bounds in camera space with a small margin.
    const direction = position.clone().sub(target).normalize();
    const orientation = new THREE.Matrix4().lookAt(position, target, this.camera.up);
    const right = new THREE.Vector3().setFromMatrixColumn(orientation, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(orientation, 1);
    const tanVertical = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * 0.94;
    const tanHorizontal = tanVertical * this.camera.aspect;
    let distance = position.distanceTo(target);
    for (const x of [-HELIOPAUSE_RADIUS * 2.5, HELIOPAUSE_RADIUS]) {
      for (const y of [-HELIOPAUSE_RADIUS * 0.85, 0]) {
        for (const z of [-HELIOPAUSE_RADIUS, HELIOPAUSE_RADIUS]) {
          const point = new THREE.Vector3(x, y, z).sub(target);
          distance = Math.max(distance, point.dot(direction) + Math.max(Math.abs(point.dot(right)) / tanHorizontal, Math.abs(point.dot(up)) / tanVertical));
        }
      }
    }
    return target.clone().addScaledVector(direction, distance);
  }

  private applyPendingFocus(nowMs: number): void {
    if (!this.pendingFocus || !this.currentState) return;
    const isWideView = !(this.currentState.gravity || this.currentState.heliosphere) && (this.currentState.frame === 'galaxy'
      || (this.currentState.frame === 'space' && this.currentState.bookmark === 'full'));
    if (isWideView) return;
    const { body, source } = this.pendingFocus;
    const object = body === 'sun' ? this.sun : this.planets.get(body);
    if (!object?.visible) return;
    const world = new THREE.Vector3();
    object.getWorldPosition(world);
    const scale = object.getWorldScale(new THREE.Vector3());
    const radius = (body === 'sun' ? SUN_DISPLAY_RADIUS : planetDisplayRadius(body)) * Math.max(scale.x, scale.y, scale.z);
    const distance = radius * (body === 'sun' ? 6 : 8);
    const offset = new THREE.Vector3(1, this.currentState.gravity ? 1.25 : 0.55, 1).normalize().multiplyScalar(distance);
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
