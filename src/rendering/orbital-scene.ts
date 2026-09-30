import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { PLANET_IDS, getPlanetProfile } from '../astronomy/planet-data';
import type { PlanetId, Vector3Au } from '../astronomy/solar-system';
import { eclipticToGalactic, type SystemSnapshot } from '../astronomy/reference-frames';
import type {
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
  SUN_DISPLAY_RADIUS,
  planetDisplayRadius,
} from './display-scale';
import {
  createAtmosphereMaterial,
  createEarthCloudTexture,
  createGalaxyTexture,
  createGlowTexture,
  createRingTexture,
  createSunMaterial,
  createUranusTexture,
  seededRandom,
} from './procedural-materials';

export interface SceneState {
  readonly snapshot: SystemSnapshot;
  readonly frame: ViewMode;
  readonly bookmark: CameraBookmark;
  readonly cameraRevision: number;
  readonly selectedBody: SelectableBody | null;
  readonly viewOptions: ViewOptions;
  readonly quality: QualityPreference;
  readonly reducedMotion: boolean;
  readonly rotations: Readonly<Record<PlanetId, number>>;
  readonly rotationStabilized: boolean;
  readonly trailRevision: number;
  readonly journeyProgress: number;
  readonly galacticProgress: number;
}

export interface OrbitalSceneOptions {
  readonly canvas: HTMLCanvasElement;
  readonly labelLayer: HTMLElement;
  readonly assetBase: string;
  readonly onSelect: (body: SelectableBody) => void;
  readonly onQualityAdapted: (quality: Exclude<QualityPreference, 'auto'>) => void;
}

const MAX_TRAIL_POINTS = 56;
const CAMERA_TWEEN_DURATION_MS = 800;
const MARKER_VISIBILITY_THRESHOLD_PX = 6;

function toSceneVector(position: Vector3Au, scale = AU_SCALE): THREE.Vector3 {
  return new THREE.Vector3(position.x * scale, position.z * scale, position.y * scale);
}


export class OrbitalScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(43, 1, 0.002, 5_000);
  private readonly controls: OrbitControls;
  private readonly solarGroup = new THREE.Group();
  private readonly galaxyGroup = new THREE.Group();
  private readonly localGuides = new THREE.Group();
  private readonly planetMeshes = new Map<PlanetId, THREE.Mesh>();
  private readonly planetTiltGroups = new Map<PlanetId, THREE.Group>();
  private readonly orbitLines = new Map<PlanetId, THREE.Line>();
  private readonly spaceOrbitLines = new Map<PlanetId, THREE.Line>();
  private readonly trailLines = new Map<PlanetId, THREE.Line>();
  private readonly trailHistory = new Map<PlanetId, Vector3Au[]>();
  private readonly bodyMarkers = new Map<SelectableBody, HTMLButtonElement>();
  private readonly markerScreenPositions = new Map<SelectableBody, THREE.Vector2>();
  private readonly atmosphereMeshes = new Map<PlanetId, THREE.Mesh>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly sunMesh: THREE.Mesh;
  private readonly sunMaterial: THREE.ShaderMaterial;
  private readonly sunGlow: THREE.Sprite;
  private readonly planeOverlay: THREE.Mesh;
  private readonly localGrid: THREE.GridHelper;
  private readonly localPath: THREE.Line;
  private readonly fullJourneyPath: THREE.Line;
  private readonly galaxySunMarker: THREE.Mesh;
  private readonly galaxyDirectionArrow: THREE.ArrowHelper;
  private readonly starField: THREE.Points;
  private readonly galaxyStars: THREE.Points;
  private readonly galaxyDiskMaterials: readonly THREE.MeshBasicMaterial[];
  private readonly earthClouds: THREE.Mesh | null;
  private readonly ringMaterials: readonly THREE.MeshStandardMaterial[];
  private readonly solarSystemLabel: HTMLDivElement;
  private readonly labelLayer: HTMLElement;
  private readonly onSelect: (body: SelectableBody) => void;
  private readonly onQualityAdapted: (quality: Exclude<QualityPreference, 'auto'>) => void;
  private readonly assetBase: string;
  private currentState: SceneState | null = null;
  private currentBookmark: CameraBookmark | null = null;
  private currentFrame: ViewMode | null = null;
  private currentCameraRevision = -1;
  private lastTrailRevision = -1;
  private lastTrailSampleMs = 0;
  private selectedOutline: THREE.Mesh | null = null;
  private outlinedBody: PlanetId | null = null;
  private appliedQualityKey: string | null = null;
  private cameraTween: {
    start: THREE.Vector3;
    end: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    startedAt: number;
  } | null = null;
  private frameSamples: number[] = [];
  private lastFrameAt = performance.now();
  private autoQualityAdapted = false;
  private followedBody: SelectableBody | null = null;
  private lastFollowPosition: THREE.Vector3 | null = null;
  private pendingFocus: SelectableBody | null = null;
  private hoveredBody: SelectableBody | null = null;
  private sunSurfaceTime = 0;
  private lastSunAnimationAt = performance.now();

  constructor(options: OrbitalSceneOptions) {
    this.labelLayer = options.labelLayer;
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

    this.camera.position.set(10, 24, 65);
    this.controls = new OrbitControls(this.camera, options.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;
    this.controls.minDistance = 0.025;
    this.controls.maxDistance = 2_500;
    this.controls.enablePan = true;
    this.controls.addEventListener('start', () => {
      this.cameraTween = null;
    });

    this.scene.add(this.solarGroup, this.localGuides, this.galaxyGroup);
    this.starField = this.createStarField();
    this.scene.add(this.starField);

    const ambient = new THREE.AmbientLight(0x53617a, 0.16);
    this.scene.add(ambient);

    const sunGeometry = new THREE.SphereGeometry(SUN_DISPLAY_RADIUS, 64, 40);
    this.sunMaterial = createSunMaterial();
    this.sunMesh = new THREE.Mesh(sunGeometry, this.sunMaterial);
    this.sunMesh.name = 'sun';
    this.solarGroup.add(this.sunMesh);

    const glowMaterial = new THREE.SpriteMaterial({
      map: createGlowTexture(),
      color: 0xffb55c,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sunGlow = new THREE.Sprite(glowMaterial);
    this.sunGlow.scale.set(SUN_DISPLAY_RADIUS * 6.2, SUN_DISPLAY_RADIUS * 6.2, 1);
    this.solarGroup.add(this.sunGlow);

    const sunlight = new THREE.PointLight(0xffe4b4, 1150, 0, 1.45);
    this.solarGroup.add(sunlight);

    for (const id of PLANET_IDS) this.createPlanet(id);
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

    this.localGrid = new THREE.GridHelper(1_000, 50, 0x4d7c91, 0x24334b);
    this.localGrid.rotation.x = Math.PI / 2;
    const gridMaterials = Array.isArray(this.localGrid.material) ? this.localGrid.material : [this.localGrid.material];
    for (const material of gridMaterials) {
      material.transparent = true;
      material.opacity = 0.16;
    }
    this.localGuides.add(this.localGrid);

    this.localPath = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -150),
        new THREE.Vector3(0, 0, 150),
      ]),
      new THREE.LineDashedMaterial({ color: 0xf4b860, opacity: 0.62, transparent: true, dashSize: 4, gapSize: 3 }),
    );
    this.localPath.computeLineDistances();
    this.localGuides.add(this.localPath);

    this.fullJourneyPath = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -FULL_JOURNEY_LENGTH / 2),
        new THREE.Vector3(0, 0, FULL_JOURNEY_LENGTH / 2),
      ]),
      new THREE.LineBasicMaterial({ color: 0xf4b860, opacity: 0.5, transparent: true }),
    );
    this.localGuides.add(this.fullJourneyPath);

    const galaxy = this.createGalaxy();
    this.galaxyStars = galaxy.stars;
    this.galaxySunMarker = galaxy.sunMarker;
    this.galaxyDirectionArrow = galaxy.directionArrow;
    this.galaxyDiskMaterials = galaxy.diskMaterials;
    this.galaxyGroup.add(galaxy.root);

    this.createBodyMarker('sun', 'Sun');
    for (const id of PLANET_IDS) this.createBodyMarker(id, getPlanetProfile(id).name);
    this.solarSystemLabel = document.createElement('div');
    this.solarSystemLabel.className = 'solar-system-label';
    this.solarSystemLabel.textContent = 'Solar System';
    this.solarSystemLabel.setAttribute('role', 'note');
    this.solarSystemLabel.hidden = true;
    this.labelLayer.append(this.solarSystemLabel);

    options.canvas.addEventListener('pointermove', (event) => this.handlePointerMove(event));
    options.canvas.addEventListener('pointerleave', () => {
      this.hoveredBody = null;
    });
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
    this.applyCamera(state, nowMs);
    this.applyPendingFocus(nowMs);
    this.updateCameraTween(state.reducedMotion, nowMs);
    this.controls.update();
    this.updateSunSurface(state.reducedMotion, nowMs);
    this.updateLabels(state);
    this.renderer.render(this.scene, this.camera);
    this.monitorPerformance(state.quality, nowMs);
  }

  focus(body: SelectableBody): void {
    this.followedBody = null;
    this.lastFollowPosition = null;
    this.pendingFocus = body;
  }

  follow(body: SelectableBody | null): void {
    this.followedBody = body;
    this.lastFollowPosition = null;
    if (body) this.pendingFocus = body;
  }

  resetCamera(): void {
    this.followedBody = null;
    this.lastFollowPosition = null;
    this.pendingFocus = null;
    this.currentCameraRevision = -1;
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

  private addRings(): readonly THREE.MeshStandardMaterial[] {
    const materials: THREE.MeshStandardMaterial[] = [];
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
      material.userData.baseOpacity = 0.86;
      materials.push(material);
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
      material.userData.baseOpacity = 0.5;
      materials.push(material);
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

  private createGalaxy(): {
    root: THREE.Group;
    stars: THREE.Points;
    sunMarker: THREE.Mesh;
    directionArrow: THREE.ArrowHelper;
    diskMaterials: readonly THREE.MeshBasicMaterial[];
  } {
    const root = new THREE.Group();
    const galaxyTexture = createGalaxyTexture();
    const primaryDiskMaterial = new THREE.MeshBasicMaterial({
      map: galaxyTexture,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const hazeMaterial = new THREE.MeshBasicMaterial({
      map: galaxyTexture,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const disk = new THREE.Mesh(new THREE.PlaneGeometry(215, 215), primaryDiskMaterial);
    disk.rotation.x = -Math.PI / 2;
    const haze = new THREE.Mesh(new THREE.PlaneGeometry(230, 230), hazeMaterial);
    haze.rotation.x = -Math.PI / 2;
    haze.position.y = -0.7;
    haze.scale.set(1, 1.08, 1);
    root.add(disk, haze);

    const random = seededRandom(8_111_995);
    const count = 1_200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const arm = index % 2;
      const radius = Math.pow(random(), 0.62) * 100;
      const baseAngle = arm * Math.PI + radius * 0.067;
      const scatter = (random() - 0.5) * (0.3 + radius * 0.012);
      const angle = baseAngle + scatter;
      const thickness = (random() - 0.5) * Math.max(0.4, 5.5 - radius * 0.045);
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = thickness;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
      const core = 1 - Math.min(1, radius / 100);
      colors[index * 3] = 0.56 + core * 0.44;
      colors[index * 3 + 1] = 0.68 + core * 0.2;
      colors[index * 3 + 2] = 0.98 - core * 0.2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const stars = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ size: 0.42, vertexColors: true, transparent: true, opacity: 0.52, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    root.add(stars);

    const orbit = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 181 }, (_, index) => {
          const angle = (index / 180) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(angle) * 65, 0, Math.sin(angle) * 65);
        }),
      ),
      new THREE.LineDashedMaterial({ color: 0xf4b860, opacity: 0.32, transparent: true, dashSize: 2, gapSize: 1.7 }),
    );
    orbit.computeLineDistances();
    root.add(orbit);

    const sunMarker = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 24, 12),
      new THREE.MeshBasicMaterial({ color: 0xffcf7b }),
    );
    sunMarker.position.set(65, 0, 0);
    root.add(sunMarker);
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(65, 0, 0), 8, 0xf4b860, 2.2, 1.2);
    root.add(arrow);
    return { root, stars, sunMarker, directionArrow: arrow, diskMaterials: [primaryDiskMaterial, hazeMaterial] };
  }

  private createBodyMarker(id: SelectableBody, text: string): void {
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
    marker.addEventListener('click', () => this.onSelect(id));
    this.labelLayer.append(marker);
    this.bodyMarkers.set(id, marker);
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
    this.localGuides.visible = state.frame === 'space';
    this.galaxyGroup.visible = isGalaxy;
    this.localPath.visible = state.frame === 'space' && !isFullJourney;
    this.localGrid.visible = state.frame === 'space' && !isFullJourney;
    this.fullJourneyPath.visible = isFullJourney;
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

    this.sunMesh.visible = !isGalaxy;
    this.sunGlow.visible = !isGalaxy;
    if (isGalaxy) {
      const angle = state.galacticProgress * Math.PI * 2;
      const markerPosition = new THREE.Vector3(Math.cos(angle) * 65, 0, Math.sin(angle) * 65);
      this.galaxySunMarker.position.copy(markerPosition);
      this.galaxyDirectionArrow.position.copy(markerPosition);
      this.galaxyDirectionArrow.setDirection(new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)));
    }
    this.localGuides.position.set(0, 0, 0);
    if (isFullJourney) {
      const journeyPosition = -FULL_JOURNEY_LENGTH / 2 + state.journeyProgress * FULL_JOURNEY_LENGTH;
      this.solarGroup.scale.setScalar(FULL_JOURNEY_GROUP_SCALE);
      this.solarGroup.position.set(0, 0, journeyPosition);
      this.localGrid.position.set(0, 0, 0);
    } else if (state.frame === 'space') {
      const scroll = ((sunPosition.y * AU_SCALE) % 20 + 20) % 20;
      this.localGrid.position.set(0, 0, -scroll);
      this.solarGroup.scale.setScalar(1);
      this.solarGroup.position.set(0, 0, 0);
    } else {
      this.localGrid.position.set(0, 0, 0);
      this.solarGroup.scale.setScalar(1);
      this.solarGroup.position.set(0, 0, 0);
    }

    for (const line of this.orbitLines.values()) line.visible = state.viewOptions.orbitPaths && state.frame === 'sun';
    for (const line of this.spaceOrbitLines.values()) line.visible = state.viewOptions.orbitPaths && isFullJourney;
    this.updateTrails(state, positions, sunPosition);
    this.updateSelection(state.selectedBody);
    this.applyQuality(state.quality, state.frame);
    this.applyControlConstraints(state.frame);
    this.applyFollow(state.frame);
  }

  private applyFollow(frame: ViewMode): void {
    if (!this.followedBody || frame === 'galaxy') return;
    const object = this.followedBody === 'sun' ? this.sunMesh : this.planetMeshes.get(this.followedBody);
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
    }
    this.controls.target.copy(current);
    this.lastFollowPosition = current;
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
    const isFullJourney = state.frame === 'space' && state.bookmark === 'full';
    const fullSunScreen = new THREE.Vector2();
    if (isFullJourney) {
      const sunWorld = new THREE.Vector3();
      this.sunMesh.getWorldPosition(sunWorld);
      sunWorld.project(this.camera);
      fullSunScreen.set((sunWorld.x * 0.5 + 0.5) * width, (-sunWorld.y * 0.5 + 0.5) * height);
    }
    this.markerScreenPositions.clear();
    for (const [id, marker] of this.bodyMarkers) {
      const object = id === 'sun' && state.frame === 'galaxy'
        ? this.galaxySunMarker
        : id === 'sun'
          ? this.sunMesh
          : this.planetMeshes.get(id);
      const available = Boolean(object?.visible) && (state.frame !== 'galaxy' || id === 'sun');
      marker.hidden = !available;
      if (!object || !available) continue;

      const world = new THREE.Vector3();
      object.getWorldPosition(world);
      const projected = world.clone().project(this.camera);
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
        const displayDistance = Math.max(minimumDistance, Math.hypot(actualX - fullSunScreen.x, actualY - fullSunScreen.y));
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
        ? state.frame === 'galaxy' ? 1.2 : SUN_DISPLAY_RADIUS
        : planetDisplayRadius(id);
      const worldScale = new THREE.Vector3();
      object.getWorldScale(worldScale);
      const worldRadius = localRadius * Math.max(worldScale.x, worldScale.y, worldScale.z);
      const distance = Math.max(0.0001, this.camera.position.distanceTo(world));
      const pixelsPerWorldUnit = height / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * distance);
      const projectedRadius = worldRadius * pixelsPerWorldUnit;
      const revealOnly = (isFullJourney && id !== 'sun')
        || (this.camera.position.distanceTo(this.controls.target) > 180 && ['mercury', 'venus', 'earth', 'mars'].includes(id));

      marker.style.left = `${x}px`;
      marker.style.top = `${y}px`;
      marker.dataset.markerVisible = String(projectedRadius < MARKER_VISIBILITY_THRESHOLD_PX || isFullJourney || state.frame === 'galaxy');
      const labelEnabled = state.viewOptions.labels || (isFullJourney && id === 'sun');
      marker.dataset.labelMode = !labelEnabled ? 'hidden' : revealOnly ? 'reveal' : 'persistent';
      marker.dataset.hovered = String(this.hoveredBody === id);
      marker.setAttribute('aria-current', String(state.selectedBody === id));
      this.markerScreenPositions.set(id, new THREE.Vector2(x, y));
    }

    this.solarSystemLabel.hidden = !isFullJourney;
    if (isFullJourney) {
      const solarSystemPosition = new THREE.Vector3();
      this.solarGroup.getWorldPosition(solarSystemPosition);
      solarSystemPosition.project(this.camera);
      const behind = solarSystemPosition.z < -1 || solarSystemPosition.z > 1;
      this.solarSystemLabel.hidden = behind;
      if (!behind) {
        this.solarSystemLabel.style.left = `${(solarSystemPosition.x * 0.5 + 0.5) * width}px`;
        this.solarSystemLabel.style.top = `${(-solarSystemPosition.y * 0.5 + 0.5) * height - 34}px`;
      }
    }
  }

  private applyCamera(state: SceneState, nowMs: number): void {
    if (
      state.bookmark === this.currentBookmark
      && state.frame === this.currentFrame
      && state.cameraRevision === this.currentCameraRevision
    ) return;
    const isInitialComposition = this.currentFrame === null;
    this.currentBookmark = state.bookmark;
    this.currentFrame = state.frame;
    this.currentCameraRevision = state.cameraRevision;
    this.followedBody = null;
    this.lastFollowPosition = null;

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
          position = narrowViewport ? new THREE.Vector3(0, 600, 650) : new THREE.Vector3(380, 240, 500);
          break;
      }
    }

    this.startCameraMove(position, target, nowMs, state.reducedMotion || isInitialComposition);
  }

  private applyPendingFocus(nowMs: number): void {
    if (!this.pendingFocus || !this.currentState) return;
    const isWideView = this.currentState.frame === 'galaxy'
      || (this.currentState.frame === 'space' && this.currentState.bookmark === 'full');
    if (isWideView) return;
    const body = this.pendingFocus;
    const object = body === 'sun' ? this.sunMesh : this.planetMeshes.get(body);
    if (!object?.visible) return;
    const world = new THREE.Vector3();
    object.getWorldPosition(world);
    const radius = body === 'sun' ? SUN_DISPLAY_RADIUS : planetDisplayRadius(body);
    const distance = radius * (body === 'sun' ? 6 : 8);
    const offset = new THREE.Vector3(1, 0.55, 1).normalize().multiplyScalar(distance);
    this.startCameraMove(world.clone().add(offset), world, nowMs, this.currentState.reducedMotion);
    this.pendingFocus = null;
  }

  private startCameraMove(
    position: THREE.Vector3,
    target: THREE.Vector3,
    nowMs: number,
    reducedMotion: boolean,
  ): void {
    this.cameraTween = {
      start: this.camera.position.clone(),
      end: position,
      startTarget: this.controls.target.clone(),
      endTarget: target,
      startedAt: reducedMotion ? nowMs - CAMERA_TWEEN_DURATION_MS : nowMs,
    };
  }

  private updateCameraTween(reducedMotion: boolean, nowMs: number): void {
    if (!this.cameraTween) return;
    const duration = reducedMotion ? 1 : CAMERA_TWEEN_DURATION_MS;
    const progress = Math.min(1, (nowMs - this.cameraTween.startedAt) / duration);
    const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    this.camera.position.lerpVectors(this.cameraTween.start, this.cameraTween.end, eased);
    this.controls.target.lerpVectors(this.cameraTween.startTarget, this.cameraTween.endTarget, eased);
    if (progress >= 1) this.cameraTween = null;
  }

  private nearestBodyAt(clientX: number, clientY: number, bounds: DOMRect): SelectableBody | null {
    const pointer = new THREE.Vector2(clientX - bounds.left, clientY - bounds.top);
    let nearest: { body: SelectableBody; distance: number } | null = null;
    for (const [body, position] of this.markerScreenPositions) {
      const distance = pointer.distanceTo(position);
      if (distance <= 22 && (!nearest || distance < nearest.distance)) nearest = { body, distance };
    }
    return nearest?.body ?? null;
  }

  private handlePointerMove(event: PointerEvent): void {
    const bounds = this.renderer.domElement.getBoundingClientRect();
    this.hoveredBody = this.nearestBodyAt(event.clientX, event.clientY, bounds);
  }

  private handlePointer(event: PointerEvent): void {
    if (!this.currentState) return;
    const bounds = this.renderer.domElement.getBoundingClientRect();
    const markerHit = this.nearestBodyAt(event.clientX, event.clientY, bounds);
    if (markerHit) {
      this.onSelect(markerHit);
      return;
    }
    if (this.currentState.frame === 'galaxy') return;
    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets: THREE.Object3D[] = [this.sunMesh, ...this.planetMeshes.values()];
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    if (!hit) return;
    const id = hit.object.userData.planetId as PlanetId | undefined;
    this.onSelect(id ?? 'sun');
  }

  private applyControlConstraints(frame: ViewMode): void {
    const isGalaxy = frame === 'galaxy';
    this.controls.enablePan = !isGalaxy;
    this.controls.minDistance = isGalaxy ? 100 : 0.025;
    this.controls.maxDistance = isGalaxy ? 650 : 2_500;
    this.controls.minPolarAngle = isGalaxy ? 0.45 : 0.05;
    this.controls.maxPolarAngle = isGalaxy ? 1.25 : Math.PI - 0.05;
  }

  private updateSunSurface(reducedMotion: boolean, nowMs: number): void {
    const elapsedSeconds = Math.min(0.05, Math.max(0, (nowMs - this.lastSunAnimationAt) / 1_000));
    this.lastSunAnimationAt = nowMs;
    if (!reducedMotion) this.sunSurfaceTime += elapsedSeconds * 0.22;
    const timeUniform = this.sunMaterial.uniforms.time;
    if (timeUniform) timeUniform.value = this.sunSurfaceTime;
  }

  private applyQuality(preference: QualityPreference, frame: ViewMode): void {
    const quality = preference === 'auto' ? 'high' : preference;
    const qualityKey = `${quality}:${frame}:${window.devicePixelRatio}`;
    if (qualityKey === this.appliedQualityKey) return;
    this.appliedQualityKey = qualityKey;
    const pixelRatio = quality === 'high' ? 2 : quality === 'balanced' ? 1.5 : 1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatio));
    const localStarCount = quality === 'high' ? 7_500 : quality === 'balanced' ? 4_500 : 2_300;
    const galaxyForegroundCount = quality === 'high' ? 450 : quality === 'balanced' ? 260 : 120;
    const galaxyCount = quality === 'high' ? 1_200 : quality === 'balanced' ? 700 : 320;
    this.starField.geometry.setDrawRange(0, frame === 'galaxy' ? galaxyForegroundCount : localStarCount);
    this.galaxyStars.geometry.setDrawRange(0, galaxyCount);
    for (const atmosphere of this.atmosphereMeshes.values()) atmosphere.visible = quality !== 'low';
    if (this.earthClouds) this.earthClouds.visible = quality === 'high';
    for (const material of this.ringMaterials) {
      const baseOpacity = typeof material.userData.baseOpacity === 'number' ? material.userData.baseOpacity : 0.7;
      const opacityFactor = quality === 'high' ? 1 : quality === 'balanced' ? 0.82 : 0.65;
      material.opacity = baseOpacity * opacityFactor;
    }
    const [disk, haze] = this.galaxyDiskMaterials;
    if (disk) disk.opacity = quality === 'low' ? 0.78 : 0.92;
    if (haze) haze.opacity = quality === 'high' ? 0.22 : quality === 'balanced' ? 0.14 : 0.08;
  }

  private monitorPerformance(quality: QualityPreference, nowMs: number): void {
    const delta = nowMs - this.lastFrameAt;
    this.lastFrameAt = nowMs;
    if (delta <= 0 || delta > 500) return;
    this.frameSamples.push(delta);
    if (this.frameSamples.length < 180) return;
    const average = this.frameSamples.reduce((sum, sample) => sum + sample, 0) / this.frameSamples.length;
    this.frameSamples.length = 0;
    if (quality === 'auto' && average > 25 && !this.autoQualityAdapted) {
      this.autoQualityAdapted = true;
      this.onQualityAdapted('balanced');
    }
  }
}
