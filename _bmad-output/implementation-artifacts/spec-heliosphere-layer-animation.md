---
title: 'Heliosphere layer animation and Sun motion'
type: 'feature'
created: '2026-11-02'
status: 'done'
route: 'dispatch'
baseline_commit: 'c54ffd319d6d04cf5fe5e63af016b9271e8b363f'
review_loop_iteration: 0
context: [docs/PRD.md, docs/SCIENCE.md, docs/agents/architecture.md, docs/agents/testing.md]
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Existing heliosphere animation is subtle and synchronized; the presentation does not convey the Sun's travel.

**Approach:** The user selected **Travel together**. Show the Sun, orbiting planets and animated heliosphere traveling together in a tracking composition. Distinct abstract reference markers pass the complete assembly while the camera retains the user's inspection angle. Give each of the five regions distinguishable internal animation.

## Boundaries & Constraints

**Always:** Preserve planetary calculations, physical cards, nested envelopes, planet containment, region selection, layers, navigation and Back restoration. Reuse the existing retained active phase for every effect, independently of planetary speed. Preserve shared playback, paused entry, scrub/endpoint/visibility freezes and reduced-motion behavior. Update PRD, SCIENCE and visible explanations.

**Never:** Add scientific frames, clocks, storage, dependencies, downloads or deployment. Feed decorative coordinates into astronomy. Add automatic camera orbit, star streaks or a solar wake. Infer measured tail alignment from travel.

**Travel:** Existing Explore Heliosphere and Play controls start the composition from either eligible scientific view. Guides convey schematic forward travel at a restrained illustrative cadence; no AU/speed claims. Distant stars remain static. Explain that the camera travels with the assembly and that direction, speed and effects are illustrative. The finite interstellar envelope remains contextual artwork, not material carried by the Sun. Reset restores the overview without resetting phase/date. Focus/Follow and manual navigation remain relative to the assembly. Reduced motion freezes travel cues; requested planetary playback remains available. Back restores the scientific context paused.

## I/O & Edge-Case Matrix

| Scenario | Input | Expected behavior |
| --- | --- | --- |
| Motion | Explicit Play | Distinct region motion; passing guides convey shared travel; planets remain inside |
| Freeze | Pause, scrub, endpoint, hidden tab | Retain every effect; explicit resume without catch-up |
| Reduced motion | Enable/disable | Freeze decoration; allow requested planets/navigation; never implicitly resume |
| Layers | Hide/select/show | Hidden surfaces cannot intercept picks; cards and phase persist |
| Camera | Inspect, Focus/Follow, Reset | Coherent assembly, no double-follow displacement; Reset retains phase |
| Adaptation | Resize/quality | Stable cadence and identities; reuse/dispose resources |

</frozen-after-approval>

## Code Map

- `src/rendering/heliosphere-presentation.ts`: five shells share drift/shimmer and common breathing; owns opacity-aware picking associations.
- `src/rendering/orbital-scene.ts`: mapped bodies, Sun phase, region selection and camera integration.
- `src/experience/experience-state.ts`, `src/main.ts`: retained phase/lifecycle and heliocentric snapshot wiring; reuse unchanged.
- `src/rendering/solar-presentation.ts`: explicit phase already drives Sun effects.
- `src/rendering/scene-camera-controller.ts`: local overview, navigation and saved-pose restoration.
- `src/rendering/path-guide-presentation.ts`: scientific guides use wall time; preserve them and avoid importing their clock.

## Tasks & Acceptance

**Execution:**
- [x] `src/rendering/heliosphere-presentation.ts` — differentiate region flow/drift/shimmer, preserving geometry and hit consistency.
- [x] `src/rendering/heliosphere-travel-presentation.ts` — create phase-sampled abstract guides with bounded resources, quality adaptation and disposal.
- [x] `src/rendering/orbital-scene.ts` — integrate guides only during Heliosphere using existing phase; preserve mapped bodies and local camera behavior.
- [x] `src/rendering/heliosphere-travel-presentation.test.ts`, `heliosphere-mapping.test.ts`, `orbital-scene.test.ts` — test actual movement, freezing, containment, selection and resource lifecycle.
- [x] `tests/app.spec.ts` — exercise matrix through real controls, entry from both views and Back; capture desktop/phone motion evidence.
- [x] `docs/PRD.md`, `docs/SCIENCE.md`, `src/interface/app-interface.ts`, `index.html` — disclose tracking composition and illustrative animation.

**Acceptance Criteria:**
- Given Play, when observing several seconds, then each region has distinguishable motion and passing guides convey shared travel without separating Sun, planets and envelopes.
- Given pause or reduced motion, when waiting or changing quality, then decoration retains appearance and scientific calculations remain unchanged.
- Given traveling playback, when selecting, navigating, resetting or returning Back, then region access and camera contracts remain intact.

## Implementation Notes

Final review patches are complete: dynamic buffer usage; explicit background-guide compositing documentation; controlled GPU output comparisons for all five actual materials; changed-camera/resume/Reset assertions; timestamped before/moving/paused/resumed evidence. Parent inspected the final patch and resumed desktop/phone captures. Final Node 24.22.2/npm 11.20.0 check passes all 205 unit tests, lint, typecheck and build. Final full browser suite: 269 passed, 10 existing skips in 9.2 minutes with three workers and 90-second allowance. All matrix rows remain covered by passing tests. Review findings were individually triaged and resolved/rejected with evidence; none deferred. See [verification evidence](heliosphere-travel-evidence/verification.md).

Implemented distinct phase-sampled region textures and bounded passing reference crosses. Existing camera, astronomy and experience lifecycle remain intact. Parent independently inspected the unified diff and desktop/phone render captures. Node 24.22.2/npm 11.20.0: full check passed (205 unit tests); full Playwright suite passed (266 passed, 10 existing platform/artifact skips) with 3 workers and the 90-second CI allowance. Initial video fixture configuration was corrected; the initial 30-second browser attempt timed out in the pre-existing multi-layout test.

Matrix audit: Motion is covered by new travel unit tests and both browser entry/layout cases; Freeze/Reduced motion by the actual-render lifecycle and delayed-RAF tests including guide/region arrays; Layers by physical picking/hidden-layer browser checks; Camera by travel Reset/Back and existing playing Focus/Follow checks; Adaptation by actual buffer/density/disposal unit tests and browser quality/layout checks. All covering tests ran and passed. Native Safari and physical-phone FPS remain unverified.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Evidence and route |
| --- | --- | --- |
| Blind 1: guide count coupled to corona detail | false | All reachable profiles produce 24/36/48 guides within capacity, verified by tests. An imagined future profile change is not a demonstrated overflow; reject additional profile surface. |
| Blind 2: external-guide geometry invariant | false | Evaluated every cross endpoint at the maximum 1.02 envelope scale and the minimum-depth plane: minimum normalized squared radius is 1.1599, above 1; complete crosses stay outside. Future changed dimensions are hypothetical. |
| Blind 3: guides blend behind foreground shells | low | Intentional background compositing preserves shell readability, as captured from overview and inspection angles. Patch documentation/comment to explicitly call them background reference guides; no depth-sorting complexity. |
| Blind 4: default static buffer usage | low | Position/color buffers upload during playback. Patch both to DynamicDrawUsage before initial upload, a direct usage-hint correction. |
| Blind 5: unbounded texture phase precision | low | Drift can lose precision in extreme retained sessions, but ordinary sessions are bounded by the 165-year playback endpoint (about 16.7 hours at slowest speed). Repeated scrub/resume can extend it; a continuous bounded-noise redesign exceeds a direct correction for this negligible everyday risk. Reject. |
| Blind 6: CPU inputs do not prove shader motion | medium | Removing textureOffset consumption can leave current tests green. Group with Gap 1; patch controlled GPU output comparisons for each real material, without fixed pixel snapshots. |
| Blind 7: new camera test lacks transform assertion | low | Existing navigation tests assert transforms and existing playing Follow is covered; the new travel-specific combination lacks explicit changed-angle/resume assertions. Patch those assertions. |
| Blind 8: static evidence lacks timestamped transitions | medium | Before/moving/inspection images plus raw sample attachments do not retain a timestamped pause/resume sequence in the evidence directory. Patch the sequence and preserve metadata alongside images. |
| Gap 1: region texture animation only checked through inputs | medium | Pre-verified mutation demonstrates heliosheath/interstellar drift can disappear unnoticed. Group with Blind 6; a browser-only GPU output check closes it without a production API, so patch rather than defer. |

Edge-case reviewer returned no findings. All three reviewers used the final implementation diff; the claim document was supplied only to the edge-case layer after tracing. No deferred entries.

## Design Notes

Use outward solar-wind flow, shock shimmer, slower heliosheath wisps, heliopause drift and restrained interstellar texture variation. Retain common ±2%/20-second breathing for nesting. Rates are artistic choices. Render travel through relative guide motion in a stable tracking frame; avoid huge world coordinates and camera translations conflicting with Follow. No irreversible operations or unresolved intent choices remain.

## Verification

- Node 24/npm 11.20.0: `npm run check`, `npm run test:e2e`, `git diff --check`.
- Inspect motion over time, individual layers, alternate angles and desktop/phone layouts. Record unverified native Safari and physical-phone performance; screenshots alone do not prove animation quality.
