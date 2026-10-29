import { defaultHeliosphereLayers, type HeliosphereLayers, type Selection } from '../experience/experience-state';
import * as THREE from 'three';

import { PLANET_IDS, getPlanetProfile } from '../astronomy/planet-data';
import type { PlanetId, Vector3Au } from '../astronomy/solar-system';
import { eclipticToGalactic, type SystemSnapshot } from '../astronomy/reference-frames';
import type {
  AlongPathMotion,
  CameraBookmark,
  ExperienceState,
  PresentationHandoff,
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
  SUN_DISPLAY_RADIUS,
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
import { GravityPresentation } from './gravity-presentation';
import { compressGravityPosition, gravityCenters, gravityBodyPosition, gravityBodyRadius, gravitySurfaceHeight, GRAVITY_SUN_RADIUS } from './gravity-mapping';
import { HeliospherePresentation } from './heliosphere-presentation';
import { HeliosphereBackground } from './heliosphere-background';
import { mapHeliospherePosition, heliosphereBodyRadius, HELIOSPHERE_SUN_RADIUS } from './heliosphere-mapping';
import type { CameraNavigation } from './scene-camera-controller';
import { SolarPresentation } from './solar-presentation';

export interface SceneState {
  readonly gravity: boolean;
  readonly heliosphere: boolean;
  readonly heliospherePhaseSeconds?: number;
  readonly heliosphereLayers?: HeliosphereLayers;
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
  readonly onSelect: (selection: Exclude<Selection, { kind: 'none' }>) => void;
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
  private readonly heliosphereBackground = new HeliosphereBackground();
  private readonly heliospherePresentation = new HeliospherePresentation();
  private readonly heliosphereOrbitLines = new Map<PlanetId, THREE.Line>();
  private readonly heliosphereSpinOffsets = new Map<PlanetId, number>();
  private heliosphereSpinActive = false;
  private readonly gravityPresentation = new GravityPresentation();
  private readonly gravityOrbitLines = new Map<PlanetId, THREE.Line>();
  private readonly gravityOrbitPoints = new Map<PlanetId, readonly { readonly x: number; readonly z: number }[]>();
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
  private readonly onSelect: (selection: Exclude<Selection, { kind: 'none' }>) => void;
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
    this.scene.add(this.heliosphereBackground.root, this.heliospherePresentation.root, this.gravityPresentation.root, this.solarGroup, this.pathGuidePresentation.root, this.galaxyPresentation.root);
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
    }, (body) => this.onSelect({ kind: 'body', body }));
    const gesture = new SceneClickGesture();
    options.canvas.addEventListener('pointerdown', (event) => gesture.down(event));
    options.canvas.addEventListener('pointermove', (event) => { gesture.move(event); this.handlePointerMove(event); });
    options.canvas.addEventListener('pointercancel', (event) => gesture.cancel(event.pointerId));
    options.canvas.addEventListener('pointerleave', () => this.sceneLabels.clearHover());
    options.canvas.addEventListener('pointerup', (event) => { if (gesture.up(event)) this.handlePointer(event); });
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.loadTextures();
  }

  setOrbitPaths(paths: Readonly<Record<PlanetId, readonly Vector3Au[]>>): void {
    for (const id of PLANET_IDS) {
      const mappedPoints = paths[id].map(mapHeliospherePosition);
      const oldHeliosphere = this.heliosphereOrbitLines.get(id);
      oldHeliosphere?.geometry.dispose();
      (oldHeliosphere?.material as THREE.Material | undefined)?.dispose();
      oldHeliosphere?.removeFromParent();
      const mappedLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(mappedPoints.map(({ x, y, z }) => new THREE.Vector3(x, y, z))), new THREE.LineBasicMaterial({ color: getPlanetProfile(id).color, opacity: 0.45, transparent: true }));
      this.heliosphereOrbitLines.set(id, mappedLine);
      this.solarGroup.add(mappedLine);
      const gravityPoints = paths[id].map(compressGravityPosition);
      this.gravityOrbitPoints.set(id, gravityPoints);
      const existingGravity = this.gravityOrbitLines.get(id);
      existingGravity?.geometry.dispose();
      (existingGravity?.material as THREE.Material | undefined)?.dispose();
      existingGravity?.removeFromParent();
      const gravityLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(gravityPoints.map(({ x, z }) => new THREE.Vector3(x, 0, z))),
        new THREE.LineBasicMaterial({ color: getPlanetProfile(id).color, opacity: 0.5, transparent: true }),
      );
      gravityLine.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 190);
      this.gravityOrbitLines.set(id, gravityLine);
      this.solarGroup.add(gravityLine);
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
    if (!state.heliosphere || !state.rotationStabilized) this.heliosphereSpinActive = false;
    this.applyView(state);
    this.heliosphereSpinActive = state.heliosphere && state.rotationStabilized;
    if (state.heliosphere) this.heliospherePresentation.render(state.heliospherePhaseSeconds ?? 0);
    this.cameraController.render(state, nowMs);
    this.heliosphereBackground.placeAroundCamera(this.camera.position);
    this.pathGuidePresentation.render({
      frame: state.gravity || state.heliosphere ? 'sun' : state.frame,
      bookmark: state.gravity || state.heliosphere ? 'inner' : state.bookmark,
      journeyProgress: state.journeyProgress,
      motion: state.pathMotion,
      quality: getRenderingQualityProfile(state.quality),
    }, nowMs);
    this.solarPresentation.render({
      nowMs,
      phaseSeconds: state.heliosphere ? state.heliospherePhaseSeconds ?? 0 : undefined,
      frozen: state.heliosphere && (!state.pathMotion.isPlaying || state.reducedMotion),
      reducedMotion: state.heliosphere ? false : state.reducedMotion,
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
    // OrbitControls changes the camera pose before the renderer refreshes its matrices.
    this.camera.updateMatrixWorld();
    this.updateLabels(state);
    this.renderer.render(this.scene, this.camera);
    const adaptedQuality = this.qualityMonitor.sample(state.quality, nowMs);
    if (adaptedQuality) this.onQualityAdapted(adaptedQuality);
  }

  handlePresentationHandoff(handoff: PresentationHandoff, state: ExperienceState, nowMs: number): void {
    if (handoff.presentation === 'heliosphere') {
      this.heliosphereSpinActive = false;
      // A frozen baseline sample clears the prior explicit-phase offset even
      // when Back and re-entry happen before a scientific frame can render.
      this.solarPresentation.render({ nowMs, frozen: true, reducedMotion: false,
        visible: state.frame !== 'galaxy', quality: getRenderingQualityProfile(state.quality) });
    }
    this.cameraController.handlePresentationHandoff(handoff, {
      gravity: state.presentation.kind === 'gravity',
      heliosphere: state.presentation.kind === 'heliosphere',
      frame: state.frame,
      bookmark: state.cameraBookmark,
      cameraRevision: state.cameraRevision,
      followedPlanet: state.followedPlanet,
      reducedMotion: state.reducedMotion,
    }, nowMs);
  }

  navigateCamera(command: CameraNavigation): void { this.cameraController.navigate(command); }

  focus(body: SelectableBody): void {
    this.cameraController.focus(body);
  }

  resetCamera(): void {
    this.cameraController.reset();
  }

  dispose(): void {
    this.heliosphereBackground.dispose();
    this.gravityPresentation.dispose();
    this.heliospherePresentation.dispose();
    this.cameraController.controls.dispose();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      }
    });
    this.renderer.dispose();
  }

  resize(): void {
    const width = this.renderer.domElement.clientWidth || window.innerWidth;
    const height = this.renderer.domElement.clientHeight || window.innerHeight;
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    if (this.currentState) this.applyQuality(this.currentState.quality, this.currentState.frame);
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
    const isFullJourney = !(state.gravity || state.heliosphere) && state.frame === 'space' && state.bookmark === 'full';
    this.heliospherePresentation.root.visible = state.heliosphere;
    this.heliosphereBackground.root.visible = state.heliosphere;
    this.heliospherePresentation.setLayers(state.heliosphereLayers ?? defaultHeliosphereLayers());
    this.gravityPresentation.root.visible = state.gravity;
    this.starField.visible = !(state.gravity || state.heliosphere);
    const centers = state.gravity ? gravityCenters(state.snapshot) : [];
    if (state.gravity) this.gravityPresentation.render(centers, getRenderingQualityProfile(state.quality));
    this.solarPresentation.root.position.set(0, state.gravity ? gravitySurfaceHeight(0, 0, centers) + GRAVITY_SUN_RADIUS * 0.75 : 0, 0);
    this.solarPresentation.root.scale.setScalar(state.heliosphere ? HELIOSPHERE_SUN_RADIUS / SUN_DISPLAY_RADIUS : state.gravity ? GRAVITY_SUN_RADIUS / SUN_DISPLAY_RADIUS : 1);
    this.solarGroup.visible = !isGalaxy;
    this.planeOverlay.visible = state.viewOptions.planeOverlays && !isFullJourney && !(state.gravity || state.heliosphere);

    const positions = new Map(state.snapshot.planets.map(({ id, position }) => [id, position]));
    const sunPosition = state.snapshot.sun;
    for (const id of PLANET_IDS) {
      const mesh = this.planetMeshes.get(id);
      const tilt = this.planetTiltGroups.get(id);
      const absolute = positions.get(id);
      if (!mesh || !tilt || !absolute) continue;
      const relative = state.frame === 'space' && !state.heliosphere && !state.gravity
        ? { x: absolute.x - sunPosition.x, y: absolute.y - sunPosition.y, z: absolute.z - sunPosition.z }
        : absolute;
      const center = centers.find((entry) => entry.id === id);
      if (center) {
        const mapped = gravityBodyPosition(center, centers);
        tilt.position.set(mapped.x, mapped.y, mapped.z);
      } else if (state.heliosphere) {
        const mapped = mapHeliospherePosition(relative);
        tilt.position.set(mapped.x, mapped.y, mapped.z);
      } else tilt.position.copy(toSceneVector(relative));
      tilt.scale.setScalar(state.heliosphere ? heliosphereBodyRadius(id) / planetDisplayRadius(id) : state.gravity ? gravityBodyRadius(id) / planetDisplayRadius(id) : 1);
      if (state.heliosphere) {
        const phase = state.heliospherePhaseSeconds ?? 0;
        if (state.rotationStabilized) {
          if (!this.heliosphereSpinActive) this.heliosphereSpinOffsets.set(id, mesh.rotation.y - phase * 0.08);
          mesh.rotation.y = (this.heliosphereSpinOffsets.get(id) ?? 0) + phase * 0.08;
        } else mesh.rotation.y = state.rotations[id];
      } else mesh.rotation.y = state.rotationStabilized && !(state.gravity && state.reducedMotion)
        ? performance.now() * 0.00008 : state.rotations[id];
      mesh.visible = !isGalaxy;
    }

    if (isFullJourney) {
      const journeyPosition = -FULL_JOURNEY_LENGTH / 2 + state.journeyProgress * FULL_JOURNEY_LENGTH;
      this.solarGroup.scale.setScalar(FULL_JOURNEY_GROUP_SCALE);
      this.solarGroup.position.set(0, 0, journeyPosition);
    } else if (state.frame === 'space' && !(state.gravity || state.heliosphere)) {
      this.solarGroup.scale.setScalar(1);
      this.solarGroup.position.set(0, 0, 0);
    } else {
      this.solarGroup.scale.setScalar(1);
      this.solarGroup.position.set(0, 0, 0);
    }

    for (const line of this.heliosphereOrbitLines.values()) line.visible = state.heliosphere && state.viewOptions.orbitPaths;
    for (const line of this.orbitLines.values()) line.visible = state.viewOptions.orbitPaths && state.frame === 'sun' && !(state.gravity || state.heliosphere);
    for (const line of this.spaceOrbitLines.values()) line.visible = state.viewOptions.orbitPaths && isFullJourney;
    for (const [id, line] of this.gravityOrbitLines) {
      line.visible = state.gravity && state.viewOptions.orbitPaths;
      if (!line.visible) continue;
      const points = this.gravityOrbitPoints.get(id) ?? [];
      const attribute = line.geometry.getAttribute('position');
      for (let index = 0; index < points.length; index += 1) {
        const point = points[index];
        if (point) attribute.setY(index, gravitySurfaceHeight(point.x, point.z, centers) + 0.22);
      }
      attribute.needsUpdate = true;
    }
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
    if (!(state.gravity || state.heliosphere) && state.viewOptions.trails && !state.reducedMotion && now - this.lastTrailSampleMs > 90) {
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
      const isFullJourney = !(state.gravity || state.heliosphere) && state.frame === 'space' && state.bookmark === 'full';
      line.visible = !(state.gravity || state.heliosphere) && state.viewOptions.trails && !state.reducedMotion && state.frame !== 'galaxy' && !isFullJourney;
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
      !(state.gravity || state.heliosphere) && state.frame === 'space' && state.bookmark === 'path',
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
    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets: THREE.Object3D[] = this.currentState.frame === 'galaxy' ? [] : [this.solarPresentation.mesh, ...this.planetMeshes.values()];
    const selection = resolveSceneSelection(this.raycaster, targets, this.heliospherePresentation.drawables, markerHit);
    if (selection) this.onSelect(selection);
  }

  private applyQuality(preference: QualityPreference, frame: ViewMode): void {
    const quality = getRenderingQualityProfile(preference);
    const viewportWidth = this.renderer.domElement.clientWidth || window.innerWidth;
    const qualityKey = `${preference}:${frame}:${window.devicePixelRatio}:${viewportWidth}`;
    if (qualityKey === this.appliedQualityKey) return;
    this.appliedQualityKey = qualityKey;
    this.heliosphereBackground.setDensity(quality, viewportWidth);
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

/** One activation resolves markers first (in handlePointer), then bodies, then
 * nearest region surface. Eligibility follows the drawable's actual ancestry. */
export function isDisplayed(object: THREE.Object3D): boolean {
  for (let current: THREE.Object3D | null = object; current; current = current.parent) {
    if (!current.visible) return false;
  }
  return true;
}
export function resolveSceneSelection(
  raycaster: THREE.Raycaster,
  bodies: readonly THREE.Object3D[],
  regions: HeliospherePresentation['drawables'],
  marker: SelectableBody | null = null,
): Exclude<Selection, { kind: 'none' }> | null {
  if (marker) return { kind: 'body', body: marker };
  const body = raycaster.intersectObjects(bodies.filter(isDisplayed), false)[0];
  if (body) return { kind: 'body', body: body.object.userData.planetId as PlanetId | undefined ?? 'sun' };
  const eligible = regions.filter(({ object }) => isDisplayed(object));
  const hit = raycaster.intersectObjects(eligible.map(({ object }) => object), false)[0];
  const region = eligible.find(({ object }) => object === hit?.object)?.region;
  return region ? { kind: 'region', region } : null;
}

/** A completed primary click/tap, never the release of a camera gesture. */
class SceneClickGesture {
  private readonly pointers = new Map<number, { x: number; y: number; eligible: boolean }>();
  down(event: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY' | 'button' | 'isPrimary'>): void {
    const multiple = this.pointers.size > 0;
    if (multiple) this.pointers.forEach((pointer) => { pointer.eligible = false; });
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, eligible: !multiple && event.isPrimary && event.button === 0 });
  }
  move(event: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY'>): void {
    const pointer = this.pointers.get(event.pointerId);
    if (pointer && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 5) pointer.eligible = false;
  }
  cancel(pointerId: number): void { this.pointers.delete(pointerId); }
  up(event: Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY' | 'button'>): boolean {
    this.move(event);
    const pointer = this.pointers.get(event.pointerId);
    this.pointers.delete(event.pointerId);
    return Boolean(pointer?.eligible && event.button === 0);
  }
}
