---
title: 'Story 1.5 — Restrained Milky Way background'
type: feature
created: '2026-10-29'
status: done
baseline_revision: e85e48c043c3a16c8cbafa36eb615e2ee0f42af3
review_loop_iteration: 0
followup_review_recommended: true
context:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/specs/spec-Solar-System-Orbital-Journey/heliosphere-presentation.md
  - docs/PRD.md
  - docs/SCIENCE.md
  - docs/agents/architecture.md
  - docs/agents/testing.md
  - ASSET_CREDITS.md
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** Heliosphere currently has an empty dark background, missing the quiet Milky Way context requested by Story 1.5.

**Approach:** Add faint diagonal Milky Way artwork and sparse dim distant stars behind the cutaway, reduce star density for phones/lower quality, and verify visible clarity, static behavior, ownership and honest explanatory credits.

## Boundaries & Constraints

**Always:** Fulfill all six Story 1.5 criteria. Preserve blue boundary, Sun, eight planet, path and label visibility in the navy/gold/blue aesthetic. Keep background decoration static across idle/playback/phase/reduced motion; deliberate camera movement remains available. Reduce actual rendered star density for phone layout or lower quality, including viewport changes, without altering calculations, mapping, region identities, nesting, 20-second ±2% cadence or semantic access. Keep text/focus/controls readable with Labels on/off. State decorative artwork, no star-by-star coordinates or exact Galactic alignment; preserve illustrative tail disclosure. Rendering owns allocation/reuse/disposal, Interface owns semantic copy. Reuse feature resources across entries, release every owned GPU resource/texture at disposal, and preserve static base paths and roughly 3 MB critical/15 MB total compressed transfer budgets. Update PRD/SCIENCE and scientific/visual credits in the same change; update ASSET_CREDITS for any new imagery, including locally generated visual treatments as appropriate.

**Never:** Add autonomous drift, streaks, camera orbit, time-driven background effects, exact stellar/alignment claims, remote runtime services/resources, new dependencies, persistent feature state or shareable schematic state. Do not attach sky artwork to breathing geometry or region picking. Do not modify other scientific/Gravity/Galaxy presentations' background behavior, physical values, clocks, camera/session/selection/layer semantics. No push/deploy. The external reference image need not be bundled; final real-device release evidence belongs to Story 1.6, but background acceptance and relevant tests finish here.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Overview | Desktop high-quality Heliosphere | Actual faint diagonal band and sparse dim stars behind readable bodies/boundaries/paths/labels | No misleading exact orientation claim |
| Static artwork | Idle, Play, retained phases, reduced motion, settled camera | Geometry/materials/background placement do not advance autonomously; manual navigation works | No clock input or breathing-parent inheritance |
| Density adaptation | Desktop high/low and phone high; resize across phone threshold | Lower phone/low actual draw density; mapping/regions/nesting/cadence/access preserved | Recompute viewport-dependent density, not DPR inference |
| Semantic clarity | Open cards/Explain, Labels on/off, native focus | Readable controls/text/focus; background and tail disclaimers available semantically | Labels never removes semantic access |
| Resource lifecycle | Repeated entry/Back and scene disposal | One reusable resource set, hidden outside Heliosphere; all owned resources released once | No background picking or retained feature DOM |
| Delivery | Production repository-base build and complete static resource set | Local resources, documented compressed critical/total budgets and honest credits | No remote runtime fetch or raw-dist-size substitution |

</intent-contract>

## Code Map

- `src/rendering/orbital-scene.ts:145,518,680`: constructs roots; generic starField deliberately hidden in Heliosphere. Integrate a sibling background owner and effective quality/viewport inputs. Existing quality cache omits viewport width. Renderer canvas CSS width/resize is the phone seam.
- `src/rendering/heliosphere-background.ts` (new if useful): rendering-only owner for static sky geometry/materials/optional procedural texture, density draw ranges, visibility and disposal. Separate from breathing `HeliospherePresentation.root` and region drawables. No clock/date/phase input is needed.
- `src/rendering/quality-profile.ts`: owns high/balanced/low budgets; add feature-specific counts rather than changing scientific/local stars. Existing phone layout breakpoint is 700 CSS pixels in `src/styles.css`; density must respond on resize at fixed DPR.
- `src/rendering/procedural-materials.ts`: reuse deterministic seededRandom/texture conventions. GalaxyPresentation demonstrates ownership patterns, but its face-on galactic disk is distinct artwork. Material disposal does not release texture maps; explicitly release any new ones.
- `src/rendering/orbital-scene.test.ts`: captures actual scene delivered to renderer; reuse for background static transforms, density integration, visibility/resource reuse and unchanged mapped bodies/regions/phase effects. New owner tests may isolate deterministic resource disposal.
- `tests/app.spec.ts`: actual production render instrumentation is test-only; reuse native controls, per-test screenshots/attachments, settled camera helpers, WebKit Option-Tab convention and rendering-frame waits after layer changes.
- `src/interface/app-interface.ts:64`: HELIOSPHERE_EXPLANATION needs the background disclaimer. `index.html:225` Sources already credits the NASA Milky Way artist concept; extend honestly. `ASSET_CREDITS.md`, `docs/PRD.md`, `docs/SCIENCE.md` record artwork/contract changes.
- `vite.config.ts`: fixed repository subpath. `public/assets/textures/` supplies bundled JPEGs; no transfer-budget script exists. Document gzip critical and complete runtime resource sets, excluding unrequested source maps.

## Tasks & Acceptance

**Execution:**
- [x] `src/rendering/heliosphere-background.ts`, `orbital-scene.ts`, `quality-profile.ts` — implement reusable static background and phone/quality density with explicit ownership, no scientific/camera coupling.
- [x] `src/rendering/heliosphere-background.test.ts` and/or `orbital-scene.test.ts` — verify actual rendered band/stars, no autonomous changes across phases/time/playback, resize/high-low density, unchanged mapping/picking/cadence, resource reuse/visibility and exact disposal.
- [x] `tests/app.spec.ts` — demonstrate desktop/phone/low background and Labels on/off semantic/focus clarity; inspect actual draw counts, static camera/background across elapsed time/playback and deliberate camera movement, repeated sessions and existing interactions. Capture visual artifacts for parent inspection; no GPU pixel snapshot assertions.
- [x] `src/interface/app-interface.ts`, `index.html`, `docs/PRD.md`, `docs/SCIENCE.md`, `ASSET_CREDITS.md` — complete semantic artwork/alignment and source disclosures without endorsement.
- [x] This spec's Auto Run Result — record measured gzip resource sets/budgets, browser/visual verification and honest approximations.

**Acceptance Criteria:**
- Given the integrated background, when visitors inspect desktop/phone/low-quality Heliosphere with Labels on/off, then its actual visible artwork and semantic controls satisfy Story 1.5 AC1–6 and every matrix row.
- Given completed verification, when npm run check and the full browser suite run, then both pass with prior scientific, Gravity, Galactic, timing, session, camera and privacy behavior intact.

## Spec Change Log

## Review Triage Log

### 2026-10-29 — Review pass
- verdicts: 13 findings — high 0, medium 5, low 3, false 5, maybe-false 0
- findings (individual verdicts before grouping; layer reporting order):
  - `[false]` `[reject]` B1: Visual inspection remains unperformed — parent inspected actual desktop high/low, Labels-off focus, phone reset overview/open card and max-zoom captures before review; faint diagonal band, dim sparse stars and readable local artwork were confirmed. Pending handoff wording is finalized after review, not evidence that inspection did not occur.
  - `[medium]` `[patch]` B2: Browser coverage executes Vite source rather than the built repository-base artifact — build/path assertions alone do not execute the minified bundle; added built-dist browser smoke with static local asset paths and real controls, without application API/test-config expansion.
  - `[medium]` `[patch]` B3: Sky browser case enables reduced motion only while paused — added explicit planetary playback with reduced motion on, verify advancing positions/date and unchanged actual background samples.
  - `[low]` `[patch]` B4: Phone-low appearance lacks browser inspection — owner tests cover its count, but added the actual low-phone draw range and readable visual artifact in a focused phone scenario.
  - `[low]` `[patch]` B5: Phone Labels-off clarity lacks its own visual/focus evidence — added phone semantic region/card and visible focus checks with Labels off. This is distinct from the quality variant above.
  - `[medium]` `[patch]` B6: Shader compilation errors can coexist with expected scene objects — captured normal-flow console/page errors before navigation and require none in sky and built smoke tests.
  - `[medium]` `[patch]` B7: Static sample omits child transforms and star material — an independently rotating star child or changing star brightness would evade the existing samples; extended actual artwork transform/material observations. Shared snapshot-observation root cause with G1.
  - `[low]` `[patch]` B8: Maximum star allocation duplicates the quality profile — the quality-tuning caller can request beyond hardcoded capacity; derived allocation/generation from the existing high-quality rendering budget, adding no speculative guard.
  - `[medium]` `[patch]` G1: Static-sky tests omit both artwork children's own orientation/scale — preverified regression gap; compared actual band/star transforms throughout advancing time, playback and reduced state, retaining camera-relative translation checks. Group with B7, including its independent brightness observation.
  - `[false]` `[reject]` I-workflow: Diff does not prove whole-batch orchestration/history — this is the intentionally separate 1.5 checkpoint after local 1.2/1.3/1.4 commits; workflow/tool execution and version history supply that evidence. Story 1.6 follows completion.
  - `[false]` `[reject]` I-visible: Rendering metadata alone does not establish perceived band/clarity — parent separately inspected real browser captures at desktop/phone/low/max-zoom states and confirmed the faint diagonal artwork and readable scene; no GPU snapshot or measured learning claim is made.
  - `[false]` `[reject]` I-readable: Semantic assertions do not measure contrast/perception — parent inspected actual phone card, overview, desktop Labels-off focus and labels, with distinct dark semantic surfaces, text and outlines; the claim describes limits of automated assertions rather than a present readability defect or an absent visual check.
  - `[false]` `[reject]` I-gates: Handoff records parent verification pending — parent independently passed npm run check (111 units), typecheck after test edits, gzip/base assertions, and complete browser gate (197 passed,10 documented skips) before review. Execution output, not source prose, proves these gates; patches receive fresh full verification.
- surviving entries: 7 — medium 4, low 3, all patch. Eight individual patched findings; no intent gap, bad spec or deferred item. Phone-quality and Labels-off gaps remain distinct entries despite one implementation message grouping nearby file edits.


## Design Notes

Exact orientation, material/shader treatment, opacity and star counts are implementation tuning. A small procedural band avoids new downloads; no raster image generation is required. World-fixed distant artwork may change projection through deliberate camera input. Density changes use existing quality policy plus actual CSS viewport size, never a new scientific or persisted state. The background is non-pickable decorative sky, distinct from associated explanatory boundary/flow drawables. Preserve frozen phase reuse and accepted-handoff continuity from Story 1.4.

## Verification

- `npm run check` — typecheck, lint, deterministic tests and repository-base production build pass.
- `npm run test:e2e -- --workers=3 --reporter=line` — complete Chromium/Firefox/WebKit regression passes, with explicit unsupported-input/artifact skips only.
- `git diff --check` — no whitespace errors.
- Measure per-file gzip (named compression level/method), document critical hero/inner-priority set and complete served runtime set with deferred resources; stay below roughly 3/15 MB. Check configured base/local loading and credits.
- Parent inspects desktop/phone/low visual artifacts for diagonal band, restrained brightness, sparse/lower phone stars and readable labels/panels/focus. Report current Safari/physical-device performance as unverified pending Story 1.6; no learning or measured alignment claim.

## Auto Run Result

Implemented a faint diagonal Milky Way shader band and sparse dim seeded stars, with a camera-centered translation and fixed sky orientation. The separate sky owner never inherits breathing or receives a clock/phase. Its early opaque, depth-free draws stay behind local artwork at maximum zoom/pan. Actual density uses the existing high/balanced/low budget and a 45% phone-layout factor at ≤700 CSS pixels, recomputed on resize. Geometry/materials are allocated once, reused across sessions, hidden outside Heliosphere, and disposed once. No image download, runtime service or dependency was added.

Files changed:
- `src/rendering/heliosphere-background.ts` and its tests — deterministic static sky, quality-derived capacity, phone draw range and complete resource ownership.
- `src/rendering/orbital-scene.ts` and its tests — sibling sky integration, camera-relative placement, resize density, actual child transform/material stability, scientific mapping preservation and disposal.
- `src/rendering/quality-profile.ts` — feature-only star budgets; other presentations' budgets remain unchanged.
- `tests/app.spec.ts` — desktop/phone/high/low/Labels/focus captures, reduced-motion planetary playback, child/material observations, shader/page-error checks, max-zoom and repeated-session coverage.
- `tests/production-smoke.spec.ts` — executes built dist bytes under the configured browser origin/subpath, with no Vite source hook; real controls, local hashed assets, disclosures, error checks and browser-specific persisted captures.
- `src/interface/app-interface.ts`, `index.html`, `docs/PRD.md`, `docs/SCIENCE.md`, `ASSET_CREDITS.md` — decorative-artwork/alignment disclosures and truthful visual source credits without endorsement.
- This spec and sprint tracking — completion, review and verification evidence.

Review: four independent layers, 13 individual findings. Eight findings patched through seven entries (4 medium,3 low); none deferred. Rejected five findings: parent had already visually inspected the real artifacts; whole-batch/history evidence lives at execution/history surfaces; parent separately confirmed visible artwork and semantic readability; command output proved the pre-review gates despite pending handoff prose. Every finding has its own verdict/evidence above. Follow-up review recommended **true** because four medium entries were patched; specific unverified risk is current Safari/physical-device GPU and release performance behavior beyond headless Chromium/Firefox/WebKit evidence.

Verification:
- `npm run check` passed: typecheck, lint, 111 unit tests in 13 files and production repository-base build. Existing Vite chunk-size advisory remains informational.
- Fifteen focused cross-browser sky/built-smoke checks passed after review; built smoke rerun passed all 3 browsers after durable screenshot output was added.
- `npm run test:e2e -- --workers=3 --reporter=line` passed: 206 passed, 10 documented skips, 216 total cases across Chromium/Firefox/WebKit (4.8 minutes). Skips cover unsupported Firefox touch, non-Chromium CDP and duplicate visual captures; every new sky/built smoke case ran.
- `git diff --check` passed.
- Parent inspected actual desktop high/low, Labels-off focus, phone high reset overview/open card, phone-low Labels-off focused card and max-zoom/panned images. It also inspected built-bundle Chromium and WebKit overview captures: faint diagonal band and sparse dim stars remain behind readable nested cutaway, Sun/eight planets, paths, labels and controls. No GPU snapshot assertions or measured visitor-learning claims were used.

Compressed delivery assertions passed on the fresh build using per-file Python `gzip.compress(..., compresslevel=9, mtime=0)`, excluding unrequested source maps. Critical hero/inner-priority set: index.html, main CSS/JS, Mercury/Venus/Earth/Mars JPEGs — **844,028 bytes (0.844 MB)**, below roughly 3 MB. Complete runtime set adds deferred Jupiter/Saturn/Neptune JPEGs — **1,516,772 bytes (1.517 MB)**, below roughly 15 MB. Procedural Uranus/galaxy/sky add no resource responses. This measures compressed artifact representations, not raw dist size or deployed HTTP negotiation. Built smoke executes those actual files at `/Solar-System-Orbital-Journey/` and rejects unexpected origins or source-module requests.

Per-file gzip9 bytes: index.html5,416; assets/index-DAeXoU4r.js171,450; assets/index-D4cNgOe8.css5,501; Mercury114,291; Venus176,178; Earth231,202; Mars139,990; Jupiter211,772; Saturn263,407; Neptune197,565. Hash identifies the measured build.

Matrix audit: overview/semantic clarity and all layout variants are covered by real browser controls plus visual inspection; static artwork by actual root/child/material snapshots through time, playback and reduced-motion playback; density by owner/integration cases and fixed-DPR browser resizing including phone-low; lifecycle by owner/scene disposal and actual max-zoom/Back/reentry resource identity; delivery by successful built-bundle smoke, local-resource checks and gzip/base-path assertions. All covering tests ran and passed; documented unsupported-input and duplicate-artifact skips do not cover these new cases.

Intentional approximations/residual risks: star placement, band orientation and dust shading are arbitrary decorative choices, unrelated to stellar coordinates or Galactic/tail alignment. Current Safari and representative physical-device FPS checks remain unverified for Story 1.6. No push or deployment occurred.
