import * as THREE from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { OrbitalScene, type SceneState } from './orbital-scene';
import { PLANET_IDS } from '../astronomy/planet-data';
import { calculateSystemSnapshot } from '../astronomy/reference-frames';
import { calculateOrbitPath } from '../astronomy/solar-system';
import { createInitialExperienceState, getAlongPathMotion } from '../experience/experience-state';
import { mapHeliospherePosition } from './heliosphere-mapping';

const capture = vi.hoisted(() => ({ scene: null as THREE.Scene | null }));
vi.mock('three', async (original) => {
  const actual = await original<typeof THREE>();
  return { ...actual, WebGLRenderer: class {
    domElement = { clientWidth: 1280, clientHeight: 720, addEventListener() {} };
    capabilities = { getMaxAnisotropy: () => 1 };
    setClearColor() {} setPixelRatio() {} setSize() {} dispose() {}
    render(scene: THREE.Scene) { scene.updateMatrixWorld(); capture.scene = scene; }
  }, TextureLoader: class { load() {} } };
});
vi.mock('three/addons/controls/OrbitControls.js', () => ({ OrbitControls: class {
  target = new THREE.Vector3();
  addEventListener() {} update() {} dispose() {}
} }));
vi.mock('./scene-labels', () => ({ SceneLabels: class { render() {} clearHover() {} } }));
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
  scene.dispose();
});
