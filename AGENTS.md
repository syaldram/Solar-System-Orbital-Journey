# AGENTS.md

<!-- bmad:context -->
<!-- Verified 2026-11-02 against 1e08cde8e85c0bceb32cf040135a215c39361ae6. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## Solar System: Orbital Journey

Solar System: Orbital Journey shows how planetary paths depend on the observer's reference frame. It is a static, private TypeScript + Three.js site on GitHub Pages. Planning and implementation artifacts live in `_bmad-output/`.

## Policy

- Accuracy governs motion; spectacle governs rendering. Treat [`docs/PRD.md`](docs/PRD.md) and [`docs/SCIENCE.md`](docs/SCIENCE.md) as the owners of product and scientific contracts, including every invariant; update the source doc in the same change whenever a contract changes.

## Where things are

- Before changing product behavior, copy, interaction design, scope, or acceptance criteria, read [`docs/PRD.md`](docs/PRD.md).
- Before changing orbital math, constants, units, reference frames, display scale, or scientific claims, read [`docs/SCIENCE.md`](docs/SCIENCE.md).
- Before adding or replacing bundled imagery, read [`ASSET_CREDITS.md`](ASSET_CREDITS.md) and update it in the same change.
- Before changing code placement, module boundaries, or TypeScript style, read [`docs/agents/architecture.md`](docs/agents/architecture.md).
- Before changing tests, CI, build output, or deployment, read [`docs/agents/testing.md`](docs/agents/testing.md).
- For issue operations, use GitHub Issues via `gh` and read [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md).
- For triage, use the default five-role labels defined in [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md).
- Before codebase exploration, terminology, or ADR work, read [`docs/agents/domain.md`](docs/agents/domain.md); this repository uses the single-context layout.

## Running and verifying

- Use Node 24 and npm 11.20.0, as declared in `.nvmrc` and `package.json`.
- `npm run check` runs typecheck, lint, unit tests, and build; it does not run Playwright. Follow [`docs/agents/testing.md`](docs/agents/testing.md) for the relevant test requirements.
- A change is done when the relevant tests pass and the handoff names any unverified behavior or intentional approximation.

<!-- /bmad:context -->
