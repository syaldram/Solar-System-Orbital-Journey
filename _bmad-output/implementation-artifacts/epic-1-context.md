# Epic 1 Context: Explore and understand the heliosphere

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give curious teens and adults accessible exploration of a heliosphere cutaway containing the Sun and eight planets. Visitors learn how solar wind creates the heliosphere, inspect five regions, control accurate planetary playback alongside disclosed illustrative effects, and return to their scientific context. Preserve the existing reference-frame lesson and baseline contracts.

## Stories

- Story 1.1: Reliably enter and return from Sun’s Gravity
- Story 1.2: Explore the heliosphere cutaway and return to the scientific view
- Story 1.3: Inspect heliosphere regions and reveal their layers
- Story 1.4: Control illustrative heliosphere motion with planetary playback
- Story 1.5: Inspect the cutaway against a restrained Milky Way background
- Story 1.6: Explore smoothly across supported devices while preserving the existing experience

## Requirements & Constraints

- Entry is available only during free exploration from Travel with Sun or Watch from Space, outside another schematic. Add no scientific frame or clock. Entry pauses at the current UTC date, retains speed, captures scientific return context once, ends Follow and clears trails. Back restores the captured view/camera and valid saved planet, retains explored date/speed, stays paused and never restarts Follow. Home/journey exits discard the session and retain their established destinations.
- Show an elongated blue translucent cutaway, visible heliotail and nested nonintersecting regions. Keep all eight readable planets inside the termination shock throughout animation. Compress distances strictly monotonically and enlarge bodies while preserving order and calculated phase. Exact geometry, mapping and camera tuning remain implementation choices.
- Preserve planetary calculations/physical values, the 165-Julian-year timeline, isolated Galactic clock, scientific-view scale/transforms, five camera bookmarks, journey, Gravity, Follow, URL allowlists and presentation-only persistence. Rendering approximations never feed astronomy.
- Identify geometry, animation and background as explanatory artwork. Explain that the heliopause is a plasma boundary and Oort Cloud objects extend farther. Use the presentation companion’s exact scale disclosure and five exact short region explanations. Exclude spacecraft, guided outward travel, measured-global-shape claims and date-specific boundary forecasts.
- Combine outward flow, shimmer and ±2% boundary breathing over each complete 20-second cycle, independently of planetary speed. Pause, scrub, endpoint and hidden-tab transitions freeze planets and decoration, including visible solar effects and stabilized spin. Scrub and tab return stay paused; explicit resume retains phase without catch-up. Reduced motion freezes decoration while permitting requested planetary playback and camera input.
- Retain private static delivery at `/Solar-System-Orbital-Journey/`, bundled resources and existing fallback/deployment. Add no services, authentication, tracking or persistent feature state. Target 60 FPS on representative recent laptops, 30 FPS on supported phones after adaptation, roughly 3 MB compressed critical transfer and 15 MB total. Adapt visual detail without changing mapping, identities, access, nesting or cadence.
- Update PRD/SCIENCE with contract changes, credit sources and update ASSET_CREDITS for added/replaced imagery. Run deterministic/browser checks, `npm run check` and `npm run test:e2e`. Cover Chromium/Firefox/WebKit, manual current Safari, touch, fallback and repository-subpath deployment. Record device performance and compressed resource sets; disclose unverified behavior and approximations. Do not claim measured visitor learning.

## Technical Decisions

- Astronomy remains pure with explicit dates; Experience owns deterministic state/actions without DOM or Three.js; Rendering owns geometry/resources; Interface owns semantic content. The composition root wires boundaries. Validate external data and prefer explicit domain types and readonly boundaries.
- Use one discriminated presentation state for scientific, gravity and heliosphere, migrating Gravity without behavior changes. Keep scientific view identities `sun`, `space`, `galaxy`; prohibit schematic nesting and direct schematic handoffs. Each session owns one scientific return context; its four layers reset on entry without overwriting scientific preferences.
- Both schematics consume unchanged heliocentric snapshots regardless of entry frame. One rendering-owned heliosphere mapping supplies bodies, paths, labels, picking and Focus/Follow targets. It is independent of quality and playback speed and separate from Gravity/scientific mappings.
- Experience stores one nonnegative decorative phase in active presentation seconds. Advance through explicit real-time deltas only while Heliosphere is active, playing, visible and reduced motion is off. Rendering derives every visible effect from that phase. Deliver visibility changes before advancement and reset the shell’s elapsed-time baseline on visibility transitions.
- Use one tagged body/region/none selection and common region IDs: `solar-wind`, `termination-shock`, `heliosheath`, `heliopause`, `interstellar-space`. A rendering-owned resolver arbitrates all pointer hits into at most one selection; drawing and picking share surface/layer associations.
- Coordinate camera/focus through ordered accepted enter/Back/discard intents, including multiple handoffs before rendering. Experience owns saved view/bookmark/selection; the camera controller alone owns pose/target. Capture once, restore the matching session and clear pending movement/damping/Follow.
- Keep all heliosphere state out of URLs/storage. Disable sharing with an explanation and guard the share boundary itself. Rendering owns GPU allocation/reuse/disposal and renderer-created DOM. Retain the existing stack, fallback, test/deployment conventions and Firefox-headed/Xvfb coupling; introduce no unrequested dependency changes.

## UX & Interaction Patterns

- Focus Back on entry and Explore Heliosphere on Back. Preserve baseline focus destinations on other exits. Keep semantic controls, visible focus, text equivalents and reachable Pause; native control keys take precedence over global shortcuts.
- Provide all five region buttons plus scene selection and independent Outer heliosphere, Termination shock, Orbit paths and Labels toggles, initially on. Hidden surfaces cannot be picked; buttons remain available, existing cards stay open and button selection never unhides a layer. Labels affects scene labels only.
- Maintain one card. Selection replaces it without pausing or moving the camera. Region selection and Escape end associated Follow; planet Focus/Follow target displayed positions. Manual camera input, playback and scrub retain Follow. Reset ends Follow and restores the full cutaway overview.
- Support mouse orbit/pan/wheel zoom, touch orbit/pinch/two-finger pan and equivalent labeled keyboard camera buttons. Prevent body clipping and automatic orbit. On phones keep large targets and all explanations/controls reachable through the collapsible bottom sheet.
- Retain the navy/gold/blue observatory aesthetic, faint diagonal Milky Way band and sparse dim static stars, reducing density on phones/lower quality. Avoid drift, streaks and exact alignment claims. The reference image need not be bundled.

## Cross-Story Dependencies

Implement 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6. Gravity establishes session ownership before heliosphere entry, selection/layers, motion and background. Final integration supplies measured release evidence; earlier stories include usable behavior and applicable verification. No other epic is required.
