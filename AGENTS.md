# Repository Guide for Coding Agents

This file applies to the entire repository. Preserve the product's scientific honesty, reference-frame lesson, accessibility, and static/private deployment model while making changes.

## Agent skills

### Issue tracker

Issues are tracked in this repository's GitHub Issues using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The default five-role triage label vocabulary is used. See `docs/agents/triage-labels.md`.

### Domain docs

This repository uses a single-context domain-doc layout. See `docs/agents/domain.md`.

## Read the relevant source of truth

- Read `docs/PRD.md` before changing product behavior, copy, interaction design, scope, or acceptance criteria.
- Read `docs/SCIENCE.md` before changing orbital calculations, physical constants, units, reference frames, display scale, or astronomy-related claims.
- Read `ASSET_CREDITS.md` before adding or replacing imagery. Update it whenever a bundled visual asset or its provenance changes.
- Read `.github/workflows/deploy.yml`, `playwright.config.ts`, and `vite.config.ts` before changing CI, browser testing, build output, or deployment.
- Use `package.json` as the source of truth for the supported runtime, package manager, dependencies, and available commands.

Do not duplicate detailed requirements or scientific explanations here. Update their source document when a decision changes.

## Architecture and ownership

Keep dependencies flowing through the existing module boundaries:

- `src/astronomy/` owns pure astronomical calculations, physical data, units, and reference-frame transformations. It must not depend on the DOM or Three.js.
- `src/rendering/` turns calculated data into Three.js scenes. It may exaggerate visual size for legibility, but it must not invent scientific rules or source simulation time.
- `src/experience/` owns deterministic application state, playback, the guided tour, selection, view preferences, and state transitions.
- `src/interface/` owns semantic HTML controls, accessible content, validated URL state, and user-facing panels.
- `src/main.ts` is the composition root. It wires modules together, persists presentation preferences, and contains the graceful WebGL fallback.

Put new logic in the module that owns it rather than expanding `src/main.ts`. Prefer small typed interfaces between modules over reaching across a boundary.

## Product and scientific invariants

Treat these as non-negotiable unless the PRD and science documentation are deliberately revised together:

- The simulation is deterministic and spans 165 Julian years from the visitor's starting UTC date.
- Planet positions use the documented NASA/JPL Table 2a and 2b approximation. Earth represents the Earth-Moon barycenter. Do not describe the result as real-time tracking or a navigation-grade ephemeris.
- Preserve the full ecliptic-to-equatorial-to-galactic transformation. Do not replace it with a hand-authored tilt or a decorative vortex path.
- Keep the exact view labels `Travel with Sun`, `Watch from Space`, and `Galaxy Overview` in user-facing copy.
- Preserve relative orbital distances and eccentricities. Enhanced body radii and schematic galactic elements must remain disclosed as visual approximations.
- Numerical constants belong in typed data and include a unit, source organization, source URL, and retrieval date. Display precision must not imply more accuracy than the model provides.
- Essential information and controls remain in semantic HTML; WebGL is an enhancement, not the only way to receive important content.
- Honor reduced-motion behavior. Initial camera movement must not autoplay.
- Keep the app static and private: no accounts, server runtime, analytics, tracking, cookies, API keys, or runtime requests to third-party assets.
- Bundle assets locally and preserve the GitHub Pages base path `/Solar-System-Orbital-Journey/` unless the deployment target intentionally changes.
- Share URLs encode only the simulated date, selected object, reference frame, and named camera bookmark. Local storage is limited to presentation preferences.

## Working on the code

1. Identify the owning module and the relevant requirements before editing.
2. Add or update the closest test for behavior that can be verified without a browser. Keep astronomy and state tests deterministic; pass dates explicitly instead of reading the clock inside calculations.
3. Use Playwright for user-visible journeys, accessibility-facing behavior, URL sharing, WebGL fallback, or cross-browser behavior. Prefer observable behavior over GPU pixel snapshots.
4. Keep rendering-only approximations out of astronomy outputs, and keep DOM manipulation out of astronomy and experience logic.
5. Preserve the current error boundary around `OrbitalScene` initialization so the page remains useful when WebGL is unavailable.
6. Update the PRD, science notes, asset credits, or README in the same change when their documented contract changes.

Follow the established strict TypeScript style: explicit domain types, immutable inputs/outputs where practical, exhaustive state actions, and no unvalidated casts at external boundaries. Match nearby code and tests rather than introducing a new framework or abstraction for an isolated change.

## Verification

During implementation, run the narrowest relevant Vitest or Playwright test. Before handing off a code change, run:

```bash
npm run check
```

Also run the full browser suite when changing UI behavior, CSS/layout, rendering, URL state, build base paths, or browser/CI configuration:

```bash
npm run test:e2e
```

For documentation-only changes, inspect the rendered Markdown where practical and run `git diff --check`; code and browser suites are not required unless the documentation accompanies code changes.

The Linux CI configuration intentionally runs Firefox headed under Xvfb because headless Firefox may not expose usable WebGL on GitHub-hosted runners. Keep `PLAYWRIGHT_FIREFOX_HEADED`, the Firefox `headless` setting, and the workflow's `xvfb-run` command aligned.

A change is complete when relevant tests pass, generated output and test reports are not added to source control, public claims and credits remain accurate, and the handoff names any unverified behavior or intentional approximation.
