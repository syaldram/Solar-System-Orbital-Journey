# AGENTS.md

Solar System: Orbital Journey is a static, private TypeScript + Three.js site on GitHub Pages that shows how planetary paths depend on the observer's reference frame.

Accuracy governs motion; spectacle governs rendering. [`docs/PRD.md`](docs/PRD.md) and [`docs/SCIENCE.md`](docs/SCIENCE.md) own the product and scientific contracts, including every invariant; a change that alters a contract updates its source doc in the same change.

`npm run check` runs typecheck, lint, unit tests, and build. A change is done when the relevant tests pass ([testing](docs/agents/testing.md)) and the handoff names any unverified behavior or intentional approximation.

## Read before changing

- **Product** behavior, copy, interaction design, scope, or acceptance criteria: [`docs/PRD.md`](docs/PRD.md)
- **Astronomy**: orbital math, constants, units, reference frames, display scale, or scientific claims: [`docs/SCIENCE.md`](docs/SCIENCE.md)
- **Assets**: adding or replacing bundled imagery: [`ASSET_CREDITS.md`](ASSET_CREDITS.md), updated in the same change
- **Code placement**, module boundaries, or TypeScript style: [`docs/agents/architecture.md`](docs/agents/architecture.md)
- **Tests**, CI, build output, or deployment: [`docs/agents/testing.md`](docs/agents/testing.md)

## Agent skills

- **Issues** live in GitHub Issues via `gh`: [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md)
- **Triage** uses the default five-role labels: [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md)
- **Domain** terms and ADRs (single-context layout): [`docs/agents/domain.md`](docs/agents/domain.md)
