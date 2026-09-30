import * as THREE from 'three';

import { PLANET_IDS, getPlanetProfile } from '../astronomy/planet-data';
import type { PlanetId, Vector3Au } from '../astronomy/solar-system';
import { eclipticToGalactic, type SystemSnapshot } from '../astronomy/reference-frames';
import type {
  AlongPathMotion,
  CameraBookmark,
  QualityPreference,
  SelectableBody,
  ViewMode,
  ViewOptions,
} from '../experience/experience-state';
import {
  AU_SCALE,
  FULL_JOURNEY_GROUP_SCALE,
  FULL_JOURNEY_LENGTH,
  planetDisplayRadius,
} from './display-scale';
import {
  createAtmosphereMaterial,
  createEarthCloudTexture,
  createRingTexture,
  createUranusTexture,
  seededRandom,
} from './procedural-materials';
import { GalaxyPresentation } from './galaxy-presentation';
import { PathGuidePresentation } from './path-guide-presentation';
import { SceneLabels } from './scene-labels';
import { SceneCameraController } from './scene-camera-controller';
import { AdaptiveQualityMonitor } from './adaptive-quality-monitor';
import { getRenderingQualityProfile } from './quality-profile';
import { SolarPresentation } from './solar-presentation';

export interface SceneState {
  readonly snapshot: SystemSnapshot;
  readonly frame: ViewMode;
  readonly bookmark: CameraBookmark;
  readonly cameraRevision: number;
  readonly selectedBody: SelectableBody | null;
  readonly followedPlanet: PlanetId | null;
  readonly viewOptions: ViewOptions;
  readonly quality: QualityPreference;
  readonly reducedMotion: boolean;
  readonly rotations: Readonly<Record<PlanetId, number>>;
  readonly rotationStabilized: boolean;
  readonly trailRevision: number;
  readonly journeyProgress: number;
  readonly pathMotion: AlongPathMotion;
  readonly galacticProgress: number;
}

export interface OrbitalSceneOptions {
  readonly canvas: HTMLCanvasElement;
  readonly labelLayer: HTMLElement;
  readonly assetBase: string;
  readonly onSelect: (body: SelectableBody) => void;
  readonly onQualityAdapted: (quality: Exclude<QualityPreference, 'auto'>) => void;
}

interface RingPresentationMaterial {
  readonly material: THREE.MeshStandardMaterial;
  readonly fullOpacity: number;
}

const MAX_TRAIL_POINTS = 56;

function toSceneVector(position: Vector3Au, scale = AU_SCALE): THREE.Vector3 {
  return new THREE.Vector3(position.x * scale, position.z * scale, position.y * scale);
}


export class OrbitalScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(43, 1, 0.002, 5_000);
  private readonly cameraController: SceneCameraController;
  private readonly solarGroup = new THREE.Group();
  private readonly galaxyPresentation: GalaxyPresentation;
  private readonly pathGuidePresentation: PathGuidePresentation;
  private readonly planetMeshes = new Map<PlanetId, THREE.Mesh>();
  private readonly planetTiltGroups = new Map<PlanetId, THREE.Group>();
  private readonly orbitLines = new Map<PlanetId, THREE.Line>();
  private readonly spaceOrbitLines = new Map<PlanetId, THREE.Line>();
  private readonly trailLines = new Map<PlanetId, THREE.Line>();
  private readonly trailHistory = new Map<PlanetId, Vector3Au[]>();
  private readonly sceneLabels: SceneLabels;
  private readonly atmosphereMeshes = new Map<PlanetId, THREE.Mesh>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly solarPresentation: SolarPresentation;
  private readonly planeOverlay: THREE.Mesh;
  private readonly starField: THREE.Points;
  private readonly earthClouds: THREE.Mesh | null;
  private readonly ringMaterials: readonly RingPresentationMaterial[];
  private readonly onSelect: (body: SelectableBody) => void;
  private readonly onQualityAdapted: (quality: Exclude<QualityPreference, 'auto'>) => void;
  private readonly qualityMonitor = new AdaptiveQualityMonitor();
  private readonly assetBase: string;
  private currentState: SceneState | null = null;
  private lastTrailRevision = -1;
  private lastTrailSampleMs = 0;
  private selectedOutline: THREE.Mesh | null = null;
  private outlinedBody: PlanetId | null = null;
  private appliedQualityKey: string | null = null;

  constructor(options: OrbitalSceneOptions) {
    this.onSelect = options.onSelect;
    this.onQualityAdapted = options.onQualityAdapted;
    this.assetBase = options.assetBase;

    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setClearColor(0x02040a, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.galaxyPresentation = new GalaxyPresentation();
    this.pathGuidePresentation = new PathGuidePresentation(options.labelLayer);
    this.scene.add(this.solarGroup, this.pathGuidePresentation.root, this.galaxyPresentation.root);
    this.starField = this.createStarField();
    this.scene.add(this.starField);

    const ambient = new THREE.AmbientLight(0x53617a, 0.16);
    this.scene.add(ambient);

    this.solarPresentation = new SolarPresentation(this.solarGroup);

    for (const id of PLANET_IDS) this.createPlanet(id);
    this.cameraController = new SceneCameraController(
      this.camera,
      options.canvas,
      this.solarPresentation.mesh,
      this.planetMeshes,
    );
    this.ringMaterials = this.addRings();
    this.earthClouds = this.addEarthClouds();

    this.planeOverlay = new THREE.Mesh(
      new THREE.RingGeometry(3.5, 315, 160),
      new THREE.MeshBasicMaterial({
        color: 0x67b9c9,
        opacity: 0.035,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.planeOverlay.rotation.x = -Math.PI / 2;
    this.solarGroup.add(this.planeOverlay);

    this.sceneLabels = new SceneLabels(options.labelLayer, {
      sun: this.solarPresentation.mesh,
      solarGroup: this.solarGroup,
      galaxyRoot: this.galaxyPresentation.root,
      galaxySun: this.galaxyPresentation.sunMarker,
      planets: this.planetMeshes,
    }, options.onSelect);
    options.canvas.addEventListener('pointermove', (event) => this.handlePointerMove(event));
    options.canvas.addEventListener('pointerleave', () => this.sceneLabels.clearHover());
    options.canvas.addEventListener('pointerup', (event) => this.handlePointer(event));
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.loadTextures();
  }

  setOrbitPaths(paths: Readonly<Record<PlanetId, readonly Vector3Au[]>>): void {
    for (const id of PLANET_IDS) {
      const existing = this.orbitLines.get(id);
      existing?.removeFromParent();
      existing?.geometry.dispose();
      const points = paths[id].map((position) => toSceneVector(position));
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: getPlanetProfile(id).color, opacity: 0.28, transparent: true }),
      );
      line.userData.planetId = id;
      this.orbitLines.set(id, line);
      this.solarGroup.add(line);

      const existingSpace = this.spaceOrbitLines.get(id);
      existingSpace?.removeFromParent();
      existingSpace?.geometry.dispose();
      const spaceLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(
          paths[id].map((position) => toSceneVector(eclipticToGalactic(position))),
        ),
        new THREE.LineBasicMaterial({ color: getPlanetProfile(id).color, opacity: 0.16, transparent: true }),
      );
      spaceLine.userData.planetId = id;
      this.spaceOrbitLines.set(id, spaceLine);
      this.solarGroup.add(spaceLine);
    }
  }

  render(state: SceneState, nowMs: number): void {
    this.currentState = state;
    this.applyView(state);
    this.cameraController.render(state, nowMs);
    this.pathGuidePresentation.render({
      frame: state.frame,
      bookmark: state.bookmark,
      journeyProgress: state.journeyProgress,
      motion: state.pathMotion,
      quality: getRenderingQualityProfile(state.quality),
    }, nowMs);
    this.solarPresentation.render({
      nowMs,
      reducedMotion: state.reducedMotion,
      visible: state.frame !== 'galaxy',
      quality: getRenderingQualityProfile(state.quality),
    });
    this.galaxyPresentation.render({
      nowMs,
      progress: state.galacticProgress,
      reducedMotion: state.reducedMotion,
      visible: state.frame === 'galaxy',
      quality: getRenderingQualityProfile(state.quality),
    });
    this.updateLabels(state);
    this.renderer.render(this.scene, this.camera);
    const adaptedQuality = this.qualityMonitor.sample(state.quality, nowMs);
    if (adaptedQuality) this.onQualityAdapted(adaptedQuality);
  }

  focus(body: SelectableBody): void {
    this.cameraController.focus(body);
  }

  resetCamera(): void {
    this.cameraController.reset();
  }

  resize(): void {
    const width = this.renderer.domElement.clientWidth || window.innerWidth;
    const height = this.renderer.domElement.clientHeight || window.innerHeight;
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private createPlanet(id: PlanetId): void {
    const profile = getPlanetProfile(id);
    const material = new THREE.MeshStandardMaterial({
      color: profile.color,
      roughness: id === 'earth' ? 0.68 : 0.8,
      metalness: 0,
    });
    const radius = planetDisplayRadius(id);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 30), material);
    mesh.name = id;
    mesh.userData.planetId = id;
    const tilt = new THREE.Group();
    tilt.rotation.z = THREE.MathUtils.degToRad(profile.obliquityDegrees);
    tilt.add(mesh);
    this.solarGroup.add(tilt);
    this.planetMeshes.set(id, mesh);
    this.planetTiltGroups.set(id, tilt);

    const atmosphereStyles: Partial<Record<PlanetId, readonly [number, number]>> = {
      venus: [0xffd9a5, 0.36],
      earth: [0x6ab8ff, 0.62],
      mars: [0xef8659, 0.13],
      jupiter: [0xe2bb8c, 0.14],
      saturn: [0xe8d7ad, 0.16],
      uranus: [0x8feaf0, 0.25],
      neptune: [0x5e8fff, 0.32],
    };
    const atmosphereStyle = atmosphereStyles[id];
    if (atmosphereStyle) {
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.07, 40, 24),
        createAtmosphereMaterial(atmosphereStyle[0], atmosphereStyle[1]),
      );
      mesh.add(atmosphere);
      this.atmosphereMeshes.set(id, atmosphere);
    }

    const trail = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: profile.color, opacity: 0.56, transparent: true }),
    );
    this.trailLines.set(id, trail);
    this.trailHistory.set(id, []);
    this.solarGroup.add(trail);
  }

  private addRings(): readonly RingPresentationMaterial[] {
    const materials: RingPresentationMaterial[] = [];
    const saturn = this.planetMeshes.get('saturn');
    if (saturn) {
      const radius = planetDisplayRadius('saturn');
      const material = new THREE.MeshStandardMaterial({
        map: createRingTexture('saturn'),
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.86,
        roughness: 0.92,
        metalness: 0,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius * 1.22, radius * 2.35, 128),
        material,
      );
      ring.rotation.x = Math.PI / 2;
      saturn.add(ring);
      materials.push({ material, fullOpacity: 0.86 });
    }
    const uranus = this.planetMeshes.get('uranus');
    if (uranus) {
      const radius = planetDisplayRadius('uranus');
      const material = new THREE.MeshStandardMaterial({
        map: createRingTexture('uranus'),
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
        roughness: 1,
        metalness: 0,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius * 1.55, radius * 2.05, 96),
        material,
      );
      ring.rotation.x = Math.PI / 2;
      uranus.add(ring);
      materials.push({ material, fullOpacity: 0.5 });
    }
    return materials;
  }

  private addEarthClouds(): THREE.Mesh | null {
    const earth = this.planetMeshes.get('earth');
    if (!earth) return null;
    const radius = planetDisplayRadius('earth');
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.018, 48, 30),
      new THREE.MeshStandardMaterial({
        map: createEarthCloudTexture(),
        transparent: true,
        opacity: 0.72,
        roughness: 0.92,
        metalness: 0,
        depthWrite: false,
      }),
    );
    earth.add(clouds);
    return clouds;
  }

  private createStarField(): THREE.Points {
    const random = seededRandom(4_204_206);
    const positions = new Float32Array(7_500 * 3);
    const colors = new Float32Array(7_500 * 3);
    for (let index = 0; index < 7_500; index += 1) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      const radius = 850 + random() * 900;
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.cos(phi);
      positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      const warmth = random();
      colors[index * 3] = 0.65 + warmth * 0.35;
      colors[index * 3 + 1] = 0.72 + warmth * 0.18;
      colors[index * 3 + 2] = 0.88 + (1 - warmth) * 0.12;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: 1.2, vertexColors: true, transparent: true, opacity: 0.72, sizeAttenuation: true, depthWrite: false });
    return new THREE.Points(geometry, material);
  }

  private loadTextures(): void {
    const loader = new THREE.TextureLoader();
    const paths: Partial<Record<PlanetId, string>> = {
      mercury: 'mercury.jpg',
      venus: 'venus.jpg',
      earth: 'earth.jpg',
      mars: 'mars.jpg',
      jupiter: 'jupiter.jpg',
      saturn: 'saturn.jpg',
      neptune: 'neptune.jpg',
    };

    const load = (id: PlanetId, path: string): void => {
      loader.load(`${this.assetBase}assets/textures/${path}`, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        const mesh = this.planetMeshes.get(id);
        if (mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.map = texture;
          mesh.material.color.setHex(0xffffff);
          mesh.material.needsUpdate = true;
        }
      });
    };

    for (const id of ['mercury', 'venus', 'earth', 'mars'] as const) {
      const path = paths[id];
      if (path) load(id, path);
    }

    const loadOuter = (): void => {
      for (const id of ['jupiter', 'saturn', 'neptune'] as const) {
        const path = paths[id];
        if (path) load(id, path);
      }
      const uranus = this.planetMeshes.get('uranus');
      if (uranus && uranus.material instanceof THREE.MeshStandardMaterial) {
        uranus.material.map = createUranusTexture();
        uranus.material.color.setHex(0xffffff);
        uranus.material.needsUpdate = true;
      }
    };
    const scheduleIdle = window.requestIdleCallback?.bind(window);
    if (scheduleIdle) scheduleIdle(loadOuter, { timeout: 1_500 });
    else globalThis.setTimeout(loadOuter, 500);
  }

  private applyView(state: SceneState): void {
    const isGalaxy = state.frame === 'galaxy';
    const isFullJourney = state.frame === 'space' && state.bookmark === 'full';
    this.solarGroup.visible = !isGalaxy;
    this.planeOverlay.visible = state.viewOptions.planeOverlays && !isFullJourney;

    const positions = new Map(state.snapshot.planets.map(({ id, position }) => [id, position]));
    const sunPosition = state.snapshot.sun;
    for (const id of PLANET_IDS) {
      const mesh = this.planetMeshes.get(id);
      const tilt = this.planetTiltGroups.get(id);
      const absolute = positions.get(id);
      if (!mesh || !tilt || !absolute) continue;
      const relative = state.frame === 'space'
        ? { x: absolute.x - sunPosition.x, y: absolute.y - sunPosition.y, z: absolute.z - sunPosition.z }
        : absolute;
      tilt.position.copy(toSceneVector(relative));
      mesh.rotation.y = state.rotationStabilized ? performance.now() * 0.00008 : state.rotations[id];
      mesh.visible = !isGalaxy;
    }

    if (isFullJourney) {
      const journeyPosition = -FULL_JOURNEY_LENGTH / 2 + state.journeyProgress * FULL_JOURNEY_LENGTH;
      this.solarGroup.scale.setScalar(FULL_JOURNEY_GROUP_SCALE);
      this.solarGroup.position.set(0, 0, journeyPosition);
    } else if (state.frame === 'space') {
      this.solarGroup.scale.setScalar(1);
      this.solarGroup.position.set(0, 0, 0);
    } else {
      this.solarGroup.scale.setScalar(1);
      this.solarGroup.position.set(0, 0, 0);
    }

    for (const line of this.orbitLines.values()) line.visible = state.viewOptions.orbitPaths && state.frame === 'sun';
    for (const line of this.spaceOrbitLines.values()) line.visible = state.viewOptions.orbitPaths && isFullJourney;
    this.updateTrails(state, positions, sunPosition);
    this.updateSelection(state.selectedBody);
    this.applyQuality(state.quality, state.frame);
  }

  private updateTrails(state: SceneState, positions: Map<PlanetId, Vector3Au>, sun: Vector3Au): void {
    if (state.trailRevision !== this.lastTrailRevision) {
      for (const history of this.trailHistory.values()) history.length = 0;
      this.lastTrailRevision = state.trailRevision;
    }

    const now = performance.now();
    if (state.viewOptions.trails && !state.reducedMotion && now - this.lastTrailSampleMs > 90) {
      for (const id of PLANET_IDS) {
        const position = positions.get(id);
        if (!position) continue;
        const history = this.trailHistory.get(id);
        history?.push({ ...position });
        if (history && history.length > MAX_TRAIL_POINTS) history.shift();
      }
      this.lastTrailSampleMs = now;
    }

    for (const id of PLANET_IDS) {
      const line = this.trailLines.get(id);
      const history = this.trailHistory.get(id) ?? [];
      if (!line) continue;
      const isFullJourney = state.frame === 'space' && state.bookmark === 'full';
      line.visible = state.viewOptions.trails && !state.reducedMotion && state.frame !== 'galaxy' && !isFullJourney;
      if (!line.visible) continue;
      const points = history.map((position) => {
        if (state.frame !== 'space') return toSceneVector(position);
        return toSceneVector({ x: position.x - sun.x, y: position.y - sun.y, z: position.z - sun.z });
      });
      line.geometry.dispose();
      line.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }
  }

  private updateSelection(selected: SelectableBody | null): void {
    const nextOutlinedBody = selected && selected !== 'sun' && this.currentState?.frame !== 'galaxy'
      ? selected
      : null;
    if (nextOutlinedBody === this.outlinedBody) return;
    this.selectedOutline?.removeFromParent();
    this.selectedOutline?.geometry.dispose();
    this.selectedOutline = null;
    this.outlinedBody = nextOutlinedBody;
    if (!nextOutlinedBody) return;
    const mesh = this.planetMeshes.get(nextOutlinedBody);
    if (!mesh || !mesh.visible) return;
    const outline = new THREE.Mesh(
      new THREE.RingGeometry(planetDisplayRadius(nextOutlinedBody) * 1.45, planetDisplayRadius(nextOutlinedBody) * 1.58, 48),
      new THREE.MeshBasicMaterial({ color: 0xf4b860, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthTest: false }),
    );
    outline.rotation.x = Math.PI / 2;
    mesh.add(outline);
    this.selectedOutline = outline;
  }

  private updateLabels(state: SceneState): void {
    const width = this.renderer.domElement.clientWidth;
    const height = this.renderer.domElement.clientHeight;
    this.sceneLabels.render(state, this.camera, this.cameraController.controls.target, width, height);
    this.pathGuidePresentation.projectLabels(
      this.camera,
      width,
      height,
      state.frame === 'space' && state.bookmark === 'path',
    );
  }

  private handlePointerMove(event: PointerEvent): void {
    const bounds = this.renderer.domElement.getBoundingClientRect();
    this.sceneLabels.updateHover(event.clientX, event.clientY, bounds);
  }

  private handlePointer(event: PointerEvent): void {
    if (!this.currentState) return;
    const bounds = this.renderer.domElement.getBoundingClientRect();
    const markerHit = this.sceneLabels.hitTest(event.clientX, event.clientY, bounds);
    if (markerHit) {
      this.onSelect(markerHit);
      return;
    }
    if (this.currentState.frame === 'galaxy') return;
    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets: THREE.Object3D[] = [this.solarPresentation.mesh, ...this.planetMeshes.values()];
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    if (!hit) return;
    const id = hit.object.userData.planetId as PlanetId | undefined;
    this.onSelect(id ?? 'sun');
  }

  private applyQuality(preference: QualityPreference, frame: ViewMode): void {
    const quality = getRenderingQualityProfile(preference);
    const qualityKey = `${preference}:${frame}:${window.devicePixelRatio}`;
    if (qualityKey === this.appliedQualityKey) return;
    this.appliedQualityKey = qualityKey;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatioCap));
    this.starField.geometry.setDrawRange(
      0,
      frame === 'galaxy' ? quality.galaxyForegroundStarCount : quality.localStarCount,
    );
    for (const atmosphere of this.atmosphereMeshes.values()) atmosphere.visible = quality.showAtmospheres;
    if (this.earthClouds) this.earthClouds.visible = quality.showEarthClouds;
    for (const ring of this.ringMaterials) {
      ring.material.opacity = ring.fullOpacity * quality.ringOpacityFactor;
    }
  }

}
