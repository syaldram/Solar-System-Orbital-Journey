# Interaction and verification

## Navigation and time

| Event | Required behavior |
| --- | --- |
| Free exploration in Travel with Sun or Watch from Space | Expose Sun’s Gravity as a semantic button. |
| Running guided tour or Galaxy Overview | Do not expose schematic entry; no automatic launch. |
| Enter Sun’s Gravity | Pause; retain Solar-System date and speed; capture previous scientific frame and return context. |
| Play, pause, speed, scrub, endpoint, replay | Reuse existing Solar-System rules and 165-Julian-year timeline; never advance Galactic time. |
| Select a planet | Reuse the existing card without automatically pausing or moving the camera; show actual calculated values and clarify actual distance. |
| Focus / Follow | Use displayed schematic coordinates consistently, including the body’s vertical placement on the sheet. |
| Back | Pause at explored Solar-System date; restore previous scientific view. Draft assumption: restore camera and valid selection, end schematic Follow, retain selected Solar-System speed. |

No independent schematic clock or illustrative orbital speed exists. Preserve the current Galactic-clock isolation contract. Outer planets may move slowly at lower speed settings; the existing higher speeds reveal that motion.

## Display mapping and integration

- Calculate the original planetary state once for the selected date. Derive schematic orbital spacing and vertical placement separately; physical information cards always consume the original state.
- Preserve calculated orbital phase and relative periods. The exact compression function is an implementation choice, but it must preserve orbital ordering, avoid path crossings introduced by compression, and provide distinguishable spacing for all eight planets.
- Choose a consistent convention for planetary centers on their moving depressions so local dip depth does not create a feedback loop. Build bounded geometry with no singularities at Sun or planet centers. Verify continuity and finite coordinates across the timeline.
- Orbit paths, labels, hit testing, selection, Focus and Follow must share the same schematic position mapping; no floating labels or camera targets at original scientific coordinates.
- Draft assumption: labels and orbit paths use current settings; trails and orbital-plane overlays are unavailable with a brief reason and their scientific-view settings survive Back.
- Draft assumption: no URL or localStorage encoding for this scene; sharing is unavailable here with an explanation. Existing scientific sharing remains intact.
- Keep presentation geometry in `src/rendering/`, state/navigation in `src/experience/`, semantic controls and copy in `src/interface/` and `index.html`, and wiring in `src/main.ts`. Avoid expanding the scientific reference-frame type solely to represent this scene.
- Current `src/rendering/display-scale.ts` and SCIENCE.md use a shared physical-radius factor in scientific views, despite older independent-enhancement wording in PRD.md. Preserve the implemented scientific scaling; document schematic body sizing as a separate exception.
- Reuse geometry/materials, bound grid resolution by quality, avoid geometry reconstruction churn, and dispose resources on teardown. Reduced motion disables decorative movement while preserving user-requested calculated playback and camera input.
- No new images or runtime requests are needed. If implementation introduces bundled imagery, consult and update ASSET_CREDITS.md.

## Acceptance checks

| Capability | Evidence |
| --- | --- |
| CAP-1 | Keyboard/touch entry from both eligible views; no entry in running tour/Galaxy Overview; paused entry/Back; restored return context. |
| CAP-2 | Visual inspection at oblique angle shows the central blue well and eight smaller moving depressions; all bodies remain distinguishable at overview and focus, including low quality and touch layout. |
| CAP-3 | Deterministic tests verify identical source snapshots with schematic enabled/disabled, finite continuous display mapping, repeatable positions after scrubbing to the same date, and unchanged orbital phases/relative periods. State tests cover shared date/speed, paused transitions, boundaries and Galactic isolation. |
| CAP-4 | Browser flows select a planet, inspect actual distance/period/speed, Focus and Follow its displayed position, stop follow, reset camera and Back. Cards must never show compressed display distances as physical distances. |
| CAP-5 | Keyboard focus and accessible names; readable disclosure and explanation; reduced-motion behavior; high/balanced/low quality; labels/orbit-path toggles; unavailable overlays/share explanation; scientific preferences restored on Back. |

Implementation runs `npm run check` and `npm run test:e2e`, with Chromium, Firefox and WebKit smoke coverage according to repository policy. Browser assertions should exercise observable scene behavior rather than fragile GPU pixel snapshots; visual inspection is still required to assess the well’s composition and legibility.

Verify unchanged scientific views, shared URLs, tour chapters, Galactic-clock isolation and the GitHub Pages base path. Assess existing 60 FPS laptop / 30 FPS phone targets on representative hardware; disclose any unverified hardware or current Safari behavior. Performance targets are inherited, not claimed by this draft.

For this specification-only change, run `git diff --check` and inspect artifact links; app behavior is not implemented or tested.
