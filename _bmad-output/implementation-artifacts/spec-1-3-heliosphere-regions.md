---
title: 'Story 1.3 — Inspect heliosphere regions and layers'
type: feature
created: '2026-10-29'
status: done
baseline_revision: 7d21d936d2e5ffe40de9f11e76eb25d41e11dc5b
review_loop_iteration: 0
followup_review_recommended: true
context:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/specs/spec-Solar-System-Orbital-Journey/heliosphere-presentation.md
  - docs/PRD.md
  - docs/SCIENCE.md
  - docs/agents/architecture.md
  - docs/agents/testing.md
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** The static cutaway cannot explain its regions through scene selection or semantic controls, and its layers cannot be independently hidden.

**Approach:** Implement all nine Story 1.3 criteria: five shared region identities with exact explanations, one body/region/none selection, one scene-hit resolver, four session layers and reachable collapsible phone controls.

## Boundaries & Constraints

**Always:** Preserve Story 1.2 mapping, scientific calculations/cards, clocks, camera/session handoffs, Focus/Follow, native-key priority, fallback and sharing/persistence allowlists. Region identities are `solar-wind`, `termination-shock`, `heliosheath`, `heliopause`, `interstellar-space`. Use each exact explanation from the presentation companion. Experience owns one tagged selection and four session layer booleans; Rendering owns geometry and common drawable/region/layer records; Interface owns semantic content. Keep all eight planets inside the shock, plasma-boundary/Oort Cloud context and exact scale disclosure. Every region must be individually selectable through actual displayed scene geometry and its button. Hidden geometry cannot be picked; buttons stay enabled and never unhide it. Selection replaces one card without pausing or moving the camera. Update affected PRD/SCIENCE contracts.

**Never:** Persist region/layer state, widen URL/storage allowlists, change astronomy/mapping, add services/dependencies/imagery, push or deploy. Boundary motion and background remain Stories 1.4/1.5; do not defer this story's verification to 1.6.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Region access | Any of five scene surfaces or buttons | Same region identity and exact explanation in one card | Reject region action outside Heliosphere |
| Replacement | Body/region selected while playing or following | Replace card, retain playback/camera; region ends Follow | Clear/Escape ends associated Follow without camera movement |
| Arbitration | Overlapping marker/body/region candidates | At most one selection per activation using shared displayed geometry | Exclude invisible surfaces and hidden ancestors/layers |
| Layers | New session or toggle | Four independent defaults on: Outer heliosphere, Termination shock, Orbit paths, Labels | Duplicate entry never resets; preserve scientific preferences |
| Hidden selection | Hide selected layer, click it or choose button | Existing card stays; hidden geometry cannot select; button opens explanation | Never unhide as a selection side effect |
| Lifecycle | Back, discard or re-entry after region selection | Back restores captured scientific body; fresh session resets layers | No region leaks through Home/tour/frame exit, URL or storage |
| Accessible controls | Tab/Enter/Space, Escape, phone scrolling/collapse | Five buttons, four toggles, explanation and Pause/camera access reachable | Native controls/dialogs retain key priority; labels toggle hides scene labels only |

</intent-contract>

## Code Map

- `src/experience/experience-state.ts`: migrate authoritative selectedBody to tagged selection; derive body-only adapter values; split heliosphere session branch to own layers. Reuse accepted handoffs and returnContext; discardPresentation must clear regions.
- `src/rendering/heliosphere-presentation.ts`: anonymous shells currently at 145/128/112; add shared drawable/region/layer records and actual visible solar-wind/interstellar selection treatments. Retain allocated resource disposal and nesting.
- `src/rendering/orbital-scene.ts`: handlePointer currently marker-first then body raycast; centralize marker/body/visible-region arbitration and single callback; drive draw visibility and raycast eligibility from the same records.
- `src/rendering/scene-labels.ts`: mapped marker positions and HTML activation; feed common selection dispatch and session Labels without creating another pointer handler.
- `src/main.ts`: onSelect, renderInterface, sharing DTO and SceneState; derive selected body and replace hardcoded heliosphere paths/labels with active session layers.
- `src/interface/app-interface.ts`, `index.html`, `src/styles.css`: exact copy, five buttons, four native checkboxes, single current card and genuinely collapsible/scrollable phone sheet. Existing Sources Escape exception must survive.
- `src/experience/experience-state.test.ts`, `src/rendering/orbital-scene.test.ts`, `tests/app.spec.ts`: reuse deterministic handoffs, actual renderer-delivered scene capture and settledBoundingBox.
- `src/interface/url-state.ts` and tests: keep scientific body-only DTO and direct schematic sharing rejection.

## Tasks & Acceptance

**Execution:**
- [x] `src/experience/experience-state.ts` and tests — introduce shared region/selection/layer types and deterministic transitions, migrate consumers without a second authoritative selection.
- [x] `src/rendering/heliosphere-presentation.ts`, `orbital-scene.ts`, `scene-labels.ts` and rendering tests — associate actual drawable geometry with regions/layers and resolve one eligible hit; preserve mapping/resources.
- [x] `src/main.ts`, `src/interface/app-interface.ts`, `index.html`, `src/styles.css` — wire session layers/selection and semantic region controls, one card and accessible phone sheet.
- [x] `tests/app.spec.ts` — physically click each real scene region and separately activate each semantic button, then verify hidden geometry, layer reset/independence, Follow, no selection movement/pause, keyboard and phone collapse/scroll access. Keep clear-canvas gesture inputs and existing regressions.
- [x] `docs/PRD.md`, `docs/SCIENCE.md` — record region/layer behavior and any new illustrative geometry; preserve exact science explanations and source credits.

**Acceptance Criteria:**
- Given Story 1.3's nine criteria and the matrix, when deterministic/browser verification runs, then every row is exercised at its actual production surface, including all five real scene selections and semantic equivalents.
- Given integrated region/layer controls, when npm run check and npm run test:e2e run, then both pass with baseline camera/playback/Gravity behavior intact and no region/layer serialization.

## Spec Change Log

## Review Triage Log

### 2026-10-29 — Review pass

- verdicts: 17 findings — high 0, medium 11, low 4, false 2, maybe-false 0
- findings (report order):
  - `[medium]` `[patch]` Gap 1: Orbit paths can ignore updates undetected — existing tests assert defaults and selection only; verify each changed session flag/unchanged siblings and actual hidden orbit geometry.
  - `[medium]` `[patch]` Edge 1: navigation pointerup selects regions — handlePointer has no movement/button/multi-pointer eligibility guard, so drag completion can replace card/end Follow; distinguish click/tap from navigation and verify retained Follow/card.
  - `[medium]` `[patch]` Edge 2: reselecting collapsed current region stays hidden — JSON identity comparison ignores accepted reactivation; react to accepted selection-object identity while ordinary advances retain that identity.
  - `[false]` `[reject]` Intent 1: overall process not established by one patch — this is the separate Story 1.3 checkpoint following committed Story 1.2; renderer invocation and workflow steps were performed, later stories are deliberately queued. No overall-completion claim was made.
  - `[false]` `[reject]` Intent 2: diff lacks test execution results — execution evidence exists outside the diff: full implementation browser run passed 171/180 with 9 explicit skips, last-run JSON says passed/no failed tests, and parent npm run check passed 105 units. Final repaired verification is recorded below.
  - `[medium]` `[patch]` Intent 3: scene samples omit overlapping/browser camera scenarios — labels-off fixed coordinates and separate resolver tests do not demonstrate overlapping candidates through browser input; add a labels-on/changed-camera scene case alongside shared-resolver integration coverage.
  - `[low]` `[patch]` Intent 4: phone clicks lack native touch/visible-focus evidence — add supported native touch activation and keyboard focus checks; keep physical devices explicitly unverified rather than claiming emulation proves hardware.
  - `[medium]` `[patch]` Intent 5: URL/storage assertions omit region/layer activity — add actual UI selection/layer changes, trigger production preference writer and scientific sharing after Back, verify allowlists.
  - `[low]` `[patch]` Blind 1: disabled options contradict active layer values — existing expression forces both checked; derive from active session booleans while retaining scientific values.
  - `[medium]` `[patch]` Blind 2: Back changes panel stacking — chrome.append places positioned card after options/explanation in paint order; restore original insertion position and test normal access to those panels.
  - `[medium]` `[patch]` Blind 3: short phone sheet overlaps camera row — CSS 42dvh sheet plus bottom offset intersects fixed 200px camera row at 667px height; constrain available sheet height and verify real open-sheet clicks. Browser confirmation is supplied by the repair test, not claimed from the reviewer’s blocked attempt.
  - `[low]` `[patch]` Blind 4: region close leaves focused hidden element — scoped focus restoration from inside the closing region card improves accessibility; companion specifically guarantees entry/Back focus, so no broader close-focus product requirement is invented.
  - `[medium]` `[patch]` Blind 5: Labels removes keyboard planet access — available=false hides whole semantic planet buttons; hide scene label text while preserving accessible selection and scene hit arbitration.
  - `[medium]` `[patch]` Blind 6: eligible body/region overlap untested — test currently hides region root before body priority assertion; keep both eligible and verify one winner.
  - `[medium]` `[patch]` Blind 7: manual visibility mutation bypasses layer wiring — exercise actual setLayers/render associations and picking together, independently of the other layer, plus orbit-path visibility.
  - `[medium]` `[patch]` Blind 8: serialization test supplies null instead of actual region/layer state — use production body projection and real UI/preferences/sharing evidence, grouped with Intent 5.
  - `[low]` `[patch]` Blind 9: concurrent screenshot paths overwrite — use per-test output paths and attached browser-identified captures; settle initial hero transition before capturing.

All remaining findings have direct local corrections and no unresolved intent gap. Thirteen grouped patch entries: layer integration, gesture eligibility, reactivation, overlap browser evidence, touch/focus evidence, persistence evidence, effective options, panel insertion order, short-phone clearance, closing-card focus, semantic planet access, eligible overlap unit evidence and isolated screenshot artifacts. Grouped severities: 9 medium, 4 low. No items deferred.


## Design Notes

Surface tessellation, region-hit priority, layer grouping and sheet arrangement are delegated choices. Document the chosen shared associations and prove every region has reachable visible geometry; invisible proxies or direct selection helpers are not scene-selection evidence. Preserve current viewport fit, ring clearance, retained spin, physical-card comparisons and native-dialog priority. Use final sources unchanged while browser verification runs; line reporter avoids HTML-server hangs.

## Verification

- `npm run check` — typecheck/lint/unit/build pass.
- `npm run test:e2e -- --workers=3 --reporter=line` — full Chromium/Firefox/WebKit suite passes, with honest explicit unsupported-input skips.
- `git diff --check` — no whitespace errors.
- Inspect open/closed/collapsed phone sheet and desktop region controls via captured images; no GPU snapshot assertions. Keep current Safari/physical hardware evidence explicitly unverified until available.


## Auto Run Result

Status: done

Implemented all five region explanations through real scene geometry and semantic buttons; one tagged selection; four independent session layers; shared drawing/picking associations; and one collapsible, scrolling phone sheet. Body cards, scientific calculations, clocks, camera handoffs, Focus/Follow and persistence/sharing allowlists remain intact.

### Changed files

- `src/experience/experience-state.ts` — tagged selection, session layers, selection replacement, return/discard isolation.
- `src/experience/experience-state.test.ts` — migration and deterministic region/layer invariants.
- `src/rendering/heliosphere-presentation.ts` — visible cut surfaces and common drawable/region/layer records.
- `src/rendering/heliosphere-mapping.ts` — explicit extent for the finite illustrative interstellar band.
- `src/rendering/orbital-scene.ts` — one hit resolver, visibility integration and private click/gesture eligibility.
- `src/rendering/orbital-scene.test.ts` — actual rendered surfaces, layer changes, orbit hiding, overlapping candidates and registered canvas handlers.
- `src/rendering/scene-camera-controller.ts` — full overview fit includes the interstellar context band.
- `src/interface/app-interface.ts` — exact explanations, effective controls, reactivation, focus restoration and original card stacking.
- `src/interface/url-state.test.ts` — direct guard uses actual region/layer state and production body projection.
- `src/main.ts` — typed selection/layer adapter wiring with unchanged share/persistence allowlists.
- `index.html` — semantic region/layer sheet.
- `src/styles.css` — themed controls, sticky/collapsible sheet, short-phone clearance and scrollable explanation panels.
- `tests/app.spec.ts` — real scene/button parity, keyboard/native touch, hidden layers, storage/URL, Back panels, gesture retention and isolated visual artifacts.
- `docs/PRD.md` — implemented region/layer product contract.
- `docs/SCIENCE.md` — illustrative cut-face dimensions, associations and exact scientific content.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — completed Story 1.3.
- `_bmad-output/implementation-artifacts/spec-1-3-heliosphere-regions.md` — plan, triage and evidence.

### Review and verification

Four independent review layers reported 17 findings; all individual verdicts appear above. Fifteen retained findings were patched in 13 root-cause entries (9 medium, 4 low), zero deferred. Two process-only findings were rejected: the diff is an individual checkpoint rather than an overall completion claim, and executed verification results exist outside the source diff. No unresolved requirement or implementation blocker remains.

Follow-up review recommended: true by the multiple-medium-entry rule. Specific unverified risk: physical Safari keyboard-navigation settings and physical-device touch/performance need final release validation; WebKit automation does not substitute for that evidence.

Final `npm run check` passed: typecheck, lint, 105 unit tests across 12 files and production build. Existing large-chunk advisory remains. Final `npm run test:e2e -- --workers=3 --reporter=line` passed unchanged sources: 185 passed, 10 explicit skips, 195 total in 4.1 minutes across Chromium/Firefox/WebKit. Skips are the existing Firefox touch case, two non-Chromium CDP multi-touch cases, six duplicate screenshot-capture cases and the new unsupported Firefox native-touch case. No skipped case is claimed as passed. Whitespace checks passed.

Matrix audit (all covering tests executed):

| Matrix row | Evidence |
| --- | --- |
| Region access | Five real surface clicks and five semantic selections in all three engines, exact explanations; outside-presentation reducer rejection. |
| Replacement | Tagged reducer invariants; browser region/body replacement, retained playback/camera and Follow termination, native dialog, Close/Escape and focus checks. |
| Arbitration | Actual renderer-delivered geometry with simultaneously eligible body/region; marker priority; registered canvas handlers dispatch one click and reject drag/secondary/cancel/multi-pointer releases; labels-on changed-camera browser hit. |
| Layers | Each state boolean and unchanged siblings; real setLayers/render/picking associations, hidden orbit vertices; defaults/reset and scientific preference browser checks. |
| Hidden selection | Existing card remains visible after hiding layer; hidden scene activation cannot display hidden region; its button still selects without unhiding. |
| Lifecycle | Captured Earth restored on Back, defaults reset on new session, regions cleared on discard; actual UI region/layer updates plus preference writes preserve URL/storage allowlists and scientific sharing. |
| Accessible controls | Enter/Space/Escape and visible focus; all eight planet buttons remain available with Labels off; native touch in Chromium/WebKit; open/collapsed/scrolling 390x844 and short 375x667 phone sheet with camera/Pause access. |

Verification followups corrected the observed test surfaces rather than lowering the contract: the touch test observes followed Earth after a pan rather than offscreen Neptune; hidden-hit assertions inspect visible card output rather than stale text in hidden DOM; long scientific explanations share the scroll limit; explicit region-close focus handles WebKit's non-focusing mouse click. WebKit uses native Option-Tab traversal for its default keyboard preference (Apple reference is linked in the tests), without overriding native application keys.

Visually inspected per-test/browser-attached desktop overview, collapsed/open phone sheet and short-phone images in test-results. Captures wait for hero opacity zero and no longer overwrite shared filenames. Physical current Safari/device measurements and visitor learning remain unverified. Geometry, finite interstellar context band, distances and body sizes remain explicitly illustrative. No imagery/dependency additions, push or deployment occurred.
