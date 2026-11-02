---
title: 'Story 1.2 — Heliosphere cutaway overview'
type: feature
created: '2026-10-29'
status: done
baseline_revision: 27cfa69c7dce24f546213ec5f685e5bea4ba269d
baseline_commit: 27cfa69c7dce24f546213ec5f685e5bea4ba269d
review_loop_iteration: 0
followup_review_recommended: true
context:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/specs/spec-Solar-System-Orbital-Journey/heliosphere-presentation.md
  - docs/PRD.md
  - docs/SCIENCE.md
  - docs/agents/architecture.md
  - docs/agents/testing.md
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** Visitors cannot inspect planetary placement within the heliosphere. Story 1.1 established ordered schematic sessions but only Gravity uses them.

**Approach:** Implement all ten Story 1.2 criteria in epics.md: a freely navigable static elongated blue cutaway, mapped planets with existing physical cards and explicit Focus/Follow, and complete session entry/Back/discard.

## Boundaries & Constraints

**Always:** Preserve scientific calculations, three view identities, isolated clocks, existing tour/Gravity and URL/storage allowlists. Reuse ordered accepted handoffs; Experience owns return context, camera owns its matching pose. Entry/Back pause and end Follow, retain date/speed and clear trails. Use one strictly monotonic rendering mapping for bodies/paths/labels/picking/camera. Keep all eight planets inside the minimum 98% termination-shock envelope. Expose the exact scale disclosure “Schematic — distances compressed; body sizes exaggerated.” Explain illustrative geometry/tail orientation, never measured global shape or Galactic alignment. Pause/reduced motion freeze visible decoration in this presentation, while requested planetary playback remains available. Preserve fallback, static base path, semantic controls, native-key priority and phone reachability. Update PRD/SCIENCE and source credits alongside implementation.

**Never:** Add a scientific frame/clock, persistent schematic state, spacecraft, guided outward travel, forecast claims, runtime service/dependency upgrade, push or deployment. Region selection/layer controls belong to 1.3, full authoritative phase/effects lifecycle to 1.4, background to 1.5 and release measurements to 1.6. Do not defer any of Story 1.2's own criteria.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Entry | Free exploration in Sun/Space | Capture once; pause current date/speed; end Follow; focus Back; clear trails | Reject tour, Galaxy, Gravity, duplicate entry |
| Back | Explored session | Restore saved view/camera/selection, preserve explored date/speed, pause, Follow off, focus entry | Matching session only; no stale restoration |
| Discard | Home/Begin/Replay/programmatic frame exit | Ordered discard, baseline destination/focus, later entry captures afresh | Never restore discarded pose |
| Inspect | Select/Focus/Follow planet | One physical card; selection preserves playback/camera; explicit actions use mapped targets | Close/Escape/other selection/Reset end Follow; manual camera/playback/scrub retain it |
| Mapping | Sun/Space entry, any date/speed/quality | Same mapped orbital phase/order, nested shells with readable planets inside shock | No display data enters astronomy/cards |
| Camera | Mouse/touch or labeled buttons | Equivalent orbit/pan/zoom; Reset restores entire still cutaway | Prevent body clipping; native keys take precedence |
| Playback | Play/Pause/scrub/speed/endpoint/reduced motion | Original planetary timing/physical values; paused/reduced decoration freezes | No new clock/frame or Galactic advancement |
| Sharing | UI or direct serialization | Explained disabled sharing, Back restores scientific sharing | No schematic data in URLs/storage |

</intent-contract>

## Code Map

- `src/experience/experience-state.ts`: extend PresentationState, actions and transitionExperience; reuse session IDs/return context/discard; generalize schematic guards.
- `src/rendering/heliosphere-mapping.ts` and `heliosphere-presentation.ts` (new): rendering-only mapping/radii and allocated disposable nested elongated cutaway.
- `src/rendering/orbital-scene.ts`: applyView maps existing textured meshes/rings, paths, labels and selection; suppress scientific overlays/background; dispose resources. Existing Focus derives world position/scale.
- `src/rendering/scene-camera-controller.ts`: synchronous handlePresentationHandoff owns saved pose/damping cancellation; add overview/navigation/body constraints.
- `src/rendering/scene-labels.ts`: mapped meshes drive markers; use readable schematic layout.
- `src/rendering/solar-presentation.ts`, stabilized spin in orbital-scene.ts: existing independent performance clocks need a heliosphere-only freeze seam; preserve baseline elsewhere.
- `src/interface/app-interface.ts`, `index.html`, `src/styles.css`: entry/Back/focus/disclosure/share reason, semantic camera buttons and responsive controls. Existing planet card/timeline reused.
- `src/main.ts`: wire heliocentric snapshots for either schematic and camera controls; preserve constructor fallback.
- `src/interface/url-state.ts`: guard serialization boundary itself, currently guarded only by composition root.
- `src/experience/experience-state.test.ts`, `src/rendering/scene-camera-controller.test.ts`, `tests/app.spec.ts`: reuse Gravity lifecycle, exact-pose and settledBoundingBox browser patterns.

## Tasks & Acceptance

**Execution:**
- [x] `src/experience/experience-state.ts` — implement heliosphere session and ordered lifecycle without changing scientific identities.
- [x] `src/rendering/heliosphere-mapping.ts`, `heliosphere-presentation.ts`, `orbital-scene.ts`, `scene-labels.ts` — implement one shared mapping and static cutaway/resources.
- [x] `src/rendering/scene-camera-controller.ts` — implement overview, semantic navigation seam and body clipping prevention, retaining session pose semantics.
- [x] `src/rendering/solar-presentation.ts`, `orbital-scene.ts` — freeze heliosphere decoration when paused/reduced motion without changing baseline animation.
- [x] `src/interface/app-interface.ts`, `index.html`, `src/styles.css`, `src/main.ts`, `src/interface/url-state.ts` — wire accessible controls, shared clock/cards, exact disclosure and direct sharing guard.
- [x] Unit tests in Experience/mapping/presentation/camera/URL modules — cover matrix edge cases, monotonicity/phase/containment, disposal and freeze.
- [x] `tests/app.spec.ts` — exercise Sun/Space entry, restoration/discard, mapped selection/Focus/Follow, pointer/touch/button camera, phone reachability, sharing and baseline preservation.
- [x] `docs/PRD.md`, `docs/SCIENCE.md`, sources in `index.html` — record implemented exception, mapping design constants and credited NASA context; update ASSET_CREDITS only if imagery changes.

**Acceptance Criteria:**
- Given Story 1.2's ten source criteria, when the feature is audited, then each is implemented with deterministic or observable browser evidence and no later story is substituted for its obligations.
- Given the integrated change, when npm run check and npm run test:e2e run, then both pass at the repository subpath and existing Gravity/journey/scientific behavior remains intact.

## Spec Change Log

## Review Triage Log

### 2026-10-29 — Review pass

- verdicts: 24 findings — high 0, medium 16, low 7, false 1, maybe-false 0
- findings (one row per finding, in report order):
  - `[medium]` `[patch]` Blind 1: square/tablet overview clips — original fixed composition skipped fitting at aspect 1; fit conservative shell bounds and test actual projected vertices on entry/Reset.
  - `[medium]` `[patch]` Blind 2: rings omitted from clearance — production ring extents exceed 1.25 body radii; include Saturn 2.35 and Uranus 2.05 plus near-plane clearance, with mapped-body tests.
  - `[low]` `[reject]` Blind 3: swept segment can cross a body between frames — the guard enforces clearance before each rendered frame; a one-frame crossing with safe endpoints produces no visible interior frame. Continuous collision history for contrived large jumps adds complexity without demonstrated everyday visible clipping; retain per-render clearance.
  - `[low]` `[patch]` Blind 4: effective checkbox values disagree — main forces paths/labels on while controls read scientific preferences; show effective schematic values and verify scientific preferences survive Back.
  - `[low]` `[patch]` Blind 5: share reason exposed scientifically — unhidden screen-reader note persists after exit; scope its hidden state to schematic activity while retaining referenced description.
  - `[low]` `[patch]` Blind 6: first stabilized Play jumps — zero-based counter replaces retained mesh angle; increment from retained displayed angle, with integrated initial/resume assertions.
  - `[low]` `[patch]` Blind 7: paused text incorrectly says reduced motion — distinguish paused and reduced-motion reasons.
  - `[medium]` `[patch]` Blind 8: gesture coverage absent — add actual mouse orbit/right-pan/wheel and native Chromium multi-touch orbit/pinch/pan with observable marker movement.
  - `[medium]` `[patch]` Blind 9: arbitrary pose test uses bookmark only — manipulate scientific camera before capture, retain exact controller pose tests and browser marker restoration.
  - `[medium]` `[patch]` Blind 10: physical card comparison absent — compare fixed-date distance and speed before/during both scientific origins.
  - `[medium]` `[patch]` Gap 1: scene freeze wiring unobserved — component flag and status text were insufficient; execute actual scene.render and inspect renderer-delivered shader/sprite/spin state across pause/reduced/resume.
  - `[medium]` `[patch]` Gap 2: rendered paths bypass helper test — inspect actual visible generated line vertices and mapped body world positions in scene integration test.
  - `[medium]` `[patch]` Gap 3: Focus result unasserted — assert centered/enlarged mapped Earth, including Space/full entry, rather than merely waiting for settlement.
  - `[medium]` `[patch]` Edge 1: intermediate aspect overview clips — same verified fixed-composition defect as Blind 1; use bounds fit and projected geometry tests.
  - `[medium]` `[patch]` Edge 2: native dialog Escape clears underlying Follow — global listener handles Escape before native dismissal; honor open dialog/defaultPrevented and test retained underlying card/Follow.
  - `[medium]` `[patch]` Edge 3: ring camera intersection — same verified radius defect as Blind 2; include displayed ring extents and clearance tests.
  - `[medium]` `[patch]` Edge 4: pointer/touch claim lacks tests — same missing gesture evidence as Blind 8; add real input tests, explicitly skip unsupported CDP engines.
  - `[low]` `[patch]` Intent 1: rendered readability/fit not numerically proven — add projected-bound tests and desktop/square/phone review images for direct inspection; no GPU snapshots assert scientific truth.
  - `[medium]` `[patch]` Intent 2: equivalent input evidence lacks gestures — same gap as Blind 8; exercise real mouse/multi-touch inputs alongside semantic buttons.
  - `[low]` `[patch]` Intent 3: clipping test proves only nonzero displacement — strengthen mapped globe/ring clearance assertions for Earth, Saturn and Uranus.
  - `[medium]` `[patch]` Intent 4: Focus/card evidence incomplete — same gaps as Blind 10/Gap 3; verify physical values and actual mapped camera result; existing reducer covers cancellation/preservation rules.
  - `[medium]` `[patch]` Intent 5: freeze component/status proxy — same scene-boundary gap as Gap 1; test real render wiring and all decorated state.
  - `[medium]` `[patch]` Intent 6: arbitrary restoration proxy — same gap as Blind 9; use real drag before capture plus exact controller pose assertions.
  - `[false]` `[reject]` Intent 7: unfinished process/checklist in review diff — this was an explicit in-review checkpoint, not a completion claim. Command outputs independently show pre-review check and 140 passing browser cases; final status, tasks, review results and commit belong to finalization after repairs.

All retained findings have direct local corrections without a new public surface or an unresolved requirement. Grouped outcomes: overview fit, displayed ring clearance, effective checkbox state, share-note visibility, retained spin, accurate wording, real gestures, arbitrary pose, physical cards, integrated freeze, rendered paths, actual Focus, native dialog priority and visual inspection. No findings deferred.

## Design Notes

Geometry dimensions, body factors, radial function and navigation increments are delegated design choices. Reuse original heliocentric scientific snapshots even when entering from Space. Reuse existing meshes and synchronous handoffs rather than parallel session ownership. Minimal frozen decoration is required now; 1.4 later consolidates the complete effect lifecycle under one Experience-owned phase. Source URLs and explanations are in the presentation companion (rechecked 2026-10-28); no new raster asset is required.

## Verification

- `npm run check` — typecheck/lint/unit/build pass.
- `npm run test:e2e` — Chromium/Firefox/WebKit pass; preserve headed Firefox/Xvfb configuration.
- `git diff --check` — clean whitespace.
- Record exact evidence and any unavailable Safari/hardware checks honestly; no deployment or measured visitor-learning claim.


## Auto Run Result

Status: done

Implemented Story 1.2's static heliosphere overview, one shared rendering mapping, eight planets and existing physical cards, explicit camera navigation/Focus/Follow, session-associated ordered entry/Back/discard, paused/reduced-motion decorative freeze, disabled schematic sharing, accessible explanations and responsive controls.

### Changed files

- `src/experience/experience-state.ts` — generalized schematic sessions, handoffs and heliosphere lifecycle.
- `src/experience/experience-state.test.ts` — eligibility, return context, ordered handoffs, isolation and discard coverage.
- `src/rendering/heliosphere-mapping.ts` — monotonic full-direction mapping and illustrative body/boundary dimensions.
- `src/rendering/heliosphere-mapping.test.ts` — direction, containment, nesting and disposal checks.
- `src/rendering/heliosphere-presentation.ts` — reusable static nested elongated cutaway and tail.
- `src/rendering/orbital-scene.ts` — shared mapped meshes/paths, presentation visibility and retained spin.
- `src/rendering/orbital-scene.test.ts` — actual scene render, solar/spin freeze and generated geometry integration.
- `src/rendering/scene-camera-controller.ts` — mapped overview, viewport fit, semantic navigation and ring-aware clearance.
- `src/rendering/scene-camera-controller.test.ts` — exact session poses, projected bounds and mapped collision coverage.
- `src/rendering/scene-labels.ts` — readable mapped schematic labels and targets.
- `src/rendering/solar-presentation.ts` — presentation-specific freeze seam without changing scientific-view animation.
- `src/rendering/solar-presentation.test.ts` — retained shader/sprite freeze and resume.
- `src/interface/app-interface.ts` — entry/Back/focus, semantic commands, effective controls, accurate descriptions and native-dialog key priority.
- `src/interface/url-state.ts` — direct schematic serialization rejection.
- `src/interface/url-state.test.ts` — direct rejection and scientific sharing restoration.
- `src/main.ts` — heliocentric schematic snapshots and adapter wiring.
- `index.html` — controls, exact scale disclosure, explanation access and NASA source credits.
- `src/styles.css` — desktop/phone controls, scrollable explanations and clear disclosure spacing.
- `tests/app.spec.ts` — user-visible lifecycle, arbitrary camera, physical values, Focus/Follow, real input, native dialog and layout evidence.
- `docs/PRD.md` — implemented heliosphere product exception.
- `docs/SCIENCE.md` — display parameters, unchanged astronomy and source context.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — synchronize completed stories.
- `_bmad-output/implementation-artifacts/spec-1-2-heliosphere-overview.md` — plan, triage and verification record.

### Review outcome

Four independent layers completed. All 24 findings have individual verdicts above: 22 patched findings grouped into 14 root-cause entries (9 medium, 5 low); zero deferred. Rejected: Blind 3's low-severity one-frame swept collision proposal adds continuous history without a demonstrated visible interior frame; Intent 7 describes an explicitly unfinished review checkpoint rather than a false completion claim. All other findings were corrected and verified. No unresolved intent or acceptance blocker remains.

Follow-up review recommended: true, because this pass patched more than two medium entries. Specific unverified risk: native multi-touch on non-Chromium engines and physical phones still needs the final release/device checks; CDP multi-touch evidence is Chromium-only. This recommendation does not claim those device checks passed.

### Verification and matrix audit

- Final `npm run check` passed: typecheck, lint, 103 tests across 12 files, production repository-subpath build. Existing large-chunk advisory remains.
- Final `npm run test:e2e -- --workers=3 --reporter=line` passed: 159 passed, 9 explicit skips, 168 total across Chromium/Firefox/WebKit (3.5 minutes). Skips: one existing Firefox touch-emulation case, two non-Chromium CDP multi-touch cases and six duplicate non-Chromium screenshot-capture cases. Required matrix coverage ran; duplicate captures and unsupported CDP adapters are not claimed as passes.
- `git diff --check` and staged whitespace checks passed.
- Entry/Back/discard: executed reducer handoff/eligibility tests, exact camera pose tests and both-origin/rapid/Home browser flows.
- Inspection: executed selection/playback invariants, mapped centered/enlarged Focus from Sun and Space/full, Follow/Reset/Escape and native-dialog browser checks.
- Mapping: executed full-timeline containment, strict monotonic direction mapping, actual generated orbit/body geometry comparison and fixed-date physical card comparisons from both origins.
- Camera: executed projected cutaway-vertex bounds on entry/Reset at phone through desktop aspects, mapped Earth/Saturn/Uranus clearance, semantic button navigation, mouse orbit/right-pan/wheel and native Chromium orbit/pinch/two-finger pan.
- Playback: executed original deterministic clock tests plus integrated solar shader/sprite and planetary rotation freeze/reduced/resume checks. No scientific view or Galactic clock was added.
- Sharing: executed direct schematic URL rejection, explained disabled UI and scientific restoration; existing explicit preference/URL allowlists remain in main and baseline regression checks pass.
- Visually inspected desktop, square and phone artifacts with cards open and closed in `/private/tmp/heliosphere-*.png`. Corrected explanation overflow, phone disclosure overlap and phone tail clipping discovered during verification; the final viewport-fit tests cover all corrected aspects. Touch coordinates now explicitly verify clear canvas targets before gestures.

Intentional approximations: compressed distances, independently exaggerated body sizes, homothetic lower-half cutaway shells, illustrative tail/global geometry and no physical boundary forecast. No new imagery or dependency was added; ASSET_CREDITS is unchanged. Manual current Safari, physical-device frame rates and non-Chromium native multi-touch remain unverified release checks. No deployment, push or measured visitor-learning claim.
