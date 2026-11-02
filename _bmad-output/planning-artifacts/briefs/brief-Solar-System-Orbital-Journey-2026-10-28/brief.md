---
title: "Product Brief: Solar System: Orbital Journey"
status: finalized
created: 2026-10-28
updated: 2026-10-28
---

# Product Brief: Solar System: Orbital Journey

## Vision and audience

Solar System: Orbital Journey is a cinematic browser experience for curious teens and adults with no astronomy background. It shows the planets orbiting the Sun while the Sun moves through the Milky Way, teaching that apparent planetary paths depend on the observer's reference frame.

Accuracy governs motion; spectacle governs rendering. Concise, optional explanations distinguish calculated motion from visual exaggerations and schematic illustrations. Visitors can follow a guided journey or explore freely without prerequisite reading.

This brief captures the existing vision and the selected direction for a heliosphere addition to the deployed app. It is finalized at the product-brief level; assumptions and detailed behavior remain for specification. It does not verify deployed behavior or replace the [PRD](../../../../docs/PRD.md) and [scientific contract](../../../../docs/SCIENCE.md).

## Existing experience

The documented baseline includes the Sun and eight planets, three scientific views, a five-chapter journey, free exploration, a deterministic 165-year planetary timeline, and a separate schematic Galactic clock. The optional Sun’s Gravity presentation provides another disclosed educational schematic.

The product remains accessible, private, fully static, and deployable to GitHub Pages. Scientific honesty, user control, and existing performance targets govern additions.

## Heliosphere: selected first-release direction

Visitors freely explore a 3D cutaway inspired by the supplied illustration. They rotate and zoom around the scene and select regions for short explanations.

The first release includes:

- The Sun, all eight planets, and the surrounding heliosphere.
- Moving planets with planetary playback.
- Both flowing/shimmering heliosphere effects and gentle expansion and contraction.
- A faint Milky Way band and scattered distant stars as the background.

Spacecraft, including Voyager markers and stories, are outside this release's scope. A guided outward journey is outside the selected first-release direction.

[ASSUMPTION] The learning outcome is to help visitors understand the Sun's surrounding environment and how the planetary orbits fit within it.

The heliosphere presentation must distinguish explanatory artwork from physical calculations. Its shape and animation must not imply an exact, date-specific boundary prediction without a justified scientific model. [Scientific sources and reference context](addendum.md) inform the later specification.

## Working assumptions for specification

These are analyst recommendations, not individually confirmed user decisions:

- [ASSUMPTION] **Entry and return:** Explore Heliosphere opens an educational schematic during free exploration; Back restores the previous planetary view. It adds no scientific reference frame.
- [ASSUMPTION] **Playback:** Retain the existing planetary clock. Heliosphere effects maintain a slow illustrative pace independent of planetary playback speed; a shared Pause stops both.
- [ASSUMPTION] **Accessibility and inspection:** Reduced motion freezes decorative effects while retaining user-controlled planetary playback and camera input. Layer visibility controls help inspect the cutaway.
- [ASSUMPTION] **Background:** Treat the chosen Milky Way band and stars as decorative, stylized context, keeping the heliosphere and labels prominent without implying a catalog of stellar positions.

## Proposed success criteria

Refine these into testable acceptance criteria in the feature spec:

- Visitors can rotate, zoom, and select explanatory regions, with equivalent keyboard controls and text explanations.
- Planetary motion retains calculated timing; heliosphere effects are visibly disclosed as schematic.
- Pause stops animation, and reduced motion preserves access to exploration and explanations.
- The addition preserves the existing journey and scientific views and meets existing performance targets.

These are proposed acceptance targets, not measured learning outcomes or verified production results.

## Specification handoff

Confirm or revise the learning outcome and working assumptions. Define the selectable regions, boundary geometry, display scale, animation amplitude and timing, entry/exit state, camera behavior, and accessible controls. Update the PRD and SCIENCE documents alongside any implementation that changes their contracts.

Sources: the existing PRD and SCIENCE documents, the user's supplied image, and product decisions captured on October 28, 2026. The [addendum](addendum.md) preserves scientific grounding and alternatives considered.
