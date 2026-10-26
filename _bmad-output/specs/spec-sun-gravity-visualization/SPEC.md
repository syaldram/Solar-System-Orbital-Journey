---
id: SPEC-sun-gravity-visualization
companions:
  - visual-reference.md
  - interaction-and-verification.md
  - ../../../docs/PRD.md
  - ../../../docs/SCIENCE.md
  - ../../../docs/agents/architecture.md
  - ../../../docs/agents/testing.md
sources: []
---

> **Canonical contract.** This SPEC and its companions define the feature. Existing project contracts remain authoritative for scientific views; the schematic exceptions below apply only inside Sun’s Gravity. Implementation must add those exceptions to PRD.md and SCIENCE.md in the same change.

# Sun’s Gravity

## Why

Realize the user’s vision of an image-inspired gravity scene: visitors see the Sun’s dominant well and smaller depressions traveling with all eight orbiting planets. A separate, explicitly schematic scene makes this explanation visually readable without changing the app’s scientific reference-frame views.

## Capabilities

- **CAP-1**
  - **intent:** Visitors can enter and leave a dedicated Sun’s Gravity scene.
  - **success:** A semantic Sun’s Gravity button is available in Travel with Sun and Watch from Space during free exploration, outside the guided tour. Entry pauses playback; Back returns to the previous scientific view paused at the explored date.
- **CAP-2**
  - **intent:** Visitors can see a dominant solar gravity well and smaller planetary depressions.
  - **success:** An angled view shows a blue wire grid on a dark background, a golden Sun deep in the central well, and all eight planets with smaller depressions moving with them. Planetary bodies follow the schematic surface; labels, bodies and orbit paths remain legible.
- **CAP-3**
  - **intent:** Visitors can explore orbital motion in a compact layout using the Solar-System timeline.
  - **success:** Orbital distances are compressed for an overview of all eight planets; orbital phase and relative periods come from the existing calculated model. Existing playback, speed, pause, scrub, endpoint and replay behaviors work on the shared Solar-System date. No illustrative orbital speeds are substituted.
- **CAP-4**
  - **intent:** Visitors can inspect and follow planets in the schematic scene.
  - **success:** Selection opens the existing planet information card with actual calculated values, clearly distinguishing actual distances from displayed spacing. Focus and Follow target the schematic body position; manual camera navigation and Reset View work.
- **CAP-5**
  - **intent:** Visitors can understand and use the scene across supported accessibility and quality settings.
  - **success:** A visible schematic disclosure and Explain this view explain compressed distances, exaggerated depths and body sizes, and the limits of the sheet analogy. Keyboard, touch, reduced-motion and quality adaptation preserve usable controls and a readable gravity well.

## Constraints

- Keep the three existing scientific reference-frame views, their JPL calculations, scale contracts and independent Galactic clock intact. Distorted display coordinates must never become astronomy inputs or scientific card values.
- Sun’s Gravity is a separate presentation, not a fourth scientific reference frame, new clock, or guided-tour chapter. No entry from Galaxy Overview or during a running tour.
- The grid is an illustrative projection, not a literal membrane, quantitative force map, or relativistic calculation. No singularity, horizon, frictional orbital decay, or spiraling planets into the Sun.
- Maintain static GitHub Pages deployment, privacy, existing module boundaries, performance targets and transfer budgets. Adapt visual density rather than orbital accuracy.
- Update PRD.md and SCIENCE.md with the new scene’s behavior and approximations during implementation. Credit any new bundled imagery in ASSET_CREDITS.md; no imagery is required for this procedural effect.

## Non-goals

- General-relativistic or N-body simulation, mass editing, numerical gravity readouts, gravitational waves or lensing.
- Three selectable spacing/speed modes, illustrative orbital timing, or changing the five-chapter tour.
- Shipping the supplied reference image as an app asset.

## Success signal

- From either supported scientific view, a visitor enters paused, sees all eight planets orbit with moving depressions under shared playback, pauses or scrubs reproducibly, reads actual planet data, and returns to the previous view paused at the explored date. The schematic explanation remains available and the tour and Galactic clock are unaffected.

## Assumptions

- Start with a still oblique composition, manual orbit/zoom and no decorative ripples or automatic camera orbit.
- Back restores the previous scientific camera and valid selection, ends schematic Follow, and retains the shared date and speed.
- Planetary depression depths and body sizes are enhanced for visibility; the Sun remains dominant. Exact bounded profiles, compression and display sizes are implementation choices.
- Apply labels and orbit paths to schematic positions; disable trails and orbital-plane overlays within this scene and restore their settings on Back.
- Keep scene navigation session-only; omit it from localStorage and URLs. Disable sharing inside it with a short explanation; scientific view sharing remains unchanged.

## Open Questions

- None blocking the draft. Assumptions above remain open for user refinement before implementation.
