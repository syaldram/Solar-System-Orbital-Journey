# Heliosphere presentation and verification

## Selectable regions and scientific content

All five regions below are selectable. Selecting one opens its short explanation.

| Label | Short explanation |
| --- | --- |
| Solar wind | A flow of charged particles from the Sun surrounds all eight planets. |
| Termination shock | The boundary where the solar wind slows abruptly. |
| Heliosheath | The region of slowed solar wind between the termination shock and heliopause. |
| Heliopause | The boundary where the solar-wind environment meets interstellar plasma. |
| Interstellar space | Space beyond the heliopause; the Solar System's distant objects extend farther. |

All eight major planets lie inside the termination shock. The heliopause is a plasma boundary, not the outer edge of everything belonging to the Solar System; Oort Cloud objects extend much farther.

The solar-wind and boundary relationships follow [NASA: Studying the Edge of the Sun's Magnetic Bubble](https://www.nasa.gov/missions/ibex/studying-the-edge-of-the-suns-magnetic-bubble/). The distinction between the heliopause and the wider Solar System follows [NASA/JPL: Voyager 2 Enters Interstellar Space](https://www.jpl.nasa.gov/news/nasas-voyager-2-probe-enters-interstellar-space/). Both were rechecked on 2026-10-28; the spacecraft article supplies scientific context, not spacecraft feature scope.

The global shape is unsettled, and the boundaries respond to solar activity. Do not portray a perfect sphere as measured geometry or link the displayed boundary to planetary UTC time without a justified model. [NASA: IBEX Charts 11 Years of Change](https://www.nasa.gov/missions/ibex/nasas-ibex-charts-11-years-of-change-at-boundary-to-interstellar-space/), rechecked 2026-10-28.

## Shape and cutaway

Use an elongated heliosphere with a visible heliotail and a 3D cutaway exposing the planetary system and nested boundaries. The requested tail is part of the heliosphere's shape; it does not add a separate moving-Sun wake, spacecraft track or particle trail.

NASA's [IBEX account](https://www.nasa.gov/missions/ibex/nasas-ibex-charts-11-years-of-change-at-boundary-to-interstellar-space/) describes an asymmetric, extended heliotail. This supplies explanatory grounding, not exact dimensions for the artwork. Keep the selected shape explicitly schematic and its region boundaries nested without intersections.

Exact aspect ratio, tail length and cutaway opening are delegated to implementation tuning within the agreed elongated, readable cutaway. Tail orientation is illustrative; do not infer an exact interstellar-flow alignment from the existing galactic travel model.

## Display scale

Compress orbital distances and enlarge bodies so all eight planets remain readable within this schematic. Preserve planetary order, calculated orbital timing and physical information; presentation mapping must not alter astronomy calculations or physical card values.

The visible disclosure is **Schematic — distances compressed; body sizes exaggerated.**

This is a heliosphere-only display exception. The existing scientific views retain their established scale contracts; implementation must record the new exception in PRD and SCIENCE. Exact monotonic distance mapping and body-size factors are delegated to implementation tuning within these constraints.

## Display and motion contract

- Show the Sun, all eight planets and the surrounding elongated heliosphere with its visible tail in a freely explorable 3D cutaway, with all five selectable regions and their short explanations.
- Use the confirmed compressed orbital distances and enlarged bodies with the exact disclosure in Display scale.
- Show slow outward flow and soft shimmer together with gentle boundary expansion/contraction of ±2% from the baseline shape over each complete 20-second cycle.
- Effects run at an illustrative pace independent of planetary playback speed. Shared Pause freezes planetary and decorative animation.
- With reduced motion, freeze decorative effects while allowing user-started planetary playback and camera controls.
- Shape, glow, color, opacity and boundary motion are explanatory artwork. Disclose schematic geometry and animation alongside the scale disclosure.
- Keep planetary timing and scientific values calculated under SCIENCE. Boundary animation is not a physical forecast, measured solar weather or a date-specific prediction.

## Playback lifecycle

Explicit Play/Resume starts the animation permitted by the current reduced-motion setting. Pause, scrubbing, the timeline endpoint and a hidden tab freeze both planetary time and decorative phase.

Scrubbing leaves playback paused. Reaching the endpoint never loops automatically. Returning to a visible tab leaves playback paused, with no catch-up for hidden time. Explicit resume continues the stored effect phase without a jump; planetary playback speed does not change the effect pace.

Reduced motion freezes decoration without blocking user-requested planetary playback or camera input. Turning reduced motion off never starts a paused planetary clock.

## Entry and return

Explore Heliosphere is available during free exploration from Travel with Sun or Watch from Space, outside Sun's Gravity. It uses the existing planetary clock and adds no scientific reference frame.

On entry, pause at the current date, retain speed, remember the prior view, camera and selected planet, and end Follow. Focus Back. Back restores the prior view and camera, restores the saved planet if still valid (otherwise no selection), retains the explored date and speed, leaves playback paused and returns focus to Explore Heliosphere. Never automatically restart Follow.

Home, Begin Journey and Replay Journey exit cleanly to their established destinations and discard the captured return state. Clear trail history on entry/exit. Preserve scientific overlay preferences; reset the four heliosphere toggles on each new entry.

Heliosphere state is session-only, never stored and never encoded in URLs. Disable sharing in this schematic with an explanation that Back returns to a shareable scientific view.

## Controls and inspection

| Layer toggle | State on each entry |
| --- | --- |
| Outer heliosphere | On |
| Termination shock | On |
| Orbit paths | On |
| Labels | On |

Regions are selectable in the scene or through five labeled buttons, one for each confirmed region. Hidden surfaces cannot be clicked, but their explanation buttons remain available. Hiding an already-selected layer keeps its explanation open; selecting its explanation button does not unhide the layer. Labels hides scene labels, never the semantic region controls.

Selecting a region or planet replaces the current information card without pausing or moving the camera. Planet cards retain Focus Camera and Follow Planet, targeting displayed schematic body positions. Retain baseline Follow cancellation rules: selecting a region closes the planet card and ends Follow; manual navigation, playback, pausing and scrubbing do not end Follow.

Reset View restores the full cutaway overview. Constrain the camera to avoid clipping through bodies; do not add automatic camera orbit. Exact camera limits and movement increments are delegated to implementation tuning.

| Input | Behavior |
| --- | --- |
| Mouse primary drag | Orbit |
| Mouse secondary drag | Pan |
| Mouse wheel | Zoom |
| One-finger touch | Orbit |
| Pinch | Zoom |
| Two-finger touch | Pan |
| Camera controls | Labeled directional orbit/pan, zoom in/out and Reset buttons, reachable with Tab and activated by Enter/Space |
| Escape | Close the current information card and end its associated Follow |

Native control key behavior takes priority over global shortcuts. Keep text explanations and essential controls in semantic HTML under the baseline accessibility contract.

## Background

Use a faint diagonal Milky Way band behind the cutaway and sparse distant stars. Reduce star density on phones or lower quality settings. Keep brightness low so the heliosphere and labels remain clear.

The background is decorative artwork, not a catalog of stellar positions or a statement of exact galactic alignment. Do not add automatic background drift, star streaks or camera orbit. Density adapts to quality; no fixed star catalog or count is required.

## Acceptance evidence

| Capability or constraint | Required demonstration |
| --- | --- |
| CAP-1 | Orbit, pan and zoom to inspect the elongated cutaway, see its heliotail and locate the Sun and every major planet. Verify displayed-position Focus Camera/Follow Planet and full-overview Reset View. |
| CAP-2 | Select each confirmed region through scene input and its labeled button. Read each explanation; verify a single current information card and no selection-triggered pause or camera movement. Verify scientific relationships and disclosures. |
| CAP-3 | Play, scrub and change speed at explicit dates across the existing timeline; compare planetary timing and physical values with the baseline. |
| CAP-4 | Observe slow outward flow and soft shimmer; verify ±2% boundary expansion/contraction over a 20-second full cycle. Changing planetary speed does not change effect pace. Shared Pause freezes both; explicit resume continues phase without a jump. |
| CAP-5 | Complete equivalent orbit, pan, zoom and region reading by mouse, touch and keyboard buttons; verify Tab/Enter/Space, Escape and focus return. With reduced motion, verify frozen decoration while user-started playback and camera input remain available. |
| Layers and selection | Verify all four toggles reset on each entry; hidden surfaces cannot be clicked, explanation buttons still work, existing information stays open and button selection does not unhide a layer. Labels leaves semantic controls available. Region selection ends planet Follow; manual navigation/playback/scrubbing do not. |
| Playback lifecycle | Verify scrubbing, endpoint and hidden-tab transitions pause planetary time and decorative phase; no automatic loop, tab-return resumption or hidden-time catch-up. Turning reduced motion off does not start a paused clock. |
| Display scale | Verify readable enlarged bodies, compressed distances, preserved planetary order, nested boundaries, exact visible disclosure and unchanged calculated timing/physical information. |
| Entry and return | Enter paused from each eligible view; verify current date/speed and prior view/camera/selection capture, Follow cancellation and focus on Back. Explore another date/speed, then Back: restore view/camera/valid selection, retain explored date/speed, stay paused, return focus and leave Follow off. |
| Exit and session | Verify Home/Begin Journey/Replay Journey leave cleanly, discard return state, clear trails and preserve scientific overlay preferences. Verify no heliosphere state in URLs/storage and explained sharing disablement. |
| Background | Verify a faint diagonal Milky Way band, sparse dim stars, reduced density on phones/lower quality, label clarity and no automatic drift/streaks/camera orbit or exact-position/alignment claims. |
| Baseline preservation | Exercise the five-chapter journey, three scientific views, Sun's Gravity, existing camera/selection/sharing flows and isolated planetary/Galactic clocks. |
| Performance and delivery | Verify existing desktop/phone targets and compressed asset budgets after adaptation, static repository-subpath build, privacy and source credits. |

Implementation verification follows the repository's testing instructions. These demonstrations have not been performed: deployed behavior has not been inspected, no physical heliosphere forecasting model is adopted, and visitor learning has not been measured.
