---
title: 'Story 1.6 — Device integration and release evidence'
type: feature
created: '2026-10-30'
status: blocked
baseline_revision: c7ca33e5bdaf8e5d686d433fd79fecebb421f7f4
review_loop_iteration: 0
followup_review_recommended: true
context:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/specs/spec-Solar-System-Orbital-Journey/heliosphere-presentation.md
  - _bmad-output/implementation-artifacts/story-1-6-environment.md
  - _bmad-output/implementation-artifacts/story-1-6-science-baseline.json
  - docs/PRD.md
  - docs/SCIENCE.md
  - docs/agents/architecture.md
  - docs/agents/testing.md
warnings: [oversized, multiple-goals]
deferred:
  - summary: >-
      Physical-phone performance and vendor device verification remain unverified.
    evidence: |-
      No physical phone is available. Local Chrome/Metal laptop data and viewport/engine automation cannot establish phone rates or constrained-device recovery. AC1 explicitly permits unavailable measurements to remain unverified.
    location: >-
      Story 1.6 AC1; heliosphere-release-evidence.md
    severity: medium
  - summary: >-
      Required current Safari manual acceptance cannot run because the native browser host is unavailable.
    evidence: |-
      Native UI inventory returned no apps/browsers and configuration/network-policy errors. Automated WebKit is not manual Safari. AC3 remains unresolved, so implementation is committed with Story 1.6 blocked rather than acceptance-complete. Current Edge is also unverified: it was not found at the standard application path.
    location: >-
      Story 1.6 AC3; story-1-6-environment.md
    severity: medium
---

<intent-contract>

## Intent

**Problem:** The completed Heliosphere needs final quality/device integration and evidence for all nine Story1.6 acceptance criteria. Investigation found eager Galaxy initialization, a fresh-CI build prerequisite gap, malformed preference startup failure, and missing integration/scientific/fallback evidence.

**Approach:** Fix those concrete integration gaps, demonstrate real adaptive-quality preservation and full scientific/product regressions, measure the built static delivery and available representative laptop, and assemble every companion acceptance row with honest verified/unverified status.

## Boundaries & Constraints

**Always:** Fulfill Story1.6 AC1–9 as integrated obligations, preserving FR1–FR32/NFR1–14/architecture/UX contracts. Actual automatic adaptation must reduce appropriate detail/density/pixel ratio without changing astronomy, mapping, region identities/access, nesting or20-second±2% cadence. Preserve quick still hero/inner priority and genuinely defer expensive Galaxy artwork until requested, retaining its stable marker/root references and original progress/quality/corona behavior. Keep the production repository subpath,3MB critical/15MB complete compressed budgets and all static/privacy guarantees. Record compression method and response sets. Validate unknown external preferences/URLs before narrowing; preserve allowlists and session-only sharing guards. Astronomy stays pure, Experience authoritative, Rendering owns mapping/resources, Interface semantic, main wiring/fallback; camera controller owns accepted pose/target handoffs. Preserve all calculated coefficients/constants, barycenter, source/pole/rotation conventions, UTC approximation, model limits, rounding and scientific/Galactic/schematic distinctions. Add accurate typed unit/source metadata without numerical changes. Record actual command/browser/device/method/quality/workload/FPS evidence and every companion matrix row. Update PRD/SCIENCE and credits for implemented exceptions; no uncredited imagery.

**Never:** Fabricate device, Safari, Edge, CI/deployment, learning or scientific accuracy passes; equate headless WebKit with manual Safari or viewport emulation with physical-phone FPS; use raw dist size as compressed transfer. Unavailable measurements remain visibly UNVERIFIED under AC1/AC9, with blockers/limitations explained. Preserve successful automated implementation/evidence while leaving release approval unclaimed. Add no runtime service/API, credentials, analytics/cookies/tracking, remote error reporting, persistent Heliosphere state, framework/backend/migration/dependency upgrade, spacecraft, guided outward travel or forecast claim. Do not reimplement baseline features or defer unfinished earlier-story functionality. No push/deploy.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Automatic quality | Sustained poor valid frame samples, auto; manual lower tiers | Real monitor→callback/state→renderer reduces visual load; actual mapping/picking/identities/phase/nesting unchanged | Ignore invalid/stall samples per baseline; do not invent new adaptation algorithm without measured need |
| Deferred loading/resources | Hero/scientific views, first Galaxy with nonzero progress/quality, reentry/disposal | No expensive Galaxy artwork before request; initialize once using current state, reuse and release all owned geometry/material/texture resources exactly once | Stable root/marker refs; no initial/hidden-time coroutine jump or double traversal disposal |
| Scientific isolation | Fixed UTC start/interior/exact165-Julian-year endpoint; both origins, all4speeds and high/balanced/low | Same original heliocentric positions/speeds and actual rounded physical cards; metadata complete and truthful; independent clocks | Frozen pre-story regression data must not be relabeled independent JPL truth or regenerated to match code |
| External state | null/array/primitive/malformed/unknown/private stored values, valid allowlisted preferences and URLs | Useful startup, validated allowlisted preferences and unchanged scientific sharing; no schematic phase/layers/pose serialization | No null dereference or arbitrary narrowing/unknown-field persistence |
| Fallback/access | Forced WebGL construction failure; desktop/phone native controls and reduce motion | Semantic fallback explains core lesson, browser requirements and working Sources; normal controls retain focus/touch/Pause/sheet behavior | No uncaught initialization error or false rendering pass |
| Baseline lifecycle | Full5chapter tour/skip/complete/replay, three scientific views/bookmarks, Gravity, both clocks/completions, Heliosphere entry/Back with nonzero Galactic progress | Full established contracts remain; collect uncaught errors; inactive clocks and sessions preserve/reset exactly as specified | Do not replace existing regression suites with weaker proxies |
| Static build/CI | Fresh build/browser job, built repository-base bundle, complete response inventory | Browser job builds its own dist; existing headed-Firefox/Xvfb and deployment conventions intact; budgets/local resources pass | Do not assume another job's filesystem or deploy remotely |
| Evidence/device | Available laptop runs; unsupported/unavailable phone/Safari/vendor checks | Named commands/results, device/browser/backend, viewport/quality/workload/warmup/window/FPS statistics; every acceptance row mapped | Label unavailable/nonrepresentative checks UNVERIFIED; report observed failures, not fabricated passes |

</intent-contract>

## Code Map

- `src/rendering/galaxy-presentation.ts`, `orbital-scene.ts:145`: constructor eagerly generates Galaxy texture/artwork; render runs while invisible. SceneLabels needs stable root/sunMarker refs. Lazily initialize expensive artwork on first visible render, applying current progress/quality. Preserve cheap original corona-time progression even before initialization; avoid resuming hidden wall time. Explicitly own/dispose shared texture maps and Sprite resources; clear/remove owned root before generic scene cleanup.
- `src/rendering/adaptive-quality-monitor.ts`:180 valid samples, auto→balanced once at average>25ms; gaps>500ms/nonpositive ignored. Add focused monitor tests and actual scene/browser callback integration rather than manual-low evidence alone. `quality-profile.ts`, `orbital-scene.test.ts` actual scene capture, and existing browser controlled-RAF harness supply seams. Retain sky transforms/materials, h phase, region picking and mapped bodies.
- `.github/workflows/deploy.yml`: independent browser-smoke checkout runs install/test without build; built smoke from1.5 requires dist. Add its build prerequisite, preserve pinned actions and Firefox env/Xvfb.
- `src/main.ts:readPreferences/applyPreferences`: JSON.parse is cast before object validation; null crashes before fallback. Extract a small pure boundary parser under `src/interface/` if useful, build a fresh allowlisted object, keep localStorage wrapper/catch in main. Cover malformed data and valid field preservation without new preference surface.
- `src/astronomy/solar-system.ts`, `planet-data.ts`, `reference-frames.ts`: preserve all math/data. Existing scientific conversion/epoch constants lack sourced unit records and periodic-correction metadata incorrectly groups unlike coefficient units. Environment context records rechecked primary sources; only metadata/constant references may change. Existing physical/orbital/Galactic metadata and approximation docs are read-only numerical contracts.
- `story-1-6-science-baseline.json`: pre-story c7ca33e frozen outputs for all8planets at2026-10-30T00Z,2109-05-01T03Z and2191-10-31T06Z. Copy/read as a labeled regression fixture, never update values to match new implementation. Existing independent J2000 Horizons fixtures remain separate. Use full deterministic origin/speed/quality cross-product and representative actual browser card wiring across the same fixed instants; explicit source/unit/rounding tests.
- `src/experience/experience-state.test.ts`, astronomy/render tests, `tests/app.spec.ts`: reuse extensive tour/frames/bookmarks/Follow/Gravity/picking/touch/storage/clocks/hidden-time suites. Add nonzero Galactic progress through Heliosphere, full-tour no-uncaught-error/speed evidence, forced WebGL fallback, and actual fixed-date card comparisons. Keep scenarios focused and settled camera measurements; no GPU pixel snapshots or application debug API.
- `tests/production-smoke.spec.ts`: executes raw dist bytes under existing origin/base and persists browser-specific artifacts, rejects unexpected/source resources and console/page errors. Refresh dist before execution.
- `scripts/measure-heliosphere.mjs` (new if useful): development-only standalone built-site benchmark with installed Chrome channel or explicit supported backend, no application instrumentation API/services. Measure uncontended real RAF intervals after warmup; record browser/headless mode, graphics backend, requested/effective quality, viewport/DPR, all-layer animated overview workload, duration, average and distribution/window FPS. Host facts are in environment context. Do not add timing thresholds to portable CI or claim phone rates from viewport emulation. Parent owns execution and assesses limitations.
- `_bmad-output/implementation-artifacts/heliosphere-release-evidence.md` (new): fresh compressed resource inventory and measurement outputs, complete13-row companion acceptance evidence map,9AC disposition, source/module/persistence/disposal audit, automated/browser/visual outcomes and clearly outstanding Safari/physical-phone/unsupported-vendor/remote-CI/deployment checks. Link repo evidence relative to this document.

## Tasks & Acceptance

**Execution:**
- [x] `src/rendering/galaxy-presentation.ts`, `src/rendering/orbital-scene.ts` and focused owner tests — lazy artwork initialization/current-state application/reuse/complete disposal without changing original Galaxy state/clock/labels behavior.
- [x] `src/rendering/adaptive-quality-monitor.ts` tests, `src/rendering/orbital-scene.test.ts`, `tests/app.spec.ts` — demonstrate actual adaptation and preserved displayed geometry/access/cadence using current policy; retain existing baselines.
- [x] `.github/workflows/deploy.yml` — ensure fresh browser job builds dist and retains headed Firefox/Xvfb/pinned workflow settings.
- [x] `src/interface/preferences.ts` and tests if extracted, `src/main.ts`, browser tests — validate unknown storage boundary, preserve allowlisted values and direct sharing guards; prove useful startup.
- [x] `src/astronomy/solar-system.ts` and appropriate metadata/constants/tests — accurately source/type current conversion/epoch units and periodic coefficient units without changing numerical results; compare frozen baseline/metadata across required scenarios.
- [x] `tests/app.spec.ts` or focused integration specs, state tests — actual rounded physical cards at three fixed UTC instants and both origins with speed/quality coverage; fallback+Sources, full tour/error/speed flow, preserved nonzero Galactic progress and existing complete regression suite.
- [x] `scripts/measure-heliosphere.mjs`, release evidence document — implement reproducible standalone local measurement; parent runs it after a fresh build, separately from browser gate. Record actual laptop data if supported; phone/currentSafari unavailable rows remain unverified.
- [x] `docs/PRD.md`, `docs/SCIENCE.md`, release evidence and this spec — complete source/module/exception/acceptance map, fresh gzip budgets and final command results; preserve honest source credits.

**Acceptance Criteria:**
- Given all nine Story1.6 criteria and the companion matrix, when integration checks execute, then every implementable behavior passes and every row names actual deterministic/browser/manual evidence or an explicitly permitted unavailable check with its concrete limitation.
- Given available representative-device measurement, when benchmark results are recorded, then device/backend/method/workload/quality/FPS are truthful; unavailable or nonrepresentative runs never establish physical-phone or manual-Safari passes, and measured failures remain failures.
- Given the final built implementation, when npm run check and the complete three-engine browser suite execute, then both pass with the earlier stories' complete product/science/resource/accessibility/privacy contracts and CI conventions intact.

## Spec Change Log

- 2026-10-30: Implemented lazy Galaxy ownership, preference validation, CI build prerequisite, sourced conversion/periodic units and integration regression evidence. Browser/device/transfer gates remain owned by the parent execution; release approval is unclaimed.

## Review Triage Log

### 2026-10-30 — Review pass

- verdicts: 18 findings — high 0, medium 9, low 3, false 6, maybe-false 0
- All four layers launched before triage. The fourth launch initially hit the platform thread limit and was retried when the first reviewer completed. Edge hunter reported no findings. Finding floor arithmetic is metadata, not a finding.
- findings:
  - `[false]` `[reject]` B1: Lazy initialization exception halts animation — procedural factories handle a missing 2D context by returning a texture and use fixed finite parameters; no reachable throwing artwork state was demonstrated. The WebGL construction catch remains. Speculative allocation failure does not justify new recovery state/branches.
  - `[medium]` `[patch]` B2: Frozen floating outputs demand last-bit portability — exact comparisons impose stronger cross-runtime numerical identity than the model contract; applied 1e-10 AU/1e-9 km/s tolerances while retaining exact dates/constants and unchanged fixtures.
  - `[low]` `[patch]` B3: Mapping comparison is tautological — both sides call the current mapper; replaced with independent magnitude/direction expectations from the documented formula and scene axis convention.
  - `[false]` `[reject]` B4: Browser card coverage advertises an untested complete planet cross-product — the spec explicitly calls this representative card wiring, and the evidence separately describes full deterministic cross-product and browser planet/speed/quality coverage. main.ts physical-card inputs depend on body/date, not quality or speed; all eight bodies and each tier/speed are exercised. No claimed full browser planet cross-product exists.
  - `[medium]` `[patch]` B5: Galactic-retention browser case need not advance playback — aria-pressed alone can pass before a frame; Added a date-advance wait before Back.
  - `[medium]` `[patch]` B6: Lazy Galaxy corona behavior lacks direct assertions — Added passing observable scale checks across clamp, reduced motion and hidden/reentry time anchors without altering original behavior.
  - `[low]` `[patch]` B7: Invalid-interval coverage only tests zero at startup — Added duplicate/backward samples after valid sampling and retained the exact180-valid-sample threshold; no policy change.
  - `[medium]` `[patch]` B8: Benchmark snapshots miss mid-window interruptions — headed observation can be hidden and restored between snapshots; Added lifecycle/context recording and per-frame playing/presentation/layer validation, rejecting interrupted runs; final measured run had zero interruptions.
  - `[medium]` `[patch]` B9: Benchmark records only ending tier — auto adaptation may occur inside future observation windows; Added starting/observed tiers and transition recording; final measured window observed high only. Grouped with B8 as the snapshot-only workload recording defect.
  - `[low]` `[reject]` B10: Reports lack bundle fingerprints and an inventory generator — these are dated historical story measurements; inventory already identifies content-hashed emitted JS/CSS, exact response sets and unambiguous per-response gzip method, and root matched all rebuilt bytes. Misreading later snapshots as current is unlikely; a new generator/provenance pipeline adds complexity beyond a direct correction.
  - `[medium]` `[patch]` G1: Owner-only tests miss scene cleanup delegation — pre-verified gap: the real scene's pagehide disposal can omit Galaxy textures/Sprite resources while stubbed tests pass. Added passing real-owner scene-boundary assertions for two textures, Sprite/material/geometry exactly-once release and detached/cleared root.
  - `[false]` `[reject]` I-workflow: Diff cannot prove the earlier batch/workflow/history — separate runs and canonical local commits 7d21d936d2e5ffe40de9f11e76eb25d41e11dc5b, c147520e64fc3b1e9be5834c1290b46ebfe766b6, e85e48c043c3a16c8cbafa36eb615e2ee0f42af3 and c7ca33e5bdaf8e5d686d433fd79fecebb421f7f4 supply that evidence; this is deliberately only the final increment. No push/deploy action was performed.
  - `[medium]` `[defer]` I-device: Laptop/synthetic evidence does not establish physical-phone recovery — true unavailable-hardware limitation, recorded in the single deferred list and release evidence; no fabricated pass.
  - `[medium]` `[defer]` I-Safari: Automated WebKit cannot satisfy manual Safari AC3 — true unresolved acceptance requirement, recorded as the terminal blocker; no native UI host is available.
  - `[false]` `[reject]` I-science: Frozen comparisons do not independently establish accuracy — AC4 requires preservation; independent J2000 reference checks remain, and the new fixture explicitly disclaims independent truth. No accuracy claim is made.
  - `[false]` `[reject]` I-handler: DOM card activation does not prove pointer reachability — this test is explicitly a card-wiring check. Retained real mouse/touch/keyboard/Focus/Follow tests provide interaction evidence; it does not claim to replace those surfaces.
  - `[false]` `[reject]` I-production: Local built smoke is not remote deployment evidence — remote deployment is expressly excluded by user intent, and evidence explicitly labels local compression/build scope; no deployed transfer or CI pass is claimed.
  - `[medium]` `[defer]` I-closure: Outstanding Safari means implementation is not acceptance-complete — same root cause as I-Safari; final status remains blocked on AC3, with reviewed implementation preserved locally.

## Design Notes

This final integrated story may correct exposed pre-existing contract holes (lazy Galaxy, null preferences) without rebuilding the product. All numerical scientific behavior is frozen before metadata work. The metadata source additions describe existing constants, not a new model; preserve original source dates for previously recorded data and use truthful new retrieval dates for newly checked metadata. Native UI host is unavailable, so no claim of manual Safari validation is authorized. AC1/AC9 allow honestly outstanding measurements; complete all concrete code/evidence first and distinguish implementation verification from release approval. No new images are necessary.

## Verification

- `npm run check` — typecheck/lint/deterministic tests and fresh production build pass; baseline numerical fixtures unchanged.
- `npm run test:e2e -- --workers=3 --reporter=line` — complete Chromium/Firefox/WebKit regression including built bundle passes with documented unsupported-input skips only; new matrix cases must actually run.
- `git diff --check` — no whitespace errors; inspect CI build prerequisite and unchanged Firefox/Xvfb coupling.
- Run standalone local benchmark on fresh built output with no concurrent browser suite, record actual launched browser/backend and interval statistics; run/record automatic-quality evidence separately. Unavailable phone/currentSafari checks stay explicitly unverified.
- Measure per-response gzip level9 or another named method; record critical and complete runtime sets including deferred resources, assert approximately3MB/15MB budgets and actual built subpath/local-resource behavior. No raw-dist or deployed-negotiation claim.
- Audit all13 companion acceptance rows against named passing tests/visual artifacts and recorded manual limitations; inspect relevant new fallback/phone/production visuals. No claim of measured visitor learning or release/deployment approval.

## Auto Run Result

Status: blocked

Blocking condition: Story 1.6 AC3 requires a current Safari manual acceptance check. The native browser host returned no usable apps/browsers and configuration/network-policy errors, so that requirement cannot be completed here. Automated WebKit does not satisfy it. Per the user's stop/report instruction, do not mark Story 1.6 done or claim release acceptance. Sprint status remains review; Epic 1 remains in progress. Reviewed implementation and evidence are preserved in a local commit, without push or deployment.

Implemented: deferred Galaxy artwork with stable anchors and explicit resource ownership, validated four-field stored preferences including explicit motion overrides, sourced conversion/periodic units without numerical model changes, independent browser-job build prerequisite, actual automatic-adaptation integration and complete scientific/product/fallback regressions. Added reproducible local laptop measurement and the complete acceptance evidence map. No production code changed during review fixes.

Files changed:

- `.github/workflows/deploy.yml` — build dist within the independent browser-smoke job; preserve Firefox-headed/Xvfb and pinned actions.
- `docs/PRD.md`, `docs/SCIENCE.md` — integration behavior, preference precedence, source units and explicit verification limits.
- `src/main.ts` — parse unknown storage once, retain allowlisted wiring and respect explicit reduced-motion false.
- `src/interface/preferences.ts`, `preferences.test.ts` — pure allowlist boundary and malformed/unknown/valid field checks.
- `src/astronomy/solar-system.ts` — typed, sourced existing conversions and separate Table 2b units, with unchanged values.
- `src/astronomy/heliosphere-regression.test.ts` — frozen three-date/origin/speed/quality science, independent display expectations and metadata preservation with negligible portable numerical tolerances.
- `src/experience/experience-state.test.ts` — retain nonzero inactive Galactic progress and speed through Heliosphere playback/Back.
- `src/rendering/galaxy-presentation.ts`, `orbital-scene.ts` — lazy procedural owner and scene disposal delegation.
- `src/rendering/galaxy-presentation.test.ts`, `orbital-scene.test.ts` — allocation/reentry/corona behavior, real-owner scene cleanup and actual adaptation into reduced renderer load with preserved mapping/cadence.
- `src/rendering/adaptive-quality-monitor.ts`, `adaptive-quality-monitor.test.ts` — reject nonfinite input and verify existing threshold/invalid/manual/fast sample policy.
- `tests/app.spec.ts` — real monitor-to-main adaptation path and deterministic delayed-frame clock setup.
- `tests/integration-1-6.spec.ts` — actual fixed-date rounded cards, preferences, fallback/Sources, full tour/error/speed flow and observed nonzero Galactic isolation during playback.
- `scripts/measure-heliosphere.mjs` — standalone built-site benchmark with bounded observation, continuous workload/quality validation and failure diagnostics.
- `story-1-6-environment.md`, `story-1-6-science-baseline.json` — truthful host/source context and immutable pre-story numerical regression fixture.
- `heliosphere-release-evidence.md`, `heliosphere-transfer-inventory.json`, `heliosphere-laptop-benchmark.json`, `heliosphere-benchmark-initial-invalid.json` — nine AC and thirteen companion rows, exact response sets, actual valid laptop results and preserved invalid first observation.
- This spec and `sprint-status.yaml` — review disposition, external acceptance blocker and implementation handoff.

Review disposition: eighteen findings individually logged. Seven patch entries applied (five medium, two low; eight individual findings), two external verification entries deferred (three findings), and seven findings rejected (six false and one low) with specific reasons in the triage log. No intent-contract amendment or code re-derivation was required. The Safari requirement is clear; its external verification surface is unavailable.

Follow-up review recommendation: true. This first pass patched five medium entries. The specific remaining risk is native Safari graphics/input behavior and physical-device performance, which browser-engine automation and the local laptop benchmark cannot establish. The required Safari manual check blocks acceptance.

Final verification:

- `npm run check` — PASS after all review fixes: typecheck, ESLint,203 tests in17 files and fresh production build. Existing Vite large-chunk advisory remains; compressed delivery is measured separately.
- `npm run test:e2e -- --workers=3 --reporter=line` — PASS after all review fixes:257 passed,10 documented pre-existing skips,267 total in5.4 minutes; no new case skipped. Chromium, Firefox and WebKit include the built repository-subpath smoke and all eight spec matrix scenarios' available automated checks.
- `env BENCHMARK_DPR=2 node scripts/measure-heliosphere.mjs` — PASS separately from the browser suite: Chrome156.0.8078.74 headless, M4 Pro Metal,1440×900 CSS/2880×1800 canvas, all layers and playback, auto/high only,10-second warmup and30.0154-second observation.1801 intervals average60.0025FPS; windows60.0000–60.0098FPS; all1802 checked frames valid, no interruptions/errors/quality transitions. This is a local laptop observation only.
- Fresh-build gzip9 inventory — PASS:844655 critical bytes and1517399 complete bytes across ten runtime responses; checked every rebuilt response against the inventory. Excludes unrequested source maps; no deployed-encoding claim.
- Matrix/source/ownership/persistence audit — all eight matrix rows mapped to executed tests/measurements and unavailable-device records; all thirteen companion rows mapped. Inspected phone sheet/overview, fallback Sources and built-site overview captures as layout evidence, never pixel snapshot assertions.
- `git diff --check`, frontmatter YAML/deferred-list parsing and immutable intent comparison — PASS at final handoff.

Residual limits: required manual Safari acceptance is blocked; physical-phone usability/FPS and current Edge remain unverified. Remote CI, deployment/encoding negotiation and visitor learning were not observed. Intentional scientific/rendering approximations remain those disclosed in SCIENCE; no coefficient, physical value, clock or frozen fixture was changed. No push or deployment occurred.
