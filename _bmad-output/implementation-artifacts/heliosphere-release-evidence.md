# Heliosphere release evidence — Story 1.6

Implementation verification and release approval are separate. No push or deployment is authorized or performed. This record does not claim measured visitor learning, a physical heliosphere forecast, physical-phone performance or a current Safari manual pass.

**Acceptance blocked:** Story 1.6 AC3 requires a current Safari manual check. The native browser host is unavailable, so automated implementation verification does not close that requirement. The story remains in review in sprint tracking and blocked in its build-auto result. Physical-phone and current Edge checks are also explicitly unverified.

## Environment and methods

Host facts and primary-source checks: [environment](story-1-6-environment.md). MacBook Pro Mac16,8, Apple M4 Pro, 48 GB RAM; macOS 26.7.2. Installed-version metadata is distinct from actually launched browser versions. Native UI/browser host was unavailable (configuration/network-policy failure); Microsoft Edge was not found at its standard application path; physical phone hardware is unavailable. Headless WebKit is an automated engine check, not manual Safari.

Frozen numerical fixture: [science baseline](story-1-6-science-baseline.json), generated at `c7ca33e5bdaf8e5d686d433fd79fecebb421f7f4`. Values are immutable application regression outputs, not independent JPL truth. Existing independent J2000 Horizons checks remain separate.

## Command evidence

- `npm run check` — PASS after review fixes: typecheck, ESLint, 203 deterministic tests across 17 files, production build. Vite reports its existing large-bundle advisory; this is distinct from transfer size.
- `npm run test:e2e -- --workers=3 --reporter=line` — PASS after review fixes: 257 passed, 10 documented skips, 267 total in 5.4m across Chromium/Firefox/WebKit, exit0. New scenarios are in [integration-1-6.spec.ts](../../tests/integration-1-6.spec.ts) and the automatic-adaptation case in [app.spec.ts](../../tests/app.spec.ts); retain all existing cases and unsupported-input skips.
- Initial complete browser run —256 passed,10 skipped,1 failed in5.4m. The Chromium delayed-RAF test raced its running-clock `Date.now()+100` pause target under concurrent load; Firefox/WebKit and every new integration case passed. Fixed the setup by pausing a fixed clock before navigation, retaining every subsequent timing/flow/hidden-time assertion. Focused corrected-case rerun passed3/3 engines (7.7s); final complete rerun passed257 with10 skips (5.4m).
- `git diff --check` — PASS after final edits.
- `env BENCHMARK_DPR=2 node scripts/measure-heliosphere.mjs` — PASS, exit 0, against fresh built output with no concurrent browser suite. [Raw laptop results](heliosphere-laptop-benchmark.json): installed Chrome156.0.8078.74, headless, ANGLE Metal Apple M4 Pro, 1440×900 CSS viewport and 2880×1800 backing canvas (DPR2), auto resolving to high throughout. All four layers, planetary and decorative playback active, visible page, healthy WebGL; date advanced. Ten-second warmup; 30.0154-second observation, 1801 real RAF intervals: average 60.0025 FPS, p50/p95/p99/max 16.7/16.7/16.8/16.8 ms, one-second windows 60.0000–60.0098 FPS. All 1802 sampled frames passed native workload checks; no visibility/context interruptions or quality transitions occurred, with high as the only observed tier. No console/page/resource errors. This supports this local recent-laptop workload; it does not establish other devices or vendor manual passes. The script supports explicit channel/headed/quality/DPR/warmup/duration overrides, bounded observation and failure diagnostics; no portable CI timing threshold.
- [Initial invalid benchmark](heliosphere-benchmark-initial-invalid.json) is preserved: similar60FPS but exit1 due one resource404. A clean rerun after the harness explicitly handled Chrome's default favicon probe records `/favicon.ico`204 and zero failed responses. The initial run is not counted as a pass.

## Transfer inventory

PASS — fresh production response inventory using gzip level 9 independently per response (mtime=0): **844,655 bytes critical** and **1,517,399 bytes complete**, below the roughly 3 MB/15 MB budgets. [Exact response inventory](heliosphere-transfer-inventory.json) records raw and compressed sizes. Critical set is index.html, the emitted CSS/JS and Mercury/Venus/Earth/Mars textures; complete set adds Jupiter/Saturn/Neptune textures. Uranus, Galaxy and Heliosphere artwork are generated locally. Source maps are excluded because runtime does not request them. This is local compression measurement, not deployed content-encoding negotiation. Galaxy artwork is generated locally only on first requested visible frame; no downloaded Galaxy image is added. Hero placeholders and inner-first texture scheduling remain intact.

## Nine acceptance criteria

| AC | Implemented evidence | Disposition |
| --- | --- | --- |
| 1 Quality/device | Monitor ignores nonfinite/nonpositive/stall samples and adapts once after 180 valid sustained slow samples. Actual scene callback updates renderer pixel ratio/density while preserving body positions/boundary phase. Browser synthetic poor-frame input reaches original monitor → main dispatch → actual renderer and semantic buttons. | Deterministic and local laptop measurement PASS; full browser gate PASS. Physical phone FPS UNVERIFIED: no hardware. |
| 2 Delivery | Lazy Galaxy owner tests prove no expensive artwork before request, stable anchors, current progress/quality, reuse and exact resource release. Built subpath smoke rejects unexpected/source resources. | Unit and compressed inventory PASS; fresh production browser gate PASS. |
| 3 Access/browsers | Existing mouse/touch/keyboard/phone sheet/Focus/Follow/layer/selection suites retained. Forced construction failure verifies lesson, browser requirements and Sources. | Browser gate PASS. Manual Safari and current Edge UNVERIFIED: UI host unavailable/Edge not found at its standard application path. |
| 4 Science | Frozen start/interior/exact-endpoint all-eight-planet comparison across both origins × four speeds × three quality levels; actual rounded card wiring at the same dates/origins with all speeds/quality and planet coverage. Separate sourced conversion metadata and correct unlike Table 2b units, unchanged values. | Deterministic PASS; actual card browser gate PASS. |
| 5 Baseline journey/views | Full five-chapter completion, visible speed assertions, replay/skip and collected errors; existing three views/five bookmarks/Follow/Gravity/path suites retained. | Browser gate PASS. |
| 6 Two clocks | Existing boundaries/completions/replay/defaults retained; new nonzero 42-million-year Galactic progress and speed survive Heliosphere play/Back and paused Galaxy re-entry. | State PASS; browser gate PASS. |
| 7 External state/privacy | Fresh four-field parser rejects null/array/primitive/wrong types/unknown fields; JSON wrapper catches malformed storage. Existing direct schematic-sharing guard/URL tests retained; useful startup browser cases added. | Unit PASS; browser gate PASS. |
| 8 Boundaries/docs | Source/module audit below, PRD/SCIENCE updates, no imagery or dependency changes. | Source audit complete; final diff check PASS. |
| 9 Release evidence | All companion rows mapped below; independent browser job now builds its own dist and retains pinned actions/headed Firefox/Xvfb. | Local gates PASS; remote CI/deployment, Safari, phone and learning remain UNVERIFIED. AC3 prevents acceptance closure; release approval unclaimed. |

## Complete companion acceptance map

Named tests refer to [app.spec.ts](../../tests/app.spec.ts), [integration-1-6.spec.ts](../../tests/integration-1-6.spec.ts), [production-smoke.spec.ts](../../tests/production-smoke.spec.ts) and the deterministic modules under `src/`. All listed automated cases ran and passed in the complete root gate. Ten pre-existing documented skips cover Firefox native-touch limitations, Chromium-only CDP input and duplicate non-Chromium inspection captures; no new Story1.6 case was skipped.

| Companion row | Deterministic/browser/manual evidence |
| --- | --- |
| CAP-1 | Actual scene mapping test; camera buttons/Focus/Follow/Escape/Reset, mouse orbit/pan/wheel, native multi-touch, phone camera and full overview production screenshots. |
| CAP-2 | Actual renderer surface picking test; physically picks five visible surfaces and semantic selections; region card replacement without motion/pause; production semantic disclosure screenshot. |
| CAP-3 | Frozen science cross-product and actual rounded physical cards at start/interior/endpoint; existing explicit-date timeline/speed tests. |
| CAP-4 | Shared-phase scene test, 20-second ±2% deterministic envelope and integration animation test; existing controlled RAF pause/resume/reduced-motion/flow/shimmer suites and visual artifacts. |
| CAP-5 | Keyboard focus/native key tests, mouse and Chromium native touch gestures, phone sheet, reduced motion allowing planetary playback; forced fallback sources screenshot. Physical-phone usability remains UNVERIFIED. |
| Layers and selection | Existing independent four toggles/default reset, actual hidden ancestor hit exclusions, visible surface/button parity, Follow replacement and labels-off access tests. |
| Playback lifecycle | Existing delayed RAF wall-interval, scrub/endpoint/hidden/no catch-up and reduced-motion transitions; state lifecycle tests retain exact phase. |
| Display scale | Actual mapped mesh/path integration, monotonic mapping/nesting envelope and all-eight-planet bounds tests; physical-card fixed-date regressions and exact disclosure. |
| Entry and return | Both scientific-origin tests, rapid handoff camera restoration using settled bounds, saved selection/speed/date and focus/Follow state; new nonzero Galactic progress retention. |
| Exit and session | Existing Home/journey/replay lifecycle tests, fresh layers/return state, preferences/URL allowlists, direct sharing rejection and explained disablement. |
| Background | Actual static sky density/adaptation/material/transform tests and desktop high/low/labels-off/phone screenshots; no autonomous motion and reduced quality access. |
| Baseline preservation | Full tour/error/speed flow plus existing all three views/five bookmarks, Gravity, cards/Follow/sharing and isolated-clock completion suites. |
| Performance and delivery | Automatic monitor and actual renderer integration; standalone laptop benchmark and compressed inventory PASS (methods/results above). Built repository-base smoke, static resource rejection and source audit. Safari/physical-phone/current Edge/remote CI/deployment UNVERIFIED for limitations above. |

## Source, ownership and persistence audit

Astronomy remains pure with explicit dates; no coefficient, frame matrix, pole, radius, period or numerical fixture changes. Conversion metadata describes existing constants and Table 2b coefficient units; UTC/ephemeris approximation and Earth–Moon barycenter treatment remain disclosed. Rendering exclusively owns compressed mapping, generated artwork, density and resources. Experience remains the authoritative DOM/Three.js-free state/action boundary and retained decorative phase. Interface owns semantic controls and the unknown-input preference parser; main retains storage exception handling, allowlisted persistence, dispatch wiring and WebGL construction catch. The camera controller retains accepted pose/target handoffs.

Galaxy retains stable root/marker identity; expensive disk/stars/orbit/halo/arrow generation is deferred until visible, initialized once, updated from current progress/quality and reused. Its cheap corona phase advances with the original clamped/reduced-motion behavior before generation; hidden render calls update its time anchor, preventing hidden wall-time catch-up. Owner disposal deduplicates geometries/materials/textures, includes Sprite resources, clears/removes the owned root before generic scene disposal and is idempotent. No feature data enters storage or URLs. No new imagery means ASSET_CREDITS does not change; all existing source/visual credits remain. No services, analytics, credentials, migrations, dependency upgrades or new framework were added.

Intentional approximations remain those in SCIENCE: approximate JPL elements, UTC time approximation, barycenter Earth, stabilized visual spin/guide motion, local Galactic tangent and schematic Galaxy/Gravity/Heliosphere artwork. Numerical preservation tests are not independent physical accuracy measurements. Native Safari, physical-device rates, visitor learning, deployed transfer negotiation and remote CI cannot be inferred from local automation.

## Visual inspection

Root inspected the freshly generated Chromium `sky-phone-low-overview` and `phone-sheet-open` artifacts: cutaway and labels remain legible, the open sheet scrolls through layers, and timeline Pause/camera controls stay reachable. These are layout inspections of automated viewport captures, not physical-device usability or frame-rate passes. Root also inspected Chromium fallback Sources and built-site overview captures: source text remains legible and scrollable, and the built cutaway, disclosure, semantic regions, layers and timeline remain clear. Fallback lesson/browser text is asserted before opening Sources. All inspected images are diagnostic artifacts, never GPU pixel snapshot assertions.

## Story matrix audit

The spec matrix is verified at these outer surfaces. All covering automated cases ran and passed in the complete gate without skipped new coverage; device/manual limitations are recorded separately.

| Spec scenario | Covering tests / measured check |
| --- | --- |
| Automatic quality | `adaptive-quality-monitor.test.ts`:180 slow valid samples, invalid samples and manual/fast preferences; `orbital-scene.test.ts`: actual monitor callback into state/pixel ratio/stars with retained mapping and20-second envelope; browser automatic poor-frame adaptation case in all engines. |
| Deferred loading/resources | `galaxy-presentation.test.ts`: lazy allocation/current progress/low tier/reentry and exact disposal, including never-initialized disposal; retained Galactic marker/quality/reduced-motion browser tests. |
| Scientific isolation | `heliosphere-regression.test.ts`:72 frozen date/origin/speed/quality cases across all8planets, conversion/element units; browser frozen actual rounded physical-card cases at all3dates and both origins. |
| External state | `preferences.test.ts`, `url-state.test.ts`; six malformed/invalid startup cases, explicit false OS override and fresh allowlisted storage browser case; retained direct share guard and persistence flows. |
| Fallback/access | Browser forced WebGL construction failure plus retained keyboard/native key priority, touch, phone sheet, Pause, Focus/Follow and reduced-motion flows; inspected phone/fallback captures. |
| Baseline lifecycle | `experience-state.test.ts` session/clocks and new42MY retention; full five-chapter/error/speed browser case, both clocks and all frames/bookmarks/Gravity/Heliosphere return suites. |
| Static build/CI | `npm run check`, raw-dist repository-subpath production smoke in all3engines, exact10-response gzip inventory; reviewed browser job build prerequisite and unchanged Firefox-headed/Xvfb coupling. Remote CI not run. |
| Evidence/device | Actual standalone Chrome/Metal laptop observation and recorded environment/method/workload/statistics; all13companion rows mapped above. Safari/physical-phone/vendor/manual limitations explicitly UNVERIFIED, never inferred from emulation. |
