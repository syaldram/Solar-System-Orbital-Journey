# Testing, CI, and deployment

## Choosing a test

- **Vitest** (`src/**/*.test.ts`): behavior verifiable without a browser. Astronomy and state tests stay deterministic: pass dates explicitly.
- **Playwright** (`tests/*.spec.ts`): user-visible journeys, accessibility-facing behavior, URL sharing, WebGL fallback, cross-browser behavior. Assert observable behavior (roles, text, marker positions) instead of GPU pixel snapshots.
- **Camera positions**: OrbitControls damping and camera tweens keep moving after input ends, and slow CI renderers stretch that out. Measure markers with `settledBoundingBox` in `tests/app.spec.ts` instead of fixed sleeps.

## Relevant tests

- While working: the narrowest Vitest or Playwright selector covering the change.
- UI behavior, CSS/layout, rendering, URL state, build base path, or browser/CI config: also `npm run test:e2e`.
- Docs-only: `git diff --check`.

## CI and deployment

`.github/workflows/deploy.yml` runs the checks and deploys to GitHub Pages; `playwright.config.ts` and `vite.config.ts` hold browser and build settings. The `browser-smoke` job runs one matrix job per Playwright project (`--project=<browser>`) with a 60-minute timeout. Playwright always serves the Vite dev server (`npm run dev`), locally and in CI, because tests intercept unbundled `/src` modules to inject instrumentation; never point it at `vite preview` or `dist/`. Under `CI` it records no traces, keeping failure screenshots instead.

CI renders WebGL in software (SwiftShader or Mesa), and Heliosphere frames there are about 5x slower than on a dev machine. Playwright actionability checks, screenshots and `settledBoundingBox` all wait on rendered frames, so heavy Heliosphere tests pass at 50-86s in CI against 4-20s locally. The CI per-test timeout is therefore 180s, and Playwright's `globalTimeout` stops at 55 minutes so the report is written before the job limit. Do not hard-code a shorter `test.setTimeout`, which would override it; use `Math.max(test.info().timeout, …)`. `test.slow()` triples the base timeout. A test that times out near the limit is usually over budget rather than hung; check its CI duration in the HTML report before suspecting a stall. Genuine software-WebGL stalls remain possible. The `webkit` project overrides `Desktop Safari`'s `deviceScaleFactor: 2` with `1`, matching Chromium and Firefox, which saves several minutes of WebKit software rendering. The workflow's `paths-ignore` skips pushes and PRs that touch only Markdown, `docs/`, `.agents/`, `skills-lock.json`, or `LICENSE`; a new file that feeds the build must stay outside those patterns. `workflow_dispatch` forces a run.

Linux CI runs Firefox headed under Xvfb because headless Firefox lacks usable WebGL on GitHub-hosted runners. These three settings move together:

- `PLAYWRIGHT_FIREFOX_HEADED: '1'` in the workflow
- Firefox `headless` in `playwright.config.ts`
- the workflow's `xvfb-run -a npm run test:e2e`
