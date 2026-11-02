---
title: 'Cloudy heliosphere envelope and illuminated star field'
type: 'feature'
created: '2026-11-02'
status: 'done'
baseline_commit: '590af4e6b9d6252530591e11a897da0ccc83f673'
route: 'dispatch'
review_loop_iteration: 0
context:
  - docs/PRD.md
  - docs/SCIENCE.md
  - docs/agents/architecture.md
  - docs/agents/testing.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The heliosphere currently resembles a half bowl because only its lower hemisphere is drawn, and flat equatorial rings dominate its appearance. The user wants a spherical impression with smoky/cloudy layers and more stars illuminating the surrounding space, inspired by the supplied reference image.

**Approach:** Replace the open bowl with complete translucent blue envelopes, with wispy cloud structure and luminous curved boundaries. Preserve the illustrative tail seen in the reference while making the upper and lower envelope readable as one enclosed volume. Increase the background star density and varied brightness modestly. Keep the interior Solar System legible.

## Boundaries & Constraints

**Always:** Preserve nested boundaries, all-eight-planet containment and readability, five selectable regions, four independent layers, semantic controls, camera navigation and session lifecycle. Preserve the existing 20-second ±2% boundary cycle and retained-phase freeze behavior. Keep the exact scale disclosure, scientific calculations and planetary timing. Treat global shape, cloudy material and star placement as illustrative artwork. Reduce rendered star density on phones and lower quality settings. Update PRD and SCIENCE alongside the changed visual contract.

**Never:** Add spacecraft, new scientific claims, a physical volumetric simulation, independent animation timers, automatic camera movement, runtime asset downloads, dependencies, storage fields or deployment. The supplied image is visual inspiration, not a texture to bundle.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Overview/navigation | Enter, orbit above/below, reset | Complete curved envelope with readable nested cloudy layers and interior planets | No open equatorial bowl or solid opaque lid |
| Scene selection | Click visible inner region through translucent foreground | Visible region can be selected; bodies/markers keep priority | Faint outer shell must not capture every click |
| Layer visibility | Hide either shell layer | Corresponding artwork and hit candidates disappear; card/buttons retain existing behavior | Hidden geometry cannot intercept picks |
| Frozen appearance | Pause, scrub, reduced motion, hidden tab | Clouds and boundary effects retain the established freeze/resume contract | No wall-clock drift or catch-up |
| Adaptation | Resize through 700 CSS px; lower quality | Fewer stars actually drawn, same region access and scientific positions | Reuse resources across resize/session changes |

</frozen-after-approval>

## Code Map

- `src/rendering/heliosphere-presentation.ts`: owns lower-half spheres, flat rings, flow, material shimmer, drawable region/layer associations and disposal. Replace geometry/material treatment here.
- `src/rendering/orbital-scene.ts`: `resolveSceneSelection` currently picks nearest region geometry, irrespective of visual transparency; closed shells require coordinated visibility-aware hits.
- `src/rendering/heliosphere-background.ts` and `quality-profile.ts`: own seeded stars, static sky and actual draw density; currently 900/550/280 stars with 45% on phones.
- `src/rendering/heliosphere-mapping.ts`: retain physical-to-display mapping, body radii and boundary radii. No astronomy changes.
- `src/interface/app-interface.ts`: explanation explicitly describes a cutaway; align copy with the complete illustrative envelope.
- Existing tests: `heliosphere-mapping.test.ts`, `heliosphere-background.test.ts`, `orbital-scene.test.ts`, `tests/app.spec.ts`; include hard-coded colors/counts and surface click coordinates needing intentional revision.

## Tasks & Acceptance

**Execution:**
- [x] `src/rendering/heliosphere-presentation.ts` -- construct full nested envelopes, soften the flat-ring treatment, and add bounded procedural cloud detail with limb emphasis and translucent centers. Preserve allocation/disposal and phase sampling.
- [x] `src/rendering/orbital-scene.ts` and `heliosphere-presentation.ts` -- coordinate rendering and hit eligibility so visible interior regions remain directly selectable through faint foreground artwork; preserve body priority and hidden-layer exclusion.
- [x] `src/rendering/heliosphere-background.ts` and `quality-profile.ts` -- increase star density and introduce restrained brightness variation while preserving deterministic placement and responsive reductions.
- [x] `src/interface/app-interface.ts`, `docs/PRD.md`, `docs/SCIENCE.md` -- replace obsolete lower-half/cutaway descriptions and document the complete illustrative envelope and richer decorative sky.
- [x] `src/rendering/heliosphere-mapping.test.ts`, `heliosphere-background.test.ts`, `orbital-scene.test.ts` -- verify full upper/lower extents, nesting, freeze/resource behavior, density reductions and interior/hidden-layer hit cases.
- [x] `tests/app.spec.ts` -- adapt geometry-dependent interaction/count expectations and capture desktop, phone and alternate-orbit evidence without weakening observable region access assertions.

**Acceptance Criteria:**
- Given a fresh heliosphere session, when viewed from the overview and opposing orbit angles, then upper/lower boundaries form a continuous rounded volume with visible smoky blue structure rather than an open bowl.
- Given all layers enabled, when viewing the Solar System, then all eight planets, orbit paths and essential labels remain legible through the envelope.
- Given the default sky, when compared with the existing baseline, then more varied stars are visibly present without overwhelming boundaries or labels.
- Given visible nested artwork, when selecting each of the five regions through scene interaction or semantic controls, then the correct card opens without camera movement or playback changes.
- Given paused or reduced-motion presentation, when waiting or resizing, then decorative appearance does not advance and quality adaptation preserves the scientific model.

## Implementation Notes

Planning baseline: `590af4e6b9d6252530591e11a897da0ccc83f673`; working tree was clean. This is one visual-composition update with no external side effects. No unresolved intent choices; retain the reference's illustrative tail rather than interpreting “sphere” as a measured perfect sphere. Full dispatch is appropriate because closed-shell transparency, region picking, shader appearance and documented contracts need coordinated implementation and review.

## Spec Change Log

Implementation completed and reviewed without changing approved intent. Final Node 24.22.2/npm 11.20 checks pass: 203 unit tests, lint, typecheck and build; 260 browser tests pass with 10 expected skips using three workers and a 90-second run timeout. All matrix rows have passing coverage, detailed in [verification evidence](heliosphere-cloudy-envelope-evidence/verification.md). Local high-quality DPR2 desktop and phone-viewport benchmarks held 60 FPS. Physical-phone profiling is deferred; native Safari remains unverified. No deployment performed.

## Review Triage Log

| Finding | Verdict | Evidence and disposition |
| --- | --- | --- |
| Blind 1: shell compositing order | low | Whole-shell ordering is an approximation: near outer fragments precede inner fragments. Inspected upper/lower views retain legible cloudy nested volumes; exact optical compositing is not promised. Reject added multi-pass complexity for negligible observed visual harm. |
| Blind 2: RGB noise omitted from picking | false | The shared contract is the opacity envelope, not brightest RGB pixel. Noise never removes opacity, and tests plus inspected visible limbs demonstrate all region selection. |
| Blind 3: fixed flow hit score | low | Points retain standard Three raycast tolerance and a distinct solar-wind score. Potential tiny tolerance overlap is negligible; reject new particle visibility-ranking complexity. Include flow in combined selection tests under Blind 4. |
| Blind 4: tests omit competing flow | medium | Candidate list omitted solar-wind-flow despite production using it. Patch fixture to include actual flow with all existing region assertions. |
| Blind 5: cloud cost at low quality | maybe-false | Pixel-ratio adaptation already reduces fragment workload; standalone native Chrome desktop and phone viewport both measured 60 FPS at high DPR2. Physical-phone cloud cost remains unverified; defer hardware profiling before adding cloud tiers. |
| Blind 6: pending timeout/performance checks | medium | Focused default-timeout run passed nine cases, skipped two platform cases, and timed out only the extensive Chromium lifecycle. Standalone high-quality native Chrome measured 60 FPS. Patch that long test's timeout locally and record final rerun. |
| Blind 7: four fixture failures | medium | Corrected touch and all three production smoke checks passed in root's focused rerun. Evidence update closes the obsolete pending result. |
| Blind 8: full shell verification | low | Bounds prove upper/lower extents but not angular coverage. Patch geometry test to assert complete sphere angular parameters; screenshots remain visual evidence rather than a GPU pixel oracle. |
| Blind 9: contextual outer boundary disclosure | medium | SCIENCE explains the finite interstellar context shell but visible explanation omits it. Patch explanatory copy with the same clarification. |
| Edge-case reviewer | false | No concrete findings returned after tracing. No patch required. |
| Verification: only first shader tested | medium | Other four material uniforms were unobserved. Patch existing test to check every material across advancing, frozen and hidden/shown phases. |

## Design Notes

Use multi-scale procedural noise with stronger limbs/back surfaces and faint foreground cloud detail. Shared visibility rules must govern both shading and picking; simply making a closed outer mesh transparent leaves it as the nearest raycast target. Avoid an opaque shell and avoid invisible hit-only substitutes for visible regions. Tune appearance through browser inspection. No new bitmap asset is planned.

## Verification

- `npm run check` -- typecheck, lint, unit tests and build pass using Node 24/npm 11.20.0.
- `npm run test:e2e` -- required rendering/UI browser suite passes; report any environment-specific gaps.
- `git diff --check` -- clean patch formatting.
- Inspect desktop/phone screenshots, upper/lower orbit angles, labels off, individual layers and playback/pause. Record visual evidence and any unverified Safari/physical-phone performance rather than inferring it from automated tests.
