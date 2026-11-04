---
title: 'Size the CI Playwright timeout for software-rendered Heliosphere tests'
type: 'bugfix'
created: '2026-11-04'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/docs/agents/testing.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Browser-smoke jobs keep failing with 90s test timeouts in Heliosphere tests, and the failing set changes every run. Run 41838314868 (30d26fb2175e75f5c97506f6785cd0f6ab0d3064) failed Chromium `tests/app.spec.ts:157`, `:1904`, `:1969` and WebKit `tests/integration-1-6.spec.ts:41` (interior/sun/balanced, endpoint/sun/high), after WebKit `deviceScaleFactor: 1` had been applied. Its HTML reports show these are budget overruns, not hangs. WebKit `app.spec.ts:1904` passed at 85.8s, and about ten other Heliosphere tests pass at 50–86s. Locally (SwiftShader, 14 cores) the same tests take 4–20s. CI software WebGL is about 5x slower per frame, and actionability checks, screenshots and `settledBoundingBox` all wait on frames.

**Approach:** Raise the CI per-test timeout to 180s (about double the slowest observed pass). Remove the hard-coded `test.setTimeout(90000)` in `tests/integration-1-6.spec.ts`, which would override it; the split per-quality cards take about 4s locally. Raise the browser-smoke job timeout from 45 to 60 minutes, because Chromium already uses 38.5 minutes. Keep WebKit `deviceScaleFactor: 1` for its run-time saving, and correct its documented rationale. Decisions: the user chose to diagnose before mitigating and to keep DPR 1. Pushing to `fix/browser-ci-reliability` for CI verification is approved.

</frozen-after-approval>

## Implementation Notes

- Diagnosis (diagnosing-bugs): a local probe confirmed Playwright headless Chromium uses SwiftShader. Frames take about 33ms in the solar view and 83ms in the Heliosphere (14-core Mac), and 133ms at DPR 2. HTML reports extracted from run 41838314868 artifacts showed passing Heliosphere tests at 50–86s and failures cut at 90–93s, one continuous distribution. Failure screenshots render normally, so the hypothesis of a main-thread hang was rejected. The same failing tests take 17–20s locally (card tests about 4s).
- Changed: `playwright.config.ts` (CI `timeout` 180s, CI `globalTimeout` 55 min, corrected DPR comment); `tests/integration-1-6.spec.ts` (removed `test.setTimeout(90000)`); `tests/app.spec.ts:1443` (`Math.max(test.info().timeout, 120_000)`); `.github/workflows/deploy.yml` (browser-smoke `timeout-minutes: 60`); `docs/agents/testing.md`.
- No correct regression-test seam exists: the failure depends on CI runner speed. `docs/agents/testing.md` now documents the budget rule instead.
- This supersedes the DPR-as-stall-cause rationale in `spec-browser-ci-webkit-dpr.md` and the Chromium stall entry it deferred.
- Verification: `npm run check` passed. Local `CI=1` `tests/integration-1-6.spec.ts` passed in all three engines (87 passed). The three `explores Sun’s Gravity` cases passed. Whether 180s covers the cut-off tests needs CI to confirm.

## Review Triage Log

- `app.spec.ts:1443` `setTimeout(120_000)` is now below the CI default — medium, patched with `Math.max(test.info().timeout, 120_000)`.
- `test.slow()` at `app.spec.ts:348` gives 540s in CI — low, kept: Chromium CI passed it at 213s, so it needs more than 180s. The docs now note the multiplier.
- The job could be killed before the HTML report is written — medium, patched with a CI `globalTimeout` of 55 min, below the 60-min job limit.
- No measured duration for the cut-off tests — maybe-false: local runs give about 17–20s × 5 ≈ 85–100s. CI will settle it.
- The spec's Implementation Notes are empty — false: they are filled in at finalize.
- Docs "50-90s" vs config "50-86s" — low, patched to 50-86s.
- The docs dropped the stall caveat — low, patched.
