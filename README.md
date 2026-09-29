# Solar System: Orbital Journey

An interactive Three.js experience showing how the planets orbit a Sun that is itself moving through the Milky Way.

The application combines an educational motion model with a cinematic planetarium presentation. Visitors can follow a five-chapter guided journey or explore three linked perspectives:

- **Travel with Sun** — a familiar Sun-centered view with proportional orbital distances.
- **Watch from Space** — a rolling local galactic frame that reveals the Sun’s straight tangent journey.
- **Galaxy Overview** — a schematic Milky Way orientation view.

## Run locally

The project is pinned to Node 24 LTS and npm.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. The GitHub Pages repository base path is already configured as `/Solar-System-Orbital-Journey/`.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Playwright requires its browser binaries once per machine:

```bash
npx playwright install
```

## Architecture

The code is organized around four modules with explicit interfaces:

- `src/astronomy` calculates orbital positions, rotations, physical data, and reference-frame transforms.
- `src/rendering` turns calculated snapshots into Three.js scenes without owning scientific rules.
- `src/experience` owns deterministic timeline, tour, selection, view, and preference state.
- `src/interface` owns semantic DOM controls, accessible panels, and validated share URLs.

The astronomy module uses NASA/JPL Table 2a and 2b approximate orbital elements, valid from 3000 BC through AD 3000. The 165-year journey therefore stays within the published fit interval. These are educational approximations, not navigation-grade ephemerides; Earth is represented by the Earth–Moon barycenter.

See the [product requirements](docs/PRD.md), [scientific model](docs/SCIENCE.md), and [asset credits](ASSET_CREDITS.md) for the agreed scope, assumptions, and sources.

## Deployment

The workflow in `.github/workflows/deploy.yml` verifies pull requests and deploys successful `main` builds to GitHub Pages. In repository settings, select **Pages → Build and deployment → GitHub Actions**.

The expected project URL is:

`https://syaldram.github.io/Solar-System-Orbital-Journey/`

## License

Original source code is available under the [MIT License](LICENSE). Planet imagery retains its source-specific attribution; see [ASSET_CREDITS.md](ASSET_CREDITS.md).
