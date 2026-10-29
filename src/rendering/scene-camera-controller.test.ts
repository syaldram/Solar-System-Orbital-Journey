import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import { createInitialExperienceState, transitionExperience, updateExperience, type ExperienceAction, type ExperienceState } from '../experience/experience-state';
import { SceneCameraController, type SceneCameraState } from './scene-camera-controller';

const damping = vi.hoisted(() => ({ delta: 0 }));

vi.mock('three/addons/controls/OrbitControls.js', async () => {
  const { Vector3 } = await import('three');
  return {
    OrbitControls: class {
      target = new Vector3();
      enableDamping = true;
      constructor(private readonly camera: THREE.PerspectiveCamera) {}
      addEventListener() {}
      update() {
        this.camera.position.x += damping.delta;
        damping.delta = this.enableDamping ? damping.delta * 0.9 : 0;
      }
    },
  };
});

function cameraState(state: ExperienceState): SceneCameraState {
  return {
    gravity: state.presentation.kind === 'gravity',
    heliosphere: state.presentation.kind === 'heliosphere',
    bookmark: state.cameraBookmark,
    cameraRevision: state.cameraRevision,
    followedPlanet: state.followedPlanet,
    frame: state.frame,
    reducedMotion: state.reducedMotion,
  };
}

function setup() {
  damping.delta = 0;
  const camera = new THREE.PerspectiveCamera();
  const earth = new THREE.Mesh();
  earth.position.set(40, 4, 10);
  const controller = new SceneCameraController(camera, {} as HTMLCanvasElement, new THREE.Mesh(), new Map([['earth', earth]]));
  let state = createInitialExperienceState(new Date('2026-10-29T00:00:00Z'));
  controller.render(cameraState(state), 0);
  camera.position.set(20, 35, 70);
  controller.controls.target.set(3, 4, 5);
  const original = camera.position.clone();
  const target = controller.controls.target.clone();
  return {
    camera, controller, original, target,
    dispatch(action: ExperienceAction) {
      const transition = transitionExperience(state, action);
      state = transition.state;
      if (transition.handoff) controller.handlePresentationHandoff(transition.handoff, cameraState(state), 100);
      return transition;
    },
    render(now = 1_000) { controller.render(cameraState(state), now); },
  };
}

describe('ordered presentation camera handoffs', () => {
  it.each([
    ['enter-gravity', 'leave-gravity'],
    ['enter-gravity', 'leave-gravity', 'enter-gravity', 'leave-gravity'],
  ] as const)('restores every matching session without an intervening render: %j', (...actions) => {
    const app = setup();
    for (const type of actions) app.dispatch({ type });
    app.render();
    app.render(2_000);
    expect(app.camera.position.toArray()).toEqual(app.original.toArray());
    expect(app.controller.controls.target.toArray()).toEqual(app.target.toArray());
  });

  it('captures before draining damping and cancels pending Focus, tween and Follow movement', () => {
    const app = setup();
    app.dispatch({ type: 'select', body: 'earth' });
    app.dispatch({ type: 'toggle-planet-follow', planet: 'earth' });
    app.render(10); // Starts a Follow tween.
    const visible = app.camera.position.clone();
    const target = app.controller.controls.target.clone();
    app.controller.focus('earth'); // Also leave a command pending before entry.
    damping.delta = 7;
    app.dispatch({ type: 'enter-gravity' });
    app.render(400);
    app.dispatch({ type: 'leave-gravity' });
    app.render(5_000);
    app.render(10_000);
    expect(app.camera.position.toArray()).toEqual(visible.toArray());
    expect(app.controller.controls.target.toArray()).toEqual(target.toArray());
    expect(damping.delta).toBe(0);
  });

  it('ignores mismatched Back/discard and rejects stale Back after discarding a session', () => {
    const app = setup();
    const entered = app.dispatch({ type: 'enter-gravity' });
    app.controller.handlePresentationHandoff({ kind: 'back', presentation: 'gravity', sessionId: 999 }, cameraState(entered.state), 200);
    app.controller.handlePresentationHandoff({ kind: 'discard', presentation: 'gravity', sessionId: 999 }, cameraState(entered.state), 200);
    app.dispatch({ type: 'leave-gravity' });
    expect(app.camera.position.toArray()).toEqual(app.original.toArray());
    app.dispatch({ type: 'enter-gravity' });
    app.dispatch({ type: 'return-home' });
    const destination = app.camera.position.clone();
    expect(destination.toArray()).not.toEqual(app.original.toArray());
    app.controller.handlePresentationHandoff({ kind: 'back', presentation: 'gravity', sessionId: 2 }, cameraState(updateExperience(entered.state, { type: 'leave-gravity' })), 300);
    expect(app.camera.position.toArray()).toEqual(destination.toArray());
    // A fresh session captures this destination, never the discarded pose.
    app.dispatch({ type: 'enter-gravity' });
    app.dispatch({ type: 'leave-gravity' });
    app.render();
    expect(app.camera.position.toArray()).toEqual(destination.toArray());
  });

  it('uses the destination composition after discard with its normal reduced-motion policy', () => {
    for (const reducedMotion of [false, true]) {
      const app = setup();
      app.dispatch({ type: 'set-reduced-motion', enabled: reducedMotion });
      app.dispatch({ type: 'enter-gravity' });
      const schematic = app.camera.position.clone();
      app.dispatch({ type: 'return-home' });
      if (!reducedMotion) expect(app.camera.position.toArray()).toEqual(schematic.toArray());
      app.render(1_000);
      expect(app.camera.position.toArray()).toEqual([14, 24, 62]);
      expect(app.controller.controls.target.toArray()).toEqual([6, 0, 0]);
    }
  });

  it('retains a restored pose even when schematic bookmarks changed', () => {
    const app = setup();
    app.dispatch({ type: 'enter-gravity' });
    app.dispatch({ type: 'set-bookmark', bookmark: 'outer' });
    app.render();
    app.dispatch({ type: 'leave-gravity' });
    app.render();
    expect(app.camera.position.toArray()).toEqual(app.original.toArray());
  });
});

describe('heliosphere camera handoffs', () => {
  it.each([
    ['enter-heliosphere', 'leave-heliosphere'],
    ['enter-heliosphere', 'leave-heliosphere', 'enter-heliosphere', 'leave-heliosphere'],
  ] as const)('restores every matching session without an intervening render: %j', (...actions) => {
    const app = setup();
    for (const type of actions) app.dispatch({ type });
    app.render();
    app.render(2_000);
    expect(app.camera.position.toArray()).toEqual(app.original.toArray());
    expect(app.controller.controls.target.toArray()).toEqual(app.target.toArray());
  });

  it('captures before draining damping and cancels pending Focus, tween and Follow movement', () => {
    const app = setup();
    app.dispatch({ type: 'select', body: 'earth' });
    app.dispatch({ type: 'toggle-planet-follow', planet: 'earth' });
    app.render(10); // Starts a Follow tween.
    const visible = app.camera.position.clone();
    const target = app.controller.controls.target.clone();
    app.controller.focus('earth'); // Also leave a command pending before entry.
    damping.delta = 7;
    app.dispatch({ type: 'enter-heliosphere' });
    app.render(400);
    app.dispatch({ type: 'leave-heliosphere' });
    app.render(5_000);
    app.render(10_000);
    expect(app.camera.position.toArray()).toEqual(visible.toArray());
    expect(app.controller.controls.target.toArray()).toEqual(target.toArray());
    expect(damping.delta).toBe(0);
  });

  it('ignores mismatched Back/discard and rejects stale Back after discarding a session', () => {
    const app = setup();
    const entered = app.dispatch({ type: 'enter-heliosphere' });
    app.controller.handlePresentationHandoff({ kind: 'back', presentation: 'heliosphere', sessionId: 999 }, cameraState(entered.state), 200);
    app.controller.handlePresentationHandoff({ kind: 'discard', presentation: 'heliosphere', sessionId: 999 }, cameraState(entered.state), 200);
    app.dispatch({ type: 'leave-heliosphere' });
    expect(app.camera.position.toArray()).toEqual(app.original.toArray());
    app.dispatch({ type: 'enter-heliosphere' });
    app.dispatch({ type: 'return-home' });
    const destination = app.camera.position.clone();
    expect(destination.toArray()).not.toEqual(app.original.toArray());
    app.controller.handlePresentationHandoff({ kind: 'back', presentation: 'heliosphere', sessionId: 2 }, cameraState(updateExperience(entered.state, { type: 'leave-heliosphere' })), 300);
    expect(app.camera.position.toArray()).toEqual(destination.toArray());
    // A fresh session captures this destination, never the discarded pose.
    app.dispatch({ type: 'enter-heliosphere' });
    app.dispatch({ type: 'leave-heliosphere' });
    app.render();
    expect(app.camera.position.toArray()).toEqual(destination.toArray());
  });

  it('uses the destination composition after discard with its normal reduced-motion policy', () => {
    for (const reducedMotion of [false, true]) {
      const app = setup();
      app.dispatch({ type: 'set-reduced-motion', enabled: reducedMotion });
      app.dispatch({ type: 'enter-heliosphere' });
      const schematic = app.camera.position.clone();
      app.dispatch({ type: 'return-home' });
      if (!reducedMotion) expect(app.camera.position.toArray()).toEqual(schematic.toArray());
      app.render(1_000);
      expect(app.camera.position.toArray()).toEqual([14, 24, 62]);
      expect(app.controller.controls.target.toArray()).toEqual([6, 0, 0]);
    }
  });

  it('retains a restored pose even when schematic bookmarks changed', () => {
    const app = setup();
    app.dispatch({ type: 'enter-heliosphere' });
    app.dispatch({ type: 'set-bookmark', bookmark: 'outer' });
    app.render();
    app.dispatch({ type: 'leave-heliosphere' });
    app.render();
    expect(app.camera.position.toArray()).toEqual(app.original.toArray());
  });
});

it('heliosphere camera commands orbit/pan/zoom without changing Follow and avoid body interiors', () => {
  const app = setup();
  app.dispatch({ type: 'enter-heliosphere' });
  app.render();
  const original = app.camera.position.clone();
  app.controller.navigate('orbit-left');
  expect(app.camera.position.toArray()).not.toEqual(original.toArray());
  const beforePan = app.controller.controls.target.clone();
  app.controller.navigate('pan-up');
  expect(app.controller.controls.target.toArray()).not.toEqual(beforePan.toArray());
  const distance = app.camera.position.distanceTo(app.controller.controls.target);
  app.controller.navigate('zoom-in');
  expect(app.camera.position.distanceTo(app.controller.controls.target)).toBeCloseTo(distance * 0.8);
  app.camera.position.set(0, 0, 0);
  app.render();
  expect(app.camera.position.length()).toBeGreaterThan(0);
});

it.each([0.4, 390 / 844, 0.6, 0.72, 0.8, 1, 1.1, 1.23, 16 / 9])('fits actual cutaway vertices on entry and Reset at aspect %s', async (aspect) => {
  const { HeliospherePresentation } = await import('./heliosphere-presentation');
  const camera = new THREE.PerspectiveCamera(43, aspect, 0.002, 5000);
  const controller = new SceneCameraController(camera, {} as HTMLCanvasElement, new THREE.Mesh(), new Map());
  const presentation = new HeliospherePresentation();
  const state = { ...cameraState(createInitialExperienceState(new Date('2026-10-29'))), heliosphere: true };
  const assertBounds = () => {
    camera.lookAt(controller.controls.target);
    camera.updateMatrixWorld();
    presentation.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return;
      const vertices = object.geometry.getAttribute('position');
      for (let i = 0; i < vertices.count; i++) {
        const projected = new THREE.Vector3().fromBufferAttribute(vertices, i).project(camera);
        expect(Math.abs(projected.x)).toBeLessThan(1);
        expect(Math.abs(projected.y)).toBeLessThan(1);
        expect(projected.z).toBeGreaterThan(-1);
        expect(projected.z).toBeLessThan(1);
      }
    });
  };
  controller.render(state, 0);
  assertBounds();
  controller.navigate('zoom-in');
  controller.reset();
  controller.render(state, 1000);
  assertBounds();
  presentation.dispose();
});

it.each(['saturn', 'uranus', 'earth'] as const)('keeps mapped %s globe and rings outside camera near plane', async (id) => {
  const { mapHeliospherePosition, heliosphereBodyRadius } = await import('./heliosphere-mapping');
  const { planetDisplayRadius } = await import('./display-scale');
  const body = new THREE.Mesh();
  const mapped = mapHeliospherePosition({ x: 8, y: 4, z: 0.2 });
  body.position.set(mapped.x, mapped.y, mapped.z);
  body.scale.setScalar(heliosphereBodyRadius(id) / planetDisplayRadius(id));
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1);
  const sun = new THREE.Mesh(); sun.visible = false;
  const controller = new SceneCameraController(camera, {} as HTMLCanvasElement, sun, new Map([[id, body]]));
  const state = { ...cameraState(createInitialExperienceState(new Date('2026-10-29'))), heliosphere: true };
  controller.render(state, 0);
  camera.position.copy(body.position).add(new THREE.Vector3(0.01, 0, 0));
  controller.render(state, 1);
  const factor = id === 'saturn' ? 2.35 : id === 'uranus' ? 2.05 : 1.25;
  expect(camera.position.distanceTo(body.position)).toBeCloseTo(heliosphereBodyRadius(id) * factor + camera.near, 10);
});
