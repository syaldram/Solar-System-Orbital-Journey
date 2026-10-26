---
title: 'Sun’s Gravity schematic scene'
type: 'feature'
created: '2026-10-26'
status: 'done'
baseline_commit: '4c87121e7660a6741ff2b8207e040a77784921a6'
route: 'dispatch'
review_loop_iteration: 0
context:
  - _bmad-output/specs/spec-sun-gravity-visualization/SPEC.md
  - _bmad-output/specs/spec-sun-gravity-visualization/visual-reference.md
  - _bmad-output/specs/spec-sun-gravity-visualization/interaction-and-verification.md
  - docs/agents/architecture.md
  - docs/agents/testing.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Visitors cannot explore the supplied gravity-sheet composition: a dominant solar depression and eight smaller depressions traveling with the planets.

**Approach:** Implement the canonical Sun’s Gravity SPEC and companions as a separate schematic presentation with a blue wire grid, golden Sun, compressed orbital spacing, calculated orbital timing, and existing Solar-System controls and planet cards.

## Boundaries & Constraints

**Always:** Preserve scientific frames, shared radius scaling, JPL calculations, physical card values and Galactic-clock isolation. Update PRD.md and SCIENCE.md. Disclose: “Schematic — distances compressed; well depths and body sizes exaggerated.” Explain sideways motion, calculated timing and the sheet analogy’s limits.

**Never:** Add frames, clocks, tour chapters, illustrative speeds, quantitative gravity claims, singularities, orbital decay, automatic camera orbit, decorative waves, imagery, runtime requests or schematic persistence.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Entry | Free exploration in Sun/Space | Semantic Sun’s Gravity button; enter paused at retained date/speed; capture return frame, camera and selection once; end Follow; focus Back | Reject entry in Galaxy or running tour; repeated entry is a no-op |
| Time | Schematic playback, scrub, endpoint/replay | Existing Solar-System semantics and calculated relative periods; Galactic state unchanged | Existing bounded timeline; no automatic loop |
| Inspect | Planet selection, Focus, Follow | Actual distance/period/speed; clarify displayed spacing; targets use schematic world positions | Selection never auto-pauses or auto-focuses |
| Back | Explored date and changed schematic selection/camera | Pause; restore prior scientific frame, camera and valid selection; retain date/speed; end Follow; focus entry button | Home/tour transitions must not strand schematic state; clear trail history on entry/exit |
| Options | Labels, paths, trails, planes, sharing | Labels/paths work; trails/planes/share unavailable with explanation; scientific overlay preferences survive Back | No schematic persistence or share encoding |

</frozen-after-approval>

## Code Map

- `src/experience/experience-state.ts`: session navigation; retain `ViewMode` and clock routing. Solar scrub preserves playback. Bypass schematic Full Journey Follow reroute.
- `src/rendering/orbital-scene.ts`: integrate via `SceneState`, `applyView`, `setOrbitPaths`, `render`; reuse meshes.
- `src/rendering/solar-presentation.ts`: Sun mesh, corona/glow and light are siblings; move together.
- `src/rendering/scene-camera-controller.ts`, `src/rendering/scene-labels.ts`: world positions already drive Follow/markers; adapt Focus radius and bypass Full Journey layout.
- `src/interface/app-interface.ts`, `index.html`, `src/main.ts`: controls/card copy and wiring; bypass schematic Full Journey Focus redirect. Keep astronomy and URL contracts intact.

## Tasks & Acceptance

**Execution:**
- [x] `src/experience/experience-state.ts`, `src/experience/experience-state.test.ts` — implement/test matrix, Follow and cleanup; preserve timeline semantics.
- [x] `src/rendering/gravity-mapping.ts`, `src/rendering/gravity-mapping.test.ts` — monotone radial compression, bounded smooth wells; test continuity, ordering, azimuth, reproducible scrubs and immutable snapshots across timeline.
- [x] `src/rendering/gravity-presentation.ts`, `src/rendering/quality-profile.ts` — reusable blue wire buffers, faded boundaries, adaptive density and disposal.
- [x] `src/rendering/orbital-scene.ts`, `src/rendering/solar-presentation.ts`, `src/rendering/scene-camera-controller.ts`, `src/rendering/scene-labels.ts` — mapped bodies/dips/paths/markers/camera; restore scientific camera/appearance.
- [x] `src/interface/app-interface.ts`, `index.html`, `src/styles.css`, `src/main.ts` — accessible navigation, truthful cards/disclosure, option reasons, responsive controls and sharing guard.
- [x] `docs/PRD.md`, `docs/SCIENCE.md` — document schematic exceptions; reconcile scientific radius wording.
- [x] `tests/app.spec.ts` — both origins, exclusions, timeline, cards, Focus/Follow/Reset/Back, preferences/share, keyboard/touch, reduced motion and quality tiers; use `settledBoundingBox`.

**Acceptance Criteria:**
- Given the oblique overview, when time plays or scrubs, then all eight distinguishable planets and their smaller depressions move together around the dominant solar well using calculated timing.
- Given a selected planet, when Focus or Follow runs, then its displayed position including surface height is the camera target; manual navigation remains available and Reset View restores the overview.
- Given low quality, reduced motion or a phone viewport, when exploring the scene, then controls/disclosure remain usable and the gravity well remains readable without lowering orbital accuracy.
- Given existing scientific views, URLs and the five-chapter tour, when exercised after the change, then their behavior and independent Galactic clock remain intact.

## Implementation Notes

Implemented as session navigation over the unchanged scientific frame and shared Solar-System clock. A pure heliocentric display mapping drives smooth Gaussian wells, bodies, paths and camera targets; scientific card values use the original snapshot. Three grid buffers are reused across visits and quality changes, with per-density input caching and disposal on scene teardown. Label leaders and schematic fill lighting preserve readability.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Evidence and route |
|---|---|---|
| Blind 1: reduced-motion schematic spin | medium | The year/decade branch uses wall-clock rotation even while paused and reduced motion is enabled. Patch the schematic branch to use the time-derived rotation under reduced motion. |
| Blind 2: detached name hit targets | medium | Marker buttons and their names inherit pointer-events:none; hitTest only checks 22px around the body, while labels are moved farther away. Patch visible schematic names to accept pointer events. |
| Blind 3: disclosure/status overlap | medium | At phone width status begins at 6.8rem and its second line/padding intersects the disclosure at 9rem; at tablet width status starts at 7.4rem against disclosure at 8rem. Patch schematic status/disclosure spacing and assert non-overlap. |
| Blind 4: sprite/texture disposal | low | The new scene teardown omits pre-existing sprites/textures, but its sole caller is non-persisted pagehide, when the document/WebGL context ends. The new grid resources are explicitly disposed. Reject: no everyday retained-resource defect demonstrated and generic texture ownership cleanup adds complexity. |
| Blind 5: paused grid recomputation | medium | Every animation frame recomputes approximately 66k high-tier vertices even with identical centers. Patch a private unchanged-input cache and verify buffer version stays stable while paused. |
| Blind 6: interleaved label measurement | low | The nine-label placement loop interleaves DOM measurement and writes. No observed jank or missed frame is established; reject an added layout pipeline without an everyday visible defect. Hardware FPS remains unverified. |
| Blind 7: labels behind interface panels | low | Labels can fall behind foreground panels after manual camera navigation; normal overview captures are readable and overlays intentionally cover scene content. Reject additional UI-obstacle routing complexity for this occasional presentation overlap. |
| Blind 8: camera restoration test breadth | low | Current preset Earth-position assertions and rapid Focus entry/Back clicks do not verify a manually moved pose using multiple bodies. Patch the existing browser flow with that direct observable regression assertion. |
| Blind 9: session-only reload coverage | low | Persistence writes only existing preferences and URL encoding is guarded, but reload/serialization assertions are absent. Patch the browser flow to exercise this contract. |
| Verification 1: actual sheet deformation unasserted | medium | Pre-verified: a flat-grid mutation preserves existing finite/reuse assertions. Patch the existing grid test to compare heights and moving local depressions at every tier. |
| Verification 2: Focus result unasserted | medium | Pre-verified: restoring the old wide-view predicate makes schematic Space/full Focus a no-op while tests still settle and pass. Patch existing origin flows to assert marker centering. |

All patch-routed findings were corrected. The active-Focus regression additionally exposed a one-frame camera-matrix lag before label projection; refreshing the matrix before labels fixed it in all three engines at the original <1px tolerance. Grid-cache/deformation tests pass at every tier; detached-name and responsive-spacing assertions pass; Focus, manual-pose restoration and reload/serialization assertions pass.

Edge-case reviewer returned no findings. No intent gaps or spec changes were required; surviving entries are direct implementation/test corrections. No layers were skipped.

## Design Notes

No intent gaps/irreversibles; cross-module change, no astronomy API changes. Preserve canonical input spec.

Transform rendering outputs from one raw heliocentric snapshot. Evaluate heights directly at mapped centers without feedback. Choose illustrative sizes/depths; retain Sun dominance and recognizable materials/rings. Suppress overlays without mutating preferences. Rendering saves camera pose; experience saves return context. Hide scientific navigation/bookmarks inside the scene.

Presentation identity must trigger composition and override scientific Full Journey transforms, path guides/projection and the controller’s wide-view Focus guard. Cancel pending Focus/tweens and residual controls motion during camera handoff. Refresh orbit-path heights against the current surface; document any visibility offset. Maintain conservative bounds for deformed buffers. Reuse one gravity presentation per scene lifetime; wire disposal into owner teardown. Test duplicate entry, rapid entry/Back during Focus, Space/full and Space/path origins, focus handoff and repeated navigation without geometry allocation.

## Verification

- `npm run check` — typecheck, lint, unit tests and production build pass.
- `npm run test:e2e` — Chromium, Firefox and WebKit flows pass at the repository base path.
- `git diff --check` — passed; no whitespace errors.
- Visually inspect oblique composition, moving local dips, focus, labels and Saturn’s rings at desktop/phone and low quality. Report any unverified current Safari or representative-hardware FPS/transfer-budget evidence.

### Executed evidence

- `npm run check`: passed, 55 unit tests across 8 files, typecheck/lint/build.
- Final full browser regression: 113 passed, 1 Firefox touch-emulation skip across Chromium/Firefox/WebKit (114 cases). Firefox non-touch flows passed; touch entry/Back passed in Chromium/WebKit. All review patches are included in this run.
- Additional matrix audit assertions: 35 state tests passed, explicitly checking selection preserves playback/camera and entry ends Follow.
- Entry and Back: state session tests plus browser flows for Sun/outer, Space/full and Space/path cover exclusions, duplicate entry, pause, retained date/speed, camera/selection restoration, focus handoff and rapid navigation during Focus.
- Time: session state tests and phone browser flow cover calculated shared playback, deterministic scrubs, endpoint/replay and Galactic isolation.
- Inspect: state selection assertions, source-snapshot mapping tests and origin browser flows cover truthful cards and schematic Focus/Follow/Reset targets.
- Options: origin/phone browser flows cover labels/paths controls, unavailable overlays/share, explanation, reduced motion, quality tiers and retained preferences; share guard and persistence retain existing scientific contracts.
- Visually inspected desktop, phone, scrubbed phone, low-quality overview and Saturn Focus captures. Intentional approximation: compressed radii, exaggerated body sizes and finite illustrative well depths; orbit paths have a documented 0.22 scene-unit visibility offset.
- Unverified: current Safari release behavior, representative laptop/phone FPS and measured transfer budgets. Vite emits its existing bundle-size advisory.
