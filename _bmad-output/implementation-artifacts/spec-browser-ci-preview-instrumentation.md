---
title: 'Run browser tests on the dev server only'
type: 'bugfix'
created: '2026-11-03'
status: 'done'
baseline_commit: 'dbe5664c804a176bec2f6256a69f16781f2df631'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/agents/testing.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Run 41697888625 failed in all three browser-smoke matrix jobs. Commit dbe5664c804a176bec2f6256a69f16781f2df631 made CI serve the bundled `dist/` through `vite preview`. Eleven `tests/app.spec.ts` cases inject instrumentation by intercepting `**/src/rendering/*.ts*`, and those requests exist only on the Vite dev server. Their window hooks stay `undefined`, so 10 cases fail identically in every engine. A separate pre-existing problem also appeared in the earlier dev-server run (41642352789): heavy Heliosphere scenes intermittently stall the page under Linux software WebGL, so ordinary actions hit the 90-second limit (2 Chromium cases and 3 WebKit cases here; 15 failures over 2.0h there).

**Approach:** Run every browser test, locally and in CI, against the Vite dev server only. Nothing runs against the production build.

**Decisions:** Scope is the preview regression only. The intermittent software-WebGL timeouts are out of scope and are recorded as deferred work. Pushing to `fix/browser-ci-reliability` to verify on CI is approved.

## Boundaries & Constraints

**Always:** Keep every existing behavioral and scientific assertion. Keep the Firefox/Xvfb settings coupled as `docs/agents/testing.md` describes. Local and CI runs use the same dev-server command. Update `docs/agents/testing.md` in the same change.

**Never:** Do not ship test hooks in the production bundle. Do not change orbital math or rendering behavior to make tests pass. Do not delete or `skip` failing cases.

</frozen-after-approval>

## Code Map

- `playwright.config.ts` -- `webServer` switches dev/preview on `CI` (lines 29-36); restore the single dev command from before dbe5664 (`npm run dev -- --host 127.0.0.1 --port 4173`). Keep the trace/screenshot settings.
- `tests/app.spec.ts:20` `observeHeliosphereRender` -- routes `orbital-scene.ts`; used by cases at 157, 233, 269, 313, 345, 552 (×2), 646, 1969, 2233.
- `tests/app.spec.ts:472` -- own route for `orbital-scene.ts` (`__regionGpuDrift`).
- `tests/app.spec.ts:2235` -- routes `adaptive-quality-monitor.ts`.
- `tests/app.spec.ts:121,146` -- helpers that read `__heliosphereRender` / `__heliosphereSky`; do not change. No test changes needed once the dev server is used.
- `.github/workflows/deploy.yml:45-76` -- browser-smoke matrix. Its `npm run build` step predates dbe5664 and stays (build check only; no test uses `dist/`).
- `docs/agents/testing.md` "CI and deployment" -- documents the preview switch.

## Tasks & Acceptance

**Execution:**
- [x] `playwright.config.ts` -- use the dev server unconditionally; drop the preview branch and its comment -- source-intercepting cases need unbundled modules, and the user wants no tests on the production build.
- [x] `docs/agents/testing.md` -- replace the preview sentence: Playwright always serves the Vite dev server, because tests intercept `/src` modules.
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- record the out-of-scope software-WebGL timeouts with run evidence.

**Acceptance Criteria:**
- Given `CI=1`, when the 11 instrumented cases run in each engine, then none fails with `undefined` hooks or the `__regionGpuDrift` poll timeout.
- Given any environment, when Playwright starts its web server, then it runs `vite` (dev), never `vite preview`.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm run check` -- expected: pass.
- `CI=1 npx playwright test tests/app.spec.ts -g "<instrumented cases>"` (all three projects) -- expected: pass.
- Push to `fix/browser-ci-reliability`; the 10 deterministic `undefined`-hook failures are gone in all three matrix jobs.

**Result:** CI run 41707722384 (f7db843a41d370673c2073e0adf57523456ccd5c): Chromium and Firefox passed; WebKit had 102 passed and no `undefined`-hook failures. Its 2 remaining failures were software-WebGL timeouts (`tests/app.spec.ts:1904`, `tests/integration-1-6.spec.ts:41` interior from space at balanced). `spec-browser-ci-webkit-dpr.md` addresses the WebKit cases; Chromium timeouts from run 41697888625 remain deferred.
