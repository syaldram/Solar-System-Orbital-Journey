---
title: 'Repair browser CI failures'
type: 'bugfix'
created: '2026-11-03'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

Repair the browser-smoke failures in run 41532528151: deterministic automatic-quality coverage, accurate marker comparison, accessible phone toolbar, and bounded long-running test scenarios. Preserve scientific calculations and existing behavioral assertions. Retain failure diagnostics in CI so future failures are reviewable.

</frozen-after-approval>

## Implementation Notes

- No unresolved product choices or irreversible actions. Scope is existing CSS, browser tests/configuration, CI artifact retention, and this implementation record. No dependency or scientific-contract changes.
- Baseline: main at 20c96784e73bd8b566a2e2cd1d156dc10c50c13c; clean working tree. CI reported 12 failures, including three adaptation failures and a WebKit offscreen toolbar. Identical PR tree had 24 failures.
- Verification uses Node 24.22.2 and npm 11.20.0. Local engine coverage cannot establish Linux runner performance or manual Safari support.
- Reproduced the 390px toolbar overflow in WebKit and Chromium: options occupied x=372.578125 through 412.578125. Compact mobile branding and a constrained grid now keep it within both 320px and 390px viewports. Reused the accessible Home label and brand icon.
- Confirmed browser-dependent CSSOM precision: assigning 12345.672448606396px serialized to 12345.7px in Chromium and 12345.672449px in WebKit. Marker comparisons now serialize expected coordinates through the same browser before exact comparison.
- Automatic-quality browser coverage primes the original monitor clock and feeds its real 180-sample policy a controlled slow window at the next scene sample. Callback dispatch, renderer density, phase/mapping and region controls remain in the integration path; policy unit tests retain sample-by-sample coverage.
- Split physical-card cases by quality while preserving the original planet distribution across all date/origin/quality/speed combinations. Added a short same-session high/balanced/low transition check. Travel evidence advances the controlled clock between stage captures and delivers real frames at each checkpoint, preserving all lifecycle assertions.
- CI records failure traces/screenshots and uploads reports/results on failure or cancellation. A full local run with continuous tracing exceeded two existing Chromium 30-second limits and was stopped (19 passed, 297 not run, exit 130); CI-only tracing avoids imposing that recording cost on local defaults. CI already grants 90 seconds per test. The stopped run successfully produced screenshot and trace diagnostics.
- Initial focused browser run: 69/69 passed across all three engines. Full check passed: typecheck, ESLint, 205 unit tests, production build (existing bundle-size advisory). Final full browser verification pending.
- Complete browser run with final application/configuration changes: 311 passed, 10 existing skips, and three failures in the newly added transition assertion (7.2 minutes). All original failure scenarios passed. The new assertion compared CSS-transformed `innerText` labels against raw DOM text; replaced it with comparisons of the three nonempty physical-value fields. Final typecheck and lint passed after that correction. The corrected case is included for all engines in the final CI-mode focused run.
- Final CI-mode focused verification: 33/33 passed in 3.0 minutes with `CI=1`, one worker, 90-second defaults and `retain-on-failure` tracing. Includes all three corrected transition cases, phone actionability, the two previously tracing-sensitive tests, original marker/adaptation/travel failures and a physical-card case in every engine. Across the full run and corrected-case rerun, all 314 applicable browser cases are verified; 10 existing skips remain. No further application changes followed the full run.
- Review findings are all addressed; nothing deferred. `git diff --check` passed. No new scientific approximations. Verification ran on macOS (including headless Firefox), not Linux/Xvfb; remote job execution and artifact upload on GitHub remain unverified until push. No push or deployment performed.

## Review Triage Log

- Low, patched: viewport assertions alone do not prove pointer actionability. Added trial clicks for each visible phone toolbar control at 320px and 390px.
- Medium, patched: splitting the physical-card matrix removed its same-session quality transitions. Added a focused transition case asserting selected Earth, unchanged physical values/date, and paused playback across high/balanced/low.
- Low, patched: failure-only artifact upload omitted canceled jobs. Included cancellation in the upload condition; abrupt runner termination may still prevent uploads.
