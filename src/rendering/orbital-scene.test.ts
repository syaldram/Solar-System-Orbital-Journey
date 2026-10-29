import * as THREE from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { OrbitalScene, resolveSceneSelection, type SceneState } from './orbital-scene';
import { PLANET_IDS } from '../astronomy/planet-data';
import { calculateSystemSnapshot } from '../astronomy/reference-frames';
import { calculateOrbitPath } from '../astronomy/solar-system';
import { createInitialExperienceState, getAlongPathMotion } from '../experience/experience-state';
import type { HeliospherePresentation } from './heliosphere-presentation';
import { mapHeliospherePosition } from './heliosphere-mapping';

const capture = vi.hoisted(() => ({ scene: null as THREE.Scene | null, camera: null as THREE.PerspectiveCamera | null }));
vi.mock('three', async (original) => {
  const actual = await original<typeof THREE>();
  return { ...actual, WebGLRenderer: class {
    domElement = { clientWidth: 1280, clientHeight: 720, addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }) };
    capabilities = { getMaxAnisotropy: () => 1 };
    setClearColor() {} setPixelRatio() {} setSize() {} dispose() {}
    render(scene: THREE.Scene, camera: THREE.PerspectiveCamera) { scene.updateMatrixWorld(); capture.scene = scene; capture.camera = camera; }
  }, TextureLoader: class { load() {} } };
});
vi.mock('three/addons/controls/OrbitControls.js', () => ({ OrbitControls: class {
  target = new THREE.Vector3();
  addEventListener() {} update() {} dispose() {}
} }));
vi.mock('./scene-labels', () => ({ SceneLabels: class { render() {} clearHover() {} hitTest() { return null; } updateHover() {} } }));
vi.mock('./path-guide-presentation', () => ({ PathGuidePresentation: class {
  root = new THREE.Group(); render() {} projectLabels() {}
} }));
vi.mock('./galaxy-presentation', () => ({ GalaxyPresentation: class {
  root = new THREE.Group(); sunMarker = new THREE.Mesh(); render() {}
} }));
vi.mock('./procedural-materials', () => ({
  seededRandom: () => () => 0.5,
  createCoronaTexture: () => new THREE.Texture(), createGlowTexture: () => new THREE.Texture(),
  createRingTexture: () => new THREE.Texture(), createEarthCloudTexture: () => new THREE.Texture(), createUranusTexture: () => new THREE.Texture(),
  createAtmosphereMaterial: () => new THREE.MeshBasicMaterial(),
  createSunMaterial: () => new THREE.ShaderMaterial({ uniforms: { time: { value: 0 } } }),
}));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('integrates mapped mesh/path geometry and retained decorative animation through pause/reduced/resume', () => {
  vi.stubGlobal('window', { devicePixelRatio: 1, addEventListener() {}, requestIdleCallback() {} });
  vi.spyOn(performance, 'now').mockReturnValue(0);
  const scene = new OrbitalScene({ canvas: { addEventListener() {} } as unknown as HTMLCanvasElement, labelLayer: {} as HTMLElement, assetBase: '/', onSelect() {}, onQualityAdapted() {} });
  const instant = new Date('2042-03-14T12:30:00Z');
  const initial = createInitialExperienceState(instant);
  const paths = Object.fromEntries(PLANET_IDS.map((id) => [id, calculateOrbitPath(id, instant)])) as Parameters<OrbitalScene['setOrbitPaths']>[0];
  scene.setOrbitPaths(paths);
  const state: SceneState = {
    snapshot: calculateSystemSnapshot(instant, instant, 'sun'), gravity: false, heliosphere: false,
    frame: 'sun', bookmark: 'inner', cameraRevision: 0, selectedBody: null, followedPlanet: null,
    viewOptions: initial.viewOptions, quality: 'high', reducedMotion: false,
    rotations: Object.fromEntries(PLANET_IDS.map((id) => [id, 1.7])) as SceneState['rotations'],
    rotationStabilized: false, trailRevision: 0, journeyProgress: 0,
    pathMotion: getAlongPathMotion(initial), galacticProgress: 0,
  };
  scene.render(state, 0);
  const sun = capture.scene?.getObjectByName('sun');
  if (!(sun instanceof THREE.Mesh) || !(sun.material instanceof THREE.ShaderMaterial) || !sun.parent) throw new Error('Missing actual solar presentation');
  const planets = PLANET_IDS.map((id) => {
    const mesh = capture.scene?.getObjectByName(id);
    if (!(mesh instanceof THREE.Mesh)) throw new Error('Missing actual planet');
    return mesh;
  });
  const decoration = () => ({
    time: sun.material instanceof THREE.ShaderMaterial ? sun.material.uniforms.time?.value : null,
    transforms: sun.parent?.children.filter((object) => object instanceof THREE.Sprite).map((object) => ({ scale: object.scale.toArray(), rotation: object.material.rotation, opacity: object.material.opacity })),
    spin: planets.map((mesh) => mesh.rotation.y),
  });
  const heliosphere = { ...state, heliosphere: true, rotationStabilized: true };
  scene.render(heliosphere, 100);
  const frozen = decoration();
  scene.render(heliosphere, 5000);
  expect(decoration()).toEqual(frozen);
  const playing = { ...heliosphere, pathMotion: { ...heliosphere.pathMotion, isPlaying: true } };
  scene.render(playing, 5010);
  planets.forEach((mesh) => expect(mesh.rotation.y).toBeCloseTo(1.7 + 10 * 0.00008, 12));
  expect(decoration()).not.toEqual(frozen);
  const beforeReduced = decoration();
  scene.render({ ...playing, reducedMotion: true }, 6000);
  expect(decoration()).toEqual(beforeReduced);
  scene.render({ ...playing, reducedMotion: true }, 9000);
  expect(decoration()).toEqual(beforeReduced);
  scene.render(playing, 9010);
  planets.forEach((mesh) => expect(mesh.rotation.y).toBeCloseTo(1.7 + 20 * 0.00008, 12));
  const resumed = decoration();
  scene.render(heliosphere, 10000);
  expect(decoration()).toEqual(resumed);
  // Compare the actual generated and visible heliosphere geometry, not a second mapping-only path.
  planets.forEach((mesh, index) => {
    const body = heliosphere.snapshot.planets[index];
    if (!body) throw new Error('Missing snapshot');
    const mapped = mapHeliospherePosition(body.position);
    expect(mesh.getWorldPosition(new THREE.Vector3()).toArray()).toEqual([mapped.x, mapped.y, mapped.z]);
  });
  const visiblePaths: THREE.Line[] = [];
  capture.scene?.traverse((object) => { if (object instanceof THREE.Line && object.visible && object.parent === sun.parent?.parent) visiblePaths.push(object); });
  expect(visiblePaths).toHaveLength(8);
  for (const [index, id] of PLANET_IDS.entries()) {
    const vertices = visiblePaths[index]?.geometry.getAttribute('position');
    expect(vertices?.count).toBe(paths[id].length);
    paths[id].forEach((point, i) => {
      const mapped = mapHeliospherePosition(point);
      expect(vertices?.getX(i)).toBeCloseTo(mapped.x, 4);
      expect(vertices?.getY(i)).toBeCloseTo(mapped.y, 4);
      expect(vertices?.getZ(i)).toBeCloseTo(mapped.z, 4);
    });
  }
  scene.render({ ...heliosphere, viewOptions: { ...heliosphere.viewOptions, orbitPaths: false } }, 10001);
  expect(visiblePaths.every((line) => !line.visible)).toBe(true);
  scene.dispose();
});

it('picks every region from the actual renderer-delivered geometry and respects hidden ancestors', () => {
  vi.stubGlobal('window', { devicePixelRatio: 1, addEventListener() {}, requestIdleCallback() {} });
  const instant = new Date('2042-03-14T12:30:00Z');
  const initial = createInitialExperienceState(instant);
  const handlers = new Map<string, (event: PointerEvent) => void>();
  const onSelect = vi.fn();
  const canvas = { addEventListener(type: string, handler: (event: PointerEvent) => void) { handlers.set(type, handler); } };
  const scene = new OrbitalScene({ canvas: canvas as unknown as HTMLCanvasElement, labelLayer: {} as HTMLElement, assetBase: '/', onSelect, onQualityAdapted() {} });
  const renderState: SceneState = {
    snapshot: calculateSystemSnapshot(instant, instant, 'sun'), gravity: false, heliosphere: true,
    frame: 'sun', bookmark: 'inner', cameraRevision: 0, selectedBody: null, followedPlanet: null,
    viewOptions: initial.viewOptions, quality: 'high', reducedMotion: false,
    rotations: Object.fromEntries(PLANET_IDS.map((id) => [id, 0])) as SceneState['rotations'],
    rotationStabilized: false, trailRevision: 0, journeyProgress: 0,
    pathMotion: getAlongPathMotion(initial), galacticProgress: 0,
  };
  scene.render(renderState, 0);
  const regions: HeliospherePresentation['drawables'] = [];
  capture.scene?.traverse((object) => {
    if (['solar-wind', 'termination-shock', 'heliosheath', 'heliopause', 'interstellar-space'].includes(object.name)) {
      regions.push({ object, region: object.name as typeof regions[number]['region'], layer: object.name === 'termination-shock' ? 'terminationShock' : 'outerHeliosphere' });
    }
  });
  const camera = capture.camera;
  if (!camera) throw new Error('Missing renderer camera');
  const raycaster = new THREE.Raycaster();
  for (const [region, radius] of [['solar-wind', 70], ['termination-shock', 111], ['heliosheath', 127], ['heliopause', 144], ['interstellar-space', 158]] as const) {
    const point = new THREE.Vector3(-1.5 * radius, 0, .8 * radius).project(camera);
    raycaster.setFromCamera(new THREE.Vector2(point.x, point.y), camera);
    expect(resolveSceneSelection(raycaster, [], regions)).toEqual({ kind: 'region', region });
    const layer = region === 'termination-shock' ? 'terminationShock' : 'outerHeliosphere';
    scene.render({ ...renderState, heliosphereLayers: { outerHeliosphere: true, terminationShock: true, orbitPaths: true, labels: true, [layer]: false } }, 1);
    for (const record of regions) expect(record.object.visible).toBe(record.layer !== layer);
    expect(resolveSceneSelection(raycaster, [], regions)).not.toEqual({ kind: 'region', region });
    scene.render(renderState, 2);
  }
  // Exercise the actual registered canvas event handlers against visible
  // renderer-delivered geometry, without exposing a gesture test API.
  const point = new THREE.Vector3(-237, 0, 126.4).project(camera);
  const pointer = { pointerId: 1, clientX: (point.x * .5 + .5) * 1280, clientY: (-point.y * .5 + .5) * 720, button: 0, isPrimary: true };
  const emit = (type: string, event: Partial<PointerEvent> = {}) => handlers.get(type)?.({ ...pointer, ...event } as PointerEvent);
  emit('pointerdown'); emit('pointerup');
  expect(onSelect).toHaveBeenLastCalledWith({ kind: 'region', region: 'interstellar-space' });
  expect(onSelect).toHaveBeenCalledTimes(1);
  onSelect.mockClear();
  emit('pointerdown'); emit('pointermove', { clientX: pointer.clientX + 10 }); emit('pointerup');
  emit('pointerdown', { button: 2 }); emit('pointerup', { button: 2 });
  emit('pointerdown'); emit('pointerdown', { pointerId: 2, isPrimary: false });
  emit('pointerup', { pointerId: 2 }); emit('pointerup');
  emit('pointerdown'); emit('pointercancel'); emit('pointerup');
  expect(onSelect).not.toHaveBeenCalled();
  const root = regions[0]?.object.parent;
  if (!root) throw new Error('Missing region group');
  root.visible = false;
  expect(resolveSceneSelection(raycaster, [], regions)).toBeNull();
  root.visible = true;
  expect(resolveSceneSelection(raycaster, [], regions)).toEqual({ kind: 'region', region: 'interstellar-space' });
  const body = new THREE.Mesh(new THREE.SphereGeometry(3), new THREE.MeshBasicMaterial());
  body.userData.planetId = 'earth';
  body.position.copy(raycaster.ray.at(10, new THREE.Vector3()));
  body.updateMatrixWorld();
  expect(resolveSceneSelection(raycaster, [body], regions)).toEqual({ kind: 'body', body: 'earth' });
  expect(resolveSceneSelection(raycaster, [body], regions, 'saturn')).toEqual({ kind: 'body', body: 'saturn' });
  body.visible = false;
  expect(resolveSceneSelection(raycaster, [body], regions)).toEqual({ kind: 'region', region: 'interstellar-space' });
});
