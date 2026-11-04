---
title: 'Keep play and other control clicks working in Safari during playback'
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

**Problem:** After the CI timeout fix (2d9d4d227f06d3282b506528aadce5c12d7ed446), run 41848112700 passed Chromium and Firefox. WebKit `tests/app.spec.ts:157` still ran out its 180s budget in `settledBoundingBox`, because playback was running when the test had paused it (failure screenshot: ‖ shown, date May 2040). Recorded events showed that the pause press delivered `pointerdown` and `pointerup` but no `click`. During playback, `AppInterface.render` runs every 100ms and rewrites button text (`playIcon.textContent = …`) even when it is unchanged, which replaces the text node under the pointer. WebKit drops a click whose pressed node is replaced before release. Real Safari users therefore lose Pause, Return to Today, Follow, Replay and tour Continue clicks that span a render. A held-press probe fails 5/5 in WebKit and passes in Chromium and Firefox.

**Approach:** Write control text in `render` only when it changes, through one helper, at every button text write inside the periodic render. Add a cross-engine Playwright regression test that holds a Pause press across interface renders. Decision: the user chose to diagnose the remaining CI failures and fix their root cause. Pushing to `fix/browser-ci-reliability` for CI verification is approved.

</frozen-after-approval>

## Implementation Notes

- Diagnosis (diagnosing-bugs): CI artifacts showed playback running after the test's pause click. A temporary probe after `tests/app.spec.ts:177` reproduced it under WebKit load (about 1–3% at 24–32 workers). Recorded events showed `pointerdown`/`pointerup` on the play toggle's child span with no `click`. Holding the press for 250ms during playback failed 5/5 in WebKit and passed in Chromium and Firefox; a visibility-flicker pause was ruled out.
- Changed: `src/interface/app-interface.ts` adds the `setControlText` helper, used for today-button (×2), the play icon, follow-planet, replay-button and tour-next. `tests/app.spec.ts` adds a regression test that holds Pause until `#current-date` changes (proof of a render) and asserts all five control text nodes survive. With the fix reverted it fails in all three engines; with the fix it passes 9/9.
- Verification: `npm run check` passed. WebKit test 157 under stress (`CI=1`, repeat 200, 32 workers) passed 200/200. Full local `CI=1` e2e passed (317 passed, 10 skipped). The temporary `[DEBUG-p4u5]` probe was removed (grep is clean). The `__heliosphereDiagnostics` recorders predate this branch (e85e48c, on main) and stay.

## Review Triage Log

- The regression test's fixed 250ms hold may contain no render on slow CI — medium, patched: it now holds until `#current-date` changes.
- Only the play toggle was covered — low, patched: the same test asserts text-node identity for all five controls in every engine.
- `#scene-status`/`#explain-copy` `innerHTML` is rewritten every render (aria-live re-announcement, lost selection) — medium, deferred: pre-existing and outside this change; recorded in deferred-work.md.
- The spec is unfinished / debug recorders were left in — false: the spec is completed at finalize, and the recorders come from Story 1.4 (e85e48c) on main.
