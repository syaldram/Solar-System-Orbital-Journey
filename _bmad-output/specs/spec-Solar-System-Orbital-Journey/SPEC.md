---
id: SPEC-Solar-System-Orbital-Journey
companions:
  - heliosphere-presentation.md
  - visual-reference.md
  - ../../planning-artifacts/architecture/architecture-Solar-System-Orbital-Journey-2026-10-28/ARCHITECTURE-SPINE.md
  - ../../../docs/PRD.md
  - ../../../docs/SCIENCE.md
sources:
  - ../../planning-artifacts/briefs/brief-Solar-System-Orbital-Journey-2026-10-28/brief.md
  - ../../planning-artifacts/briefs/brief-Solar-System-Orbital-Journey-2026-10-28/addendum.md
---

> **Canonical contract.** Read this SPEC with every listed companion. This is the agreed heliosphere feature contract. PRD and SCIENCE remain the active baseline; incorporate the documented feature exceptions alongside implementation.

# Heliosphere free exploration

## Why

Extend Solar System: Orbital Journey with a cinematic heliosphere cutaway for curious teens and adults without astronomy knowledge. The confirmed learning goal is to understand how the Sun's solar wind creates the heliosphere and where the planetary orbits sit inside it. Concise optional explanations distinguish calculated motion from illustrative artwork. Preserve the existing lesson that apparent planetary paths depend on the observer's reference frame.

## Capabilities

- **CAP-1**
  - **intent:** Visitors freely inspect a 3D heliosphere cutaway around the planetary system.
  - **success:** Orbit, pan and zoom reveal the elongated heliosphere, visible heliotail, nested regions, Sun and all eight planets. Reset View restores the full cutaway overview; planet cards retain explicit Focus Camera and Follow Planet.
- **CAP-2**
  - **intent:** Visitors select heliosphere regions to understand how solar wind surrounds the planetary system.
  - **success:** Solar wind, Termination shock, Heliosheath, Heliopause and Interstellar space are selectable in the scene or through five labeled buttons and expose the explanations in `heliosphere-presentation.md`. Region/planet selection replaces the current information card without pausing or moving the camera.
- **CAP-3**
  - **intent:** Visitors control planetary playback while exploring the heliosphere.
  - **success:** The existing planetary clock supports playback, scrubbing and speed changes with unchanged calculated timing and physical card values. Entry/Back retain the agreed date, speed, camera and selection state; no new scientific frame or clock is introduced.
- **CAP-4**
  - **intent:** Visitors see illustrative heliosphere flow and boundary motion.
  - **success:** Slow outward flow and soft shimmer coexist with ±2% boundary expansion/contraction over each 20-second full cycle, independently of planetary playback speed. Shared Pause freezes planets and effects; explicit resume continues the stored effect phase without a jump.
- **CAP-5**
  - **intent:** Visitors explore and read explanations with mouse, touch, keyboard and reduced motion.
  - **success:** Camera buttons and region buttons provide keyboard access equivalent to mouse/touch interaction, with the focus rules in `heliosphere-presentation.md`. Reduced motion freezes decorative effects while allowing user-started planetary playback and camera controls.

## Constraints

- Follow the adopted `ARCHITECTURE-SPINE.md` (AD-1–AD-8); its invariants bind implementation, while its structural and version seeds remain code-owned.
- Preserve the adopted baseline: three scientific views, five skippable chapters, free exploration, Sun's Gravity, the deterministic 165-Julian-year planetary timeline and the isolated schematic Galactic clock.
- Accuracy governs motion; spectacle governs rendering. Preserve JPL-derived planetary calculations and physical values; illustrative geometry and animation must not feed astronomy or imply a date-specific boundary forecast.
- Use the elongated heliotail cutaway and compressed orbital distances/enlarged bodies described in `heliosphere-presentation.md`. Preserve planetary order and nested region relationships. Show “Schematic — distances compressed; body sizes exaggerated.” Disclose illustrative geometry and animation.
- Follow the confirmed playback, entry/return, focus, selection, Follow, layer and input contracts in `heliosphere-presentation.md`. Keep heliosphere state session-only, absent from URLs and storage; disable sharing with an explanation.
- Use a dim, faint diagonal Milky Way band and sparse distant stars, reducing density on phones or lower quality. The background is decorative, without automatic drift, star streaks, camera orbit or claims of exact stellar positions/galactic alignment.
- Remain private, accessible, fully static and deployable at the GitHub Pages repository subpath; retain the baseline stack, module boundaries and restrictions on runtime networking and tracking.
- Retain stable 60 FPS on typical recent laptops, at least 30 FPS on supported phones, roughly 3 MB compressed critical transfer and 15 MB complete experience. Adapt rendering quality without reducing orbital accuracy.
- Tune exact geometry, monotonic distance mapping, body-size factors, camera limits and movement increments during implementation within the agreed readability, scientific and interaction constraints.
- Implementation must update PRD and SCIENCE wherever the feature changes their contracts, including its display-scale exception. Credit scientific/visual sources and update ASSET_CREDITS.md if bundled imagery is added or replaced.

## Non-goals

- Spacecraft, including Voyager markers and stories; a guided outward journey.
- Exact date-specific heliosphere forecasts or claims of measured global geometry without a justified scientific model.
- Features excluded by the baseline PRD.

## Success signal

Demonstrate the elongated cutaway and heliotail, readable Sun/eight planets, all five region explanations, accurate planetary playback, disclosed illustrative effects, the exact scale disclosure, all layer controls and mouse/touch/keyboard/reduced-motion access. Exercise entry/Back, selection/Follow, scrub/endpoint/hidden-tab pauses, clean Home/journey exits and session-only sharing behavior, then verify the existing journey, scientific views, clock isolation, static deployment and performance targets remain intact. Visitor learning has not been measured.
