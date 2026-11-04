---
title: 'Run WebKit browser tests at device scale factor 1'
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

**Problem:** After the dev-server fix (f7db843a41d370673c2073e0adf57523456ccd5c), CI run 41707722384 passed Chromium and Firefox. The WebKit job still failed: 2 tests hit the 90s timeout (`tests/app.spec.ts:1904` and `tests/integration-1-6.spec.ts:41` interior from space at balanced) because the page stopped delivering animation frames, so click stability and `settledBoundingBox` never resolved. Playwright's `Desktop Safari` device uses `deviceScaleFactor: 2`; Chrome and Firefox use 1. The default High quality caps pixel ratio at 2, so CI WebKit renders 4× the pixels in software WebGL, and its job is the slowest (40.9 of 45 minutes).

**Approach:** Override `deviceScaleFactor: 1` for the `webkit` Playwright project in every environment, matching the other engines. Change only test configuration, not the app. Decisions: the user chose DPR 1 everywhere over a CI-only override, approved resolving the deferred software-WebGL timeouts here, and approved pushing to `fix/browser-ci-reliability` for CI verification.

</frozen-after-approval>

## Implementation Notes

- `playwright.config.ts`: the `webkit` project spreads `Desktop Safari` and then sets `deviceScaleFactor: 1`. `docs/agents/testing.md` documents the override as a render-cost mitigation, not a proven root cause.
- No test asserts DPR-specific behavior. Vitest covers the pixel-ratio clamp (`src/rendering/orbital-scene.test.ts:271-294`).
- Restored `spec-browser-ci-preview-instrumentation.md` from HEAD (its working copy had been emptied), marked it done, and recorded the CI result.
- Verification: `npm run check` passed. Local `CI=1 npx playwright test --project=webkit` passed (104 passed, 4 skipped, 3.1m). macOS uses hardware GL, so the local run cannot reproduce the Linux software-WebGL stall; CI must confirm. The stall is intermittent, so a single green run is weak evidence.

## Review Triage Log

- Blind: "DPR is stated as the proven cause, but Chromium at 1x also stalled" — medium, patched: the config comment and docs now describe a cost mitigation, and the Chromium stall is deferred.
- Blind: "4x is wrong for the balanced case" — low, patched with the same rewording ("up to 4x at High quality").
- Blind: "deferred-work.md not updated; Chromium timeouts unowned" — medium, deferred: appended a new entry (existing entries are append-only).
- Blind: "the preview spec Result line overstates the handoff" — low, patched: it now names only the WebKit cases and notes that the Chromium ones remain deferred.
- Blind: "the new spec lacks Code Map/Tasks/AC/baseline" — false: the oneshot route deletes those sections by design.
- Blind: "no pass criterion for intermittent failures" — low, recorded in the notes above and in the handoff. It needs several green CI runs, which cannot be checked locally.
- Blind: "no browser test runs above 1x" — low, rejected: the user chose DPR 1 everywhere, no e2e test asserted DPR behavior before, and Vitest covers the clamp.
