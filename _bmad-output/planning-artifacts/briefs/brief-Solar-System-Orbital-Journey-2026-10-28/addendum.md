# Product brief addendum

## Visual reference and selected direction

The user supplied a [heliosphere cutaway illustration](/Users/saadyaldram/Desktop/image1.jpeg) on October 28, 2026. It places the planetary system inside a blue volume with termination shock, heliopause, interstellar space, and Voyager 1 labels. It is visual inspiration, not a requested literal copy. The image remains an external discovery reference; no new imagery has been bundled into the app.

The selected direction is free exploration of a 3D cutaway: rotation, zoom, and selectable regions with short explanations. The Sun and all eight planets are included. Planetary playback continues to be available, and the heliosphere combines flowing/shimmering effects with gentle expansion and contraction. The chosen background is a faint Milky Way band and scattered distant stars.

A guided outward journey and a Voyager-centered story were considered as alternative main experiences. The user selected free exploration and explicitly limited the first release to the Sun, planets, and heliosphere. This excludes supporting spacecraft markers as well as spacecraft stories and preserves the PRD's spacecraft exclusion.

## Scientific grounding

### Regions and boundaries

Solar wind slows at the termination shock, passes through the heliosheath, and meets interstellar plasma at the heliopause. All eight major planets are inside the termination shock. The heliopause is a plasma boundary; rendered glow, color, and opacity would be explanatory design choices. [NASA: Studying the Edge of the Sun’s Magnetic Bubble](https://www.nasa.gov/missions/ibex/studying-the-edge-of-the-suns-magnetic-bubble/), consulted October 28, 2026.

The precise global shape is not settled, and the boundaries vary with solar activity. A fixed perfect sphere should not be presented as measured geometry. Boundary animation tied to the simulated planetary date would require a justified scientific model. [NASA: IBEX Charts 11 Years of Change](https://www.nasa.gov/missions/ibex/nasas-ibex-charts-11-years-of-change-at-boundary-to-interstellar-space/), consulted October 28, 2026.

Crossing the heliopause into interstellar space does not mean leaving the whole Solar System: the Oort Cloud extends much farther. Avoid describing the heliopause as the outer limit of everything belonging to the Solar System. [NASA/JPL: Voyager 2 Enters Interstellar Space](https://www.jpl.nasa.gov/news/nasas-voyager-2-probe-enters-interstellar-space/), consulted October 28, 2026.

### Implications for specification

Use the sources above to define the explanatory regions and disclosures. The user's animation choice establishes a visual direction, not a physical boundary model. Preserve the distinction between calculated planetary motion and illustrative heliosphere effects. Explicitly disclose illustrative geometry and any changes in display scale.

## Working assumptions and design details

The [brief](brief.md) identifies the remaining analyst recommendations as assumptions. They include an Explore Heliosphere entry with Back restoring the previous planetary view, reuse of the planetary clock, slow heliosphere effects independent of planetary playback speed, a shared Pause, layer visibility controls, and reduced-motion treatment.

The proposed learning outcome is understanding the Sun's surrounding environment and how planetary orbits fit within it. This has not been separately confirmed by the user. Decorative, stylized treatment of the chosen background is also a recommendation; the faint band and scattered stars are confirmed visual choices.

Before implementation, specify boundary geometry, scale treatment, animation amplitude and timing, entry and exit state, camera behavior, selectable regions, keyboard and touch controls, background orientation and density, and any background animation. Accessibility and existing performance targets constrain those choices.

## Evidence limits and handoff

The baseline comes from the PRD and SCIENCE documents. The deployed app has not been inspected during this brief workflow, and visitor learning has not been measured. No heliosphere model has been selected or implemented.

This addendum supplies context for a feature spec. It does not amend the active PRD or SCIENCE contracts; implementation must update those documents wherever the feature changes their requirements.
