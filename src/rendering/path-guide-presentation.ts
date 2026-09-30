import * as THREE from 'three';

import type { AlongPathMotion, CameraBookmark, ViewMode } from '../experience/experience-state';
import { AU_SCALE, FULL_JOURNEY_LENGTH } from './display-scale';
import type { RenderingQualityProfile } from './quality-profile';

const GUIDE_NEAR_Z = -720;
const GUIDE_FAR_Z = 240;
const GUIDE_HALF_WIDTH = 92;
const GUIDE_TICK_SPACING_AU = 20;
const GUIDE_TICK_LABEL_COUNT = 6;
const GUIDE_RAIL_X = [-92, -46, 0, 46, 92] as const;
const REDUCED_GUIDE_STEP_MS = 450;

export interface PathGuidePresentationState {
  readonly frame: ViewMode;
  readonly bookmark: CameraBookmark;
  readonly journeyProgress: number;
  readonly motion: AlongPathMotion;
  readonly quality: RenderingQualityProfile;
}

export class PathGuidePresentation {
  readonly root = new THREE.Group();

  private readonly coordinateGuides: THREE.LineSegments;
  private readonly depthMarkers: THREE.Points;
  private readonly localPath: THREE.Line;
  private readonly fullJourneyPath: THREE.Line;
  private readonly tickLabels: readonly HTMLDivElement[];
  private readonly tickPositions: THREE.Vector3[] = [];
  private displayedDistanceAu: number | null = null;
  private previousTargetAu: number | null = null;
  private lastAnimationAt = performance.now();
  private lastReducedStepAt = 0;

  constructor(labelLayer: HTMLElement) {
    this.coordinateGuides = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0x4d8ca2, opacity: 0.22, transparent: true }),
    );
    this.coordinateGuides.frustumCulled = false;
    this.depthMarkers = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({
        color: 0x75d7e8,
        size: 0.75,
        transparent: true,
        opacity: 0.42,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    );
    this.depthMarkers.frustumCulled = false;
    this.root.add(this.coordinateGuides, this.depthMarkers);

    this.localPath = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -150),
        new THREE.Vector3(0, 0, 150),
      ]),
      new THREE.LineDashedMaterial({
        color: 0xf4b860,
        opacity: 0.62,
        transparent: true,
        dashSize: 4,
        gapSize: 3,
      }),
    );
    this.localPath.computeLineDistances();
    this.root.add(this.localPath);

    this.fullJourneyPath = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -FULL_JOURNEY_LENGTH / 2),
        new THREE.Vector3(0, 0, FULL_JOURNEY_LENGTH / 2),
      ]),
      new THREE.LineBasicMaterial({ color: 0xf4b860, opacity: 0.5, transparent: true }),
    );
    this.root.add(this.fullJourneyPath);

    this.tickLabels = Array.from({ length: GUIDE_TICK_LABEL_COUNT }, () => {
      const label = document.createElement('div');
      label.className = 'path-distance-tick';
      label.setAttribute('aria-hidden', 'true');
      label.hidden = true;
      labelLayer.append(label);
      return label;
    });
  }

  render(state: PathGuidePresentationState, nowMs: number): void {
    const isFullJourney = state.frame === 'space' && state.bookmark === 'full';
    const active = state.frame === 'space' && !isFullJourney;
    this.root.visible = state.frame === 'space';
    this.localPath.visible = active;
    this.coordinateGuides.visible = active;
    this.depthMarkers.visible = active;
    this.fullJourneyPath.visible = isFullJourney;
    this.root.position.set(0, 0, 0);

    if (!active) {
      this.displayedDistanceAu = null;
      this.previousTargetAu = null;
      this.lastAnimationAt = nowMs;
      this.tickPositions.length = 0;
      for (const label of this.tickLabels) label.hidden = true;
      return;
    }

    const targetAu = state.motion.distanceAu;
    const elapsedSeconds = Math.min(0.1, Math.max(0, (nowMs - this.lastAnimationAt) / 1_000));
    this.lastAnimationAt = nowMs;
    if (this.displayedDistanceAu === null) {
      this.displayedDistanceAu = targetAu;
    } else if (!state.motion.isPlaying && this.previousTargetAu !== targetAu) {
      if (state.journeyProgress >= 1) {
        const maximumChange = state.motion.apparentGuideAuPerSecond * elapsedSeconds;
        const remaining = targetAu - this.displayedDistanceAu;
        this.displayedDistanceAu += Math.sign(remaining) * Math.min(Math.abs(remaining), maximumChange);
      } else {
        this.displayedDistanceAu = targetAu;
      }
    } else if (state.motion.isPlaying) {
      const reducedStepDue = nowMs - this.lastReducedStepAt >= REDUCED_GUIDE_STEP_MS;
      if (state.motion.guideFlow !== 'stepped' || reducedStepDue) {
        const flowSeconds = state.motion.guideFlow === 'stepped'
          ? REDUCED_GUIDE_STEP_MS / 1_000
          : elapsedSeconds;
        const maximumChange = state.motion.apparentGuideAuPerSecond * flowSeconds;
        const remaining = targetAu - this.displayedDistanceAu;
        this.displayedDistanceAu += Math.sign(remaining) * Math.min(Math.abs(remaining), maximumChange);
        if (state.motion.guideFlow === 'stepped') this.lastReducedStepAt = nowMs;
      }
    }
    this.previousTargetAu = targetAu;
    this.rebuild(this.displayedDistanceAu, state.motion, state.quality);
  }

  projectLabels(camera: THREE.Camera, width: number, height: number, visible: boolean): void {
    for (let index = 0; index < this.tickLabels.length; index += 1) {
      const label = this.tickLabels[index];
      const position = this.tickPositions[index];
      if (!label || !position || !visible) {
        if (label) label.hidden = true;
        continue;
      }
      const projected = position.clone().project(camera);
      const behind = projected.z < -1 || projected.z > 1;
      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;
      const offscreen = x < 0 || x > width || y < 0 || y > height;
      label.hidden = behind || offscreen;
      if (!label.hidden) {
        label.style.left = `${x}px`;
        label.style.top = `${y}px`;
      }
    }
  }

  private rebuild(
    displayedDistanceAu: number,
    motion: AlongPathMotion,
    quality: RenderingQualityProfile,
  ): void {
    const linePositions: number[] = [];
    for (const x of GUIDE_RAIL_X) {
      linePositions.push(x, -10, GUIDE_NEAR_Z, x, -10, GUIDE_FAR_Z);
    }

    const firstVisibleDistanceAu = Math.max(0, displayedDistanceAu - GUIDE_FAR_Z / AU_SCALE);
    const lastVisibleDistanceAu = displayedDistanceAu - GUIDE_NEAR_Z / AU_SCALE;
    const firstTickAu = Math.ceil(firstVisibleDistanceAu / GUIDE_TICK_SPACING_AU) * GUIDE_TICK_SPACING_AU;
    this.tickPositions.length = 0;
    let labelIndex = 0;
    for (let tickAu = firstTickAu; tickAu <= lastVisibleDistanceAu; tickAu += GUIDE_TICK_SPACING_AU) {
      const z = (displayedDistanceAu - tickAu) * AU_SCALE;
      linePositions.push(-GUIDE_HALF_WIDTH, -10, z, GUIDE_HALF_WIDTH, -10, z);
      linePositions.push(-GUIDE_HALF_WIDTH, -10, z, -GUIDE_HALF_WIDTH, -3, z);
      if (labelIndex < this.tickLabels.length) {
        const label = this.tickLabels[labelIndex];
        if (label) {
          label.textContent = `${Math.round(tickAu).toLocaleString('en')} AU`;
          label.hidden = false;
          this.tickPositions.push(new THREE.Vector3(-GUIDE_HALF_WIDTH, -2, z));
        }
        labelIndex += 1;
      }
    }
    for (let index = labelIndex; index < this.tickLabels.length; index += 1) {
      const label = this.tickLabels[index];
      if (label) label.hidden = true;
    }
    this.coordinateGuides.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(linePositions, 3),
    );

    const flowSpacingFactor = motion.guideFlow === 'stabilized'
      ? 1.6
      : motion.guideFlow === 'stepped'
        ? 2.4
        : 1;
    const markerSpacingAu = quality.pathMarkerSpacingAu * flowSpacingFactor;
    const firstMarkerIndex = Math.floor(firstVisibleDistanceAu / markerSpacingAu) - 1;
    const markerPositions: number[] = [];
    for (let index = firstMarkerIndex; ; index += 1) {
      const markerDistanceAu = index * markerSpacingAu;
      const z = (displayedDistanceAu - markerDistanceAu) * AU_SCALE;
      if (z < GUIDE_NEAR_Z) break;
      if (z > GUIDE_FAR_Z) continue;
      const horizontalSeed = Math.sin(index * 12.9898 + 4.1414) * 43_758.5453;
      const verticalSeed = Math.sin(index * 78.233 + 1.732) * 12_345.6789;
      const horizontalUnit = horizontalSeed - Math.floor(horizontalSeed);
      const verticalUnit = verticalSeed - Math.floor(verticalSeed);
      const side = index % 2 === 0 ? 1 : -1;
      markerPositions.push(side * (28 + horizontalUnit * 88), -46 + verticalUnit * 86, z);
    }
    this.depthMarkers.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(markerPositions, 3),
    );
  }
}
