---
title: 'Story 1.1 — Reliable Gravity entry and return'
type: 'refactor'
created: '2026-10-29'
status: 'done'
baseline_commit: '5cfebec7977c6079b7a858a09345707620a1498f'
route: 'dispatch'
story_key: '1-1-reliably-enter-and-return-from-sun-s-gravity'
review_loop_iteration: 0
context:
  - _bmad-output/implementation-artifacts/epic-1-context.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture/architecture-Solar-System-Orbital-Journey-2026-10-28/ARCHITECTURE-SPINE.md
  - docs/PRD.md
  - docs/SCIENCE.md
  - docs/agents/architecture.md
  - docs/agents/testing.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Gravity lifecycle adapters infer transitions independently, and the camera samples only the final state each frame. Rapid actions can lose handoffs or reuse another session’s camera pose.

**Approach:** Implement Story 1.1’s eight acceptance criteria: one Experience-owned discriminated presentation state, session-associated return context and ordered accepted enter/Back/discard intent shared by camera and interface.

## Boundaries & Constraints

**Always:** Preserve the existing Gravity experience and scientific contracts, including heliocentric schematic snapshots, physical cards, shared planetary time, Galactic isolation, overlays, reduced motion, URL/storage allowlists and WebGL fallback. Experience owns deterministic intent; camera alone owns Three.js poses. Update PRD/SCIENCE alongside any contract clarification.

**Never:** Add heliosphere behavior, placeholders for unimplemented modes, scientific frames/clocks, visual/mapping changes, assets, dependencies, persistence, deployment or remote operations. Do not change the approved planning artifacts.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Enter | Free exploration in Sun or Space | Capture frame/bookmark/selection and camera once; retain date/speed, pause, end Follow, clear trails, focus Back | Duplicate, Galaxy or tour entry emits no handoff |
| Back | Active session after exploration | Restore matching saved view/camera/valid selection; retain explored date/speed, pause, Follow off, clear trails, focus entry | Back without session cannot restore stale data |
| Rapid actions | Enter→Back, Back→enter, enter→Back→enter before rendering | Process every accepted handoff in order; fresh sessions capture fresh context | Final-state sampling must not drop intermediate actions |
| Discard | Home, Begin/Replay Journey; programmatic frame exit | Discard session/pose and use destination behavior; later entry captures afresh | Never treat discard as camera-restoring Back or focus hidden schematic controls |
| Camera motion | Pending Focus, tween, damping or Follow during handoff | Cancel residual movement and preserve the visible captured pose; restoration survives later renders | A mismatched session cannot restore another pose |
| Existing use | Selection, playback/scrub, Focus/Follow/Reset, options/share | Preserve Gravity behavior, truthful cards and unavailable-option explanations; scientific preferences survive Back | No session or pose enters URL/storage |

</frozen-after-approval>

## Code Map

- `src/experience/experience-state.ts`: `gravityReturn`, enter/leave and recursive exits.
- `src/main.ts`: `dispatch`, snapshot/Focus/share guards; interface updates synchronously, camera on RAF.
- `src/rendering/scene-camera-controller.ts`: `render`, boolean edges, revision-only `returnPose` and pending moves.
- `src/rendering/orbital-scene.ts`: `SceneState`, camera delegation; retain mapping/presentation.
- `src/interface/app-interface.ts`: `render` infers focus from boolean edges.
- `src/experience/experience-state.test.ts`, `tests/app.spec.ts`: reuse Gravity session, restoration, Focus, touch and serialization coverage.

## Tasks & Acceptance

**Execution:**
- [x] `src/experience/experience-state.ts` — replace the parallel Gravity return flag with scientific/Gravity presentation variants, monotonic session identity and accepted lifecycle intent; distinguish Back from discard.
- [x] `src/rendering/scene-camera-controller.ts`, `src/rendering/orbital-scene.ts` — consume ordered handoffs, own one matching saved pose, clear residual motion and prevent composition from overwriting restoration.
- [x] `src/interface/app-interface.ts`, `src/main.ts` — wire the same accepted handoffs to camera/focus and migrate all guards without moving feature policy into main.
- [x] `src/experience/experience-state.test.ts`, `src/rendering/scene-camera-controller.test.ts` — cover every matrix row’s deterministic outcomes, session mismatch/rejection, discard and ordered actions without a render.
- [x] `tests/app.spec.ts` — extend observable rapid-action/discard/damping regressions; reuse origin, multi-marker, focus, Follow, options and serialization flows.
- [x] `docs/PRD.md`, `docs/SCIENCE.md` — reconcile only affected contract wording if needed; preserve astronomy and display formulas.

**Acceptance Criteria:**
- Given Story 1.1, when implementation is audited, then all eight source criteria are met, including unchanged scientific view identities and existing Gravity controls.
- Given all matrix scenarios, when verification runs, then deterministic tests and observable browser regressions pass, with explicit evidence for each row.

## Implementation Notes

- Experience now owns `PresentationState` (`scientific` or `gravity`), a monotonic session identity and the session's scientific return context. `transitionExperience` produces accepted enter/Back/discard handoffs; the composition root delivers each one synchronously to the camera and interface before another action or RAF can hide it.
- The camera owns one session-associated pose. It captures before draining OrbitControls damping, cancels pending Focus/Follow/tween movement, restores only matching Back and records composition identity so later rendering preserves the restored pose. Discard drops the pose and uses the destination composition's existing tween/reduced-motion behavior.
- Interface focus consumes the same handoff: Back on entry, Sun's Gravity on Back, and no schematic focus override on discard. Scientific snapshot, sharing and overlay guards now read the presentation discriminant.
- PRD/SCIENCE clarify lifecycle ownership and discard semantics. Gravity mapping, geometry, scientific values, clock identities, assets, dependencies and URL/storage allowlists are unchanged.

### Acceptance-matrix evidence

| Matrix row | Evidence |
| --- | --- |
| Enter | Existing reducer session/eligibility tests, accepted-intent rejection test, three scientific-origin browser flows and entry/Back focus assertions. |
| Back | Existing reducer explored date/speed/context test; matching-pose/composition camera tests; three scientific-origin multi-marker browser restorations. |
| Rapid actions | Ordered monotonic-intent reducer test; camera sequences without render; browser rapid duplicate entry/Back/re-entry sequence. |
| Discard | Parameterized reducer Home/Begin/Replay/programmatic frame-exit tests; camera mismatch/discard/fresh-session and destination-motion tests; browser Home/Begin/Replay flow. |
| Camera motion | Camera pending Focus/Follow/tween/damping cancellation test; browser Focus-transition and released-drag damping captures with settled multi-marker restoration. |
| Existing use | Existing Gravity inspection/Focus/Follow/Reset/playback/options/phone/touch/serialization browser flows and baseline clock/sharing/preference unit/browser tests. WebGL construction fallback boundary remains unchanged. |

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Evidence and route |
| --- | --- | --- |
| Blind 1: damping may settle before capture | low | The browser test released a real drag without proving remaining movement. Patched: both markers must move between consecutive rendered frames immediately before entry; final full browser verification passes. |
| Blind 2: unit damping fixture omits real rotation/pan | low | The fixture intentionally isolates cancellation; grouped with Blind 1/3. Patched real OrbitControls coverage exercises both rotation and pan rather than duplicating the dependency in a mock; final full browser verification passes. |
| Blind 3: residual pan lacks browser coverage | low | The original regression exercised rotation only. Patched with the same live-damping/restoration check for secondary-button pan; all three browser engines pass. |
| Blind 4: assert a named destination focus | false | The contract preserves established destination focus; it does not introduce a new opening/journey focus target. Existing Home/enter/replay handlers retain their behavior, and discard deliberately supplies no schematic focus override. |
| Blind 5: programmatic frame-exit browser matrix | low | Reducer tests exercise same-frame and Galaxy discard, and all discard destinations share the tested camera handoff. Reject extra browser setup: hidden programmatic navigation is not an everyday visitor action and no distinct adapter failure was demonstrated. |
| Blind 6: rapid discard/re-entry browser sequence | low | Ordered reducer and camera tests already cover discard followed by fresh entry without rendering; the browser covers rapid handoffs and Home/fresh entry separately. Reject additional setup for a rare programmatic combination; no different production branch or failing outcome was identified. |
| Blind 7: two markers cannot prove the full pose | false | Controller tests assert exact three-dimensional position and target after later renders; real OrbitControls derives orientation from that target with unchanged projection/up. Multi-marker browser checks supplement those exact assertions. |
| Blind 8: complete state at scene handoff boundary | false | Rendering already consumes Experience-owned typed state. This method reads six readonly fields and forwards a narrow SceneCameraState; it neither serializes nor depends on unrelated fields. No diverging caller or violated ownership rule was identified. |
| Blind 9: sprint status lags review state | low | Story tracking lagged the spec. Patched to review with last_updated refreshed; normal completion synchronization follows this gate. |
| Blind 10: durable revision/environment evidence | low | Baseline commit and exact commands are recorded; verification describes the uncommitted tree and local reports. Reject the proposed fix because it edits this build's spec; committed-release evidence is not claimed. |

## Design Notes

No intent gaps or irreversible actions; cross-module footprint requires dispatch. Story 1.2 extends the union later. Use synchronous typed handoffs or a bounded ordered queue retaining transition context, never final-state sampling. Capture before draining damping. Saved selection is already a validated body ID. Reserve entry-button focus for Back; preserve destination focus on discard.

## Verification

- `npm run check` — typecheck, lint, unit tests and production build pass.
- `npm run test:e2e` — full Chromium/Firefox/WebKit regression at the repository base path passes; use `settledBoundingBox` for camera measurements.
- `git diff --check` — no whitespace errors.
- Report unverified current Safari/hardware performance behavior and retained intentional schematic approximations; claim no new measured release evidence.

### Implementation verification record

- Final `npm run check` passed: typecheck, lint, all 68 unit tests across 9 files and production build. The existing large-chunk build advisory remains.
- Rotation and pan damping browser regressions passed Chromium, Firefox and WebKit. Both prove movement between consecutive rendered frames immediately before capture, then verify settled restoration.
- Final post-review `npm run test:e2e -- --workers=3` passed at the repository base path: 125 passed and 1 pre-existing Firefox touch-emulation skip across Chromium, Firefox and WebKit (126 total, 2.6 minutes). The final run has no failures; an earlier run overlapping the final controller edit timed out in an unchanged Galactic-marker test, which passed in the clean rerun.
- `git diff --check` passed. Browser per-test results are in `playwright-report/index.html`; an extracted machine-readable report is at `/private/tmp/story-1-1-verification.json` (local verification artifacts, not bundled resources).
- Current Safari manual release checks and representative-device performance remain unverified. Existing Gravity's compressed radial mapping, exaggerated body/well sizes and illustrative surface height remain intentional; no new measured release or visitor-learning evidence is claimed.
