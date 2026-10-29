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
