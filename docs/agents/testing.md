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

`.github/workflows/deploy.yml` runs the checks and deploys to GitHub Pages; `playwright.config.ts` and `vite.config.ts` hold browser and build settings. Its `paths-ignore` skips pushes and PRs that touch only Markdown, `docs/`, `.agents/`, `skills-lock.json`, or `LICENSE`; a new file that feeds the build must stay outside those patterns. `workflow_dispatch` forces a run.

Linux CI runs Firefox headed under Xvfb because headless Firefox lacks usable WebGL on GitHub-hosted runners. These three settings move together:

- `PLAYWRIGHT_FIREFOX_HEADED: '1'` in the workflow
- Firefox `headless` in `playwright.config.ts`
- the workflow's `xvfb-run -a npm run test:e2e`
