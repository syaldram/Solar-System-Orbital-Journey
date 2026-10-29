---
title: 'Story 1.4 — Controlled illustrative heliosphere motion'
type: feature
created: '2026-10-29'
status: done
baseline_revision: c147520e64fc3b1e9be5834c1290b46ebfe766b6
review_loop_iteration: 0
followup_review_recommended: true
context:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/specs/spec-Solar-System-Orbital-Journey/heliosphere-presentation.md
  - _bmad-output/planning-artifacts/architecture/architecture-Solar-System-Orbital-Journey-2026-10-28/ARCHITECTURE-SPINE.md
  - docs/PRD.md
  - docs/SCIENCE.md
  - docs/agents/architecture.md
  - docs/agents/testing.md
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** The static cutaway lacks explanatory motion, and its Sun/stabilized spin currently use independent rendering clocks without a hidden-tab lifecycle.

**Approach:** Implement all ten Story 1.4 criteria with one Experience-owned retained phase in active presentation seconds. Render slow outward flow, soft shimmer and a complete 20-second ±2% boundary cycle from it, coordinated with shared playback, visibility and reduced motion.

## Boundaries & Constraints

**Always:** Experience owns finite nonnegative elapsed phase seconds; Rendering only consumes them for every illustrative heliosphere effect, Sun shader/corona/filaments/glow and stabilized spin, independently of planetary speed. Preserve calculated planetary date, direction, physical cards, normal physical rotation, pole conventions, scientific/Galactic clocks and all prior camera/selection/layer/session behavior. All eight planets remain within the minimum shock envelope; shells, cut faces, rims and actual picking geometry remain nested and consistent throughout breathing. Explicit Play/Resume permits motion; Pause/scrub/endpoint/hidden transitions freeze retained phase; scrub and tab return stay paused. Visibility arrives before advancement and resets shell real-time baseline, preventing hidden catch-up. Reduced motion freezes retained decoration while permitting requested planetary motion/manual camera; disabling it never starts paused playback. Disclose animation as illustrative, not measured solar weather or a date-specific forecast. Update PRD/SCIENCE and in-app disclosures.

**Never:** Feed phase to astronomy, physical cards, Galactic time, URLs or storage; advance it outside active Heliosphere; reset it for speed/layer/quality/camera changes; add independent heliosphere animation clocks, automatic camera motion, remote resources/dependencies/imagery, push or deployment. Preserve other presentations' existing animation behavior. Background remains Story 1.5; no acceptance deferred to 1.6.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Permitted advance | Active visible playing Heliosphere, reduced off, explicit real delta | Phase increases in elapsed seconds independently of speed; positions/cards use scientific date | Reject nonfinite/negative phase deltas |
| Effects | Phase across 0/5/10/15/20 seconds and between | Outward flow and shimmer coexist; boundary scale reaches 1.02/.98 and repeats each 20 seconds | Preserve nested actual geometry, minimum containment and layer/picking associations |
| Pause/resume | Shared Pause then explicit Resume | Planetary time and every illustrative effect stop and continue retained appearance | No independent Sun/spin clock or resume jump |
| Scrub/endpoint | Chosen date or last active fraction at endpoint | Phase retained/final permitted fraction, paused controls and no loop | Do not drop or overrun final active interval |
| Visibility | Hidden then visible, including before next RAF | Inputs delivered before advance, phase/date frozen, return paused; baseline reset | No hidden-time catch-up or implicit resume |
| Reduced motion | Toggle on/off while playing or paused | Freeze decoration at retained appearance; requested planets/camera remain available | Turning off never starts a paused clock |
| Presentation/context | Speed/layers/quality/inspection/exit/re-entry | Same mapping, targets, identities/cadence; session-only phase; normal return/exit behavior | Scientific/Galactic/Gravity animation and serialization remain intact |

</intent-contract>

## Code Map

- `src/experience/experience-state.ts`: heliosphere session branch owns layers; add retained seconds and explicit visibility input/gate. Extend advance, endpoint, Play, scrub and reduced-motion transitions without coupling clocks.
- `src/main.ts`: RAF currently caps delta at .1s and has no visibility listener; deliver visibility/reset elapsed baseline before advance and wire explicit phase through SceneState. Retain baseline policies elsewhere.
- `src/rendering/orbital-scene.ts`: remove heliosphere lastRenderMs/decorativeDeltaMs clock; pass phase to presentation/Sun and derive stabilized spin with fixed continuity offsets, preserving actual mapped bodies and hit geometry.
- `src/rendering/solar-presentation.ts`: optional explicit phase drives every solar property in Heliosphere; preserve baseline animationTime/lastAnimationAt behavior outside it.
- `src/rendering/heliosphere-presentation.ts`: owns shells/rims/cut faces and region/layer records. Add phase-sampled breathing, visible flow/shimmer with resource reuse/disposal and shared visibility associations.
- `src/rendering/heliosphere-mapping.ts`, `quality-profile.ts`: preserve physical display mapping/radii; adapt only effect detail/count if needed, never phase or identities.
- `src/interface/app-interface.ts`, `index.html`, `docs/PRD.md`, `docs/SCIENCE.md`: replace static/subsequent-motion descriptions with implemented illustrative motion/lifecycle.
- `src/rendering/orbital-scene.test.ts`, `solar-presentation.test.ts`, `heliosphere-mapping.test.ts`, `src/experience/experience-state.test.ts`, `tests/app.spec.ts`: reuse actual renderer-delivered scene capture, deterministic clocks and real UI controls.

## Tasks & Acceptance

**Execution:**
- [x] `src/experience/experience-state.ts` and tests — implement finite active-seconds ownership and all matrix lifecycle transitions, speed independence and endpoint fraction.
- [x] `src/main.ts` — wire visibility before advancement, reset real-time baseline and pass phase; preserve other clocks and persistence.
- [x] `src/rendering/heliosphere-presentation.ts`, `quality-profile.ts` if needed — implement shared-phase breathing/flow/shimmer, layer ownership, reuse and complete disposal.
- [x] `src/rendering/orbital-scene.ts`, `solar-presentation.ts` — remove independent heliosphere clocks and derive all illustrative effects from phase, with continuity and unchanged scientific branches.
- [x] `src/experience/experience-state.test.ts`, `src/rendering/orbital-scene.test.ts`, `src/rendering/solar-presentation.test.ts`, `src/rendering/heliosphere-mapping.test.ts` — verify actual transformed geometry/materials/flow/Sun/spin at controlled phases and widely separated wall times, containment/nesting, speed/quality independence and every lifecycle edge.
- [x] `tests/app.spec.ts` — demonstrate actual flow/shimmer/retained rendered state plus shared Play/Pause/scrub/endpoint/reduced/visibility behavior and unchanged region/layer/Focus/Follow interactions; inspect phase-independent physical values.
- [x] `src/interface/app-interface.ts`, `index.html`, `docs/PRD.md`, `docs/SCIENCE.md` — record implemented exception, units and honest motion disclosure, with existing source credits.

**Acceptance Criteria:**
- Given Story 1.4's ten criteria and matrix, when verification runs, then actual production render state and user controls demonstrate every row rather than relying on textual “frozen” proxies.
- Given the integrated motion, when npm run check and npm run test:e2e run, then both pass with prior behavior and static delivery intact.

## Spec Change Log

## Review Triage Log

### 2026-10-29 — Review pass
- verdicts: 17 findings — high 0, medium 10, low 3, false 4, maybe-false 0
- findings (individual verdicts rendered before grouping; order follows layer reporting):
  - `[medium]` `[patch]` G1: Glow/corona advancement can disappear while combined snapshots still change through shader time — preverified independent-property assertion gap; added independent actual sprite scale/opacity/rotation assertions.
  - `[medium]` `[patch]` B1: Delayed RAF uses post-input play/reduced state for the entire previous interval — main dispatch does not reset/settle its baseline, so paused t0 → Play t900 → RAF t1000 charges 1s; settled the existing shell transition baseline and covered controlled delays.
  - `[medium]` `[patch]` B2: Rapid Back/re-entry before rendering retains old Sun/spin continuity against new phase zero — render-only resets leave explicitPhaseOffset and heliosphereSpinActive unchanged; rebased internal references on accepted handoffs and regressed nonzero-phase rapid sessions.
  - `[low]` `[reject]` B3: Flow particles visibly recycle at radial endpoints — deterministic sparse particle recycling is cosmetic; independent fades require per-particle shader/attribute complexity beyond a direct correction. No measured weather is claimed.
  - `[medium]` `[patch]` B4: Flow lacks shared solar-wind drawable ownership — root.add bypasses drawables and SCIENCE's per-drawable region/layer contract; used the common association for visibility/picking, retaining resource identity.
  - `[low]` `[patch]` B5: Frozen frames repeatedly rewrite/upload flow and recompute bounds — render loops over positions regardless of identical phase; cached the last sampled phase and verified reuse.
  - `[medium]` `[patch]` B6: Synthetic hidden events plus a positive resume increment cannot detect catch-up — added controlled long RAF gaps and bounded first resumed phase/date increments. Group with I-hidden.
  - `[medium]` `[patch]` B7: Browser endpoint scenario tests scrubbing rather than natural completion — reached the endpoint through Play and checked retained final effects/completion controls. Group with I-endpoint.
  - `[medium]` `[patch]` B8: Speed loop only compares Sun time to phase — both could be wrong together; asserted actual effect/phase progression over equal controlled wall intervals at every speed.
  - `[low]` `[patch]` B9: SCIENCE says no clock while describing presentation seconds — clarified no scientific clock.
  - `[false]` `[reject]` I-execution: Single-story diff does not prove the entire five-story workflow/history — this is intentionally the separate 1.4 iteration after committed 1.2/1.3; renderer invocations, review agents, command outcomes and commits are execution evidence, not application code. Remaining authorized iterations follow completion.
  - `[false]` `[reject]` I-visible: Render inputs/screenshot alone do not prove visual inspection — parent inspected the actual retained WebKit artifact, confirmed readable cutaway/labels, and combined that with actual buffer/material progression; no GPU snapshot or perceptual-learning claim is made.
  - `[medium]` `[patch]` I-hidden: Actual browser suspension/throttling is not exercised by synthetic document.hidden alone — strengthened controlled shell scheduling and no-catch-up assertions with B6; physical/current-Safari suspension remains honestly unverified.
  - `[medium]` `[patch]` I-endpoint: Natural completion is only reducer-tested — strengthened real browser completion with B7.
  - `[false]` `[reject]` I-science: New motion test does not compare cards to the model — unchanged existing browser test 'restores sun/space view...' compares fixed-date physical distance before/after entry; actual renderer mapping tests compare every body to calculated snapshots, and astronomy tests run in the full check. Coverage need not be newly duplicated.
  - `[medium]` `[patch]` I-interaction: Focus/Follow during breathing lacks browser coverage — extended existing production-control checks during playback with mapped markers, layer/quality changes and retained phase assertions.
  - `[false]` `[reject]` I-gates: Diff statements do not prove command success — parent independently ran npm run check (110 units) and complete browser gate (188 passed, 10 documented skips) before review. Execution output supplies evidence; both gates rerun after patches.
- grouped surviving entries: 10 — medium 8, low 2. All route patch, with no public surface required; no intent gap, bad spec or deferred item.


## Design Notes

SCIENCE distinguishes physical date-derived rotation (day/month) from illustrative stabilization (year/decade). Keep normal physical orientation responsive to explicit dates/scrubs and requested playback, including reduced motion; stabilized spin consumes retained phase. Any continuity offsets are fixed reference values, never independently advancing clocks. Preserve scientific stabilized performance-time spin, Gravity reduced-motion rotation and baseline Sun behavior outside Heliosphere.

Exact flow geometry/shimmer tuning are delegated. A common homothetic boundary transform and phase sampling can preserve drawing/picking/nesting; bodies never inherit boundary breathing. Browser tests may instrument the actual application render boundary inside tests, without a public production test-only API, to inspect real scene geometry/materials. Keep native gestures/keys, per-test visual attachments and settled camera checks. Finish source edits before full browser verification.

## Verification

- `npm run check` — typecheck, lint, deterministic tests and production build pass.
- `npm run test:e2e -- --workers=3 --reporter=line` — full Chromium/Firefox/WebKit regression passes with explicit unsupported-input skips.
- `git diff --check` — no whitespace errors.
- Inspect visual flow/shimmer and frozen/resumed scenes through captured images or browser render observations; no GPU snapshot assertions or claims of measured weather/visitor learning. Manual current Safari and physical-device release checks remain explicitly unverified until available.

## Auto Run Result

Implemented controlled illustrative Heliosphere motion. Experience owns one retained active-seconds phase; Rendering samples flow, shimmer, nested 20-second ±2% boundaries, Sun and stabilized spin. Shared controls, visibility and reduced motion preserve scientific timing and physical cards. Input intervals settle under their prior permissions, and rapid accepted handoffs rebase visual continuity without a new public interface.

Files changed:
- `src/experience/experience-state.ts` and its tests — session phase, visibility gates, finite deltas, endpoint fractions and four reduced-motion transitions.
- `src/main.ts` — explicit phase wiring, visibility delivery/baseline reset and input-time settlement.
- `src/rendering/heliosphere-presentation.ts` — phase-sampled geometry/materials/flow, common region/layer association, identical-phase reuse and disposal.
- `src/rendering/orbital-scene.ts`, `solar-presentation.ts` — phase-driven Sun/spin, accepted-handoff continuity, preserved physical rotation and other presentation clocks.
- Rendering test files — actual nested geometry/containment, transformed picking at extrema and high/low quality, flow visibility/reuse/disposal, independent Sun components and rapid handoffs.
- `tests/app.spec.ts` — production-render observations through real controls, playing Focus/Follow, equal controlled wall-time cadence at all speeds, delayed RAF/reduced transitions, long hidden gaps, automatic endpoint completion and rendering-synchronized hidden-layer checks. Failure-only diagnostics and per-test visual attachments remain test-only.
- `docs/PRD.md`, `docs/SCIENCE.md`, `src/interface/app-interface.ts`, `index.html` — implemented lifecycle and illustrative-weather disclosures.
- This spec and sprint tracking — completion and review/verification evidence.

Review: four independent layers; 17 individual findings, 12 patched through 10 shared-cause entries (8 medium, 2 low), none deferred. Rejections: particle recycling fades are cosmetic and would add per-particle shader complexity; whole-sequence/history evidence lives in workflow execution; parent visually inspected the real artifact; existing fixed-date cards and actual mapped snapshot tests cover scientific preservation; independent command output proves gates. Each rejection and patch is recorded individually above.

Follow-up review recommended: **true**, because eight medium entries were patched. Specific unverified risk: current Safari/physical-phone lifecycle and actual browser suspension scheduling have not been measured by headless browser or controlled-RAF tests; these remain explicit release checks for Story 1.6.

Verification:
- `npm run check` passed: typecheck, lint, 110 unit tests in 12 files, production repository-base build. Existing bundle-size advisory is unchanged in character.
- Controlled delayed-RAF browser check passed Chromium, Firefox and WebKit before the final full regression run.
- `npm run test:e2e -- --workers=3 --reporter=line` passed: 191 passed, 10 documented skips, 201 cases across Chromium/Firefox/WebKit (4.3 minutes). Skips are Firefox native-touch limitations, non-Chromium CDP and duplicate layout captures.
- `git diff --check` passed.
- Parent inspected the retained-motion WebKit artifact: elongated nested blue cutaway, readable Sun/planet markers, card, camera controls and exact disclosure. Actual geometry/material/phase checks prove flow/shimmer progression and retained appearance without GPU snapshot assertions.

Matrix audit: permitted advance and all reduced toggles are covered by Experience tests; effects/containment by actual presentation geometry and mapping tests; pause/resume by independent solar properties, renderer and real browser lifecycle; scrub/endpoint by reducer final-fraction and automatic browser completion; visibility and baseline by long controlled browser RAF gaps; session/quality/layer/picking/camera/physical preservation by actual rendered scene and complete browser regressions. All covering tests ran and passed; unsupported native-touch/artifact duplicates are unrelated documented skips.

Residual risks/approximations: boundary dimensions/tail orientation, breathing, particle recycling, shimmer and compressed mapping are illustrative. Day/month physical orientation follows scientific dates; only year/decade stabilized spin is decorative. Current Safari and real-device FPS checks remain unverified. One pre-review WebKit lifecycle pause did not reproduce after explicit toggle assertions; failure-only event diagnostics remain available. No new imagery, dependencies, services, push or deployment.
