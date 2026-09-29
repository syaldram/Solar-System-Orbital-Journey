import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { PLANET_IDS, getPlanetProfile } from '../astronomy/planet-data';
import type { PlanetId, Vector3Au } from '../astronomy/solar-system';
import type { SystemSnapshot } from '../astronomy/reference-frames';
import type {
  CameraBookmark,
  QualityPreference,
  SelectableBody,
  ViewMode,
  ViewOptions,
} from '../experience/experience-state';

export interface SceneState {
  readonly snapshot: SystemSnapshot;
  readonly frame: ViewMode;
  readonly bookmark: CameraBookmark;
  readonly selectedBody: SelectableBody | null;
  readonly viewOptions: ViewOptions;
  readonly quality: QualityPreference;
  readonly reducedMotion: boolean;
  readonly rotations: Readonly<Record<PlanetId, number>>;
  readonly rotationStabilized: boolean;
  readonly trailRevision: number;
  readonly journeyProgress: number;
}

export interface OrbitalSceneOptions {
  readonly canvas: HTMLCanvasElement;
  readonly labelLayer: HTMLElement;
  readonly assetBase: string;
  readonly onSelect: (body: SelectableBody) => void;
  readonly onQualityAdapted: (quality: Exclude<QualityPreference, 'auto'>) => void;
}

const AU_SCALE = 10;
const FULL_JOURNEY_LENGTH = 700;
const MAX_TRAIL_POINTS = 56;

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0;
    return value / 4_294_967_296;
  };
}

function toSceneVector(position: Vector3Au, scale = AU_SCALE): THREE.Vector3 {
  return new THREE.Vector3(position.x * scale, position.z * scale, position.y * scale);
}

function createGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(canvas);
  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,244,204,1)');
  gradient.addColorStop(0.16, 'rgba(255,187,84,.9)');
  gradient.addColorStop(0.52, 'rgba(255,126,34,.22)');
  gradient.addColorStop(1, 'rgba(255,126,34,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function createUranusTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(canvas);
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#a9e4e5');
  gradient.addColorStop(0.48, '#79cbd2');
  gradient.addColorStop(0.56, '#77c7cf');
  gradient.addColorStop(1, '#9ddadd');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalAlpha = 0.12;
  for (let y = 30; y < canvas.height; y += 24) {
    context.fillStyle = y % 48 === 0 ? '#d9f4ef' : '#4daeb8';
    context.fillRect(0, y, canvas.width, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function planetDisplayRadius(id: PlanetId): number {
  const earthRadius = 6371.0084;
  const relative = getPlanetProfile(id).meanRadiusKm / earthRadius;
  return 0.55 + Math.sqrt(relative) * 0.52;
}

export class OrbitalScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(43, 1, 0.05, 200_000);
  private readonly controls: OrbitControls;
  private readonly solarGroup = new THREE.Group();
  private readonly galaxyGroup = new THREE.Group();
  private readonly localGuides = new THREE.Group();
  private readonly planetMeshes = new Map<PlanetId, THREE.Mesh>();
  private readonly planetTiltGroups = new Map<PlanetId, THREE.Group>();
  private readonly orbitLines = new Map<PlanetId, THREE.Line>();
  private readonly trailLines = new Map<PlanetId, THREE.Line>();
  private readonly trailHistory = new Map<PlanetId, Vector3Au[]>();
  private readonly labels = new Map<SelectableBody, HTMLButtonElement>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly sunMesh: THREE.Mesh;
  private readonly sunGlow: THREE.Sprite;
  private readonly planeOverlay: THREE.Mesh;
  private readonly localPath: THREE.Line;
  private readonly fullJourneyPath: THREE.Line;
  private readonly fullJourneyMarker: THREE.Mesh;
  private readonly galaxySunMarker: THREE.Mesh;
  private readonly starField: THREE.Points;
  private readonly galaxyStars: THREE.Points;
  private readonly labelLayer: HTMLElement;
  private readonly onSelect: (body: SelectableBody) => void;
  private readonly onQualityAdapted: (quality: Exclude<QualityPreference, 'auto'>) => void;
  private readonly assetBase: string;
  private currentState: SceneState | null = null;
  private currentBookmark: CameraBookmark | null = null;
  private currentFrame: ViewMode | null = null;
  private lastTrailRevision = -1;
  private lastTrailSampleMs = 0;
  private selectedOutline: THREE.Mesh | null = null;
  private cameraTween: { start: THREE.Vector3; end: THREE.Vector3; target: THREE.Vector3; startedAt: number } | null = null;
  private frameSamples: number[] = [];
  private lastFrameAt = performance.now();
  private autoQualityAdapted = false;
  private followedBody: SelectableBody | null = null;
  private lastFollowPosition: THREE.Vector3 | null = null;

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
    this.controls.minDistance = 3;
    this.controls.maxDistance = 2_500;
    this.controls.enablePan = true;

    this.scene.add(this.solarGroup, this.localGuides, this.galaxyGroup);
    this.starField = this.createStarField();
    this.scene.add(this.starField);

    const ambient = new THREE.AmbientLight(0x53617a, 0.16);
    this.scene.add(ambient);

    const sunGeometry = new THREE.SphereGeometry(4.5, 64, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffc56e });
    this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
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
    this.sunGlow.scale.set(25, 25, 1);
    this.solarGroup.add(this.sunGlow);

    const sunlight = new THREE.PointLight(0xffe4b4, 1150, 0, 1.45);
    this.solarGroup.add(sunlight);

    for (const id of PLANET_IDS) this.createPlanet(id);
    this.addRings();

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

    const localGrid = new THREE.GridHelper(1_000, 50, 0x4d7c91, 0x24334b);
    localGrid.rotation.x = Math.PI / 2;
    const gridMaterials = Array.isArray(localGrid.material) ? localGrid.material : [localGrid.material];
    for (const material of gridMaterials) {
      material.transparent = true;
      material.opacity = 0.16;
    }
    this.localGuides.add(localGrid);

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
    this.fullJourneyMarker = new THREE.Mesh(
      new THREE.SphereGeometry(3, 24, 12),
      new THREE.MeshBasicMaterial({ color: 0xffd187 }),
    );
    this.localGuides.add(this.fullJourneyMarker);

    const galaxy = this.createGalaxy();
    this.galaxyStars = galaxy.stars;
    this.galaxySunMarker = galaxy.sunMarker;
    this.galaxyGroup.add(galaxy.root);

    this.createLabel('sun', 'Sun');
    for (const id of PLANET_IDS) this.createLabel(id, getPlanetProfile(id).name);

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
    }
  }

  render(state: SceneState, nowMs: number): void {
    this.currentState = state;
    this.applyView(state);
    this.applyCamera(state, nowMs);
    this.controls.update();
    this.updateCameraTween(state.reducedMotion, nowMs);
    this.updateLabels(state);
    this.renderer.render(this.scene, this.camera);
    this.monitorPerformance(state.quality, nowMs);
  }

  focus(body: SelectableBody): void {
    const object = body === 'sun' ? this.sunMesh : this.planetMeshes.get(body);
    if (!object || !object.visible) return;
    const world = new THREE.Vector3();
    object.getWorldPosition(world);
    const distance = body === 'sun' ? 20 : Math.max(8, planetDisplayRadius(body) * 6);
    this.startCameraMove(world.clone().add(new THREE.Vector3(distance, distance * 0.55, distance)), world);
  }

  follow(body: SelectableBody | null): void {
    this.followedBody = body;
    this.lastFollowPosition = null;
    if (body) this.focus(body);
  }

  resetCamera(): void {
    this.currentBookmark = null;
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
      roughness: 0.82,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(planetDisplayRadius(id), 40, 24), material);
    mesh.name = id;
    mesh.userData.planetId = id;
    const tilt = new THREE.Group();
    tilt.rotation.z = THREE.MathUtils.degToRad(profile.obliquityDegrees);
    tilt.add(mesh);
    this.solarGroup.add(tilt);
    this.planetMeshes.set(id, mesh);
    this.planetTiltGroups.set(id, tilt);

    const trail = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: profile.color, opacity: 0.56, transparent: true }),
    );
    this.trailLines.set(id, trail);
    this.trailHistory.set(id, []);
    this.solarGroup.add(trail);
  }

  private addRings(): void {
    const saturn = this.planetMeshes.get('saturn');
    if (saturn) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(3.5, 5.8, 96),
        new THREE.MeshStandardMaterial({ color: 0xd4bf91, side: THREE.DoubleSide, transparent: true, opacity: 0.72, roughness: 1 }),
      );
      ring.rotation.x = Math.PI / 2;
      saturn.add(ring);
    }
    const uranus = this.planetMeshes.get('uranus');
    if (uranus) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.4, 3.1, 72),
        new THREE.MeshBasicMaterial({ color: 0xa8dfe3, side: THREE.DoubleSide, transparent: true, opacity: 0.24 }),
      );
      ring.rotation.x = Math.PI / 2;
      uranus.add(ring);
    }
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

  private createGalaxy(): { root: THREE.Group; stars: THREE.Points; sunMarker: THREE.Mesh } {
    const root = new THREE.Group();
    const random = seededRandom(8_111_995);
    const count = 18_000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const arm = index % 4;
      const radius = Math.pow(random(), 0.62) * 100;
      const baseAngle = (arm / 4) * Math.PI * 2 + radius * 0.105;
      const scatter = (random() - 0.5) * (0.2 + radius * 0.035);
      const angle = baseAngle + scatter;
      const thickness = (random() - 0.5) * Math.max(0.6, 7 - radius * 0.055);
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = thickness;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
      const core = 1 - Math.min(1, radius / 100);
      colors[index * 3] = 0.55 + core * 0.45;
      colors[index * 3 + 1] = 0.62 + core * 0.25;
      colors[index * 3 + 2] = 0.86 - core * 0.12;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const stars = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ size: 0.72, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    root.add(stars);

    const orbit = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 181 }, (_, index) => {
          const angle = (index / 180) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(angle) * 65, 0, Math.sin(angle) * 65);
        }),
      ),
      new THREE.LineDashedMaterial({ color: 0xf4b860, opacity: 0.55, transparent: true, dashSize: 2, gapSize: 1.5 }),
    );
    orbit.computeLineDistances();
    root.add(orbit);

    const sunMarker = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 24, 12),
      new THREE.MeshBasicMaterial({ color: 0xffcf7b }),
    );
    sunMarker.position.set(65, 0, 0);
    root.add(sunMarker);
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(65, 0, 0), 9, 0xf4b860, 2.5, 1.4);
    root.add(arrow);
    return { root, stars, sunMarker };
  }

  private createLabel(id: SelectableBody, text: string): void {
    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'celestial-label';
    label.textContent = text;
    label.addEventListener('click', () => this.onSelect(id));
    this.labelLayer.append(label);
    this.labels.set(id, label);
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
    this.solarGroup.visible = !isGalaxy && !isFullJourney;
    this.localGuides.visible = state.frame === 'space';
    this.galaxyGroup.visible = isGalaxy;
    this.localPath.visible = state.frame === 'space' && !isFullJourney;
    this.fullJourneyPath.visible = isFullJourney;
    this.fullJourneyMarker.visible = isFullJourney;
    this.planeOverlay.visible = state.viewOptions.planeOverlays;

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
      mesh.visible = !isGalaxy && !isFullJourney;
    }

    this.sunMesh.visible = !isGalaxy && !isFullJourney;
    this.sunGlow.visible = !isGalaxy && !isFullJourney;
    if (state.frame === 'space' && !isFullJourney) {
      const scroll = ((sunPosition.y * AU_SCALE) % 20 + 20) % 20;
      this.localGuides.position.z = -scroll;
      this.solarGroup.position.z = -this.localGuides.position.z;
    } else {
      this.localGuides.position.set(0, 0, 0);
      this.solarGroup.position.set(0, 0, 0);
    }

    this.fullJourneyMarker.position.set(0, 0, -FULL_JOURNEY_LENGTH / 2 + state.journeyProgress * FULL_JOURNEY_LENGTH);
    for (const line of this.orbitLines.values()) line.visible = state.viewOptions.orbitPaths && state.frame === 'sun';
    this.updateTrails(state, positions, sunPosition);
    this.updateSelection(state.selectedBody);
    this.applyQuality(state.quality);
    this.applyFollow(state.frame);
  }

  private applyFollow(frame: ViewMode): void {
    if (!this.followedBody || frame === 'galaxy') return;
    const object = this.followedBody === 'sun' ? this.sunMesh : this.planetMeshes.get(this.followedBody);
    if (!object?.visible) return;
    const current = new THREE.Vector3();
    object.getWorldPosition(current);
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
      line.visible = state.viewOptions.trails && !state.reducedMotion && state.frame !== 'galaxy';
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
    this.selectedOutline?.removeFromParent();
    this.selectedOutline?.geometry.dispose();
    this.selectedOutline = null;
    if (!selected || selected === 'sun' || this.currentState?.frame === 'galaxy') return;
    const mesh = this.planetMeshes.get(selected);
    if (!mesh || !mesh.visible) return;
    const outline = new THREE.Mesh(
      new THREE.RingGeometry(planetDisplayRadius(selected) * 1.45, planetDisplayRadius(selected) * 1.58, 48),
      new THREE.MeshBasicMaterial({ color: 0xf4b860, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthTest: false }),
    );
    outline.rotation.x = Math.PI / 2;
    mesh.add(outline);
    this.selectedOutline = outline;
  }

  private updateLabels(state: SceneState): void {
    const width = this.renderer.domElement.clientWidth;
    const height = this.renderer.domElement.clientHeight;
    for (const [id, label] of this.labels) {
      const object = id === 'sun' && state.frame === 'galaxy'
        ? this.galaxySunMarker
        : id === 'sun'
          ? this.sunMesh
          : this.planetMeshes.get(id);
      const visible = Boolean(object?.visible) && state.viewOptions.labels && (state.frame !== 'galaxy' || id === 'sun');
      label.hidden = !visible;
      if (!object || !visible) continue;
      const cameraDistance = this.camera.position.distanceTo(this.controls.target);
      if (cameraDistance > 180 && ['mercury', 'venus', 'earth', 'mars'].includes(id)) {
        label.hidden = true;
        continue;
      }
      const position = new THREE.Vector3();
      object.getWorldPosition(position);
      position.project(this.camera);
      const behind = position.z < -1 || position.z > 1;
      label.hidden = behind;
      if (behind) continue;
      label.style.left = `${(position.x * 0.5 + 0.5) * width}px`;
      label.style.top = `${(-position.y * 0.5 + 0.5) * height - 18}px`;
      label.setAttribute('aria-current', String(state.selectedBody === id));
    }
  }

  private applyCamera(state: SceneState, nowMs: number): void {
    if (state.bookmark === this.currentBookmark && state.frame === this.currentFrame) return;
    this.currentBookmark = state.bookmark;
    this.currentFrame = state.frame;

    let position = new THREE.Vector3(18, 28, 70);
    let target = new THREE.Vector3(0, 0, 0);
    if (state.frame === 'galaxy') {
      position = new THREE.Vector3(0, 115, 155);
    } else if (state.frame === 'space' && state.bookmark === 'full') {
      position = new THREE.Vector3(380, 240, 500);
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
          position = new THREE.Vector3(380, 240, 500);
          break;
      }
    }

    this.cameraTween = {
      start: this.camera.position.clone(),
      end: position,
      target,
      startedAt: state.reducedMotion ? nowMs - 1_500 : nowMs,
    };
  }

  private startCameraMove(position: THREE.Vector3, target: THREE.Vector3): void {
    this.cameraTween = { start: this.camera.position.clone(), end: position, target, startedAt: performance.now() };
  }

  private updateCameraTween(reducedMotion: boolean, nowMs: number): void {
    if (!this.cameraTween) return;
    const duration = reducedMotion ? 1 : 1_250;
    const progress = Math.min(1, (nowMs - this.cameraTween.startedAt) / duration);
    const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    this.camera.position.lerpVectors(this.cameraTween.start, this.cameraTween.end, eased);
    this.controls.target.lerp(this.cameraTween.target, Math.min(1, eased + 0.08));
    if (progress >= 1) this.cameraTween = null;
  }

  private handlePointer(event: PointerEvent): void {
    if (!this.currentState || this.currentState.frame === 'galaxy') return;
    const bounds = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets: THREE.Object3D[] = [this.sunMesh, ...this.planetMeshes.values()];
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    if (!hit) return;
    const id = hit.object.userData.planetId as PlanetId | undefined;
    this.onSelect(id ?? 'sun');
  }

  private applyQuality(preference: QualityPreference): void {
    const quality = preference === 'auto' ? 'high' : preference;
    const pixelRatio = quality === 'high' ? 2 : quality === 'balanced' ? 1.5 : 1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatio));
    const starCount = quality === 'high' ? 7_500 : quality === 'balanced' ? 4_500 : 2_300;
    const galaxyCount = quality === 'high' ? 18_000 : quality === 'balanced' ? 11_000 : 6_000;
    this.starField.geometry.setDrawRange(0, starCount);
    this.galaxyStars.geometry.setDrawRange(0, galaxyCount);
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
