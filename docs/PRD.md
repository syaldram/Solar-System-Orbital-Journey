# Product Requirements Document

## Solar System: Orbital Journey

**Status:** Version 1 requirements confirmed

**Source:** Product decisions captured during the September 29, 2026 `grill-me` session

**Product subtitle:** “See how our planetary system moves through the Milky Way.”

## 1. Product summary

Solar System: Orbital Journey is an interactive, browser-based Three.js experience that explains two motions at once: the eight planets orbit the Sun while the Sun travels through the Milky Way.

The experience should feel cinematic and immediately engaging without sacrificing the underlying lesson. Accuracy governs motion; spectacle governs rendering. The product must avoid the misleading “vortex model” by showing that the apparent paths depend on the observer’s reference frame.

## 2. Audience and user need

The primary audience is curious teens and adults with no astronomy background. They need an intuitive way to understand:

- Why a familiar Sun-centered view and a moving-Sun view can both be useful.
- How dramatically planetary orbital periods differ.
- Why the Solar System’s local galactic motion can be approximated as a straight tangent over a human-scale timeline.
- Which parts of the presentation are physical calculations and which are visual or schematic simplifications.

The initial experience must not require prior reading. Explanations should be concise, optional, and available in context.

## 3. Product principles

1. **Scientific honesty:** Use deterministic astronomy calculations, state their limits, and visibly disclose rendering exaggerations.
2. **Reference frames teach the lesson:** Make changes in viewpoint explicit instead of presenting a single corkscrew-like path as absolute truth.
3. **Guided, never trapped:** Offer a polished journey while allowing users to pause, scrub, select, skip, or explore freely.
4. **Cinematic restraint:** Use motion, light, scale, and typography to create wonder without resembling a spaceship cockpit.
5. **Accessible by construction:** Keep essential text and controls in semantic HTML rather than WebGL.
6. **Private and static:** Require no account, API key, analytics, cookies, tracking, or server-side runtime.

## 4. Version 1 scope

Version 1 includes:

- The Sun and all eight planets.
- A deterministic 165-Julian-year simulation.
- Three linked reference-frame views.
- A five-chapter guided journey and free exploration.
- Play, pause, scrubbing, named speed steps, and current simulated date.
- Planet selection, information cards, and camera controls.
- Shareable URLs for reproducible views.
- Desktop and functional touch layouts.
- Reduced-motion and adaptive-quality behavior.
- Locally bundled textures, scientific documentation, and source credits.
- Static deployment to GitHub Pages.

Version 1 explicitly excludes:

- Moons, asteroids, spacecraft, and full N-body dynamics.
- An animated 230-million-year galactic orbit.
- Independently animated cloud bands.
- Sound, analytics, accounts, or remote error reporting.
- A Progressive Web App or offline-first installation flow.
- Arbitrary camera matrices in shared URLs.
- A star-by-star Milky Way or nearby-star map.

## 5. Entry experience and journey

The application opens on a still hero composition. Camera movement must never autoplay on initial load.

The hero presents two primary actions:

- **Begin Journey** starts the guided experience.
- **Explore Freely** enters the simulation without the tour.

The guided journey contains five skippable chapters:

1. **Meet the Solar System** — introduce the familiar Sun-centered view.
2. **Set Time in Motion** — demonstrate the planets’ different orbital periods.
3. **Change Your Point of View** — introduce reference frames.
4. **The Sun Is Moving Too** — reveal the local tangent journey.
5. **Our Place in the Milky Way** — show the schematic galactic overview, then return control to the user.

Users may pause, scrub time, orbit the camera, select a planet, change views, or skip the journey at any time. Automatic tour speed changes must be reflected in the visible controls. After completion, the menu exposes **Replay Journey**.

Reduced-motion mode replaces sweeping transitions with brief crossfades or immediate cuts, disables automatic orbiting and motion trails, and requires user input between chapters.

## 6. Reference frames

The interface uses exactly these three labels:

### Travel with Sun

- Sun-centered J2000 ecliptic view.
- Preserve relative semi-major-axis distances and eccentricities.
- Enhance planet and Sun radii independently for visibility.
- Use camera movement, markers, and labels to reveal the inner system rather than compressing orbital distances.
- Short optional trails reveal orbital ellipses.

### Watch from Space

- Show heliocentric positions transformed into the J2000 galactic frame while the Sun translates.
- Use the full ecliptic-to-equatorial-to-galactic transformation, preserving the approximately 60.2° inclination and line of nodes.
- Render the Sun’s 165-year motion as a straight path labeled **local tangent approximation**.
- Use an abstract galactic coordinate grid and distance ticks. Decorative stars remain distant and unlabeled.
- Keep the real transverse-to-forward distance ratio; do not exaggerate planetary motion.
- Show only a short rolling trail window by default.
- Provide **Show Full Journey**, where the Solar System becomes a labeled marker.

### Galaxy Overview

- Show a stylized barred-spiral disk with the Sun about 26,000 light-years from the center.
- Show the Sun’s orbital direction and a simplified circular path.
- Label the view **schematic—not a star-by-star map**.
- Do not imply exact spiral-arm geometry.
- State that vertical and radial oscillations are omitted.

Changing reference frames resets motion trails.

## 7. Timeline and playback

- Begin each ordinary visit at the visitor’s current UTC date.
- End exactly 165 Julian years later.
- Provide **Play/Pause**, a full-range scrubber, the simulated UTC date, and **Return to Today**.
- Provide named speed steps: **1 day/s**, **1 month/s**, **1 year/s**, and **10 years/s**.
- Begin the guided tour near real-time educational pacing, then accelerate to reveal outer-planet motion.
- At the endpoint, stop playback and show **Journey complete**.
- Offer **Replay from Today** and **Continue Exploring**.
- Never loop automatically.

## 8. Selection, camera, and controls

Selecting a planet opens an information card without pausing playback or moving the camera automatically.

The card provides:

- Planet name and one-sentence identity.
- Current distance from the Sun.
- Orbital period.
- Current orbital speed.
- A **Learn more** disclosure with eccentricity, inclination, and scale notes.
- Explicit **Focus Camera** and **Follow Planet** actions.

Camera interaction supports constrained orbit, pan, and zoom around the selected object or Sun. It prevents clipping through bodies and provides **Reset View**.

Named camera bookmarks are:

- **Inner Planets**
- **Outer Planets**
- **Along the Path**
- **Above the Ecliptic**
- **Show Full Journey**

View Options contains four toggles:

- Orbit paths
- Labels
- Motion trails
- Orbital-plane overlays

Orbit paths and essential labels default on. Trails and plane overlays default off.

## 9. Sharing and persistence

**Share this view** encodes only:

- Simulated UTC date
- Selected object
- Reference frame
- Named camera bookmark

It must not encode arbitrary camera matrices, analytics identifiers, or private information.

Local storage is limited to presentation preferences such as reduced motion, quality level, labels, trails, and a future volume preference. The simulated time always starts at today unless a valid shared URL supplies a date.

## 10. Scientific model

### Planet positions

- Use JPL Approximate Positions of the Planets, Table 2a and the Table 2b periodic corrections, for all eight planets.
- Use the model continuously across the entire 165-year range.
- Describe positions as **calculated from JPL approximate orbital elements**, never as real-time NASA tracking.
- Treat Earth as the Earth–Moon barycenter, consistent with the source model.
- Keep astronomy calculations separate from rendering.

### Galactic conventions

Adopt and document these rounded conventions:

- Sun’s galactocentric distance: 26,000 light-years.
- Local galactic speed: 220 km/s.
- Galactic orbital period: approximately 230 million years.

### Rotation and axes

- Preserve published axial tilts.
- Represent each physical spin pole using its full obliquity.
- Rotate positively around that pole using the absolute sidereal-period magnitude.
- Preserve signed source rotation periods in metadata without applying a second visual reversal to Venus or Uranus.
- Treat giant-planet periods as adopted reference rotations because visible atmospheres rotate differentially.
- At extreme time compression, stabilize surface rotation visually and disclose the stabilization. Orbital positions remain fully time-derived.

### Units and precision

- Planet radii and local speeds: kilometers and kilometers per second.
- Solar-System distances: astronomical units.
- Galactic distances: light-years.
- Periods: days or Earth years.
- Round values to match the model’s actual precision.

Every numerical constant must include its unit, source organization, source URL, and retrieval date in typed data.

## 11. Visual and content design

Use a restrained observatory aesthetic:

- Near-black navy background.
- Warm solar gold and cool informational blue.
- Translucent panels and crisp sans-serif typography.
- Luminous orbit lines, recognizable textures, plausible lighting, and very limited bloom.
- A procedural or stylized Milky Way, clearly identified as schematic.

Content uses concise documentary language: curious, calm, and precise. Define unfamiliar terms such as *ecliptic* in place, avoid equations in the main journey, and reserve technical depth for **Learn more** and **Explain this view**.

Persistent labels appear only when useful. Wide views replace illegibly small bodies with markers and labels.

## 12. Assets, loading, and privacy

- Bundle optimized NASA/USGS-derived textures where available.
- Downsample archival imagery appropriately.
- Generate Uranus procedurally from its observed color.
- Label representative appearance textures honestly.
- Include in-app **Sources & Credits** and a repository asset manifest.
- Never imply NASA, JPL, or USGS endorsement.
- Load the hero quickly with lightweight placeholders, prioritize inner-planet assets, and defer the galaxy overview until requested.
- Make no runtime network calls after the initial static site load.
- Include no analytics, cookies, tracking pixels, accounts, or remote error reporting.

## 13. Accessibility and responsive behavior

- Use semantic HTML controls with visible focus states.
- Keep pause visible throughout the experience.
- Provide keyboard-accessible playback, navigation, and view controls.
- Provide text equivalents for essential visual explanations.
- Do not rely on color alone.
- Provide a semantic fallback page describing the experience, browser requirements, core lesson, and source links.
- On touch devices, use a collapsible bottom sheet, large targets, one-finger orbit, pinch zoom, and explicit two-finger pan.
- Supported desktop targets are current Chrome, Edge, Firefox, and Safari.
- Phones receive a functional layout with reduced visual density when necessary.

## 14. Performance and adaptation

- Target a stable 60 FPS on a typical recent laptop and at least 30 FPS on supported phones.
- Detect sustained poor performance and reduce bloom, star density, pixel ratio, and texture detail.
- Never reduce orbital accuracy as a performance adaptation.
- Keep critical initial transfer under roughly 3 MB compressed.
- Keep the complete experience under roughly 15 MB compressed.
- Avoid archival-resolution assets and provide texture tiers where useful.

## 15. Technical architecture

Use Vite, TypeScript, npm, current Node LTS, and direct Three.js. Do not introduce a UI framework unless future requirements create a clear need.

Use four modules with explicit responsibilities:

- **Astronomy** — pure time-to-position, rotation, physical data, and reference-frame calculations.
- **Rendering** — Three.js scenes, bodies, materials, effects, and cameras; consumes astronomy state and contains no scientific rules.
- **Experience** — deterministic timeline, guided-tour chapters, selection, bookmarks, and preferences.
- **Interface** — semantic controls, panels, accessibility behavior, and validated URL state.

The project must remain fully static and deployable at the GitHub Pages repository subpath.

## 16. Verification and release criteria

A version 1 release is acceptable when:

- The five-chapter journey completes and can be skipped.
- All eight planets remain numerically correct across the full timeline.
- All three views and five camera bookmarks work.
- Playback, scrubbing, speed changes, selection, sharing, and reset work.
- Keyboard and reduced-motion flows are complete.
- Unit tests cover positions, periods, rotations, transforms, timeline boundaries, URL validation, and pause/scrub behavior.
- Browser smoke tests cover loading, tour controls, keyboard input, sharing, reference frames, camera bookmarks, and the GitHub Pages base path.
- Chromium, Firefox, and WebKit smoke tests pass; current Safari receives a manual release check.
- The experience maintains its performance targets after quality adaptation on representative hardware.
- Every scientific and visual source is credited.
- The production build works from `/Solar-System-Orbital-Journey/`.
- A complete guided journey produces no uncaught errors.

The agreed requirements and cited primary scientific sources are the authority. Any later visual exaggeration must be disclosed in **Explain this view** and documented in the repository.
