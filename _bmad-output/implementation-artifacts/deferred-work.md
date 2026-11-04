
- source_spec: `_bmad-output/implementation-artifacts/spec-heliosphere-cloudy-envelope.md`
  summary: Unverified medium risk — profile cloudy envelope rendering on physical phones before deciding whether cloud shader detail needs quality tiers.
  evidence: Five procedural shells add fragment work; pixel-ratio adaptation reduces workload and standalone Apple M4 Pro desktop/phone-viewport runs held 60 FPS at high quality DPR2. Physical-phone frame timings would settle remaining hardware risk.
- source_spec: `_bmad-output/implementation-artifacts/spec-browser-ci-preview-instrumentation.md`
  summary: Intermittent 90-second Playwright timeouts in heavy Heliosphere scenes under Linux software WebGL on GitHub-hosted runners; out of scope for the dev-server fix.
  evidence: Run 41697888625 (dbe5664, `vite preview`) had, besides 10 deterministic `undefined`-hook failures per engine, ordinary-action timeouts in Chromium (`tests/app.spec.ts:1904` mouse orbit/pan/zoom, `tests/app.spec.ts:1969` cloudy envelopes upper/lower views) and WebKit (`tests/integration-1-6.spec.ts:41` frozen actual cards — endpoint/high, interior/balanced, interior/low, all from sun). Earlier dev-server run 41642352789 (1d16a4b) showed 15 failures over 2.0h. The page intermittently stalls, so actions such as `locator.click` exceed the 90s test timeout.
- source_spec: `_bmad-output/implementation-artifacts/spec-browser-ci-webkit-dpr.md`
  summary: Intermittent software-WebGL frame stalls can still time out Playwright cases in Chromium (already 1x), which the WebKit-only deviceScaleFactor change does not address.
  evidence: Run 41697888625 timed out Chromium `tests/app.spec.ts:1904` and `:1969` at deviceScaleFactor 1; run 41707722384 passed Chromium, so the stall is intermittent. Several consecutive green browser-smoke runs, or a CI `--repeat-each` of those cases, would show whether it persists.
- source_spec: `_bmad-output/implementation-artifacts/spec-webkit-control-click-during-playback.md`
  summary: `AppInterface.render` still rewrites `#scene-status` (aria-live polite) and `#explain-copy` via `innerHTML` on every 100ms playback render, even when the markup is unchanged.
  evidence: `src/interface/app-interface.ts` scene-status and explain-copy `innerHTML` assignments run on each render. This is pre-existing and not caused by the control-text fix. A screen reader (VoiceOver/Safari) may re-announce the status during playback, and text selection in an open Explain panel is lost. Unverified: a VoiceOver check during playback would confirm the re-announcement.
