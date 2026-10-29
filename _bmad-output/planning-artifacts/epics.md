---
status: final
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
workflowStage: complete
validationOpenChecks: 0
storyUnderReview: null
approvedStories: ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6']
approvalMode: user-approved-all-stories
requirementsConfirmed: true
epicStructureApproved: true
sourceSelectionConfirmed: true
feature: Heliosphere free exploration
created: 2026-10-28
inputDocuments:
  - _bmad-output/specs/spec-Solar-System-Orbital-Journey/SPEC.md
  - _bmad-output/specs/spec-Solar-System-Orbital-Journey/heliosphere-presentation.md
  - _bmad-output/specs/spec-Solar-System-Orbital-Journey/visual-reference.md
  - _bmad-output/planning-artifacts/architecture/architecture-Solar-System-Orbital-Journey-2026-10-28/ARCHITECTURE-SPINE.md
  - docs/PRD.md
  - docs/SCIENCE.md
  - _bmad-output/planning-artifacts/briefs/brief-Solar-System-Orbital-Journey-2026-10-28/brief.md
  - _bmad-output/planning-artifacts/briefs/brief-Solar-System-Orbital-Journey-2026-10-28/addendum.md
  - docs/agents/architecture.md
  - docs/agents/testing.md
---

# Solar-System-Orbital-Journey - Epic Breakdown

## Overview

This document decomposes the Heliosphere free-exploration feature into one epic and six implementation stories with 52 numbered acceptance criteria. The audience is curious teens and adults without astronomy knowledge; the learning goal is understanding how the Sun's solar wind creates the heliosphere and where the planetary orbits sit inside it. Preserve the existing reference-frame lesson.

The canonical SPEC and all five companions govern this feature. The presentation and visual-reference companions supply its UX contract; no separate DESIGN.md/EXPERIENCE.md pair was found. The original brief and addendum are historical background: their earlier assumptions and open details do not supersede the finalized spec. Architecture AD-1–AD-8 bind implementation. PRD and SCIENCE remain the active baseline, with the agreed heliosphere exceptions to be incorporated alongside implementation.

FR1–FR24 describe feature behavior. FR25–FR32 capture existing behavior to preserve and verify, rather than a request to rebuild the product. The complete PRD and SCIENCE contracts remain binding; their preservation requirements below are an index into those documents. Requirement IDs are local to this breakdown; CAP and AD references retain their source identities.

Scope excludes spacecraft (including Voyager markers/stories), a guided outward journey, exact date-specific boundary forecasting, claims of measured global geometry without a justified model, and all baseline PRD exclusions. The external reference image is inspiration, not a required bundled asset. Geometry, materials, mapping parameters, body factors, hit geometry and camera increments remain implementation choices within the adopted constraints.

The user confirmed the requirements inventory and approved the single-epic structure. Stories 1.1–1.3 received individual approval; the subsequent instruction “approve all stories” approved Story 1.4 and authorized completion of the remaining stories without individual approval stops. All six stories are recorded below. Requirement allocation and final planning validation are complete, with zero open planning checks. This final document is ready for implementation planning; implementation behavior, deployment, performance and visitor learning have not been verified by this planning work.

## Requirements Inventory

### Functional Requirements

FR1: Offer Explore Heliosphere only during free exploration from Travel with Sun or Watch from Space, outside Sun's Gravity; prohibit entry from Galaxy Overview, the guided tour or another schematic. Add no scientific reference frame or scientific clock. [CAP-1, CAP-3; presentation: Entry and return; AD-2]

FR2: On accepted entry, pause at the current planetary UTC date, retain speed, capture the prior scientific view/camera/selected planet once, end Follow, clear trail history, initialize all four heliosphere layers on and focus Back. [CAP-3, CAP-5; presentation: Entry and return]

FR3: Back restores the captured scientific view and camera and the saved planet if still valid, otherwise no selection; retain the explored date and speed, remain paused, leave Follow off, clear trail history and return focus to Explore Heliosphere. Scientific overlay preferences survive the session. [CAP-3, CAP-5; presentation: Entry and return]

FR4: Home, Begin Journey and Replay Journey exit Heliosphere cleanly to their established destinations, discard the captured return state, end Follow and clear trails. A later entry captures a new session and resets its four layers without overwriting scientific overlay preferences. [presentation: Entry and return; AD-2, AD-7]

FR5: Render a freely explorable elongated 3D heliosphere cutaway with visible heliotail, nested nonintersecting regions, the Sun and all eight readable planets. All eight major planets remain inside the termination shock throughout the boundary animation. [CAP-1; presentation: Shape and cutaway; AD-5]

FR6: Compress displayed orbital distances strictly monotonically and enlarge displayed bodies while preserving planetary order and calculated orbital phase/timing. Bodies, orbit paths, labels, hit geometry and Focus/Follow use the same displayed mapping. Physical card values continue to derive from the original heliocentric scientific data regardless of the entry frame. [CAP-1, CAP-3; presentation: Display scale; AD-3, AD-5]

FR7: Make Solar wind, Termination shock, Heliosheath, Heliopause and Interstellar space individually selectable both in the scene and through five semantic labeled buttons, using common region identities. [CAP-2, CAP-5; presentation: Selectable regions and scientific content]

FR8: Display each selected region's exact short explanation from the presentation companion, plus accessible context explaining that all eight planets lie inside the termination shock, the heliopause is a plasma boundary, and distant Solar-System objects including the Oort Cloud extend farther. Disclose illustrative geometry/animation and the exact scale statement. [CAP-2; presentation: Scientific content, Display scale and Display and motion contract]

FR9: Keep one current information card: selecting a planet or region replaces the prior selection without pausing playback, moving the camera or unhiding a layer. Resolve overlapping scene hits into at most one selection per pointer activation; region selections are valid only in Heliosphere. [CAP-2; AD-6]

FR10: Planet cards retain explicit Focus Camera and Follow Planet actions targeting each body's displayed schematic position/radius. Following is tied to the selected planet's open card and exposes Stop Following with the planet name. [CAP-1; presentation: Controls and inspection; PRD §8; AD-7]

FR11: End Follow on region selection, card close/Escape, selection of another planet, Focus Camera, Reset View, another camera bookmark/reference-frame view, schematic entry/exit, Home or guided-tour chapter change. Stopping Follow leaves the camera where it is unless an explicit navigation/handoff action moves it. Orbit, pan, zoom, playback, pause and scrub do not cancel Follow. Never automatically restart Follow on Back. [presentation: Controls and inspection; PRD §8; AD-2, AD-7]

FR12: Provide independent Outer heliosphere, Termination shock, Orbit paths and Labels toggles, all on for each new entry and scoped to the heliosphere session. [presentation: Controls and inspection]

FR13: Exclude hidden surfaces from scene picking while keeping all explanation buttons available. Hiding a selected layer leaves its card open; selecting its button does not unhide it. Labels affects scene labels only, never semantic controls. [CAP-2, CAP-5; presentation: Controls and inspection; AD-6]

FR14: Reuse the deterministic planetary clock and existing Play/Pause, scrubbing, speed steps, UTC date and timeline controls in Heliosphere with unchanged calculated motion and physical card values. Never advance or reinterpret Galactic elapsed time through heliosphere interactions. [CAP-3; AD-3]

FR15: Show slow outward flow and soft shimmer together with boundary expansion/contraction of ±2% from baseline over each complete 20-second cycle. Drive all visible heliosphere decoration from one retained active-animation phase independently of planetary speed; boundary geometry remains nested throughout. [CAP-4; presentation: Display and motion contract; AD-4, AD-5]

FR16: Explicit Play/Resume permits planetary motion and, when reduced motion is off, decorative animation. Shared Pause freezes planets and all visible decoration, including the Sun and stabilized surface spin. Explicit resume continues the retained phase without a jump; changing planetary speed never changes effect pace. [CAP-3, CAP-4; presentation: Playback lifecycle; AD-4]

FR17: Scrubbing freezes decorative phase and leaves playback paused at the chosen planetary date. The timeline endpoint stops both advancement and effects, preserves baseline completion controls and never loops automatically. [CAP-3, CAP-4; presentation: Playback lifecycle; PRD §7]

FR18: Hiding the tab freezes planetary advancement and decorative phase. Returning leaves playback paused with no hidden-time catch-up; a later explicit resume continues the retained phase without a jump. [CAP-3, CAP-4; presentation: Playback lifecycle; AD-4]

FR19: Reduced motion freezes decoration while retaining user-started planetary playback and manual camera controls. Turning reduced motion off never starts a paused planetary clock. Apply the feature-wide freeze policy without changing baseline animation behavior in other presentations. [CAP-5; presentation: Playback lifecycle; AD-4]

FR20: Support mouse primary-drag orbit, secondary-drag pan and wheel zoom; touch one-finger orbit, pinch zoom and two-finger pan; and equivalent labeled directional orbit/pan, zoom and Reset buttons operable with Tab and Enter/Space. [CAP-1, CAP-5; presentation: Controls and inspection]

FR21: Escape closes the current card and ends its associated Follow. Native control key behavior takes precedence over global shortcuts; entry/Back focus follows FR2/FR3 and other exits retain baseline focus destinations. [CAP-5; presentation: Controls and inspection; AD-7]

FR22: Reset View restores the full cutaway overview and ends Follow. Camera constraints prevent clipping through displayed bodies, manual navigation stays available and no automatic orbit is introduced. [CAP-1; presentation: Controls and inspection; AD-7]

FR23: Display a faint diagonal Milky Way band and sparse dim distant stars, with reduced star density on phones/lower quality. Keep labels and heliosphere readable; the decorative background has no automatic drift, star streaks, camera orbit or claims of exact stellar positions/galactic alignment. Tail orientation is illustrative and not inferred from the Galactic travel model. [presentation: Background and Shape and cutaway]

FR24: Keep heliosphere presentation, region selection, phase, layers and camera-return state session-only and absent from URLs/storage. Disable sharing with an explanation that Back returns to a shareable scientific view, and guard the share boundary against serializing schematic state. Preserve baseline sharing/persistence behavior after exit. [presentation: Entry and return; AD-8]

FR25: Preserve the still hero, Begin Journey/Explore Freely, five named skippable chapters, user-controlled pause/scrub/navigation/selection/view changes, visible tour speed updates and Replay Journey. Preserve reduced-motion chapter input, crossfade/cut transitions and disabled automatic orbit/trails. [PRD §§5, 16]

FR26: Preserve exactly Travel with Sun, Watch from Space and Galaxy Overview, their transformations/scale/disclosures, trail clearing on view change and all five named camera bookmarks. Preserve Along the Path's non-wrapping coordinate guides, AU/light-year distance values and disclosed speed stabilization; Full Journey's true transverse-to-forward ratio and current-position markers; and Galaxy Overview's stationary schematic galaxy/camera, moving Sun marker, tangent arrow and progress overlay. [PRD §§6, 8, 11; SCIENCE: Reference frames and Display scale]

FR27: Preserve ordinary-visit current-UTC initialization unless a validated shared date is supplied; the exact 165-Julian-year range; Play/Pause, full-range scrubber, UTC date, Return to Today; 1 day/s, 1 month/s, 1 year/s and 10 years/s speed steps; and Journey complete, Replay from Today and Continue Exploring with no automatic loop. [PRD §§7, 9]

FR28: Preserve the isolated Galactic elapsed time clock and its complete PRD §7 lifecycle: approximately 230-million-year orbit, 1/5/10/25 million years/s speeds with 5 default, paused entry, explicit Play/Pause/Resume Galactic Orbit labels, whole-million-year readout, paused scrubbing, orbit-completion/replay/continue controls and Return to Present. Preserve in-session progress/speed but paused re-entry, reload defaults, journey resets and planetary date/speed isolation; expose only the active clock's controls. [PRD §7; SCIENCE: Reference frames]

FR29: Preserve Sun's Gravity's full entry/Back/exit/focus/session behavior, oblique wire-grid overview, finite solar/planetary depressions, existing monotonic mapping and surface offsets, displayed-position labels/paths/Focus/Follow, exact disclosure and membrane-analogy limits. Retain explained unavailability of trails/planes/sharing, scientific preference restoration, reduced-motion behavior and quality adaptation without new imagery/waves/spirals. Migrate its presentation state under AD-2 without changing those contracts. [PRD §6; SCIENCE: Sun's Gravity schematic exception]

FR30: Preserve baseline planet identity, distance, period, orbital-speed and Learn more eccentricity/inclination/scale content; selection without automatic pause/focus; all Follow start/stop/cancellation behavior including Full Journey's announced Along the Path handoff; and Galaxy Overview's selection clearing. Preserve constrained orbit/pan/zoom/reset and scientific View Options defaults: paths/labels on, trails/planes off. [PRD §8]

FR31: Preserve scientific sharing's allowlist of UTC date, selected object, scientific frame and named camera bookmark; presentation-preference-only local storage; current-date initialization without a valid shared date; and exclusion of Galactic progress, arbitrary camera matrices and private identifiers. Shared Galaxy Overview starts at its present-location anchor. [PRD §9]

FR32: Preserve user-visible baseline explanations and visual distinctions: calculated positions versus artwork, optional Learn more/Explain this view, local tangent approximation, schematic Galaxy Overview and omitted oscillations, and disclosed surface-spin/guide stabilization. Retain the restrained solar treatment, recognizable representative textures, wide-view markers, in-app Sources & Credits and semantic fallback explaining the experience, browser requirements, core lesson and sources. [PRD §§6, 10–13; SCIENCE]

### NonFunctional Requirements

NFR1: Preserve deterministic JPL Table 2a/Table 2b calculations across the full timeline, Earth–Moon barycenter treatment, original physical distance/speed/period values and isolated Galactic calculations. Maintain published physical-pole obliquities, positive spin about those poles using absolute sidereal periods, signed metadata and adopted giant-planet reference rotations. Rendering approximations never feed astronomy. [SPEC: Constraints; PRD §10; SCIENCE]

NFR2: Preserve scientific-view semi-major-axis/eccentricity relationships and common radius factor, Watch from Space's full transform/inclination/line of nodes and true transverse-to-forward ratio, and Gravity's separately documented scale exception. Heliosphere's mapping preserves order/phase, all-eight-body readability and nested containment; quality and playback speed cannot change the mapping. [SCIENCE; AD-3, AD-5]

NFR3: Treat geometry, color/glow/opacity, heliotail orientation, background and animation as explanatory artwork. Make no exact measured-shape, date-specific forecast, solar-weather, exact galactic-alignment, spacecraft-scope or heliopause-as-whole-Solar-System-edge claim. Preserve source/model limits and distinguish boundary motion from planetary UTC time. [SPEC; presentation: Scientific content and Display and motion contract]

NFR4: Target stable 60 FPS on typical recent laptops and at least 30 FPS on supported phones after adaptation. Respond to sustained poor performance through bloom/detail/density/pixel ratio/texture changes, preserving orbital accuracy, region identities, access, mapping, nesting and animation cadence. [SPEC: Constraints; PRD §14; AD-8]

NFR5: Keep critical initial transfer under roughly 3 MB compressed and the complete experience under roughly 15 MB compressed. Preserve lightweight hero placeholders, inner-planet asset priority and deferred galaxy loading; feature resources remain within the same budgets. Avoid archival-resolution assets. [PRD §§12, 14; AD-8]

NFR6: Remain fully static at /Solar-System-Orbital-Journey/ on GitHub Pages using bundled resources under the configured base. Retain local dev/preview, the existing CI/deployment pipeline and WebGL construction fallback. Add no backend, API key, authentication or persistent feature store. [PRD §§12, 15–16; AD-8]

NFR7: Preserve privacy: no runtime network calls after the initial static site load, analytics, tracking pixels, cookies, accounts or remote error reporting. Do not widen URL/storage allowlists or serialize whole application state. [PRD §§9, 12; AD-8]

NFR8: Essential controls/explanations remain semantic HTML with visible focus, meaningful labels and text equivalents; do not rely on color alone. Keep Pause visible and keyboard-accessible playback/navigation/view controls available. Reduced-motion and input equivalence are release requirements, not optional polish. [PRD §13; CAP-5]

NFR9: Support current Chrome, Edge, Firefox and Safari, plus functional touch-phone layouts with a collapsible bottom sheet, large targets and reduced visual density. Preserve usable controls, explanations and scene readability across those layouts. [PRD §13]

NFR10: Retain the observatory aesthetic: near-black navy, warm solar gold, informational blue, translucent panels, crisp sans-serif text, luminous orbit lines, plausible lighting and limited bloom. Use concise optional documentary explanations for non-specialists, define unfamiliar terms in context and reserve equations/technical depth for disclosures. [PRD §11; visual-reference]

NFR11: Credit every scientific and visual source in the appropriate repository/in-app locations, preserve the asset manifest and avoid NASA/JPL/USGS endorsement claims. New or replaced bundled imagery requires ASSET_CREDITS.md updates in the same change. Preserve optimized representative NASA/USGS imagery and procedural Uranus; the external reference is not a runtime asset requirement. [SPEC: Constraints; PRD §12; AD-8]

NFR12: Preserve typed numerical-source metadata: unit, source organization, source URL and retrieval date. Use km for radii, km/s for speeds, AU for Solar-System distances, light-years for Galactic distances and days/Earth years for periods; round to model precision. Distinguish illustrative scene parameters from scientific constants. [PRD §10; SCIENCE; AD-5]

NFR13: Update PRD and SCIENCE alongside implementation wherever heliosphere changes their contracts, explicitly recording its compressed-distance/enlarged-body exception and preserving the other views' contracts. Record any intentional approximation and unverified behavior in the handoff; do not claim measured visitor learning or verified runtime/performance from planning alone. [SPEC: Constraints and Success signal; AGENTS.md]

NFR14: Demonstrate all acceptance-matrix cases in the presentation companion and retain baseline verification: deterministic science/state tests; browser flows for journey, scientific views, schematics, sharing, focus, input and Follow; isolated clocks; static base path/fallback; compressed budgets and representative-hardware performance. Pass Chromium/Firefox/WebKit smoke coverage and manually check current Safari for release. Complete guided journeys must produce no uncaught errors. [presentation: Acceptance evidence; PRD §16; testing instructions]

### Additional Requirements

AR1: Retain the existing Vite/TypeScript/direct Three.js/npm/Node LTS application; no greenfield starter, new framework, dependency upgrade, backend, data migration or service setup is specified. Architecture's recorded versions and file layout are seeds owned by code, not instructions to pin or upgrade dependencies. [Architecture: Stack and Structural Seed]

AR2: Preserve module boundaries: pure Astronomy receives explicit dates; Experience owns deterministic exhaustive transitions without DOM/Three.js; Rendering and Interface consume typed state and dispatch through owned interfaces; main.ts remains a composition root. Use explicit domain types, readonly inputs/outputs where practical and validation at external boundaries. [AD-1; repository architecture rules]

AR3: Introduce one experience-owned discriminated presentation state, scientific/gravity/heliosphere, migrating Gravity into it. Keep scientific ViewMode exactly sun/space/galaxy, prohibit nested/direct schematic entry and keep one captured scientific return context per session. [AD-2]

AR4: Build either schematic from an unchanged heliocentric JPL snapshot at the shared planetary date even when entered from Watch from Space. Physical cards use original scientific data; mapped coordinates/radii, tail orientation and decorative phase never enter astronomy or Galactic time. [AD-3]

AR5: Experience owns one nonnegative phase in elapsed active presentation seconds advanced by explicit real-time deltas only when Heliosphere is active, planetary playback is permitted/playing, the page is visible and reduced motion is off. Rendering derives the 20-second ±2% cycle, flow, shimmer and all other visible decoration from that phase; no independent decorative timers. [AD-4]

AR6: The browser shell delivers visibility changes before advancement and resets its real-time baseline to prevent hidden-time catch-up. Pause/scrub/endpoint/visibility transitions freeze phase and planetary advancement; visibility return and scrub remain paused. [AD-4]

AR7: One rendering owner defines monotonic heliosphere mapping and displayed radii. Bodies, paths, labels, picking and camera targets consume it or its resulting transforms. Keep tuning local, independent of quality/speed and distinct from Gravity/scientific mappings; preserve containment and nonintersection across a full breathing cycle. [AD-5]

AR8: Experience owns one tagged selection, body/heliosphere-region/none, using shared IDs solar-wind, termination-shock, heliosheath, heliopause and interstellar-space. Interface owns exact explanation content; scene and button inputs dispatch the same identities/actions. [AD-6]

AR9: Rendering owns the surface-to-region/layer lookup shared by visibility and picking, and one hit resolver arbitrates marker/body/region candidates into at most one action per pointer activation. Exclude hidden surfaces without suppressing semantic access or clearing cards. [AD-6]

AR10: Coordinate camera and focus through accepted session enter/Back/discard intent. Experience owns saved frame/bookmark/eligible selection; the camera controller alone owns actual pose/target and associates one saved pose with the same session. Process every accepted handoff in order even when several occur before rendering, capture once, restore only on matching Back and discard on Home/journey exits. Clear pending moves, damping carry-over and Follow movement; keep Three.js objects out of experience state. Interface applies focus from the same accepted intent. [AD-7]

AR11: Use shared camera operations for pointer/touch and semantic buttons; Focus/Follow/clipping consume active displayed positions/radii and Reset chooses the active schematic's overview. Gravity retains its existing oblique overview and entry-button focus. [AD-7]

AR12: Rendering owns allocation/reuse/disposal of feature GPU resources and renderer-created DOM; Interface owns semantic controls/panels. Preserve the main.ts scene-construction try/catch fallback, configured-base resource resolution and scientific URL/preference validation; protect sharing at both interface and boundary. [AD-8; repository architecture rules]

AR13: Follow repository verification conventions: deterministic Vitest for science/state/mapping with explicit dates; Playwright for observable UI/camera/lifecycle/sharing/fallback/base-path behavior rather than GPU snapshots, using settledBoundingBox for camera checks. Implementation must pass relevant tests, npm run check and npm run test:e2e for UI/rendering changes; docs-only planning uses git diff --check. Retain the coupled Firefox-headed/Xvfb CI configuration and existing deployment workflow. [testing instructions; AGENTS.md]

### UX Design Requirements

UX-DR1: Build an elongated, layered blue translucent 3D cutaway with a visible tail, exposed nested boundaries and readable Sun/eight planets. Tune proportions/opening within that direction; the reference is inspiration, not a literal-copy or measured-scale requirement. [visual-reference; presentation: Shape and cutaway]

UX-DR2: Show the exact visible semantic disclosure “Schematic — distances compressed; body sizes exaggerated.” and accompanying explanation that geometry, glow/color/opacity and animation are illustrative rather than measured solar weather or date-specific boundary forecasts. [presentation: Display scale and Display and motion contract]

UX-DR3: Provide a Solar wind button and matching scene selection whose card says exactly: “A flow of charged particles from the Sun surrounds all eight planets.” [presentation: Selectable regions and scientific content]

UX-DR4: Provide a Termination shock button and matching scene selection whose card says exactly: “The boundary where the solar wind slows abruptly.” [presentation: Selectable regions and scientific content]

UX-DR5: Provide a Heliosheath button and matching scene selection whose card says exactly: “The region of slowed solar wind between the termination shock and heliopause.” [presentation: Selectable regions and scientific content]

UX-DR6: Provide a Heliopause button and matching scene selection whose card says exactly: “The boundary where the solar-wind environment meets interstellar plasma.” [presentation: Selectable regions and scientific content]

UX-DR7: Provide an Interstellar space button and matching scene selection whose card says exactly: “Space beyond the heliopause; the Solar System's distant objects extend farther.” [presentation: Selectable regions and scientific content]

UX-DR8: Keep concise optional text explaining all-eight-planet containment and the distinction between a plasma boundary and the more distant Oort Cloud; avoid presenting a perfect sphere or exact global shape as measured geometry. [presentation: Selectable regions and scientific content]

UX-DR9: Provide Outer heliosphere as an independent semantic toggle, initially on each entry, tied to the rendering-owned visibility/picking association. [presentation: Controls and inspection; AD-6]

UX-DR10: Provide Termination shock as an independent semantic toggle, initially on each entry, tied to the rendering-owned visibility/picking association. [presentation: Controls and inspection; AD-6]

UX-DR11: Provide Orbit paths as an independent semantic toggle, initially on each entry; paths use the same displayed mapping as their bodies. [presentation: Controls and inspection; AD-5]

UX-DR12: Provide Labels as an independent semantic toggle, initially on each entry, affecting scene labels but leaving all semantic region buttons available. [presentation: Controls and inspection]

UX-DR13: Maintain one card for body or region information; replacement selection never pauses, moves the camera or unhides a layer. Hiding a selected surface keeps its explanation readable, and its button still opens the explanation while hidden. [presentation: Controls and inspection]

UX-DR14: Retain planet-card Focus Camera, Follow Planet and Stop Following controls with displayed-position targeting, baseline cancellation semantics and no automatic Focus/Follow on selection or Back. Region selection closes the planet card and ends its Follow. [presentation: Controls and inspection; PRD §8]

UX-DR15: Provide labeled directional orbit buttons, directional pan buttons, zoom in/out and Reset View, reachable by Tab and activated by Enter/Space. They invoke the same camera operations as pointer/touch input and respect native control keys. [presentation: Controls and inspection; AD-7]

UX-DR16: Support primary-drag orbit, secondary-drag pan and wheel zoom on mouse; one-finger orbit, pinch zoom and two-finger pan on touch. Keep clipping constraints appropriate to enlarged displayed bodies and preserve manual input while Following. [presentation: Controls and inspection]

UX-DR17: Reset View ends Follow and restores the full cutaway overview, without automatic camera orbit. Exact camera bounds/increments are tuned for readable inspection of every planet and region. [presentation: Controls and inspection]

UX-DR18: Put Explore Heliosphere in eligible free-exploration contexts and focus Back on entry. Back restores the matching camera/view/valid saved planet, keeps explored time/speed paused and returns keyboard focus to Explore Heliosphere. Home/journey exits keep baseline focus destinations. [presentation: Entry and return; AD-7]

UX-DR19: Escape closes the active information card and associated Follow; retain visible focus states and avoid global shortcuts overriding native input behavior. [presentation: Controls and inspection; PRD §13]

UX-DR20: Reuse visible planetary playback/date/scrubber/speed controls; keep Pause available, expose paused scrub/endpoint/tab-return states and never resume automatically on tab return or reduced-motion disablement. [presentation: Playback lifecycle; PRD §§7, 13]

UX-DR21: Combine slow outward flow, soft shimmer and gentle ±2% breathing per 20-second full cycle. Keep pace independent of planetary speed, freeze all decoration on pause/reduced motion and continue the retained phase on explicit resume. Preserve user-requested planetary motion and manual camera input with reduced motion. [presentation: Display and motion contract; AD-4]

UX-DR22: Use a faint diagonal Milky Way band with sparse dim static stars; reduce density on phones/lower quality without changing alignment claims, essential labels or interaction access. Do not introduce drift, streaks or automatic camera orbit. [presentation: Background]

UX-DR23: Disable Share this view in Heliosphere with an accessible explanation that Back returns to a shareable scientific view. Preserve scientific sharing after Back and keep session data out of URL/storage. [presentation: Entry and return; AD-8]

UX-DR24: Fit essential controls/explanations into the existing semantic interface with the restrained navy/gold/blue palette, translucent panels and crisp type; keep meaning understandable without color and do not add cockpit styling or unsupported new components/tokens. [PRD §§11, 13; visual-reference]

UX-DR25: On phones retain large touch targets and the collapsible bottom sheet, reduce visual density and keep all five region buttons, camera controls, layer controls, disclosures and the current explanation reachable. [PRD §13; CAP-5]

UX-DR26: Retain the existing semantic WebGL fallback and text equivalents, Sources & Credits and scientific-view/Gravity explanations. No new standalone UX design pair or fixed breakpoint/token scale is prescribed; follow established UI patterns and verify current supported desktop browsers and touch layouts. [PRD §§12–13; AD-8]

### FR Coverage Map

Every functional requirement maps to the approved Epic 1. FR25–FR32 are preservation obligations within that feature's implementation and verification, not separate rebuild epics.

| Requirement | Epic | Coverage |
| --- | --- | --- |
| FR1 | 1 | Eligible entry; no added scientific frame or clock |
| FR2 | 1 | Paused entry, captured return context, layer defaults and focus |
| FR3 | 1 | Back restores scientific context while retaining explored date/speed |
| FR4 | 1 | Clean Home/journey exits and independent later sessions |
| FR5 | 1 | Readable elongated cutaway, heliotail, nested boundaries and containment |
| FR6 | 1 | Shared monotonic display mapping and unchanged physical values |
| FR7 | 1 | Five scene-selectable regions and equivalent semantic buttons |
| FR8 | 1 | Exact explanations, scientific relationships and disclosures |
| FR9 | 1 | Single selection/card and one action per pointer activation |
| FR10 | 1 | Displayed-position Focus Camera and Follow Planet |
| FR11 | 1 | Follow cancellation and preservation rules |
| FR12 | 1 | Four session-local layer toggles and entry defaults |
| FR13 | 1 | Hidden-layer picking exclusion and persistent semantic access |
| FR14 | 1 | Existing planetary controls and isolated Galactic clock |
| FR15 | 1 | Outward flow, shimmer and 20-second ±2% breathing |
| FR16 | 1 | Shared Pause, retained phase and speed-independent effects |
| FR17 | 1 | Paused scrubbing and non-looping endpoint |
| FR18 | 1 | Hidden-tab freeze, paused return and no catch-up |
| FR19 | 1 | Reduced-motion decoration freeze with requested playback/input |
| FR20 | 1 | Equivalent mouse, touch and semantic keyboard camera controls |
| FR21 | 1 | Escape, native-key priority and coordinated focus |
| FR22 | 1 | Full-cutaway Reset View and displayed-body clipping constraints |
| FR23 | 1 | Dim diagonal Milky Way and adaptive sparse static stars |
| FR24 | 1 | Session-only state and explained/guarded sharing disablement |
| FR25 | 1 | Preserve hero, free exploration and five-chapter journey |
| FR26 | 1 | Preserve scientific views, transformations and camera bookmarks |
| FR27 | 1 | Preserve the deterministic planetary timeline and controls |
| FR28 | 1 | Preserve the complete isolated Galactic clock lifecycle |
| FR29 | 1 | Preserve Sun's Gravity while migrating shared presentation state |
| FR30 | 1 | Preserve scientific planet cards, Follow and overlay defaults |
| FR31 | 1 | Preserve scientific sharing and preference allowlists |
| FR32 | 1 | Preserve baseline explanations, visual distinctions, credits and fallback |

All NFR1–NFR14, AR1–AR13 and UX-DR1–UX-DR26 also bind Epic 1. The story coverage ledger below allocates implementation and evidence ownership; none is deferred to a separate accessibility, infrastructure or test epic.

### Story Coverage Ledger

Every reference identifies the implementing or verifying story and its numbered acceptance criterion. Earlier story verification is required when that story is implemented; Story 1.6 adds complete-device integration and release evidence rather than postponing basic correctness or access. Preservation entries retain the complete source contract, not only the examples named here.

#### Functional requirements

| Requirement | Story acceptance criteria |
| --- | --- |
| FR1 | 1.2 AC1 |
| FR2 | 1.2 AC1; 1.3 AC4 |
| FR3 | 1.2 AC7; 1.3 AC8 |
| FR4 | 1.2 AC8; 1.3 AC8 |
| FR5 | 1.2 AC2; 1.4 AC2 |
| FR6 | 1.2 AC3; 1.4 AC3 |
| FR7 | 1.3 AC1; 1.3 AC9 |
| FR8 | 1.2 AC9; 1.3 AC1; 1.3 AC8; 1.4 AC9 |
| FR9 | 1.3 AC2; 1.3 AC3 |
| FR10 | 1.2 AC5 |
| FR11 | 1.2 AC5; 1.3 AC6; 1.6 AC5 |
| FR12 | 1.3 AC4; 1.3 AC8 |
| FR13 | 1.3 AC5 |
| FR14 | 1.2 AC6; 1.4 AC3; 1.6 AC4; 1.6 AC6 |
| FR15 | 1.4 AC1; 1.4 AC2 |
| FR16 | 1.4 AC4 |
| FR17 | 1.4 AC5 |
| FR18 | 1.4 AC6 |
| FR19 | 1.4 AC7 |
| FR20 | 1.2 AC4; 1.6 AC3 |
| FR21 | 1.2 AC4; 1.2 AC7; 1.3 AC6; 1.3 AC7 |
| FR22 | 1.2 AC4 |
| FR23 | 1.5 AC1; 1.5 AC2; 1.5 AC3 |
| FR24 | 1.2 AC9; 1.3 AC8; 1.4 AC9; 1.6 AC7 |
| FR25 | 1.6 AC5 |
| FR26 | 1.6 AC4; 1.6 AC5 |
| FR27 | 1.6 AC6 |
| FR28 | 1.6 AC6 |
| FR29 | 1.1 AC1; 1.1 AC2; 1.1 AC3; 1.1 AC4; 1.1 AC5; 1.1 AC6; 1.1 AC7; 1.1 AC8; 1.6 AC6 |
| FR30 | 1.2 AC5; 1.6 AC5 |
| FR31 | 1.6 AC7 |
| FR32 | 1.5 AC4; 1.5 AC6; 1.6 AC3; 1.6 AC5; 1.6 AC8 |

#### Quality constraints

| Requirement | Story acceptance criteria |
| --- | --- |
| NFR1 | 1.6 AC4 |
| NFR2 | 1.2 AC3; 1.4 AC2; 1.6 AC4 |
| NFR3 | 1.2 AC9; 1.3 AC8; 1.4 AC9; 1.5 AC2; 1.5 AC4 |
| NFR4 | 1.6 AC1 |
| NFR5 | 1.6 AC2 |
| NFR6 | 1.6 AC2; 1.6 AC3; 1.6 AC8; 1.6 AC9 |
| NFR7 | 1.6 AC2; 1.6 AC7 |
| NFR8 | 1.2 AC4; 1.3 AC7; 1.6 AC3 |
| NFR9 | 1.6 AC3 |
| NFR10 | 1.5 AC1; 1.5 AC4; 1.6 AC8 |
| NFR11 | 1.2 AC10; 1.5 AC6; 1.6 AC8 |
| NFR12 | 1.6 AC4 |
| NFR13 | 1.2 AC10; 1.4 AC10; 1.6 AC8; 1.6 AC9 |
| NFR14 | 1.6 AC9 |

#### Architecture and delivery requirements

| Requirement | Story acceptance criteria |
| --- | --- |
| AR1 | 1.6 AC8 |
| AR2 | 1.1 AC1; 1.6 AC8 |
| AR3 | 1.1 AC1; 1.1 AC2; 1.2 AC1 |
| AR4 | 1.2 AC3; 1.6 AC4 |
| AR5 | 1.4 AC1; 1.4 AC2; 1.4 AC4; 1.4 AC7; 1.4 AC9 |
| AR6 | 1.4 AC5; 1.4 AC6 |
| AR7 | 1.2 AC3; 1.4 AC2; 1.4 AC8 |
| AR8 | 1.3 AC1; 1.3 AC2 |
| AR9 | 1.3 AC3; 1.3 AC5 |
| AR10 | 1.1 AC2; 1.1 AC3; 1.1 AC4; 1.1 AC5; 1.2 AC1; 1.2 AC7; 1.2 AC8; 1.6 AC8 |
| AR11 | 1.2 AC4; 1.2 AC5 |
| AR12 | 1.5 AC5; 1.6 AC3; 1.6 AC7; 1.6 AC8 |
| AR13 | 1.6 AC9 |

#### UX design requirements

| Requirement | Story acceptance criteria |
| --- | --- |
| UX-DR1 | 1.2 AC2 |
| UX-DR2 | 1.2 AC9; 1.4 AC9 |
| UX-DR3 | 1.3 AC1 |
| UX-DR4 | 1.3 AC1 |
| UX-DR5 | 1.3 AC1 |
| UX-DR6 | 1.3 AC1 |
| UX-DR7 | 1.3 AC1 |
| UX-DR8 | 1.3 AC8 |
| UX-DR9 | 1.3 AC4; 1.3 AC5 |
| UX-DR10 | 1.3 AC4; 1.3 AC5 |
| UX-DR11 | 1.3 AC4; 1.3 AC5 |
| UX-DR12 | 1.3 AC4; 1.3 AC5 |
| UX-DR13 | 1.3 AC2; 1.3 AC5 |
| UX-DR14 | 1.2 AC5; 1.3 AC6 |
| UX-DR15 | 1.2 AC4 |
| UX-DR16 | 1.2 AC4 |
| UX-DR17 | 1.2 AC4 |
| UX-DR18 | 1.2 AC1; 1.2 AC7; 1.2 AC8 |
| UX-DR19 | 1.3 AC6; 1.3 AC7 |
| UX-DR20 | 1.2 AC6; 1.4 AC5; 1.4 AC6; 1.4 AC7; 1.6 AC3 |
| UX-DR21 | 1.4 AC1; 1.4 AC2; 1.4 AC3; 1.4 AC4; 1.4 AC5; 1.4 AC6; 1.4 AC7 |
| UX-DR22 | 1.5 AC1; 1.5 AC2; 1.5 AC3; 1.5 AC4 |
| UX-DR23 | 1.2 AC9; 1.6 AC7 |
| UX-DR24 | 1.5 AC1; 1.5 AC4; 1.6 AC3; 1.6 AC8 |
| UX-DR25 | 1.3 AC7; 1.6 AC3 |
| UX-DR26 | 1.6 AC3; 1.6 AC8 |

#### Capability and adopted architecture coverage

| Source contract | Story acceptance criteria |
| --- | --- |
| CAP-1 | 1.2 AC2–AC5; 1.6 AC3 |
| CAP-2 | 1.3 AC1–AC9 |
| CAP-3 | 1.2 AC1, AC3, AC6–AC8; 1.4 AC3–AC6; 1.6 AC4, AC6 |
| CAP-4 | 1.4 AC1–AC10 |
| CAP-5 | 1.2 AC4, AC7; 1.3 AC7; 1.4 AC7; 1.6 AC3 |
| AD-1 | 1.1 AC1; 1.6 AC8 |
| AD-2 | 1.1 AC1–AC5; 1.2 AC1, AC7–AC8; 1.3 AC4, AC8 |
| AD-3 | 1.2 AC3; 1.4 AC3, AC9; 1.6 AC4 |
| AD-4 | 1.4 AC1–AC7, AC9 |
| AD-5 | 1.2 AC2–AC5; 1.4 AC2, AC8 |
| AD-6 | 1.3 AC1–AC9 |
| AD-7 | 1.1 AC2–AC5; 1.2 AC1, AC4–AC5, AC7–AC8; 1.6 AC8 |
| AD-8 | 1.5 AC5–AC6; 1.6 AC1–AC3, AC7–AC9 |

## Epic List

**Approved structure: one epic.**

### Epic 1: Explore and understand the heliosphere

Visitors can enter from either eligible scientific view, freely inspect an elongated heliosphere cutaway containing the Sun and all eight planets, select and understand its five explanatory regions, control accurate planetary playback alongside disclosed illustrative effects, and return to their prior scientific context. Mouse, touch, keyboard and reduced-motion users can complete the exploration. The existing journey, scientific views, Sun's Gravity, sharing/privacy rules and performance envelope remain intact.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR32.

**Capability coverage:** CAP-1–CAP-5 in full. **Other binding requirements:** NFR1–NFR14, AR1–AR13, UX-DR1–UX-DR26; architecture AD-1–AD-8.

**Why one epic:** This is one fully specified visitor journey with finalized architecture and interaction contracts. Entry/Back, unified presentation/selection state, shared mapping, camera handoffs, animation lifecycle and semantic controls repeatedly modify the same feature integration. Repository inspection confirms shared touch points in src/experience/experience-state.ts, src/rendering/orbital-scene.ts, src/rendering/scene-camera-controller.ts, src/interface/app-interface.ts and src/main.ts. Splitting those concerns into epics would fragment one user outcome and repeat the same core-file changes. No unresolved product decision or independent feedback boundary currently justifies that split. Implementation-sized, ordered stories will provide incremental delivery within this epic.

**Dependencies and completion boundary:** Depends on the existing application and the confirmed spec/companions, not another planned epic. The completed epic delivers all five capabilities without needing a future epic. Its stories fit one development-agent context and depend only on existing behavior or earlier stories. Basic usable exploration, scientific honesty, essential input access and applicable verification accompany the behavior being introduced; they do not rely on a future hardening epic. Story order and acceptance criteria are recorded below.

**Implementation constraints:** Migrate Gravity into the single presentation state while retaining its behavior; use unchanged heliocentric snapshots and one rendering-owned display mapping; coordinate camera/focus through accepted session intent; use one experience-owned decorative phase and one selection/hit path. Preserve static delivery, resource ownership/disposal, privacy, URL/storage allowlists and fallback. Update PRD/SCIENCE alongside affected implementation, credit sources and update ASSET_CREDITS if imagery is added/replaced. Include relevant deterministic/browser regression checks and measured transfer/performance evidence in completion; preserve all existing scientific/journey/Gravity contracts rather than rebuilding them.

## Epic 1: Explore and understand the heliosphere

Visitors can inspect and understand the heliosphere through accessible free exploration while retaining accurate planetary playback and reliable return to the existing scientific experience. The complete approved goal, requirements and constraints are in the Epic List above. Stories are recorded in dependency order under the user's individual and blanket approvals.

| Story | Deliverable | Depends on | Acceptance criteria |
| --- | --- | --- | --- |
| 1.1 | Reliable Sun's Gravity lifecycle migration | Existing application | 8 |
| 1.2 | Accessible heliosphere cutaway, planetary inspection and return | 1.1 | 10 |
| 1.3 | Five explanatory regions, unified selection and four layer controls | 1.2 | 9 |
| 1.4 | Shared-phase illustrative effects and complete playback lifecycle | 1.3 | 10 |
| 1.5 | Restrained Milky Way background and adaptive sparse stars | 1.4 | 6 |
| 1.6 | Supported-device quality integration, baseline preservation and release evidence | 1.5 | 9 |

### Story 1.1: Reliably enter and return from Sun’s Gravity

As a visitor exploring the Solar System,
I want Sun’s Gravity to preserve my scientific context through entry and exit,
So that I can inspect the schematic and return without losing my place.

**Requirements:** FR29; baseline preservation under FR25–FR28 and FR30–FR32; architecture AD-1–AD-3, AD-7 and AD-8.

**Dependencies:** Existing application only.

**Acceptance Criteria:**

**AC1**

**Given** the existing scientific and Gravity presentations,
**When** their lifecycle is migrated,
**Then** Experience owns one discriminated presentation state instead of a separate Gravity flag,
**And** scientific views remain exactly `sun`, `space` and `galaxy`, with no additional scientific clock or frame.

**AC2**

**Given** free exploration in Travel with Sun or Watch from Space,
**When** the visitor enters Sun’s Gravity,
**Then** playback pauses at the retained date and speed, Follow ends, trails clear and Back receives focus,
**And** the scientific frame, bookmark, selection and camera pose are captured once for that session. Duplicate entry, Galaxy Overview entry and tour entry are rejected without replacing that context.

**AC3**

**Given** an active Gravity session in which the visitor changes date, speed or camera position,
**When** Back is activated,
**Then** the prior scientific frame, camera and valid saved selection are restored,
**And** the explored date and speed remain, playback stays paused, Follow remains off, trails clear and focus returns to Sun’s Gravity.

**AC4**

**Given** multiple accepted entry, Back or exit actions before the next render,
**When** adapters process their handoffs,
**Then** every accepted handoff is handled in order and camera restoration uses only its matching session,
**And** pending camera moves, damping carry-over and Follow movement cannot override the handoff. Back without a matching session cannot restore a stale pose.

**AC5**

**Given** an active Gravity session,
**When** Home, Begin Journey or Replay Journey is activated,
**Then** the session and saved pose are discarded and the established destination and focus behavior apply,
**And** a later entry captures a fresh context.

**AC6**

**Given** the migrated Gravity presentation,
**When** visitors inspect, select, play, scrub, Focus, Follow or Reset,
**Then** its existing mapping, surface geometry, displayed camera targets, card values, disclosure and reduced-motion behavior remain unchanged,
**And** trails, orbital planes and sharing remain unavailable with explanations; scientific overlay preferences survive Back.

**AC7**

**Given** scientific sharing, preference persistence and either scientific clock,
**When** Gravity sessions are entered and exited,
**Then** existing allowlists and clock isolation remain intact,
**And** no session or camera-return state enters URLs/storage; semantic controls, explanations and WebGL fallback remain available.

**AC8**

**Given** the completed migration,
**When** verification runs,
**Then** deterministic tests cover eligibility, duplicate entry, return/discard and ordered handoffs, and browser tests cover camera/focus restoration and Gravity regression,
**And** `npm run check` and `npm run test:e2e` pass, using settled camera measurements where needed.

### Story 1.2: Explore the heliosphere cutaway and return to the scientific view

As a visitor exploring the Solar System,
I want to inspect the Sun and planets inside a heliosphere cutaway,
So that I can understand their placement and return to my previous view.

**Dependencies:** Story 1.1.

**Requirements:** FR1–FR6, FR10–FR11, FR14, FR20–FR22 and FR24; corresponding scientific, accessibility and delivery constraints. This story establishes the overview; region inspection, layer controls and animated effects follow separately.

**Acceptance Criteria:**

**AC1**

**Given** free exploration in Travel with Sun or Watch from Space,
**When** Explore Heliosphere is activated,
**Then** the shared presentation state enters Heliosphere paused at the current date and speed, ends Follow, clears trails and focuses Back,
**And** captures the scientific return context once. Entry from Gravity, Galaxy Overview, the tour or an existing heliosphere session is rejected.

**AC2**

**Given** the heliosphere overview,
**When** the scene is displayed,
**Then** an elongated, layered blue cutaway exposes a visible heliotail, nested nonintersecting boundaries, the Sun and all eight distinguishable planets,
**And** the planets remain inside the termination shock, with geometry allowing the agreed ±2% boundary-motion envelope.

**AC3**

**Given** an unchanged heliocentric scientific snapshot at the planetary date,
**When** displayed positions and sizes are calculated,
**Then** one rendering-owned strictly monotonic mapping compresses distances and enlarges bodies while preserving orbital phase and planetary order,
**And** bodies, paths, labels, picking and camera targets share that mapping, independently of quality and playback speed. Physical card values remain unchanged.

**AC4**

**Given** mouse, touch or keyboard access,
**When** visitors orbit, pan, zoom or activate Reset View,
**Then** pointer gestures and labeled Tab/Enter/Space camera buttons invoke equivalent operations,
**And** Reset ends Follow and restores the full cutaway overview; constraints prevent clipping through displayed bodies, native control keys retain priority and no automatic orbit occurs.

**AC5**

**Given** a displayed planet,
**When** it is selected, focused or followed,
**Then** selection opens its existing physical-information card without pausing or moving the camera, while explicit Focus/Follow target its displayed position,
**And** existing Follow cancellation rules apply, including Escape/card closure; manual navigation, playback, pause and scrub preserve Follow.

**AC6**

**Given** the active overview,
**When** visitors play, pause, scrub or change planetary speed,
**Then** existing calculated timing, timeline limits, physical values and completion behavior remain intact, with no new scientific clock or frame,
**And** paused/reduced-motion states freeze visible decoration while permitting requested planetary playback and camera input.

**AC7**

**Given** an explored heliosphere session,
**When** Back is activated,
**Then** the saved scientific view, camera and valid selection are restored, explored date/speed are retained and playback remains paused,
**And** Follow stays off, trails clear, scientific overlay preferences survive and focus returns to Explore Heliosphere.

**AC8**

**Given** an active session,
**When** Home, Begin Journey or Replay Journey is activated,
**Then** its captured return context and camera pose are discarded through the ordered handoff mechanism,
**And** established destinations/focus apply without stale restoration on later entry.

**AC9**

**Given** the heliosphere interface,
**When** its controls and explanations are inspected,
**Then** it displays “Schematic — distances compressed; body sizes exaggerated.” and explains illustrative geometry and tail orientation,
**And** sharing is disabled with an accessible Back-to-share explanation; session state never enters URLs/storage and controls remain reachable on phones.

**AC10**

**Given** the completed overview,
**When** implementation is verified,
**Then** deterministic mapping/lifecycle tests and browser entry, return, camera, selection and sharing tests pass alongside `npm run check` and `npm run test:e2e`,
**And** PRD/SCIENCE record the feature exception, sources are credited, resource ownership/disposal and static fallback are preserved, and imagery changes update ASSET_CREDITS.

### Story 1.3: Inspect heliosphere regions and reveal their layers

As a visitor exploring the heliosphere,
I want to select its regions and control visible layers,
So that I can understand their relationships without losing my exploration context.

**Dependencies:** Story 1.2.

**Requirements:** FR7–FR9, FR11–FR13, FR21; layer-reset and session requirements; UX-DR3–UX-DR13, UX-DR19 and UX-DR25; AD-6.

**Acceptance Criteria:**

**AC1**

**Given** the heliosphere cutaway,
**When** a visitor selects a region through its scene geometry or labeled semantic button,
**Then** both inputs select the same typed region identity and display its exact explanation,
**And** all five regions are individually accessible:

| Region | Exact explanation |
| --- | --- |
| Solar wind | A flow of charged particles from the Sun surrounds all eight planets. |
| Termination shock | The boundary where the solar wind slows abruptly. |
| Heliosheath | The region of slowed solar wind between the termination shock and heliopause. |
| Heliopause | The boundary where the solar-wind environment meets interstellar plasma. |
| Interstellar space | Space beyond the heliopause; the Solar System's distant objects extend farther. |

**AC2**

**Given** an existing body or region selection,
**When** another body or region is selected,
**Then** one experience-owned tagged selection replaces the current information card without pausing, moving the camera or unhiding layers,
**And** region identities use `solar-wind`, `termination-shock`, `heliosheath`, `heliopause` and `interstellar-space`; region selection is rejected outside Heliosphere.

**AC3**

**Given** overlapping marker, body and region hit candidates,
**When** one pointer activation occurs,
**Then** one rendering-owned resolver dispatches at most one selection,
**And** drawing and picking use the same rendering-owned region/layer associations and displayed geometry.

**AC4**

**Given** a newly entered heliosphere session,
**When** layer controls are displayed or changed,
**Then** Outer heliosphere, Termination shock, Orbit paths and Labels are independently operable and initially on,
**And** paths retain the shared display mapping, Labels affects scene labels only, and scientific overlay preferences remain unchanged.

**AC5**

**Given** a selected region whose surface layer is subsequently hidden,
**When** the visitor clicks hidden geometry or activates that region’s explanation button,
**Then** hidden geometry cannot be picked, while the button remains available and opens the explanation without unhiding anything,
**And** hiding the layer does not close its existing card.

**AC6**

**Given** an active planet Follow or open information card,
**When** a region is selected or Escape is pressed,
**Then** region selection ends Follow and replaces the planet card; Escape clears the current card and its associated Follow,
**And** stopping Follow leaves the camera in place, while manual navigation, playback, pause and scrub retain the established Follow behavior.

**AC7**

**Given** visitors using keyboard, touch or a phone layout,
**When** they access region buttons and layer controls,
**Then** controls have meaningful labels, visible focus and native keyboard operation without shortcut interference,
**And** the bottom-sheet layout keeps all five buttons, four toggles and explanations reachable without relying on color alone.

**AC8**

**Given** the region explanations and session state,
**When** visitors read the context, use Back or re-enter Heliosphere,
**Then** text explains that all eight planets lie inside the termination shock and the heliopause is a plasma boundary with Oort Cloud objects farther out,
**And** Back restores the captured scientific selection rather than the region selection; a new entry resets layers, with no region/layer state written to URLs or storage.

**AC9**

**Given** the completed region and layer interactions,
**When** verification runs,
**Then** deterministic tests cover selection replacement, Follow, layer defaults, hidden-hit exclusion and hit arbitration; browser tests exercise every region through scene input and buttons, keyboard access, hidden-layer behavior and phone reachability,
**And** `npm run check` and `npm run test:e2e` pass while existing camera, playback and Gravity behavior remains intact.

### Story 1.4: Control illustrative heliosphere motion with planetary playback

As a visitor exploring the heliosphere,
I want gentle illustrative motion that obeys playback and reduced-motion controls,
So that I can inspect the scene comfortably without confusing artwork with calculated astronomy.

**Dependencies:** Story 1.3.

**Requirements:** FR15–FR19; scientific/playback preservation under FR6 and FR14; UX-DR2, UX-DR20–UX-DR21; AD-3–AD-5 and AD-8.

**Acceptance Criteria:**

**AC1**

**Given** an active, visible heliosphere session with reduced motion off,
**When** explicit Play/Resume permits playback,
**Then** Experience advances one nonnegative decorative phase using explicit real-time deltas measured in elapsed active presentation seconds,
**And** Rendering consumes that phase for all visible decoration without independent animation clocks or dependence on planetary speed.

**AC2**

**Given** advancing decorative phase,
**When** a complete 20-second cycle is observed,
**Then** slow outward flow and soft shimmer coexist with gentle boundary expansion/contraction reaching ±2% of the baseline shape,
**And** geometry remains elongated, nested and nonintersecting, with all eight planets inside the termination shock throughout the cycle.

**AC3**

**Given** the same elapsed active presentation time,
**When** planetary speed changes among the existing speed steps,
**Then** illustrative effect cadence remains unchanged,
**And** planetary positions and physical card values remain derived from the original scientific model at the selected UTC date.

**AC4**

**Given** playing planets and effects,
**When** shared Pause is activated and later explicitly resumed,
**Then** planetary time and every visible decorative effect freeze while paused and continue from their retained state without a phase jump,
**And** this includes solar corona/filament/glow animation and any stabilized surface spin visible in Heliosphere.

**AC5**

**Given** an active session,
**When** the visitor scrubs or playback reaches the timeline endpoint,
**Then** planetary advancement and decorative phase stop; scrubbing leaves playback paused at the chosen date,
**And** endpoint completion retains existing controls and never loops automatically.

**AC6**

**Given** a playing session,
**When** the tab becomes hidden and subsequently visible,
**Then** visibility changes are delivered before further advancement, both planetary time and decorative phase freeze, and returning leaves playback paused,
**And** the shell resets its real-time baseline so explicit resume produces no hidden-time catch-up or phase jump.

**AC7**

**Given** either playing or paused playback,
**When** reduced motion is enabled,
**Then** decoration freezes at its retained phase while user-started planetary playback and manual camera input remain available,
**And** disabling reduced motion never starts a paused planetary clock; any permitted decorative resumption continues from the retained phase.

**AC8**

**Given** animated boundaries, layer changes or quality adaptation,
**When** visitors inspect, select, Focus or Follow,
**Then** displayed geometry, hit targets and camera targets remain consistent with their established owners,
**And** adaptation preserves mapping, region identities, selectable access, nesting and effect cadence.

**AC9**

**Given** explanatory text and presentation lifecycle,
**When** visitors read the animation disclosure or leave Heliosphere,
**Then** the interface identifies animation as illustrative rather than measured solar weather or a date-specific forecast,
**And** the phase never feeds astronomy, Galactic time, URLs or storage, never advances outside active Heliosphere, and does not change baseline animation behavior elsewhere.

**AC10**

**Given** the completed effects and lifecycle,
**When** verification runs,
**Then** deterministic tests exercise periodicity/amplitude, speed independence, containment and every pause/resume/reduced-motion/visibility transition; browser checks demonstrate flow, shimmer, shared controls and retained phase,
**And** `npm run check` and `npm run test:e2e` pass, with relevant PRD/SCIENCE contracts and source disclosures updated alongside implementation.

### Story 1.5: Inspect the cutaway against a restrained Milky Way background

As a visitor inspecting the heliosphere,
I want a quiet Milky Way backdrop that preserves the clarity of the cutaway,
So that I can see its structure and labels without distracting motion or misleading alignment claims.

**Dependencies:** Story 1.4.

**Requirements:** FR23 and background/explanation preservation under FR32; NFR3–NFR5, NFR10–NFR11; UX-DR22, UX-DR24; AD-5 and AD-8.

**Acceptance Criteria:**

**AC1**

**Given** the heliosphere overview,
**When** its background is rendered,
**Then** a faint diagonal Milky Way band and sparse dim distant stars sit behind the cutaway,
**And** their brightness preserves the visibility of nested blue boundaries, the Sun, all eight planets, orbit paths and scene labels within the existing navy/gold/blue observatory aesthetic.

**AC2**

**Given** planetary playback, manual camera movement or an idle scene,
**When** the background is observed,
**Then** it introduces no automatic drift, star streaks or camera orbit,
**And** neither the star placement, band orientation nor heliotail orientation is presented as exact stellar coordinates or alignment derived from Galactic travel. Manual camera movement remains available.

**AC3**

**Given** a phone layout or lower quality setting,
**When** the existing quality policy is applied,
**Then** star density is reduced relative to the higher-detail desktop presentation,
**And** the reduction does not change scientific positions, body mapping, region identities, nesting, animation cadence or semantic access. No fixed catalog or exact star count is required.

**AC4**

**Given** an open region/planet explanation and semantic controls,
**When** the visitor uses the overview with Labels on or off,
**Then** text, focus indicators and controls remain readable without depending on background color alone,
**And** the semantic explanation states that the background is decorative artwork rather than a star-by-star map or exact galactic alignment.

**AC5**

**Given** background resources and repeated entry/exit,
**When** the presentation is constructed, reused or disposed,
**Then** Rendering owns its GPU resources and renderer-created DOM while Interface owns semantic content, with no accumulated feature resources across sessions,
**And** resources resolve under the configured static base, remain within the shared transfer budgets and add no runtime service dependency. The external reference image need not be bundled.

**AC6**

**Given** the completed background,
**When** verification and source-credit checks run,
**Then** desktop/phone and lower-quality checks demonstrate the band, sparse stars, lower phone density, label clarity and absence of autonomous background/camera motion,
**And** `npm run check` and `npm run test:e2e` pass; scientific/visual sources are credited and any added/replaced bundled imagery updates ASSET_CREDITS.md without implying agency endorsement.

### Story 1.6: Explore smoothly across supported devices while preserving the existing experience

As a visitor on a supported desktop browser or phone,
I want responsive heliosphere exploration that leaves the existing journey and scientific views intact,
So that I can use the complete experience reliably on my device.

**Dependencies:** Story 1.5.

**Requirements:** FR1–FR32 as integrated acceptance and regression obligations, especially FR25–FR32; NFR1–NFR14; AR1–AR13; UX-DR1–UX-DR26. This story owns final device/quality integration and measured release evidence, not implementation deferred from earlier stories.

**Acceptance Criteria:**

**AC1**

**Given** sustained poor rendering performance or a lower quality preference,
**When** the existing adaptive-quality policy responds,
**Then** it reduces appropriate bloom, density, pixel ratio, mesh/effect detail or texture detail while preserving planetary calculations, displayed mapping, region identities, scene/button access, nesting and the 20-second ±2% effect cadence,
**And** measured representative-device runs meet stable 60 FPS on a typical recent laptop and at least 30 FPS on a supported phone after adaptation. Record device/browser, quality, scene workload, measurement method and observed frame rates; unsupported or unavailable measurements remain explicitly unverified and cannot be reported as passed.

**AC2**

**Given** the production build at /Solar-System-Orbital-Journey/,
**When** compressed transfer and loading behavior are measured,
**Then** the initial critical transfer remains under roughly 3 MB and the complete experience under roughly 15 MB, including deferred feature resources,
**And** lightweight hero placeholders, inner-planet priority and deferred galaxy loading remain; resources use bundled static paths under the baseline's no-runtime-network-after-initial-static-load contract, without adding runtime services, authentication, analytics, cookies, tracking or remote error reporting. Record the compression method and critical/total resource sets rather than equating raw dist size with transfer size.

**AC3**

**Given** current Chrome, Edge, Firefox and Safari plus a supported phone layout,
**When** visitors complete entry/Back, camera navigation, all five scene/button region selections, four layer toggles, planet Focus/Follow, playback and reduced-motion flows,
**Then** semantic controls/text, visible focus, native-key priority, persistent Pause access, large touch targets and the collapsible bottom sheet remain functional and reachable,
**And** automated Chromium/Firefox/WebKit smoke coverage and a current Safari manual release check are recorded; the semantic fallback still explains the experience, browser requirements, core lesson and sources when WebGL construction fails.

**AC4**

**Given** fixed UTC instants at the start, interior and endpoint of the existing 165-Julian-year interval,
**When** scientific results and heliosphere physical cards are compared across entry from both eligible views, playback speeds and quality levels,
**Then** JPL Table 2a/2b calculations, Earth–Moon barycenter treatment, physical values, source/pole/rotation conventions and published approximation limits remain unchanged; scientific-view scale and full galactic transforms stay distinct from each schematic mapping,
**And** numerical values preserve typed units/source organization/source URL/retrieval date and model-appropriate rounding; illustrative constants remain identified as design choices. Neither heliosphere state nor Galactic elapsed time enters planetary calculations.

**AC5**

**Given** the existing hero, free exploration and five-chapter journey,
**When** visitors begin, skip, complete and replay the journey or exit either schematic through Home/journey actions,
**Then** the still initial composition, five named chapters, visible tour-speed changes, skippability and reduced-motion cuts/input remain intact with no uncaught errors,
**And** all three scientific views and five named bookmarks retain their transformations, scale, trail resets, Along the Path guide stabilization/distances, Full Journey proportions and schematic Galaxy marker/arrow/progress behavior. Reset/Focus/Follow and planet cards retain the full FR30 contract, including the announced Full Journey-to-Along the Path Follow handoff and Galaxy selection clearing.

**AC6**

**Given** planetary and Galactic playback and completion states,
**When** visitors scrub, switch views, replay, return to Today/Present, continue exploring, reload or start/replay the guided journey,
**Then** the full FR27/FR28 controls, speed choices, labels, readouts, defaults, completion actions, paused re-entry and in-session preservation/reset rules pass regression coverage,
**And** the clocks never advance each other and inactive values retain their established preservation rules; heliosphere hidden-tab behavior has no catch-up and entry/Back never resets or advances Galactic progress. Gravity's mapping, surface offsets, disclosures, session/focus behavior and overlay restrictions remain unchanged after its shared-state migration.

**AC7**

**Given** a heliosphere session, a scientific shared URL or stored presentation preferences,
**When** sharing is attempted through either the interface or the share boundary and the app is reloaded or returned to a scientific view,
**Then** heliosphere sharing is explained/disabled and direct share-boundary invocation cannot serialize schematic state; phase, selection, layers and camera-return pose remain absent from URLs/storage,
**And** the existing scientific URL/preference allowlists, date initialization and present-anchor Galaxy sharing behavior remain intact, including rejection of arbitrary camera matrices, invalid external state and private identifiers.

**AC8**

**Given** the finished implementation and source documentation,
**When** module boundaries, persistence, disposal and content are checked,
**Then** Astronomy remains pure with dates as arguments, Experience owns authoritative exhaustive state/actions without DOM/Three.js, Rendering owns mapping/resources, Interface owns semantic content and main.ts remains wiring with its scene-construction fallback. Use explicit domain types and readonly inputs/outputs where practical, validate external data before narrowing, and preserve dependency directions; the camera controller alone owns actual Three.js pose/target associated with accepted session handoffs. No new starter/framework/backend/database migration or unrequested dependency upgrade is introduced,
**And** PRD/SCIENCE include every implemented feature exception in the same change; scale/geometry/animation/background disclosures, concise optional explanations and Sources & Credits are complete; scientific/visual credits and conditional ASSET_CREDITS changes are present without adding spacecraft, guided outward travel or forecast claims.

**AC9**

**Given** the completed feature and all earlier story checks,
**When** release evidence is assembled,
**Then** every row of the presentation companion's acceptance matrix is mapped to deterministic/browser/manual evidence, `npm run check` and `npm run test:e2e` pass, and the production repository-subpath build works with the existing CI/deployment conventions,
**And** verification uses observable behavior rather than GPU snapshots and settled camera measurements where relevant; retains Firefox-headed/Xvfb configuration; reports outstanding checks and intentional approximations honestly; and makes no claim that visitor learning has been measured. This story may fix integration/quality regressions discovered here without reimplementing the existing product.

## Planning Validation

Validated on 2026-10-28 against the confirmed spec package, active PRD/SCIENCE and adopted architecture. This validates the plan's coverage and readiness, not an implemented application.

| Check | Result | Evidence |
| --- | --- | --- |
| Functional coverage | PASS | FR1–FR32 each have explicit story/AC ownership in the coverage ledger; preservation requirements retain their full baseline source contracts. |
| Quality, architecture and UX coverage | PASS | NFR1–NFR14, AR1–AR13 and UX-DR1–UX-DR26 all map to valid numbered criteria; CAP-1–CAP-5 and AD-1–AD-8 have explicit coverage. |
| Existing-project and foundation scope | PASS | No starter template or database migration is prescribed. Story 1.1 migrates the currently needed Gravity lifecycle; subsequent stories introduce their feature state/geometry when needed. Existing modules, stack and fallback are retained. |
| Story completeness and size | PASS | Six bounded stories contain As a/I want/So that, requirements, dependencies and 52 complete Given/When/Then/And criteria. Story 1.2 reuses existing bodies, cards, timeline and camera operations for its initial vertical slice. Story 1.6 reuses the existing quality policy/test suites and owns final integration evidence rather than recreating baseline features. |
| Epic value and file overlap | PASS | One complete heliosphere exploration outcome covers the feature. Shared integration files were considered explicitly and consolidated into the approved epic. No future epic is needed for completion. |
| Dependency sequence | PASS | 1.1 uses the current application; each subsequent story depends only on the preceding story. Static geometry/access, region inspection, motion and background each work without waiting for later enhancements; later release evidence does not defer their story checks. |
| Source and text integrity | PASS | All 10 input paths resolve; all five exact short region explanations match the presentation companion; the exact scale disclosure is preserved and no template placeholders remain. |
| Document checks | PASS | Contiguous story/AC numbering, valid ledger references, complete requirement sets, backward dependencies and whitespace checked; git diff --check passes. |

**Open planning checks:** 0. **Implementation checks:** not run during this documentation-only workflow. Each story's implementation must satisfy its own tests; measured device performance, compressed transfer, browser/manual checks, deployed behavior and visitor learning remain unverified. PRD/SCIENCE and asset-credit updates belong to the same future implementation changes that introduce their exceptions/assets. No application code, imagery, scientific constants or active source contracts were changed by this planning workflow.
